import { useMemo, useState } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Layers } from "lucide-react";
import { evaluateMeddicProgress, INITIAL_MEDDIC_CRITERIA, type MeddicItem } from "../../lib/sales/meddic";
import { useStore } from "../../lib/store";
import type { TranscriptSegment } from "../../lib/types";

export function MeddicMatrix() {
  const segments = useStore((s) => s.segments);
  const [expanded, setExpanded] = useState(false);
  const [manualOverrides, setManualOverrides] = useState<Record<string, boolean>>({});

  const { items, score } = useMemo(() => {
    const fullText = (segments || []).map((u: TranscriptSegment) => u.text || "").join(" ");
    const { updated } = evaluateMeddicProgress(fullText, INITIAL_MEDDIC_CRITERIA);
    
    // Apply manual toggles if any
    const finalItems = updated.map((item) => ({
      ...item,
      detected: manualOverrides[item.key] !== undefined ? manualOverrides[item.key] : item.detected,
    }));

    const finalScore = Math.round(
      (finalItems.filter((i) => i.detected).length / finalItems.length) * 100
    );

    return { items: finalItems, score: finalScore };
  }, [segments, manualOverrides]);

  const toggleItem = (key: MeddicItem["key"]) => {
    setManualOverrides((prev) => ({
      ...prev,
      [key]: !items.find((i) => i.key === key)?.detected,
    }));
  };

  return (
    <div className="border-b border-border/40 bg-card/20 px-3 py-2 text-xs">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setExpanded(!expanded)}
        className="flex cursor-pointer items-center justify-between hover:opacity-80"
      >
        <div className="flex items-center gap-1.5">
          <Layers className="size-3.5 text-cyan-400" />
          <span className="font-semibold text-foreground">MEDDIC Qualification:</span>
          <span className="font-mono text-cyan-400 font-bold">{score}% Qualified</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <span>{expanded ? "Hide Details" : "Show Checklist"}</span>
          {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </div>
      </div>

      {expanded && (
        <div className="mt-2.5 grid grid-cols-2 gap-2 pt-2 border-t border-border/30">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleItem(item.key)}
              className={`flex items-start gap-2 rounded border p-2 text-left transition-colors ${
                item.detected
                  ? "border-cyan-800/40 bg-cyan-950/20 text-cyan-200"
                  : "border-border/30 bg-muted/10 text-muted-foreground hover:bg-muted/20"
              }`}
            >
              {item.detected ? (
                <CheckCircle2 className="size-3.5 shrink-0 text-cyan-400 mt-0.5" />
              ) : (
                <Circle className="size-3.5 shrink-0 text-muted-foreground/60 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold flex items-center justify-between text-[11px]">
                  <span>[{item.key}] {item.name}</span>
                  {item.detected && <span className="text-[9px] uppercase tracking-wider text-cyan-400">Verified</span>}
                </div>
                <div className="text-[10px] opacity-75 truncate">{item.shortDesc}</div>
                {item.evidenceQuote && (
                  <div className="mt-1 text-[9px] italic text-cyan-300/80 line-clamp-1">
                    "{item.evidenceQuote}"
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
