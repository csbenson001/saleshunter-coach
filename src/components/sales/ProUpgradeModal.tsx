import { Check, Sparkles, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureTrigger?: string;
}

export function ProUpgradeModal({ isOpen, onClose, featureTrigger }: ProUpgradeModalProps) {
  if (!isOpen) return null;

  const openCheckout = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in">
      <div className="relative flex w-full max-w-lg flex-col rounded-2xl border border-sky-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl text-foreground">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>

        {/* Badge & Title */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/20 px-2.5 py-0.5 text-xs font-semibold text-sky-400 border border-sky-500/30">
            <Sparkles className="size-3" />
            SalesHunter Pro
          </span>
          {featureTrigger && (
            <span className="text-[11px] text-muted-foreground">Unlocked with Pro</span>
          )}
        </div>

        <h2 className="mt-3 text-xl font-extrabold tracking-tight text-white">
          Close more deals with real-time AI in your ear.
        </h2>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          Free Community includes local BYOK voice typing. Upgrade to SalesHunter Pro for live objection handling, unlimited AI CRM exports, and MEDDIC qualification intelligence.
        </p>

        {/* Value Prop List */}
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-2.5">
            What you get with Pro:
          </div>
          <ul className="space-y-2 text-xs">
            <li className="flex items-start gap-2 text-slate-200">
              <Check className="size-3.5 shrink-0 text-sky-400 mt-0.5" />
              <span><strong>Sub-50ms live objection handling</strong> &amp; rebuttal battlecards during active calls.</span>
            </li>
            <li className="flex items-start gap-2 text-slate-200">
              <Check className="size-3.5 shrink-0 text-sky-400 mt-0.5" />
              <span><strong>Automatic MEDDIC &amp; BANT tracking</strong> directly in the live coach HUD.</span>
            </li>
            <li className="flex items-start gap-2 text-slate-200">
              <Check className="size-3.5 shrink-0 text-sky-400 mt-0.5" />
              <span><strong>1-Click CRM follow-up drafts</strong> formatted for Salesforce, HubSpot, and Slack.</span>
            </li>
            <li className="flex items-start gap-2 text-slate-200">
              <Check className="size-3.5 shrink-0 text-sky-400 mt-0.5" />
              <span><strong>No API keys or cloud setup required</strong> — hosted high-speed model pool included.</span>
            </li>
          </ul>
        </div>

        {/* Pricing CTA */}
        <div className="mt-5 flex flex-col gap-2">
          <Button
            size="lg"
            onClick={() => openCheckout("https://buy.stripe.com/cNifZgbvIcPDfg17gQgbm00")}
            className="w-full h-11 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-bold text-sm shadow-lg shadow-sky-500/25"
          >
            Start 7-Day Free Trial ($49/mo) →
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openCheckout("https://buy.stripe.com/eVq5kC8jw2aZ1pb0Ssgbm01")}
            className="text-xs text-muted-foreground hover:text-white"
          >
            Looking for multi-seat team billing? Deploy for Team ($79/seat/mo) →
          </Button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground/75">
          <ShieldCheck className="size-3.5 text-emerald-400" />
          <span>7-day free trial. Cancel anytime with 1 click. Easily expensed as software training.</span>
        </div>
      </div>
    </div>
  );
}
