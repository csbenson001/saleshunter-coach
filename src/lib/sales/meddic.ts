/**
 * SalesHunter Live MEDDIC & BANT Qualification Engine
 *
 * Tracks sales methodology criteria during live calls:
 * - M: Metrics
 * - E: Economic Buyer
 * - D: Decision Criteria
 * - D: Decision Process
 * - I: Identify Pain
 * - C: Champion
 */

export interface MeddicItem {
  key: "M" | "E" | "DC" | "DP" | "I" | "C";
  name: string;
  shortDesc: string;
  detected: boolean;
  evidenceQuote?: string;
  detectionKeywords: RegExp;
}

export const INITIAL_MEDDIC_CRITERIA: MeddicItem[] = [
  {
    key: "M",
    name: "Metrics",
    shortDesc: "Quantified pain & expected ROI",
    detected: false,
    detectionKeywords: /\b(\d+%\s*(increase|decrease|growth|reduction)|save\s*\$?\d+|roi|cost savings|hours per week|revenue target|kpi)\b/i,
  },
  {
    key: "E",
    name: "Economic Buyer",
    shortDesc: "Budget owner with discretionary veto",
    detected: false,
    detectionKeywords: /\b(cfo|cro|ceo|budget owner|sign[- ]off|discretionary budget|purchasing authority|board approval)\b/i,
  },
  {
    key: "DC",
    name: "Decision Criteria",
    shortDesc: "Technical, security & commercial rules",
    detected: false,
    detectionKeywords: /\b(evaluation criteria|must[- ]have features|soc[- ]?2|vendor requirements|sla requirements|integration capability)\b/i,
  },
  {
    key: "DP",
    name: "Decision Process",
    shortDesc: "Step-by-step path from evaluation to contract",
    detected: false,
    detectionKeywords: /\b(procurement process|legal review|security review|msa|steps to sign|timeline to purchase|vendor onboarding)\b/i,
  },
  {
    key: "I",
    name: "Identify Pain",
    shortDesc: "Core business problem & cost of inaction",
    detected: false,
    detectionKeywords: /\b(biggest challenge|bottleneck|costing us|struggling with|pain point|failing to|losing deals because)\b/i,
  },
  {
    key: "C",
    name: "Champion",
    shortDesc: "Internal advocate with power and interest",
    detected: false,
    detectionKeywords: /\b(i('ll| will) advocate for|show this to my team|love this product|internal sponsor|excited to bring this in)\b/i,
  },
];

/**
 * Scan a transcript segment to automatically verify MEDDIC criteria
 */
export function evaluateMeddicProgress(
  transcriptText: string,
  currentCriteria: MeddicItem[] = INITIAL_MEDDIC_CRITERIA
): { updated: MeddicItem[]; scorePercent: number } {
  if (!transcriptText) {
    return {
      updated: currentCriteria,
      scorePercent: 0,
    };
  }

  const updated = currentCriteria.map((item) => {
    if (item.detected) return item;

    const match = item.detectionKeywords.exec(transcriptText);
    if (match) {
      return {
        ...item,
        detected: true,
        evidenceQuote: match[0],
      };
    }
    return item;
  });

  const completedCount = updated.filter((i) => i.detected).length;
  const scorePercent = Math.round((completedCount / updated.length) * 100);

  return { updated, scorePercent };
}
