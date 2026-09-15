import { useMemo } from "react";
import { AlertTriangle, TrendingUp, ShieldCheck, Zap } from "lucide-react";
import { evaluateLiveDealRisk } from "../../lib/sales/liveDealRisk";
import { useStore } from "../../lib/store";

export function DealRiskHud() {
  const segments = useStore((s) => s.segments);

  const report = useMemo(() => evaluateLiveDealRisk(segments), [segments]);
  const { buyingSignals: signals, risks, healthScore, momentum, qualification, talkTimeAlert } = report;

  if (signals.length === 0 && risks.length === 0 && talkTimeAlert === null) {
    return (
      <div className="border-b border-border/40 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="size-3.5 text-sky-400" />
            <span className="font-medium text-foreground">Deal Radar Active</span>
            <span className="text-[11px] opacity-70">— Listening for buying signals &amp; deal risks...</span>
          </div>
          <div className="flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            {healthScore}% Baseline
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5" aria-label="MEDDIC qualification status">
          {qualification.map((criterion) => (
            <span
              key={criterion.key}
              className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                criterion.badgeTone === "green"
                  ? "border-emerald-800/40 bg-emerald-950/30 text-emerald-300"
                  : "border-red-900/40 bg-red-950/20 text-red-300"
              }`}
            >
              {criterion.key}: {criterion.status}
            </span>
          ))}
        </div>
      </div>
    );
  }

  const badgeColor =
    momentum === "positive"
      ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/40"
      : momentum === "at_risk"
      ? "text-amber-400 bg-amber-950/40 border-amber-800/40"
      : "text-sky-400 bg-sky-950/40 border-sky-800/40";

  return (
    <div className="border-b border-border/60 bg-background/80 px-3 py-2 text-xs backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeColor}`}>
            {momentum === "positive" ? <TrendingUp className="size-3" /> : <AlertTriangle className="size-3" />}
            Deal Health: {healthScore}% ({momentum.replace("_", " ").toUpperCase()})
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

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5" aria-label="MEDDIC qualification status">
        {qualification.map((criterion) => (
          <span
            key={criterion.key}
            className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
              criterion.badgeTone === "green"
                ? "border-emerald-800/40 bg-emerald-950/30 text-emerald-300"
                : "border-red-900/40 bg-red-950/20 text-red-300"
            }`}
          >
            {criterion.key}: {criterion.status}
          </span>
        ))}
      </div>

      {talkTimeAlert && (
        <div className="mt-1.5 rounded border border-red-900/40 bg-red-950/30 px-2 py-1 text-[11px] text-red-200" role="alert">
          <span className="font-semibold text-red-300">Talk-time alert:</span>{" "}
          You have spoken {Math.round(talkTimeAlert.ratio * 100)}% for {Math.round(talkTimeAlert.sustainedMs / 1000)}s.
        </div>
      )}

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
