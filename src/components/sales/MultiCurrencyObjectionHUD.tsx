import { useState } from "react";
import { Globe, Copy, Check, DollarSign } from "lucide-react";
import {
  type MultiCurrencyObjectionCard,
  MULTI_CURRENCY_OBJECTION_CARDS,
} from "@/lib/sales/multiCurrencyObjection";

interface MultiCurrencyObjectionHUDProps {
  card?: MultiCurrencyObjectionCard;
  onDismiss?: () => void;
}

export function MultiCurrencyObjectionHUD({
  card = MULTI_CURRENCY_OBJECTION_CARDS[0],
  onDismiss,
}: MultiCurrencyObjectionHUDProps) {
  const [copied, setCopied] = useState(false);
  const [selectedTradeIndex, setSelectedTradeIndex] = useState(0);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-sky-950/40 border border-sky-500/50 rounded-xl p-4 shadow-xl backdrop-blur-md text-slate-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* HUD Header Banner */}
      <div className="flex items-center justify-between pb-2 border-b border-sky-500/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/40">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-sky-300 font-mono tracking-wider uppercase">
                MULTI-CURRENCY OBJECTION RADAR
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                +$8,500 ARR IMPACT · 50x ROI
              </span>
            </div>
            <p className="text-[11px] text-sky-200/80 font-medium">{card.repWarning}</p>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-slate-400 hover:text-white text-xs cursor-pointer p-1"
            title="Dismiss radar"
          >
            ✕
          </button>
        )}
      </div>

      {/* Give-to-Get Trade Asks */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
          <DollarSign className="w-3 h-3 text-emerald-400" />
          Mandatory Trade Requirements (Lock 1 Before Agreeing to Local Currency):
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {card.recommendedTrades.map((trade, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedTradeIndex(idx)}
              className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                selectedTradeIndex === idx
                  ? "bg-sky-900/40 border-sky-400 text-white shadow-xs"
                  : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <div className="font-semibold text-sky-300 mb-0.5">{trade.label}</div>
              <p className="text-[11px] text-slate-300 leading-tight mb-1">{trade.tradeAsk}</p>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                {trade.commercialValue}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Instant Rep Counterpunch Speech Script */}
      <div className="bg-slate-950 p-3 rounded-lg border border-sky-500/30 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono text-sky-400 font-bold uppercase mb-1">
            Say This to Neutralize FX Objection (&lt;3s Glance &amp; Speak):
          </div>
          <p className="text-xs text-slate-200 italic font-sans leading-relaxed">
            &ldquo;{card.rebuttalScript} {card.followUpQuestion}&rdquo;
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleCopy(`${card.rebuttalScript} ${card.followUpQuestion}`)}
          className="p-1.5 rounded-md bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 shrink-0 transition cursor-pointer"
          title="Copy counterpunch to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
