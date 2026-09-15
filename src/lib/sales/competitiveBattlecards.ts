import type { HudObjectionCard } from "./inCallNudgeHud";

export const COMPETITIVE_KILL_CARD_MAX_CHARACTERS = 280;

export type CompetitiveKillCardId =
  | "gong"
  | "chorus"
  | "clari"
  | "weflow"
  | "scratchpad";

export interface CompetitiveKillCard {
  id: CompetitiveKillCardId;
  competitor: string;
  /** Transcript heuristics include common STT spellings and split product names. */
  triggerPatterns: readonly RegExp[];
  trigger: string;
  trap: string;
  counterStrike: string;
  pivotQuestion: string;
}

export const COMPETITIVE_KILL_CARDS: readonly CompetitiveKillCard[] = [
  {
    id: "gong",
    competitor: "Gong",
    triggerPatterns: [/\bgong(?:[.\s]+(?:dot\s+)?io)?\b/i],
    trigger: "[GONG MENTIONED]",
    trap: "Trap: Recording means reps are coached.",
    counterStrike:
      "Say: “Gong gives managers an autopsy after the deal dies. We coach the rep while the deal is live.”",
    pivotQuestion: "Ask: “How does Gong help a rep handle this objection right now?”",
  },
  {
    id: "chorus",
    competitor: "Chorus",
    triggerPatterns: [/\bchorus(?:[.\s]+(?:dot\s+)?ai)?\b/i],
    trigger: "[CHORUS MENTIONED]",
    trap: "Trap: Call intelligence means live guidance.",
    counterStrike:
      "Say: “Chorus explains calls later. We coach the rep during the moment that changes the deal.”",
    pivotQuestion: "Ask: “How does Chorus help a rep respond before the call ends?”",
  },
  {
    id: "clari",
    competitor: "Clari",
    triggerPatterns: [/\bclar(?:i|y)\b/i],
    trigger: "[CLARI MENTIONED]",
    trap: "Trap: Forecast accuracy means execution support.",
    counterStrike:
      "Say: “Clari predicts the outcome. We flag MEDDIC gaps and coach the next move while the call is live.”",
    pivotQuestion: "Ask: “Which MEDDIC gap can Clari help a rep close in this conversation?”",
  },
  {
    id: "weflow",
    competitor: "Weflow",
    triggerPatterns: [/\bwe(?:[\s-]+)?flow\b/i],
    trigger: "[WEFLOW MENTIONED]",
    trap: "Trap: Faster CRM updates mean active selling help.",
    counterStrike:
      "Say: “Weflow makes notes faster. We eliminate note-taking and defend margin live.”",
    pivotQuestion: "Ask: “What protects margin when procurement pushes during the call?”",
  },
  {
    id: "scratchpad",
    competitor: "Scratchpad",
    triggerPatterns: [/\bscratch[\s-]*pad\b/i],
    trigger: "[SCRATCHPAD MENTIONED]",
    trap: "Trap: Cleaner CRM data means better objection handling.",
    counterStrike:
      "Say: “Scratchpad improves CRM hygiene. We coach the rep live and capture the call without manual notes.”",
    pivotQuestion: "Ask: “What helps the rep handle a pricing challenge in the moment?”",
  },
];

export function formatCompetitiveKillCard(card: CompetitiveKillCard): string {
  return [card.trigger, card.trap, card.counterStrike, card.pivotQuestion].join("\n");
}

export function matchCompetitiveKillCard(text: string): CompetitiveKillCard | null {
  if (!text.trim()) return null;
  return COMPETITIVE_KILL_CARDS.find((card) =>
    card.triggerPatterns.some((pattern) => pattern.test(text)),
  ) ?? null;
}

export function competitiveKillCardForHud(card: CompetitiveKillCard): HudObjectionCard {
  return {
    id: `competitor_${card.id}`,
    title: card.trigger,
    trap: card.trap,
    rebuttalScript: card.counterStrike,
    followUpQuestion: card.pivotQuestion,
  };
}
