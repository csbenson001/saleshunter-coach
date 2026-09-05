/**
 * SalesHunter Deal Risk & Buying Signals Intelligence Engine
 *
 * Real-time heuristic and semantic classification of sales dialogue to detect:
 * 1. Buying signals (pricing queries, timeline commitment, internal advocacy, technical fit)
 * 2. Deal risks (budget pushback, missing decision maker, competitor threat, stalled timeline)
 */

export type SignalCategory = "pricing" | "timeline" | "champion" | "technical_fit";
export type RiskCategory = "budget_freeze" | "authority_gap" | "competitor_threat" | "timeline_slip" | "inertia";

export interface DealSignal {
  id: string;
  category: SignalCategory;
  label: string;
  matchedPhrase: string;
  timestampMs: number;
  confidence: number;
}

export interface DealRisk {
  id: string;
  category: RiskCategory;
  label: string;
  severity: "low" | "medium" | "high";
  matchedPhrase: string;
  timestampMs: number;
  coachingAdvice: string;
}

export interface DealHealthReport {
  healthScore: number; // 0-100
  momentum: "positive" | "neutral" | "at_risk";
  buyingSignals: DealSignal[];
  risks: DealRisk[];
}

const BUYING_SIGNAL_PATTERNS: Array<{
  category: SignalCategory;
  label: string;
  regex: RegExp;
}> = [
  {
    category: "pricing",
    label: "Pricing / Terms Inquiry",
    regex: /\b(how much|pricing tier|pricing model|cost structure|what('s| is) the cost|payment terms|per seat|annual discount)\b/i,
  },
  {
    category: "timeline",
    label: "Onboarding & Start Date",
    regex: /\b(when can we start|onboarding process|how long does it take to (deploy|setup|launch)|go[- ]live date|rollout timeline)\b/i,
  },
  {
    category: "champion",
    label: "Internal Champion Alignment",
    regex: /\b(show this to (my|our) (boss|vp|team|lead)|executive sponsor|getting budget approved|presenting to leadership|advocate for this)\b/i,
  },
  {
    category: "technical_fit",
    label: "Architecture & Security Fit",
    regex: /\b(integrate with our|soc[- ]?2|security review|compliance certification|api access|single sign[- ]on|sso support)\b/i,
  },
];

const DEAL_RISK_PATTERNS: Array<{
  category: RiskCategory;
  label: string;
  severity: "low" | "medium" | "high";
  regex: RegExp;
  coachingAdvice: string;
}> = [
  {
    category: "budget_freeze",
    label: "Budget Constraint / Freeze",
    severity: "high",
    regex: /\b(no budget|budget freeze|spending freeze|spend freeze|complete freeze|cut costs|tight budget|too expensive|can('t|not) afford|out of our budget)\b/i,
    coachingAdvice: "Reframe from cost to ROI: probe what problem this solves and the cost of inaction.",
  },
  {
    category: "authority_gap",
    label: "Missing Decision Maker",
    severity: "medium",
    regex: /\b(not my decision|someone else handles|have to check with procurement|don('t| not) have purchasing power|above my pay grade)\b/i,
    coachingAdvice: "Ask: 'Who else will weigh in on this decision, and how can we build the business case together for them?'",
  },
  {
    category: "competitor_threat",
    label: "Active Competitor Evaluation",
    severity: "medium",
    regex: /\b(looking at (gong|chorus|clari|zoominfo|apollo|salesforce)|evaluating another vendor|talking to a competitor)\b/i,
    coachingAdvice: "Do not badmouth competitors; highlight SalesHunter's real-time in-call live coaching vs post-call recording tools.",
  },
  {
    category: "timeline_slip",
    label: "Timeline Stalled / Postponed",
    severity: "high",
    regex: /\b(check back next quarter|revisit in (6|six) months|pushed (it|this) back|not a priority right now|table this for now)\b/i,
    coachingAdvice: "Identify the blocker: 'What needs to happen between now and next quarter for this to become a priority?'",
  },
  {
    category: "inertia",
    label: "Status Quo Inertia",
    regex: /\b(happy with (what we have|our current)|doing this manually|build it in[- ]house|good enough for now)\b/i,
    severity: "low",
    coachingAdvice: "Uncover hidden friction: 'What takes your team the most time when doing this the manual way?'",
  },
];

/**
 * Scan dialogue for buying signals and deal risks.
 */
export function analyzeDealSignals(
  text: string,
  timestampMs: number = Date.now()
): { signals: DealSignal[]; risks: DealRisk[] } {
  if (!text || typeof text !== "string") {
    return { signals: [], risks: [] };
  }

  const signals: DealSignal[] = [];
  const risks: DealRisk[] = [];

  for (const pattern of BUYING_SIGNAL_PATTERNS) {
    const match = pattern.regex.exec(text);
    if (match) {
      signals.push({
        id: `sig_${pattern.category}_${timestampMs}_${Math.random().toString(36).slice(2, 6)}`,
        category: pattern.category,
        label: pattern.label,
        matchedPhrase: match[0],
        timestampMs,
        confidence: 0.9,
      });
    }
  }

  for (const pattern of DEAL_RISK_PATTERNS) {
    const match = pattern.regex.exec(text);
    if (match) {
      risks.push({
        id: `risk_${pattern.category}_${timestampMs}_${Math.random().toString(36).slice(2, 6)}`,
        category: pattern.category,
        label: pattern.label,
        severity: pattern.severity,
        matchedPhrase: match[0],
        timestampMs,
        coachingAdvice: pattern.coachingAdvice,
      });
    }
  }

  return { signals, risks };
}

/**
 * Calculate overall deal health score from 0 to 100 based on accumulated signals and risks.
 */
export function calculateDealHealth(signals: DealSignal[], risks: DealRisk[]): DealHealthReport {
  let score = 55; // Baseline neutral health

  for (const _sig of signals) {
    score += 10;
  }

  for (const risk of risks) {
    if (risk.severity === "high") score -= 18;
    else if (risk.severity === "medium") score -= 12;
    else score -= 6;
  }

  // Clamp 5 to 98
  score = Math.max(5, Math.min(98, score));

  let momentum: DealHealthReport["momentum"] = "neutral";
  if (score >= 70) momentum = "positive";
  else if (score <= 45) momentum = "at_risk";

  return {
    healthScore: score,
    momentum,
    buyingSignals: signals,
    risks,
  };
}
