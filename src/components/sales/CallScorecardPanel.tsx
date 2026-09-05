import { useMemo } from "react";
import { Award, MessageSquare, Mic, AlertCircle, CheckCircle2 } from "lucide-react";
import { evaluateCallScorecard, type TranscriptUtterance } from "../../lib/sales/scorecard";

export interface CallScorecardPanelProps {
  utterances: TranscriptUtterance[];
}

export function CallScorecardPanel({ utterances }: CallScorecardPanelProps) {
  const scorecard = useMemo(() => {
    return evaluateCallScorecard(utterances);
  }, [utterances]);

  const gradeBadgeColor =
    scorecard.overallGrade.startsWith("A")
      ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-400"
      : scorecard.overallGrade === "B"
      ? "bg-sky-950/60 border-sky-500/50 text-sky-400"
      : "bg-amber-950/60 border-amber-500/50 text-amber-400";

  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-4 text-xs backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <Award className="size-4 text-sky-400" />
          <h3 className="font-semibold text-foreground text-sm">Call Coaching Scorecard</h3>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-bold ${gradeBadgeColor}`}>
          <span>Grade: {scorecard.overallGrade}</span>
          <span className="opacity-70 font-mono text-[11px]">({scorecard.numericScore}/100)</span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {/* Talk vs Listen */}
        <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Mic className="size-3 text-sky-400" />
            <span>Talk vs. Listen</span>
          </div>
          <div className="mt-1 text-base font-bold text-foreground font-mono">
            {scorecard.repTalkPercent}% <span className="text-[11px] font-normal text-muted-foreground">Rep</span> / {scorecard.customerTalkPercent}% <span className="text-[11px] font-normal text-muted-foreground">Prospect</span>
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden flex">
            <div
              style={{ width: `${scorecard.repTalkPercent}%` }}
              className={`h-full ${scorecard.repTalkPercent <= 50 ? "bg-emerald-500" : "bg-amber-500"}`}
            />
            <div
              style={{ width: `${scorecard.customerTalkPercent}%` }}
              className="h-full bg-cyan-400"
            />
          </div>
        </div>

        {/* Discovery Questions */}
        <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <MessageSquare className="size-3 text-cyan-400" />
            <span>Discovery Questions</span>
          </div>
          <div className="mt-1 text-base font-bold text-foreground font-mono">
            {scorecard.questionCount} <span className="text-[11px] font-normal text-cyan-400">({scorecard.openEndedQuestionCount} open-ended)</span>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground truncate">
            {scorecard.openEndedQuestionCount >= 3 ? "Optimal discovery depth" : "Needs more open discovery"}
          </div>
        </div>

        {/* Filler Word Pacing */}
        <div className="rounded-lg border border-border/40 bg-background/50 p-2.5">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <AlertCircle className="size-3 text-amber-400" />
            <span>Pacing &amp; Fillers</span>
          </div>
          <div className="mt-1 text-base font-bold text-foreground font-mono">
            {scorecard.fillerWordCount} <span className="text-[11px] font-normal text-muted-foreground">words ({scorecard.fillerRatePer100Words}%)</span>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground truncate">
            {scorecard.fillerRatePer100Words <= 2 ? "Clean vocal cadence" : "Aim for deliberate pauses"}
          </div>
        </div>
      </div>

      {/* Coaching Tips */}
      <div className="mt-3 rounded-lg border border-border/40 bg-muted/20 p-3">
        <span className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">
          Coaching Recommendations for Next Meeting:
        </span>
        <ul className="mt-1.5 space-y-1">
          {scorecard.coachingTips.map((tip, idx) => (
            <li key={idx} className="flex items-start gap-1.5 text-[11px] text-foreground/90">
              <CheckCircle2 className="size-3.5 shrink-0 text-sky-400 mt-0.5" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
