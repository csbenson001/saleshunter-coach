/** Commercial proof contract for the Gong coexistence defense. */
export const GONG_COEXISTENCE_PROOF = {
  seatCount: 20,
  successMetric: "time_to_close",
  targetRoiMultiplier: 50,
} as const;

const INCUMBENT_OWNERSHIP_PATTERNS = [
  /\b(?:we|our(?:\s+[\w-]+){0,2}\s+(?:team|company|org|organization))\s+(?:already\s+)?(?:use|uses|have|has|bought|pay for)\s+(?:gong|chorus)\b/i,
  /\bwe(?:'re| are)\s+(?:already\s+)?(?:using|on)\s+(?:gong|chorus)\b/i,
  /\b(?:gong|chorus)\s+(?:is|has been|was)\s+(?:already\s+)?(?:deployed|rolled out|standardized)\b/i,
  /\b(?:gong|chorus)\s+(?:is\s+)?(?:deployed\s+)?across\s+(?:our\s+)?(?:\d+|all)\s+reps?\b/i,
];

/**
 * Detect ownership or deployment pressure, not a casual competitor mention.
 * This keeps the live surface quiet until the buyer frames Gong or Chorus as
 * the reason not to evaluate SalesHunter.
 */
export function detectGongIncumbentObjection(text: string): boolean {
  const normalized = text.trim();
  return normalized.length > 0 && INCUMBENT_OWNERSHIP_PATTERNS.some((pattern) => pattern.test(normalized));
}
