import { describe, expect, it } from "vitest";
import {
  createInCallHudCardEmission,
  hudShouldIgnoreCursorEvents,
  shouldShowInCallNudgeHud,
  type HudObjectionCard,
  initialInCallHudState,
  reduceInCallHudState,
} from "./inCallNudgeHud";
import { settingsForPersistence } from "../store";
import type { Settings } from "../types";

const CARD: HudObjectionCard = {
  id: "obj_budget",
  title: "Too expensive",
  rebuttalScript: "Tie the investment to the missed deal.",
  followUpQuestion: "Which metric does finance need to approve this?",
};

describe("in-call HUD integration boundaries", () => {
  it("opens only for a recording and destroys for every other meeting state", () => {
    expect(shouldShowInCallNudgeHud("recording")).toBe(true);
    expect(shouldShowInCallNudgeHud("idle")).toBe(false);
    expect(shouldShowInCallNudgeHud("paused")).toBe(false);
    expect(shouldShowInCallNudgeHud("stopped")).toBe(false);
  });

  it("keeps the surface click-through until a card supplies a reachable affordance", () => {
    expect(hudShouldIgnoreCursorEvents(initialInCallHudState())).toBe(true);
    const visible = reduceInCallHudState(
      initialInCallHudState(),
      { type: "objection-card", card: CARD },
      1_000,
    );
    expect(hudShouldIgnoreCursorEvents(visible)).toBe(false);
  });

  it("assigns a new measurement identity when the same objection is emitted again", () => {
    const first = createInCallHudCardEmission(null, CARD.id, 10);
    const second = createInCallHudCardEmission(first.id, CARD.id, 20);

    expect(second.id).not.toBe(first.id);
    expect(second.cardId).toBe(first.cardId);
    expect(second.emittedAtMs).toBe(20);
  });

  it("replays 100 reducer emissions with a p95 below the HUD budget", () => {
    const durations: number[] = [];
    let state = initialInCallHudState();
    for (let i = 0; i < 100; i += 1) {
      const started = performance.now();
      state = reduceInCallHudState(state, { type: "objection-card", card: CARD }, started);
      durations.push(performance.now() - started);
    }

    durations.sort((a, b) => a - b);
    console.info(`in-call HUD 100-event reducer p95: ${durations[94].toFixed(4)} ms`);
    expect(durations[94]).toBeLessThan(100);
    expect(state.card).toEqual(CARD);
  });
});

describe("settings persistence boundary", () => {
  it("does not write provider credentials into browser persistence", () => {
    const settings = {
      anthropicApiKey: "anthropic-secret",
      openaiApiKey: "openai-secret",
      geminiApiKey: "gemini-secret",
      groqApiKey: "groq-secret",
      qwenApiKey: "qwen-secret",
      kimiApiKey: "kimi-secret",
      ollamaApiKey: "ollama-secret",
      openrouterApiKey: "openrouter-secret",
      coachApiKey: "coach-secret",
      sonioxApiKey: "soniox-secret",
      deepgramApiKey: "deepgram-secret",
      assemblyaiApiKey: "assemblyai-secret",
    } as Settings;

    const persisted = settingsForPersistence(settings);
    for (const value of Object.values(settings)) {
      if (typeof value === "string" && value.endsWith("-secret")) {
        expect(Object.values(persisted)).not.toContain(value);
      }
    }
  });
});
