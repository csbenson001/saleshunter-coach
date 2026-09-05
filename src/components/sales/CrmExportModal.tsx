import { useState } from "react";
import { Database, Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatForSalesforce,
  formatForHubSpot,
  formatForNotion,
  formatWebhookPayload,
  type MeetingExportData,
} from "../../lib/sales/crmExport";

export interface CrmExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: MeetingExportData;
}

export function CrmExportModal({ isOpen, onClose, data }: CrmExportModalProps) {
  const [platform, setPlatform] = useState<"salesforce" | "hubspot" | "notion" | "webhook">("salesforce");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const content = (() => {
    switch (platform) {
      case "salesforce":
        return formatForSalesforce(data);
      case "hubspot":
        return formatForHubSpot(data);
      case "notion":
        return formatForNotion(data);
      case "webhook":
        return JSON.stringify(formatWebhookPayload(data), null, 2);
    }
  })();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex h-[80vh] max-h-[600px] w-full max-w-2xl flex-col rounded-xl border border-border/80 bg-card p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Database className="size-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-foreground">Export to CRM &amp; Knowledge Base</h2>
              <p className="text-xs text-muted-foreground">Formats meeting intelligence for seamless CRM ingestion</p>
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

        {/* Platform Selector Buttons */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={platform === "salesforce" ? "default" : "outline"}
            onClick={() => setPlatform("salesforce")}
            className="h-8 gap-1.5 text-xs"
          >
            Salesforce
          </Button>
          <Button
            size="sm"
            variant={platform === "hubspot" ? "default" : "outline"}
            onClick={() => setPlatform("hubspot")}
            className="h-8 gap-1.5 text-xs"
          >
            HubSpot
          </Button>
          <Button
            size="sm"
            variant={platform === "notion" ? "default" : "outline"}
            onClick={() => setPlatform("notion")}
            className="h-8 gap-1.5 text-xs"
          >
            Notion
          </Button>
          <Button
            size="sm"
            variant={platform === "webhook" ? "default" : "outline"}
            onClick={() => setPlatform("webhook")}
            className="h-8 gap-1.5 text-xs"
          >
            Zapier / Webhook JSON
          </Button>
        </div>

        {/* Content Box */}
        <div className="mt-3 flex-1 overflow-auto rounded-lg border border-border/60 bg-background/90 p-3 font-mono text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed select-text">
          {content}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
          <span className="text-[11px] text-muted-foreground">
            {platform === "webhook" ? "REST API / Zapier payload ready" : "Paste directly into CRM activity feed"}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose} className="h-8 text-xs">
              Close
            </Button>
            <Button size="sm" onClick={handleCopy} className="h-8 gap-1.5 text-xs bg-cyan-600 hover:bg-cyan-700 text-white">
              {copied ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : `Copy for ${platform.toUpperCase()}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
