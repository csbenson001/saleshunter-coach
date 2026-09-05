import { useMemo } from "react";
import { AlertTriangle, TrendingUp, ShieldCheck, Zap } from "lucide-react";
import { analyzeDealSignals, calculateDealHealth } from "../../lib/sales/dealSignals";
import { useStore } from "../../lib/store";
import type { TranscriptSegment } from "../../lib/types";

export function DealRiskHud() {
  const segments = useStore((s) => s.segments);

  const { signals, risks, health } = useMemo(() => {
    const fullText = (segments || []).map((u: TranscriptSegment) => u.text || "").join(" ");
    const { signals: sList, risks: rList } = analyzeDealSignals(fullText);
    const h = calculateDealHealth(sList, rList);
    return { signals: sList, risks: rList, health: h };
  }, [segments]);

  if (signals.length === 0 && risks.length === 0) {
    return (
      <div className="flex items-center justify-between border-b border-border/40 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <Zap className="size-3.5 text-sky-400" />
          <span className="font-medium text-foreground">Deal Radar Active</span>
          <span className="text-[11px] opacity-70">— Listening for buying signals &amp; deal risks...</span>
        </div>
        <div className="flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          55% Baseline
        </div>
      </div>
    );
  }

  const badgeColor =
    health.momentum === "positive"
      ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/40"
      : health.momentum === "at_risk"
      ? "text-amber-400 bg-amber-950/40 border-amber-800/40"
      : "text-sky-400 bg-sky-950/40 border-sky-800/40";

  return (
    <div className="border-b border-border/60 bg-background/80 px-3 py-2 text-xs backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeColor}`}>
            {health.momentum === "positive" ? <TrendingUp className="size-3" /> : <AlertTriangle className="size-3" />}
            Deal Health: {health.healthScore}% ({health.momentum.replace("_", " ").toUpperCase()})
          </span>
          {signals.length > 0 && (
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="size-3" />
              {signals.length} Buying Signal{signals.length > 1 ? "s" : ""}
            </span>
          )}
          {risks.length > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <AlertTriangle className="size-3" />
              {risks.length} Risk{risks.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Top coaching insight if risk exists */}
      {risks.length > 0 && (
        <div className="mt-1.5 flex items-start gap-1.5 rounded border border-amber-900/30 bg-amber-950/20 px-2 py-1 text-[11px] text-amber-300">
          <span className="font-semibold text-amber-400 shrink-0">⚠️ Coaching Tip:</span>
          <span>{risks[risks.length - 1].coachingAdvice}</span>
        </div>
      )}
    </div>
  );
}
