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
    title: "Too Expensive / No Budget",
    triggerPhrases: ["too expensive", "no budget", "cost is too high", "can't afford", "out of budget", "spend freeze"],
    rebuttalScript:
      "I hear you on budget discipline. When customers tell us that, it's usually because the cost of losing deals to missed objections dwarfs the subscription in week one.",
    followUpQuestion:
      "If this helped your reps win just one additional deal this quarter, how does that compare to the $49/mo investment?",
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
    triggerPhrases: ["we use gong", "we already have chorus", "using gong", "using clari", "have another tool"],
    rebuttalScript:
      "Gong and Chorus are great recording archives for managers to review on Friday after the deal is already lost. SalesHunter Coach is the in-ear co-pilot whispering live objection handling to the rep while they are speaking.",
    followUpQuestion:
      "How often do your reps review past 45-minute call recordings before their next call?",
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
    triggerPhrases: ["send me an email", "check back next quarter", "revisit in 6 months", "busy right now", "ping me later"],
    rebuttalScript:
      "I can definitely send over a summary email. Usually when folks ask for an email, it's a polite way of saying this doesn't feel urgent or I didn't clearly address your immediate bottleneck.",
    followUpQuestion:
      "Be candid with me — what is the single biggest priority occupying your calendar right now?",
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
    triggerPhrases: ["talk to my boss", "need my team's input", "executive committee", "not my decision", "run it by leadership"],
    rebuttalScript:
      "That makes total sense. Buying software alone without internal alignment is impossible.",
    followUpQuestion:
      "What is the one metric or proof point your VP will scrutinize first when you bring this up?",
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
    triggerPhrases: ["build in-house", "our own engineers", "internal tools", "doing it ourselves", "custom internal"],
    rebuttalScript:
      "Your engineering talent is best spent on your core product, not maintaining real-time audio drivers, Whisper STT relays, and LLM prompt pipelines.",
    followUpQuestion:
      "How many engineering sprints would your team need to dedicate to match our 50ms latency engine?",
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
    triggerPhrases: ["not a priority", "table this", "plate is full", "focused elsewhere", "next year"],
    rebuttalScript:
      "Understood. When revenue growth is a priority, closing pipeline faster is always top of mind.",
    followUpQuestion:
      "What happens to your Q4 revenue targets if deal cycle times stay where they are?",
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
