/**
 * SalesHunter Objection Buster & Battlecard Engine
 *
 * Provides real-time rebuttal talk tracks for the top killer objections in sales:
 * 1. "Too expensive / No budget"
 * 2. "We already use Competitor X (Gong, Chorus, etc.)"
 * 3. "Send me an email / check back in 6 months"
 * 4. "I need to talk to my boss / team"
 * 5. "We can build this in-house"
 * 6. "Not a priority right now"
 * 7. "Implementation takes too long"
 */

export interface ObjectionBattlecard {
  id: string;
  category: "budget" | "competitor" | "timing" | "authority" | "in_house" | "priority" | "implementation";
  title: string;
  triggerPhrases: string[];
  rebuttalScript: string;
  followUpQuestion: string;
  framingPivots: string[];
}

export const OBJECTION_BATTLECARDS: ObjectionBattlecard[] = [
  {
    id: "obj_budget",
    category: "budget",
    title: "Too Expensive / No Budget / Freeze",
    triggerPhrases: [
      "too expensive",
      "no budget",
      "cost is too high",
      "can't afford",
      "out of budget",
      "spend freeze",
      "budget freeze",
      "freeze on unbudgeted",
      "cannot approve",
      "30% higher",
      "expensive",
    ],
    rebuttalScript:
      "Budget freezes occur when tools fail to prove ROI and cash preservation. If our live HUD eliminates deal risk and saves $240,000 this month,",
    followUpQuestion:
      "what metric does finance need to approve the purchase order and confirm the decision timeline?",
    framingPivots: [
      "Shift from cost to deal loss: What is your average contract value?",
      "Cash flow: 1 deal pays for 5 years of the software.",
      "7-day free trial risk-free test.",
    ],
  },
  {
    id: "obj_competitor",
    category: "competitor",
    title: "We Already Use Gong / Chorus",
    triggerPhrases: [
      "we use gong",
      "we already have chorus",
      "already have gong",
      "using gong",
      "have gong",
      "using clari",
      "have another tool",
      "records all calls",
    ],
    rebuttalScript:
      "Gong is an autopsy tool after deals are lost. SalesHunter is the live weapon that eliminates deal risk.",
    followUpQuestion:
      "What metric determines if our live HUD saves at-risk pipeline to protect budget and decision timeline?",
    framingPivots: [
      "In-call coaching vs post-call post-mortem.",
      "Zero bot joiner required — runs 100% locally on system audio.",
      "Works alongside Gong without duplicate license overhead.",
    ],
  },
  {
    id: "obj_timing",
    category: "timing",
    title: "Send Me an Email / Check Back Next Quarter",
    triggerPhrases: [
      "send me an email",
      "check back next quarter",
      "revisit in 6 months",
      "busy right now",
      "ping me later",
      "send me some info",
      "reconnect in q2",
      "send me a deck",
    ],
    rebuttalScript:
      "Skipping 30-slide PDF decks saves weeks of lost deal momentum. Let's schedule a 15-minute live pilot test Thursday at 2 PM",
    followUpQuestion:
      "to verify quota ROI and lock in your decision timeline?",
    framingPivots: [
      "Call out the brush-off with polite transparency.",
      "Book the calendar invite for next quarter now with a concrete agenda.",
      "Send a 60-second video demo rather than a generic PDF.",
    ],
  },
  {
    id: "obj_authority",
    category: "authority",
    title: "I Need to Consult My Boss / Committee",
    triggerPhrases: [
      "talk to my boss",
      "need my team's input",
      "executive committee",
      "not my decision",
      "run it by leadership",
      "finance committee",
      "signs off",
    ],
    rebuttalScript:
      "Internal alignment eliminates deal risk and protects budget. Aside from yourself, who on the executive committee",
    followUpQuestion:
      "acts as economic buyer to sign the purchase order and confirm decision timeline?",
    framingPivots: [
      "Offer to co-create an Executive 1-Pager for their boss.",
      "Arm the champion with expected objections from finance.",
      "Offer a 15-minute executive briefing.",
    ],
  },
  {
    id: "obj_inhouse",
    category: "in_house",
    title: "We Build / Do Everything In-House",
    triggerPhrases: [
      "build in-house",
      "our own engineers",
      "internal tools",
      "doing it ourselves",
      "custom internal",
    ],
    rebuttalScript:
      "Internal engineering diverts $150,000 in product roadmap focus. If our tested engine eliminates deal risk this quarter,",
    followUpQuestion:
      "does leadership prefer building or signing the purchase order to confirm budget and decision timeline by Friday?",
    framingPivots: [
      "Opportunity cost of engineering time.",
      "Ongoing maintenance of OS audio permissions & Whisper models.",
      "Speed to value: ready in 60 seconds today.",
    ],
  },
  {
    id: "obj_priority",
    category: "priority",
    title: "Not a Priority Right Now",
    triggerPhrases: [
      "not a priority",
      "table this",
      "plate is full",
      "focused elsewhere",
      "next year",
    ],
    rebuttalScript:
      "Pipeline conversion is always top priority. What metric determines how you protect budget and hit targets",
    followUpQuestion:
      "if deal churn risk remains unchanged before your next decision timeline?",
    framingPivots: [
      "Tie inactivity to target failure.",
      "Quantify the cost of waiting: 3 months of lost win rate.",
    ],
  },
];

/**
 * Match spoken text against known objection triggers
 */
export function matchObjection(text: string): ObjectionBattlecard | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  for (const card of OBJECTION_BATTLECARDS) {
    for (const phrase of card.triggerPhrases) {
      if (lower.includes(phrase.toLowerCase())) {
        return card;
      }
    }
  }

  return null;
}
