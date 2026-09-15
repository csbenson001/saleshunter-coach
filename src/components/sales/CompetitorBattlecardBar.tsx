import { useMemo } from "react";
import { Swords } from "lucide-react";
import { useStore } from "../../lib/store";
import type { TranscriptSegment } from "../../lib/types";
import { matchCompetitiveKillCard } from "../../lib/sales/competitiveBattlecards";

export function CompetitorBattlecardBar() {
  const segments = useStore((s) => s.segments);

  const matchedCompetitor = useMemo(() => {
    const text = (segments || []).slice(-5).map((s: TranscriptSegment) => s.text || "").join(" ");
    return matchCompetitiveKillCard(text);
  }, [segments]);

  if (!matchedCompetitor) return null;

  return (
    <div className="border-b border-sky-500/40 bg-sky-950/40 p-2.5 text-xs backdrop-blur-md animate-in slide-in-from-top">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-sky-300">
          <Swords className="size-4 text-sky-400" />
          <span>{matchedCompetitor.trigger}</span>
        </div>
      </div>
      <div className="mt-1.5 flex items-start gap-1 text-[11px] text-slate-200">
        <span>{matchedCompetitor.trap}</span>
      </div>
      <div className="mt-1 text-[11px] text-slate-100">
        {matchedCompetitor.counterStrike}
      </div>
      <div className="mt-1 text-[11px] text-amber-300">
        {matchedCompetitor.pivotQuestion}
      </div>
    </div>
  );
}
