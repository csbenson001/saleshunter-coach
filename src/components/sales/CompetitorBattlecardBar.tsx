import { useMemo } from "react";
import { Swords } from "lucide-react";
import { useStore } from "../../lib/store";
import type { TranscriptSegment } from "../../lib/types";

interface CompetitorIntel {
  name: string;
  triggerRegex: RegExp;
  differentiation: string;
  trapQuestion: string;
}

const COMPETITORS: CompetitorIntel[] = [
  {
    name: "Gong",
    triggerRegex: /\bgong\b/i,
    differentiation: "In-ear live whisper coaching during the call vs post-mortem archive on Friday after the deal is lost.",
    trapQuestion: "How does a recording review next week help your rep overcome the objection happening right now?",
  },
  {
    name: "Chorus",
    triggerRegex: /\bchorus\b/i,
    differentiation: "Zero bot-joiners required; runs 100% private and local on system audio with sub-50ms latency.",
    trapQuestion: "How often do your prospects complain about recorder bots joining executive calls?",
  },
  {
    name: "ZoomInfo / Apollo",
    triggerRegex: /\b(zoominfo|apollo)\b/i,
    differentiation: "They provide stale contact phone numbers; SalesHunter Coach is real-time conversational intelligence.",
    trapQuestion: "Once you have the phone number, how are you ensuring your reps actually qualify the deal properly?",
  },
  {
    name: "Clari",
    triggerRegex: /\bclari\b/i,
    differentiation: "Revenue forecasting relies on reps logging truthful CRM data; SalesHunter auto-enforces MEDDIC directly from call audio.",
    trapQuestion: "Are your reps accurately logging their MEDDIC criteria into Clari today without guessing?",
  },
];

export function CompetitorBattlecardBar() {
  const segments = useStore((s) => s.segments);

  const matchedCompetitor = useMemo(() => {
    const text = (segments || []).slice(-5).map((s: TranscriptSegment) => s.text || "").join(" ");
    return COMPETITORS.find((c) => c.triggerRegex.test(text));
  }, [segments]);

  if (!matchedCompetitor) return null;

  return (
    <div className="border-b border-sky-500/40 bg-sky-950/40 p-2.5 text-xs backdrop-blur-md animate-in slide-in-from-top">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-sky-300">
          <Swords className="size-4 text-sky-400" />
          <span>Competitor Mentioned: {matchedCompetitor.name} Battlecard</span>
        </div>
      </div>
      <div className="mt-1.5 flex items-start gap-1 text-[11px] text-slate-200">
        <span className="font-semibold text-sky-400 shrink-0">🎯 Our Advantage:</span>
        <span>{matchedCompetitor.differentiation}</span>
      </div>
      <div className="mt-1 flex items-start gap-1 text-[11px] text-amber-300">
        <span className="font-semibold text-amber-400 shrink-0">💣 Trap Question to Ask:</span>
        <span className="italic">"{matchedCompetitor.trapQuestion}"</span>
      </div>
    </div>
  );
}
