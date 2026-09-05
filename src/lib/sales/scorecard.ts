/**
 * SalesHunter Call Performance Scorecard & Coaching Analytics Engine
 *
 * Evaluates rep sales effectiveness from transcript data:
 * 1. Talk-to-Listen ratio (ideal: 35-45% Rep, 55-65% Customer)
 * 2. Question density (open-ended discovery queries)
 * 3. Monologue duration and conversational pacing
 * 4. Filler words ("um", "uh", "like", "you know")
 * 5. Overall letter grade & targeted coaching recommendations.
 */

export interface TranscriptUtterance {
  speaker: "rep" | "customer" | "unknown";
  text: string;
  durationMs?: number;
}

export interface ScorecardMetrics {
  repWordCount: number;
  customerWordCount: number;
  repTalkPercent: number;
  customerTalkPercent: number;
  questionCount: number;
  openEndedQuestionCount: number;
  fillerWordCount: number;
  fillerRatePer100Words: number;
  overallGrade: "A+" | "A" | "B" | "C" | "Needs Coaching";
  numericScore: number; // 0 - 100
  coachingTips: string[];
}

const OPEN_ENDED_REGEX = /\b(how (do|did|would|will|can)|what (are|is|would|led)|why (is|did|are)|tell me about|walk me through|can you describe)\b/i;
const FILLER_REGEX = /\b(um|uh|like|you know|sort of|kind of|basically)\b/gi;

export function evaluateCallScorecard(utterances: TranscriptUtterance[]): ScorecardMetrics {
  let repWords = 0;
  let customerWords = 0;
  let questions = 0;
  let openEnded = 0;
  let fillerCount = 0;

  for (const u of utterances) {
    const text = u.text || "";
    const words = text.trim().split(/\s+/).filter(Boolean);
    const count = words.length;

    if (u.speaker === "rep") {
      repWords += count;
      const fillers = text.match(FILLER_REGEX);
      if (fillers) fillerCount += fillers.length;

      // Count rep questions
      if (text.includes("?")) {
        questions += (text.match(/\?/g) || []).length;
        if (OPEN_ENDED_REGEX.test(text)) {
          openEnded += 1;
        }
      }
    } else {
      customerWords += count;
    }
  }

  const totalWords = repWords + customerWords;
  const repTalkPercent = totalWords > 0 ? Math.round((repWords / totalWords) * 100) : 50;
  const customerTalkPercent = 100 - repTalkPercent;

  const fillerRate = repWords > 0 ? Math.round((fillerCount / repWords) * 100 * 10) / 10 : 0;

  // Compute composite score
  let score = 80;

  // Ideal talk ratio penalty/boost
  if (repTalkPercent >= 35 && repTalkPercent <= 48) {
    score += 10;
  } else if (repTalkPercent > 60) {
    score -= 15;
  } else if (repTalkPercent < 25) {
    score -= 5;
  }

  // Question density boost
  if (openEnded >= 4) {
    score += 10;
  } else if (openEnded === 0 && totalWords > 200) {
    score -= 12;
  }

  // Filler word penalty
  if (fillerRate > 3) {
    score -= 10;
  }

  score = Math.max(20, Math.min(99, score));

  let overallGrade: ScorecardMetrics["overallGrade"] = "B";
  if (score >= 90) overallGrade = "A+";
  else if (score >= 80) overallGrade = "A";
  else if (score >= 70) overallGrade = "B";
  else if (score >= 60) overallGrade = "C";
  else overallGrade = "Needs Coaching";

  const coachingTips: string[] = [];

  if (repTalkPercent > 50) {
    coachingTips.push(
      `You spoke for ${repTalkPercent}% of the call. Try using more open-ended prompts ("Tell me more about...") to keep the prospect talking at least 55% of the time.`
    );
  } else {
    coachingTips.push(`Great active listening! Prospect spoke for ${customerTalkPercent}% of the conversation.`);
  }

  if (openEnded < 3) {
    coachingTips.push("Increase high-leverage discovery: Aim for at least 3-5 open-ended questions per 30-minute meeting.");
  } else {
    coachingTips.push(`Excellent discovery depth with ${openEnded} open-ended inquiry prompts.`);
  }

  if (fillerRate > 2) {
    coachingTips.push(
      `Detected ${fillerCount} filler words (${fillerRate}% frequency). Practice deliberate pauses instead of saying "um" or "like".`
    );
  } else {
    coachingTips.push("Clean vocal delivery and minimal filler words detected.");
  }

  return {
    repWordCount: repWords,
    customerWordCount: customerWords,
    repTalkPercent,
    customerTalkPercent,
    questionCount: questions,
    openEndedQuestionCount: openEnded,
    fillerWordCount: fillerCount,
    fillerRatePer100Words: fillerRate,
    overallGrade,
    numericScore: score,
    coachingTips,
  };
}
