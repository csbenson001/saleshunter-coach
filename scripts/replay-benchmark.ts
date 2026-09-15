#!/usr/bin/env node

/**
 * Replay transcript JSON through the same synchronous detector used by the
 * live in-call HUD. This runner deliberately does not invoke an LLM: SAL-2 is
 * the latency gate for the local trigger/render path, and deterministic replay
 * keeps the result reproducible when a holdout corpus is not available to the
 * builder.
 */

import { readFile, readdir, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import type { Source, TranscriptSegment } from "../src/lib/types";
import {
  initialLiveObjectionDefenseState,
  reduceLiveObjectionDefense,
  type LiveObjectionDefenseState,
} from "../src/lib/sales/liveObjectionDefense";

export const P95_LATENCY_LIMIT_MS = 2_000;
export const INSTANT_FAIL_LATENCY_LIMIT_MS = 2_500;

type JsonRecord = Record<string, unknown>;

export interface LatencySample {
  /** Stable identifier from the input, or a generated file-local identifier. */
  segmentId: string;
  /** Timestamp from the transcript timeline, never wall-clock time. */
  utteranceEndMs: number;
  /** Identifier of the rendered production cue. */
  cueId: string;
  latencyMs: number;
}

export interface ReplayReport {
  schemaVersion: 1;
  generatedAt: string;
  corpus: string;
  pace: number;
  thresholds: {
    p95LatencyMs: number;
    instantFailLatencyMs: number;
  };
  counts: {
    files: number;
    utterances: number;
    prospectUtterances: number;
    suggestions: number;
  };
  latencyMs: {
    p50: number | null;
    p95: number | null;
    p99: number | null;
    max: number | null;
  };
  /** Flat aliases make the machine-readable gate easy to consume in CI. */
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
  p99LatencyMs: number | null;
  samples: LatencySample[];
  verdict: "PASS" | "FAIL";
  failureReasons: string[];
}

export interface ReplayOptions {
  pace: number;
  /** Test seam; production callers use the wall clock and real timers. */
  clock?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
}

const DEFAULT_SLEEP: ReplayOptions["sleep"] = (milliseconds) =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

function asRecord(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return value as JsonRecord;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function millisecondsFrom(record: JsonRecord, keys: string[], fallback: number | null): number | null {
  for (const key of keys) {
    const value = numberValue(record[key]);
    if (value === null) continue;
    return key.toLowerCase().includes("ms") ? value : value * 1_000;
  }
  return fallback;
}

function sourceFrom(value: unknown): Source {
  const source = String(value ?? "").trim().toLowerCase();
  if (["me", "rep", "seller", "agent", "host"].includes(source)) return "me";
  if (["mix", "combined"].includes(source)) return "mix";
  return "them";
}

function inputItems(value: unknown, filePath: string): unknown[] {
  if (Array.isArray(value)) return value;
  const root = asRecord(value, filePath);
  for (const key of ["segments", "utterances", "transcript", "events", "items"]) {
    if (Array.isArray(root[key])) return root[key] as unknown[];
  }
  throw new Error(`${filePath} must contain an array (or a segments/utterances array)`);
}

/** Normalize common transcript export shapes without retaining transcript text. */
export function normalizeTranscript(value: unknown, filePath = "transcript.json"): TranscriptSegment[] {
  const items = inputItems(value, filePath);
  let previousEndMs = 0;

  return items.flatMap((item, index) => {
    const record = asRecord(item, `${filePath} item ${index + 1}`);
    const text = stringValue(record.text ?? record.transcript ?? record.content ?? record.utterance);
    if (!text) return [];

    const startMs = millisecondsFrom(
      record,
      ["startMs", "start_ms", "startTimeMs", "startTime", "start", "timestamp"],
      previousEndMs,
    ) ?? previousEndMs;
    const estimatedDurationMs = Math.max(1_000, Math.round(text.split(/\s+/).filter(Boolean).length * 380));
    const endMs = Math.max(
      startMs,
      millisecondsFrom(record, ["endMs", "end_ms", "endTimeMs", "endTime", "end", "stopMs"], startMs + estimatedDurationMs) ?? startMs + estimatedDurationMs,
    );
    previousEndMs = endMs;

    const id = stringValue(record.id ?? record.segmentId ?? record.utteranceId) ?? `${basename(filePath)}:${index + 1}`;
    const role = record.source ?? record.role ?? record.speakerRole ?? record.speaker_type ?? record.speakerType ?? (typeof record.speaker === "string" ? record.speaker : undefined);
    return [{
      id,
      source: sourceFrom(role),
      speaker: numberValue(record.speaker) ?? 0,
      text,
      isFinal: record.isFinal !== false && record.final !== false,
      startMs,
      endMs,
    } satisfies TranscriptSegment];
  });
}

async function jsonFiles(corpusPath: string): Promise<string[]> {
  const absolutePath = resolve(corpusPath);
  const entries = await readdir(absolutePath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".json")
    .map((entry) => join(absolutePath, entry.name))
    .sort();
}

export async function loadCorpus(corpusPath: string): Promise<{ files: string[]; segments: TranscriptSegment[] }> {
  const absolutePath = resolve(corpusPath);
  let files: string[];
  try {
    const contents = await readFile(absolutePath, "utf8");
    files = [absolutePath];
    return { files, segments: normalizeTranscript(JSON.parse(contents), absolutePath) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EISDIR") throw error;
    files = await jsonFiles(absolutePath);
  }

  if (files.length === 0) throw new Error(`No .json transcript files found in ${absolutePath}`);
  const segments: TranscriptSegment[] = [];
  for (const filePath of files) {
    const contents = await readFile(filePath, "utf8");
    segments.push(...normalizeTranscript(JSON.parse(contents), filePath));
  }
  return { files, segments };
}

function percentile(values: number[], rank: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * rank;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return roundMs(sorted[lower]);
  return roundMs(sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower));
}

function roundMs(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatMs(value: number | null): string {
  return value === null ? "n/a" : `${value.toFixed(2)} ms`;
}

function isMain(): boolean {
  // vite-node does not preserve the script path in argv[1] on every version;
  // these flags are unique to the CLI and keep importing this module side-effect free in tests.
  return process.argv.some((argument) => ["--corpus", "--help", "-h"].includes(argument));
}

export async function replaySegments(
  segments: TranscriptSegment[],
  options: ReplayOptions,
): Promise<{ samples: LatencySample[]; state: LiveObjectionDefenseState }> {
  if (!Number.isFinite(options.pace) || options.pace <= 0) {
    throw new Error("--pace must be a finite number greater than 0");
  }

  const clock = options.clock ?? (() => performance.now());
  const sleep: (milliseconds: number) => Promise<void> = options.sleep ?? DEFAULT_SLEEP;
  let state = initialLiveObjectionDefenseState();
  let previousTimelineMs = 0;
  const samples: LatencySample[] = [];

  for (const segment of segments) {
    const waitMs = Math.max(0, segment.endMs - previousTimelineMs) / options.pace;
    if (waitMs >= 1) await sleep(waitMs);
    previousTimelineMs = Math.max(previousTimelineMs, segment.endMs);

    const utteranceEndedAt = clock();
    const nextState = reduceLiveObjectionDefense(state, segment);
    const suggestionRenderedAt = clock();
    if (nextState.objectionCount > state.objectionCount && nextState.cue) {
      samples.push({
        segmentId: segment.id,
        utteranceEndMs: segment.endMs,
        cueId: nextState.cue.id,
        latencyMs: roundMs(Math.max(0, suggestionRenderedAt - utteranceEndedAt)),
      });
    }
    state = nextState;
  }

  return { samples, state };
}

export function makeReport(
  corpus: string,
  pace: number,
  files: string[],
  segments: TranscriptSegment[],
  samples: LatencySample[],
): ReplayReport {
  const values = samples.map((sample) => sample.latencyMs);
  const p50 = percentile(values, 0.5);
  const p95 = percentile(values, 0.95);
  const p99 = percentile(values, 0.99);
  const max = values.length ? roundMs(Math.max(...values)) : null;
  const failureReasons: string[] = [];
  if (samples.length === 0) failureReasons.push("No coaching suggestions were observed; the latency SLA was not measurable.");
  if (p95 !== null && p95 > P95_LATENCY_LIMIT_MS) failureReasons.push(`P95 latency ${formatMs(p95)} exceeds ${P95_LATENCY_LIMIT_MS} ms.`);
  if (max !== null && max > INSTANT_FAIL_LATENCY_LIMIT_MS) failureReasons.push(`A suggestion latency ${formatMs(max)} exceeds the instant-fail limit of ${INSTANT_FAIL_LATENCY_LIMIT_MS} ms.`);

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    corpus,
    pace,
    thresholds: {
      p95LatencyMs: P95_LATENCY_LIMIT_MS,
      instantFailLatencyMs: INSTANT_FAIL_LATENCY_LIMIT_MS,
    },
    counts: {
      files: files.length,
      utterances: segments.length,
      prospectUtterances: segments.filter((segment) => segment.source === "them" || segment.source === "mix").length,
      suggestions: samples.length,
    },
    latencyMs: { p50, p95, p99, max },
    p50LatencyMs: p50,
    p95LatencyMs: p95,
    p99LatencyMs: p99,
    // Segment ids and cue ids are safe diagnostics; transcript text is never persisted.
    samples,
    verdict: failureReasons.length ? "FAIL" : "PASS",
    failureReasons,
  };
}

export function scorecardMarkdown(report: ReplayReport): string {
  const trace = report.samples.length
    ? report.samples.map((sample) => `- ${sample.utteranceEndMs} ms — segment ${sample.segmentId} — cue ${sample.cueId} — ${formatMs(sample.latencyMs)}`).join("\n")
    : "- No coaching-trigger traces recorded.";
  return [
    "# Holdout Replay Evaluation Scorecard",
    `**Date**: ${report.generatedAt}`,
    `**Corpus**: ${report.corpus}`,
    `**Pace**: ${report.pace}x`,
    "",
    "## Summary Results",
    `- **Overall Verdict**: ${report.verdict}`,
    `- **P50 Latency**: ${formatMs(report.latencyMs.p50)}`,
    `- **P95 Latency**: ${formatMs(report.latencyMs.p95)}`,
    `- **P99 Latency**: ${formatMs(report.latencyMs.p99)}`,
    `- **Suggestions**: ${report.counts.suggestions}`,
    "",
    "## Timestamped Latency Traces",
    trace,
    "",
    "## Recommendation",
    report.verdict === "PASS" ? "Certify the measured trigger path for this latency gate." : `Block release: ${report.failureReasons.join(" ")}`,
    "",
  ].join("\n");
}

function printUsage(): void {
  console.log("Usage: npm run test:replay -- --corpus <file-or-directory> [--pace <multiplier>] [--json-out <file>] [--scorecard-out <file>]");
}

function parseArgs(argv: string[]): { corpus: string; pace: number; jsonOut?: string; scorecardOut?: string } {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      printUsage();
      process.exit(0);
    }
    if (!argument.startsWith("--")) throw new Error(`Unexpected argument: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value`);
    values.set(argument, value);
    index += 1;
  }
  const corpus = values.get("--corpus");
  if (!corpus) throw new Error("--corpus is required");
  const pace = Number(values.get("--pace") ?? "1");
  if (!Number.isFinite(pace) || pace <= 0) throw new Error("--pace must be a finite number greater than 0");
  return {
    corpus,
    pace,
    jsonOut: values.get("--json-out") ?? values.get("--report-out") ?? values.get("--output"),
    scorecardOut: values.get("--scorecard-out") ?? values.get("--markdown-out"),
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const loaded = await loadCorpus(args.corpus);
  const replay = await replaySegments(loaded.segments, { pace: args.pace });
  const report = makeReport(args.corpus, args.pace, loaded.files, loaded.segments, replay.samples);

  console.log(`P50 latency: ${formatMs(report.latencyMs.p50)}`);
  console.log(`P95 latency: ${formatMs(report.latencyMs.p95)}`);
  console.log(`P99 latency: ${formatMs(report.latencyMs.p99)}`);
  console.log(`Suggestions: ${report.counts.suggestions}`);
  console.log(`Verdict: ${report.verdict}`);
  if (report.failureReasons.length) console.error(`Failure: ${report.failureReasons.join(" ")}`);

  if (args.jsonOut) await writeFile(resolve(args.jsonOut), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (args.scorecardOut) await writeFile(resolve(args.scorecardOut), scorecardMarkdown(report), "utf8");

  if (report.verdict === "FAIL") process.exitCode = 1;
}

if (isMain()) {
  main().catch((error: unknown) => {
    console.error(`Replay failed: ${error instanceof Error ? error.message : String(error)}`);
    printUsage();
    process.exitCode = 1;
  });
}
