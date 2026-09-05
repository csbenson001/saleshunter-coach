import { useState, useMemo } from "react";
import { ShieldAlert, Copy, Check, ChevronRight, Sparkles } from "lucide-react";
import { OBJECTION_BATTLECARDS, matchObjection, type ObjectionBattlecard } from "../../lib/sales/objectionBuster";
import { useStore } from "../../lib/store";
import type { TranscriptSegment } from "../../lib/types";
import { Button } from "@/components/ui/button";

export function ObjectionDrawer() {
  const segments = useStore((s) => s.segments);
  const [selectedCard, setSelectedCard] = useState<ObjectionBattlecard>(OBJECTION_BATTLECARDS[0]);
  const [copied, setCopied] = useState(false);

  // Auto-suggest battlecard based on recent speech
  const detectedCard = useMemo(() => {
    const recent = (segments || []).slice(-4).map((u: TranscriptSegment) => u.text || "").join(" ");
    return matchObjection(recent);
  }, [segments]);

  const activeCard = detectedCard || selectedCard;

  const copyRebuttal = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card/60 p-3 text-xs backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <ShieldAlert className="size-4 text-sky-400" />
          <span>Objection Buster &amp; Battlecards</span>
        </div>
        {detectedCard && (
          <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300 animate-pulse">
            <Sparkles className="size-3" />
            Detected in call!
          </span>
        )}
      </div>

      {/* Pill selector for quick categories */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {OBJECTION_BATTLECARDS.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => setSelectedCard(card)}
            className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
              activeCard.id === card.id
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
            }`}
          >
            {card.title}
          </button>
        ))}
      </div>

      {/* Active Battlecard Card */}
      <div className="mt-3 rounded-md border border-border/40 bg-background/60 p-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sky-400 text-[12px]">{activeCard.title}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => copyRebuttal(activeCard.rebuttalScript)}
            className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
            {copied ? "Copied" : "Copy Rebuttal"}
          </Button>
        </div>

        <div className="mt-2 rounded bg-muted/30 p-2 text-foreground font-medium leading-relaxed">
          "{activeCard.rebuttalScript}"
        </div>

        <div className="mt-2.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Follow-Up Question:</span>
          <div className="mt-0.5 text-sky-300 font-medium">
            "{activeCard.followUpQuestion}"
          </div>
        </div>

        <div className="mt-2.5 border-t border-border/30 pt-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Framing Pivots:</span>
          <ul className="mt-1 space-y-1">
            {activeCard.framingPivots.map((p, idx) => (
              <li key={idx} className="flex items-start gap-1 text-[11px] text-muted-foreground">
                <ChevronRight className="size-3 shrink-0 text-sky-400 mt-0.5" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
