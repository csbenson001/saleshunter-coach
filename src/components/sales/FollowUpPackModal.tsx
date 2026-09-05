import { useState } from "react";
import { Mail, Check, Copy, Sparkles, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FollowUpPackProps {
  isOpen: boolean;
  onClose: () => void;
  meetingTitle: string;
  summaryBullets?: string[];
  actionItems?: string[];
  prospectName?: string;
}

export function FollowUpPackModal({
  isOpen,
  onClose,
  meetingTitle,
  summaryBullets = [],
  actionItems = [],
  prospectName = "there",
}: FollowUpPackProps) {
  const [activeTab, setActiveTab] = useState<"email" | "brief">("email");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const defaultBullets = summaryBullets.length > 0 ? summaryBullets : [
    "Reviewed sales coaching architecture and local-first latency advantages.",
    "Validated immediate ROI requirements for objection handling on sales calls.",
    "Aligned on next steps for evaluation with team leadership.",
  ];

  const defaultActions = actionItems.length > 0 ? actionItems : [
    "Send SalesHunter Pro 7-day trial link and onboarding guide.",
    "Schedule 15-minute technical architecture review.",
  ];

  const emailDraft = `Hi ${prospectName},

Thank you for taking the time to speak today about ${meetingTitle}.

Here is a quick recap of what we discussed:
${defaultBullets.map((b) => `• ${b}`).join("\n")}

Next steps we agreed upon:
${defaultActions.map((a) => `• ${a}`).join("\n")}

You can activate your SalesHunter Pro evaluation directly here:
https://buy.stripe.com/cNifZgbvIcPDfg17gQgbm00

Looking forward to our next conversation!

Best regards,`;

  const executiveBrief = `🎯 EXECUTIVE BRIEF: ${meetingTitle}
Date: ${new Date().toLocaleDateString()}

KEY HIGHLIGHTS:
${defaultBullets.map((b) => `• ${b}`).join("\n")}

ACTION ITEMS & COMMITMENTS:
${defaultActions.map((a) => `[ ] ${a}`).join("\n")}
`;

  const contentToCopy = activeTab === "email" ? emailDraft : executiveBrief;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(contentToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex h-[85vh] max-h-[640px] w-full max-w-2xl flex-col rounded-xl border border-border/80 bg-card p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-sky-400" />
            <div>
              <h2 className="text-base font-bold text-foreground">1-Click Post-Call Follow-Up Pack</h2>
              <p className="text-xs text-muted-foreground">Ready-to-send executive brief &amp; client follow-up email</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            variant={activeTab === "email" ? "default" : "outline"}
            onClick={() => setActiveTab("email")}
            className="h-8 gap-1.5 text-xs"
          >
            <Mail className="size-3.5" />
            Follow-Up Email Draft
          </Button>
          <Button
            size="sm"
            variant={activeTab === "brief" ? "default" : "outline"}
            onClick={() => setActiveTab("brief")}
            className="h-8 gap-1.5 text-xs"
          >
            <FileText className="size-3.5" />
            Executive Brief (Slack/Internal)
          </Button>
        </div>

        {/* Text Area Content */}
        <div className="mt-3 flex-1 overflow-auto rounded-lg border border-border/60 bg-background/90 p-3 font-mono text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed select-text">
          {contentToCopy}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
          <span className="text-[11px] text-muted-foreground">
            {activeTab === "email" ? "Includes active Pro Stripe checkout link" : "Formatted for Slack, Notion & team updates"}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose} className="h-8 text-xs">
              Close
            </Button>
            <Button size="sm" onClick={handleCopy} className="h-8 gap-1.5 text-xs bg-sky-500 hover:bg-sky-600 text-white">
              {copied ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />}
              {copied ? "Copied to Clipboard!" : "Copy to Clipboard"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
