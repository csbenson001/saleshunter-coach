import { useEffect, useMemo, useRef, useState } from "react";
import { ShieldAlert, X } from "lucide-react";
import { useStore } from "../../lib/store";
import { log } from "../../lib/log";
import {
  findLiveConcessionCue,
  findLiveObjectionCue,
  playSoundboardCue,
} from "../../lib/sales/soundboard";
import { ConcessionTradeHUD } from "./ConcessionTradeHUD";

export function LiveConcessionBar() {
  const segments = useStore((s) => s.segments);
  const [dismissedCueKey, setDismissedCueKey] = useState<string | null>(null);
  const playedCueKey = useRef<string | null>(null);

  const activeCue = useMemo(() => {
    const concession = findLiveConcessionCue(segments);
    if (concession) return { kind: "concession" as const, ...concession };
    const objection = findLiveObjectionCue(segments);
    return objection ? { kind: "objection" as const, ...objection } : null;
  }, [segments]);

  useEffect(() => {
    if (!activeCue || playedCueKey.current === activeCue.key) return;
    playedCueKey.current = activeCue.key;
    void playSoundboardCue()
      .then((receipt) => {
        if (receipt) {
          log.info(`soundboard: ${activeCue.kind} cue scheduled`, {
            cueKey: activeCue.key,
            startupLatencyMs: Math.round(receipt.startupLatencyMs),
            withinBudget: receipt.withinBudget,
          });
        }
      })
      .catch((error) =>
        log.warn("soundboard: concession cue unavailable", { error: String(error) }),
      );
  }, [activeCue]);

  if (!activeCue || activeCue.key === dismissedCueKey) return null;

  if (activeCue.kind === "objection") {
    return (
      <div
        data-testid="live-objection-counterpunch"
        className="flex items-center gap-3 border-b border-sky-500/40 bg-sky-950/30 px-3 py-2 text-xs"
        role="status"
        aria-live="polite"
      >
        <ShieldAlert className="size-4 shrink-0 text-sky-400" />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
            Buyer objection: {activeCue.objection.title}
          </div>
          <p className="mt-0.5 font-medium leading-snug text-foreground">
            Say: &ldquo;{activeCue.objection.liveCounterpunch}&rdquo;
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-semibold text-emerald-400">
          Ready &lt;1.8s
        </span>
        <button
          type="button"
          aria-label="Dismiss objection counterpunch"
          onClick={() => setDismissedCueKey(activeCue.key)}
          className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid="live-concession-bar"
      className="border-b border-amber-500/40 bg-amber-950/20 px-3 py-2 backdrop-blur-md"
    >
      <div className="flex items-center justify-between pb-1.5 text-[11px] font-mono font-bold text-amber-400 uppercase">
        <span className="flex items-center gap-1">
          ⚡ Live Audio Loopback Trigger: Instant Concession Counterpunch
        </span>
        <span className="text-[10px] text-emerald-400 font-semibold">Latency: &lt;1.8s (SLA Met)</span>
      </div>
      <ConcessionTradeHUD
        concession={activeCue.concession}
        onDismiss={() => setDismissedCueKey(activeCue.key)}
      />
    </div>
  );
}
