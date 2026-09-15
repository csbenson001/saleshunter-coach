import { useState } from "react";
import { ArrowRightLeft, DollarSign, Copy, Check } from "lucide-react";
import type { ConcessionDemand } from "@/lib/sales/concessionMatrix";
import {
  CONCESSION_TRADE_OPTIONS,
  type ConcessionTradeOption,
} from "@/lib/sales/concessionVault";

interface ConcessionTradeHUDProps {
  concession: ConcessionDemand;
  onDismiss?: () => void;
  onTradeSelected?: (trade: ConcessionTradeOption) => void;
}

interface HudTrade {
  id: string;
  label: string;
  tradeAsk: string;
  commercialValue: string;
  canonical: ConcessionTradeOption | null;
}

function getHudTrades(concession: ConcessionDemand): HudTrade[] {
  const canonicalTrades = concession.tradeOptions ?? concession.recommendedTradeDemands
    .map((trade) => (
      trade.id
        ? CONCESSION_TRADE_OPTIONS.find((option) => option.id === trade.id) ?? null
        : null
    ))
    .filter((trade): trade is ConcessionTradeOption => trade !== null);

  if (canonicalTrades.length === 3) {
    return canonicalTrades.map((trade) => ({
      id: trade.id,
      label: trade.label,
      tradeAsk: `${trade.give} in exchange for ${trade.get}`,
      commercialValue: trade.get,
      canonical: trade,
    }));
  }

  return concession.recommendedTradeDemands.map((trade, index) => ({
    id: trade.id ?? `legacy_trade_${index}`,
    label: trade.label,
    tradeAsk: trade.tradeAsk,
    commercialValue: trade.commercialValue,
    canonical: trade.id
      ? CONCESSION_TRADE_OPTIONS.find((option) => option.id === trade.id) ?? null
      : null,
  }));
}

export function ConcessionTradeHUD({
  concession,
  onDismiss,
  onTradeSelected,
}: ConcessionTradeHUDProps) {
  const [copied, setCopied] = useState(false);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const hudTrades = getHudTrades(concession);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-4 shadow-xl backdrop-blur-md text-slate-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* HUD Header Banner */}
      <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-300 font-mono tracking-wider uppercase">
                GIVE-TO-GET CONCESSION RADAR
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                +$4,200 ACV LIFT
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                +$1,800 COMMISSION DEFENDED
              </span>
            </div>
            <p className="text-[11px] text-amber-200/80 font-medium">{concession.repWarning}</p>
          </div>
        </div>

        {onDismiss && (
          <button type="button" onClick={onDismiss} className="text-slate-400 hover:text-white text-xs">
            ✕
          </button>
        )}
      </div>

      {/* Give-to-Get Trade Asks */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
          <DollarSign className="w-3 h-3 text-emerald-400" />
          Mandatory Trade Requirements (Demand 1 Before Discounting):
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {hudTrades.map((trade) => (
            <button
              type="button"
              key={trade.id}
              data-testid="concession-trade-card"
              data-trade-id={trade.id}
              aria-pressed={selectedTradeId === trade.id}
              onClick={() => {
                setSelectedTradeId(trade.id);
                if (trade.canonical) onTradeSelected?.(trade.canonical);
              }}
              className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                selectedTradeId === trade.id
                  ? "bg-amber-900/30 border-amber-400 text-white shadow-xs"
                  : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <div className="font-semibold text-amber-300 mb-0.5">{trade.label}</div>
              <p className="text-[11px] text-slate-300 leading-tight mb-1">{trade.tradeAsk}</p>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">{trade.commercialValue}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Instant Rep Counterpunch Speech Script */}
      <div className="bg-slate-950 p-3 rounded-lg border border-amber-500/30 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono text-amber-400 font-bold uppercase mb-1">
            Say This to Hold Price (Glance & Speak &lt;3s):
          </div>
          <p className="text-xs text-slate-200 italic font-sans leading-relaxed">
            &ldquo;{concession.exactCounterpunchScript}&rdquo;
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleCopy(concession.exactCounterpunchScript)}
          className="p-1.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shrink-0 transition"
          title="Copy counterpunch to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
