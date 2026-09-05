/**
 * SalesHunter Tough Sales Person Persona Judge Engine
 * 
 * Persona: Marcus "The Closer" Vance
 * Role: 25-Year Enterprise VP of Sales, $100M+ ARR Builder, Ruthless Hard Grader.
 * 
 * Purpose: Evaluates features, coaching cues, and buyer interactions against real-world
 * quota attainment, deal velocity, and hard dollar ROI — not just technical functionality.
 */

export interface SalesCapabilityEvaluationTarget {
  featureName: string;
  category: "in_call_cue" | "objection_response" | "qualification" | "post_call_asset" | "workflow_tool";
  inputContext: string;
  solutionOutput: string;
  targetBuyerPersona?: string;
  dealSizeUsd?: number;
}

export interface ToughJudgeRubricScore {
  criterion: string;
  score: number; // 0 - 100
  weight: number; // 0.0 - 1.0
  toughCritique: string;
  howToWinTheDeal: string;
}

export type JudgeVerdict = "REJECT_AS_SHELFWARE" | "CONDITIONAL_PASS" | "DEAL_CLOSER_CERTIFIED";

export interface ToughJudgeAuditResult {
  judgeName: string;
  verdict: JudgeVerdict;
  overallScore: number; // 0 - 100
  executiveCritique: string;
  rubricBreakdown: ToughJudgeRubricScore[];
  dollarRoiMultiplierEstimate: string;
  repUsabilityVerdict: "Too complex in-call" | "Glanceable & lethal" | "Acceptable post-call";
  tacticalAdjustments: string[];
}

export const TOUGH_JUDGE_WEIGHTS = {
  winRateImpact: 0.30,       // Does it actually close deals or increase win rate?
  cognitiveLatency: 0.25,    // Can an AE use it in 2 seconds without stuttering?
  commercialLeverage: 0.25,  // Does it create pricing/negotiation power, not just pleasantries?
  hardDollarRoi: 0.20,       // Does it easily pay for the $49/mo or $79/seat/mo subscription?
};

/**
 * Heuristics-based local evaluation for offline CI/CD, augmented with deep persona analysis.
 */
export function auditSalesCapability(target: SalesCapabilityEvaluationTarget): ToughJudgeAuditResult {
  const breakdown: ToughJudgeRubricScore[] = [];

  // 1. Win Rate Impact Criterion
  const winRateSignals = [
    "budget", "decision", "timeline", "next step", "close", "roi", "pain",
    "risk", "competitor", "champion", "economic buyer", "urgency", "metric",
    "churn", "save", "value", "cost", "committee", "measure"
  ];
  const outputLower = target.solutionOutput.toLowerCase();
  const matchedSignals = winRateSignals.filter((s) => outputLower.includes(s));
  
  let winRateScore = Math.min(100, Math.round((matchedSignals.length / 4) * 80) + 20);
  let winRateCritique = "";
  if (winRateScore < 70) {
    winRateCritique = "Weak commercial spine. Sounds like customer service, not quota-carrying sales. Rep will get friend-zoned by the prospect.";
  } else if (winRateScore < 88) {
    winRateCritique = "Good fundamental qualification points, but needs more teeth around urgency and quantifiable commercial consequences of doing nothing.";
  } else {
    winRateCritique = "Lethal focus on business outcomes and decision control. Drives the buyer towards a commercial decision point.";
  }

  breakdown.push({
    criterion: "Win Rate & Pipeline Velocity Impact",
    score: winRateScore,
    weight: TOUGH_JUDGE_WEIGHTS.winRateImpact,
    toughCritique: winRateCritique,
    howToWinTheDeal: "Force the prospect to articulate the financial loss of sticking with their status quo.",
  });

  // 2. Cognitive Latency & In-Call Glancability
  // Cues should be super brief (<140 chars); objection responses can be crisp 2-sentence talk tracks (<260 chars).
  const charCount = target.solutionOutput.length;
  let latencyScore = 85;
  let usabilityVerdict: ToughJudgeAuditResult["repUsabilityVerdict"] = "Glanceable & lethal";

  const maxCrisp = target.category === "in_call_cue" ? 140 : 260;
  const maxAcceptable = target.category === "in_call_cue" ? 280 : 420;

  if (target.category === "in_call_cue" || target.category === "objection_response") {
    if (charCount > maxAcceptable) {
      latencyScore = 45;
      usabilityVerdict = "Too complex in-call";
    } else if (charCount > maxCrisp) {
      latencyScore = 72;
      usabilityVerdict = "Acceptable post-call";
    } else {
      latencyScore = 95;
      usabilityVerdict = "Glanceable & lethal";
    }
  } else {
    latencyScore = charCount > 1200 ? 70 : 92;
    usabilityVerdict = "Acceptable post-call";
  }

  breakdown.push({
    criterion: "In-Call Glanceability & Cognitive Load",
    score: latencyScore,
    weight: TOUGH_JUDGE_WEIGHTS.cognitiveLatency,
    toughCritique: latencyScore < 70
      ? "Wall of text! If an AE looks down to read a 4-paragraph essay while a VP is speaking, the call is dead. Cut it down to a 5-word hook."
      : "Punchy and immediate. Rep can absorb the point in half a second and deliver it naturally.",
    howToWinTheDeal: "Keep in-call prompts under 25 words. Give them the question to ask, not a lecture.",
  });

  // 3. Commercial Leverage & Objection Backbone
  const weakLanguage = ["maybe", "hopefully", "if that's okay", "sorry", "discount", "cheap"];
  const hasWeakness = weakLanguage.some((w) => outputLower.includes(w));
  const hasStrongQuestions = target.solutionOutput.includes("?") || outputLower.includes("what if");

  let leverageScore = 80;
  if (hasWeakness) leverageScore -= 30;
  if (hasStrongQuestions) leverageScore += 15;
  leverageScore = Math.max(20, Math.min(100, leverageScore));

  breakdown.push({
    criterion: "Commercial Leverage & Objection Backbone",
    score: leverageScore,
    weight: TOUGH_JUDGE_WEIGHTS.commercialLeverage,
    toughCritique: leverageScore < 70
      ? "Too apologetic. Never negotiate against yourself by offering early discounts or sounding submissive."
      : "High status positioning. Rep leads the dance and commands authority in the room.",
    howToWinTheDeal: "Answer questions with strategic clarifying questions that re-anchor to value.",
  });

  // 4. Hard Dollar ROI Justification
  const dealValue = target.dealSizeUsd || 25000;
  let roiScore = 85;
  if (winRateScore > 75 && latencyScore > 70) {
    roiScore = 95;
  } else if (winRateScore < 60) {
    roiScore = 40;
  }

  breakdown.push({
    criterion: "Direct Revenue & ROI Justification",
    score: roiScore,
    weight: TOUGH_JUDGE_WEIGHTS.hardDollarRoi,
    toughCritique: roiScore < 70
      ? `Can't justify $49/mo if it doesn't demonstrably prevent deal slippage on an average $${dealValue.toLocaleString()} pipeline deal.`
      : `No-brainer purchase. Saving even 1 deal per quarter yields a 50x to 100x return on subscription cost.`,
    howToWinTheDeal: "Document the revenue preserved in the CRM export so leadership sees immediate software ROI.",
  });

  // Calculate Weighted Overall
  const overall = Math.round(
    breakdown.reduce((sum, item) => sum + item.score * item.weight, 0)
  );

  let verdict: JudgeVerdict = "REJECT_AS_SHELFWARE";
  if (overall >= 88) {
    verdict = "DEAL_CLOSER_CERTIFIED";
  } else if (overall >= 72) {
    verdict = "CONDITIONAL_PASS";
  }

  const executiveCritique =
    verdict === "DEAL_CLOSER_CERTIFIED"
      ? `[CERTIFIED BY THE CLOSER]: "${target.featureName}" delivers real revenue leverage. Reps will actually use this because it makes them money and protects their commission checks.`
      : verdict === "CONDITIONAL_PASS"
      ? `[CONDITIONAL PASS]: "${target.featureName}" is technically solid, but needs more commercial bite. Cut the fluff, reduce rep cognitive load, and sharpen the objection responses.`
      : `[REJECTED AS SHELFWARE]: "${target.featureName}" feels like an engineer's toy rather than a sales tool. No AE will use this under live battlefield conditions unless you make it 10x faster and strictly ROI-driven.`;

  const tacticalAdjustments: string[] = [
    "Ensure every in-call alert can be digested in under 3 seconds.",
    "Always steer the conversation toward quantifiable business pain and economic buyers.",
    "Replace passive note-taking summaries with proactive 'Next Step Commitment' drivers.",
  ];

  return {
    judgeName: "Marcus 'The Closer' Vance (Tough Sales Judge)",
    verdict,
    overallScore: overall,
    executiveCritique,
    rubricBreakdown: breakdown,
    dollarRoiMultiplierEstimate: overall >= 80 ? "25x - 100x pipeline ROI" : "< 5x questionable ROI",
    repUsabilityVerdict: usabilityVerdict,
    tacticalAdjustments,
  };
}
