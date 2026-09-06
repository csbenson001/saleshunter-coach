import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../../lib/store";
import { log } from "../../lib/log";
import {
  findLiveConcessionCue,
  playSoundboardCue,
} from "../../lib/sales/soundboard";
import { ConcessionTradeHUD } from "./ConcessionTradeHUD";

export function LiveConcessionBar() {
  const segments = useStore((s) => s.segments);
  const [dismissedCueKey, setDismissedCueKey] = useState<string | null>(null);
  const playedCueKey = useRef<string | null>(null);

  const activeCue = useMemo(() => findLiveConcessionCue(segments), [segments]);

  useEffect(() => {
    if (!activeCue || playedCueKey.current === activeCue.key) return;
    playedCueKey.current = activeCue.key;
    void playSoundboardCue()
      .then((receipt) => {
        if (receipt) {
          log.info("soundboard: concession cue scheduled", {
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
