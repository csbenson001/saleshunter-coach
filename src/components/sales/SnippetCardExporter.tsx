import { useState } from "react";
import { Share2, Copy, Check, X, Sparkles, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SnippetCardExporterProps {
  isOpen: boolean;
  onClose: () => void;
  quoteText?: string;
  speakerName?: string;
  callTitle?: string;
}

export function SnippetCardExporter({
  isOpen,
  onClose,
  quoteText = "The 7-day trial validated that our reps handled 4x more objections live without stalling deals.",
  speakerName = "VP of Sales",
  callTitle = "Enterprise Growth Call",
}: SnippetCardExporterProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyText = async () => {
    const formatted = `"${quoteText}"\n— ${speakerName} on ${callTitle}\n\n🎙️ Coached in real-time with SalesHunter Coach (saleshunterlive.com)`;
    await navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in">
      <div className="flex w-full max-w-md flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="size-4 text-sky-400" />
            <h2 className="text-sm font-bold text-foreground">Share Call Highlight Snippet</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Branded Social Card Preview */}
        <div className="mt-4 rounded-xl border border-sky-500/30 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-5 shadow-inner">
          <Quote className="size-6 text-sky-400 opacity-60 mb-2" />
          <p className="text-sm font-medium text-slate-100 italic leading-relaxed">
            "{quoteText}"
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px]">
            <div>
              <div className="font-semibold text-white">{speakerName}</div>
              <div className="text-muted-foreground text-[10px]">{callTitle}</div>
            </div>
            <div className="flex items-center gap-1 rounded bg-sky-950/60 border border-sky-500/30 px-2 py-0.5 text-[10px] font-mono text-sky-400">
              <Sparkles className="size-2.5" />
              SalesHunter Coach
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Ready for Slack &amp; LinkedIn</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose} className="h-8 text-xs">
              Close
            </Button>
            <Button size="sm" onClick={handleCopyText} className="h-8 gap-1.5 text-xs bg-sky-500 hover:bg-sky-600 text-white">
              {copied ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />}
              {copied ? "Copied!" : "Copy Shareable Text"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
