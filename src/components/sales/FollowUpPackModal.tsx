import { useState } from "react";
import { Mail, Check, Copy, Sparkles, FileText, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExecutiveDealMemo } from "../../lib/sales/executiveDealMemo";

export type ClipboardWriter = (text: string) => Promise<void>;
export type EmailOpener = (url: string) => void;

export interface FollowUpPackProps {
  isOpen: boolean;
  onClose: () => void;
  meetingTitle: string;
  summaryBullets?: string[];
  actionItems?: string[];
  prospectName?: string;
  prospectEmail?: string;
  memo?: ExecutiveDealMemo | null;
  clipboard?: ClipboardWriter;
  openEmail?: EmailOpener;
}

function defaultClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

function defaultEmailOpener(url: string): void {
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) throw new Error("The default email client could not be opened");
}

function internalMemoText(memo: ExecutiveDealMemo): string {
  return [
    "DEAL HEALTH: " + memo.internal.grade + " (" + memo.internal.healthScore + "/100)",
    "Missing MEDDIC: " + (memo.internal.missingMeddicComponents.join(", ") || "None"),
    "Discount exposure: " + memo.internal.discountExposure,
    "Risk evidence:",
    ...(memo.internal.riskEvidence.length
      ? memo.internal.riskEvidence.map((evidence) => "- " + evidence)
      : ["- None detected"]),
  ].join("\n");
}

export function FollowUpPackModal({
  isOpen,
  onClose,
  meetingTitle,
  prospectEmail = "",
  memo,
  clipboard = defaultClipboard,
  openEmail = defaultEmailOpener,
}: FollowUpPackProps) {
  const [activeTab, setActiveTab] = useState<"email" | "brief">("email");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const emailBody = memo?.clientFacing.emailBody ?? "Executive follow-up memo is still generating.";
  const executiveBrief = memo
    ? internalMemoText(memo)
    : "Internal deal-health memo is still generating.";
  const contentToCopy = activeTab === "email" ? emailBody : executiveBrief;

  const handleCopy = async () => {
    setError(null);
    try {
      await clipboard(contentToCopy);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Copy to clipboard failed");
    }
  };

  const handleEmail = () => {
    if (!memo) {
      setError("The executive memo is still generating");
      return;
    }
    setError(null);
    try {
      const params = new URLSearchParams({
        subject: memo.clientFacing.emailSubject,
        body: memo.clientFacing.emailBody,
      });
      openEmail("mailto:" + encodeURIComponent(prospectEmail) + "?" + params.toString());
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Email client could not be opened");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex h-[85vh] max-h-[640px] w-full max-w-2xl flex-col rounded-xl border border-border/80 bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-sky-400" />
            <div>
              <h2 className="text-base font-bold text-foreground">Post-Call Executive Deal Memo</h2>
              <p className="text-xs text-muted-foreground">{meetingTitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" variant={activeTab === "email" ? "default" : "outline"} onClick={() => setActiveTab("email")} className="h-8 gap-1.5 text-xs">
            <Mail className="size-3.5" /> Client Recap
          </Button>
          <Button size="sm" variant={activeTab === "brief" ? "default" : "outline"} onClick={() => setActiveTab("brief")} className="h-8 gap-1.5 text-xs">
            <FileText className="size-3.5" /> Internal Deal Risk
          </Button>
        </div>

        <div className="mt-3 flex-1 overflow-auto rounded-lg border border-border/60 bg-background/90 p-3 font-mono text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed select-text">
          {contentToCopy}
        </div>

        {error && (
          <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="size-3.5" /> {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
          <span className="text-[11px] text-muted-foreground">
            {memo ? "Generated from final call commitments" : "Generating from the final transcript…"}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose} className="h-8 text-xs">Close</Button>
            <Button size="sm" variant="outline" onClick={handleEmail} disabled={!memo} className="h-8 gap-1.5 text-xs">
              <Mail className="size-3.5" /> Open Email Client
            </Button>
            <Button size="sm" onClick={handleCopy} disabled={!memo} className="h-8 gap-1.5 bg-sky-500 text-xs text-white hover:bg-sky-600">
              {copied ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

