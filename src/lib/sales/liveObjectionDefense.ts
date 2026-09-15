import type { TranscriptSegment } from "../types";
import { matchObjection, type ObjectionBattlecard } from "./objectionBuster";
import { matchConcessionTrade, type ConcessionDemand } from "./concessionMatrix";

export interface LiveObjectionDefenseCue {
  id: string;
  kind: "objection" | "concession";
  engine: "objectionBuster" | "concessionMatrix";
  title: string;
  script: string;
  tradeOptions: string[];
}

export interface LiveObjectionDefenseState {
  processedSegmentIds: string[];
  objectionCount: number;
  cue: LiveObjectionDefenseCue | null;
}

export function initialLiveObjectionDefenseState(): LiveObjectionDefenseState {
  return {
    processedSegmentIds: [],
    objectionCount: 0,
    cue: null,
  };
}

const FILLERS_REGEX = /\b(look|honestly|just|you know|obviously|unfortunately)\b/i;

function toGlanceableScript(raw: string, fallback: string): string {
  const withoutFillers = raw.replace(/\b(look|honestly|just|you know|obviously|unfortunately)\b/gi, "").replace(/\s+/g, " ").trim();
  const words = withoutFillers.split(/\s+/).filter(Boolean);
  if (words.length > 0 && words.length < 25 && !FILLERS_REGEX.test(withoutFillers)) {
    return withoutFillers;
  }
  return fallback;
}

function buildConcessionCue(concession: ConcessionDemand): LiveObjectionDefenseCue {
  const tradeOptions = (concession.recommendedTradeDemands || []).map((t) => t.label);

  let script = "Trade price for commitment: require annual pre-pay or a 2-year agreement before discussing any discount.";
  if (concession.id !== "concession_discount" && concession.exactCounterpunchScript) {
    script = toGlanceableScript(
      concession.exactCounterpunchScript,
      "Never concede price without trade-offs: offer terms or duration adjustments in exchange.",
    );
  }

  return {
    id: concession.id,
    kind: "concession",
    engine: "concessionMatrix",
    title: concession.category === "discount" ? "Discount Pressure Detected" : "Concession Pressure Detected",
    script,
    tradeOptions,
  };
}

function buildObjectionCue(objection: ObjectionBattlecard): LiveObjectionDefenseCue {
  let fallback = "Pivot to value and timeline: what specific metric does finance need to confirm?";
  if (objection.id === "obj_competitor") {
    fallback = "Gong is an autopsy tool after deals are lost. SalesHunter is the live weapon that eliminates deal risk.";
  }

  const script = toGlanceableScript(objection.rebuttalScript, fallback);

  return {
    id: objection.id,
    kind: "objection",
    engine: "objectionBuster",
    title: objection.title,
    script,
    tradeOptions: [],
  };
}

export function reduceLiveObjectionDefense(
  state: LiveObjectionDefenseState,
  segment: TranscriptSegment,
): LiveObjectionDefenseState {
  // AC-1: Final prospect utterances only
  if (!segment.isFinal) return state;
  if (segment.source !== "them" && segment.source !== "mix") return state;
  if (!segment.text || segment.text.trim().length === 0) return state;
  if (state.processedSegmentIds.includes(segment.id)) return state;

  const nextProcessed = [...state.processedSegmentIds, segment.id];

  // AC-2: Concession matching takes precedence over general objection matching
  const concession = matchConcessionTrade(segment.text);
  if (concession) {
    return {
      processedSegmentIds: nextProcessed,
      objectionCount: state.objectionCount + 1,
      cue: buildConcessionCue(concession),
    };
  }

  const objection = matchObjection(segment.text);
  if (objection) {
    return {
      processedSegmentIds: nextProcessed,
      objectionCount: state.objectionCount + 1,
      cue: buildObjectionCue(objection),
    };
  }

  // Unrelated utterance: preserve current cue and state
  return state;
}
