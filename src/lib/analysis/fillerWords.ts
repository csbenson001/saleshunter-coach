//! Hardcoded filler-word / verbal-crutch vocabulary used by the delivery
//! analysis to spot OVER-USE. This is the single place to tune detection — add
//! or remove entries here and the live + post-call delivery passes pick them up.
//!
//! DELIBERATELY LEXICAL words/phrases only — NOT non-lexical hesitation sounds
//! (um, uh, er). Speech-to-text engines routinely drop those, so
//! trying to detect them is unreliable; we only track real words that actually
//! land in the transcript.
//!
//! Detection never flags mere presence — everyone uses these. The analysis flags
//! a speaker only when they lean on these densely enough to distract (the LLM
//! judges over-use vs. ordinary meaningful use; see analyzeDelivery). That keeps
//! borderline entries (e.g. "actually", which is often meaningful) safe
//! to include here: they're only ever flagged when genuinely overused.

/** Lexical filler vocabulary. */
export const FILLER_WORDS: Record<string, string[]> = {
  en: [
    "like",
    "you know",
    "i mean",
    "basically",
    "actually",
    "literally",
    "sort of",
    "kind of",
    "kinda",
    "sorta",
    "you see",
    "i guess",
    "right?",
    "so yeah",
    "to be honest",
    "at the end of the day",
    "or whatever",
    "and stuff",
  ],
};

/** Flat, de-duplicated lexical filler watchlist. */
export function fillerWatchlist(_language: string): string[] {
  return Array.from(new Set(FILLER_WORDS.en));
}

// ── Non-lexical filler SOUNDS ("um" / "uh") ──────────────────────────────────
// Unlike the lexical crutch words above (which the LLM judges for over-use), the
// hesitation NOISES are matched directly against the live transcript so the
// delivery panel can tally them in real time — the acoustic DSP detector missed
// too many, so we count whatever the recognizer actually wrote down.
//
// Runs collapse to a single event ("ummm" counts once).

// Latin hesitations, one simple shape per entry: um/umm, uh/uhh, uhm, er/erm,
// hmm, mm(m), ah, eh. Kept as separate patterns instead of one giant
// alternation so no single regex has the ambiguous/overlapping quantifiers that
// risk super-linear backtracking. Every shape is `\b`-anchored to a whole word
// (so they never match inside real words like human, yeah, ahead…) and the
// shapes use disjoint letter sets, so a given word matches at most one shape —
// counting them independently can never double-count. (`e+r+m*` already covers
// "erm", so no standalone "erm" entry is needed.)
const LATIN_FILLER_SHAPES = [
  "u+m+", // um, umm, ummm
  "u+h+", // uh, uhh
  "uh+m+", // uhm, uhhm, uhmm
  "e+r+m*", // er, err, erm, ermm
  "h+m+", // hm, hmm
  "m+m+", // mm, mmm
  "a+h+", // ah, ahh
  "e+h+", // eh, ehh
];

const FILLER_SOUND_PATTERNS: RegExp[] = [
  ...LATIN_FILLER_SHAPES.map(
    (shape) => new RegExp(String.raw`\b(?:${shape})\b`, "gi"),
  ),
];

/**
 * Count non-lexical filler SOUND events in a transcript fragment. Language
 * agnostic; repeated runs count once. Used to tally hesitations live as segments
 * stream in (see the store's `upsertSegment`).
 */
export function countFillerSounds(text: string): number {
  if (!text) return 0;
  let count = 0;
  for (const re of FILLER_SOUND_PATTERNS) {
    re.lastIndex = 0;
    while (re.exec(text) !== null) count += 1;
  }
  return count;
}
