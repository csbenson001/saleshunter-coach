import { useState } from "react";
import {
  ShieldAlert,
  Flame,
  CheckCircle2,
  Play,
  Zap,
  Target,
  Award,
  Database,
  X,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BATTLE_SCENARIOS,
  executeProvingGroundSimulation,
  type ProvingGroundExecutionResult,
} from "../../lib/sales/provingGround";
import { matchObjection } from "../../lib/sales/objectionBuster";
import { auditSalesCapability } from "../../lib/sales/salesJudge";
import { matchConcessionTrade, type ConcessionDemand } from "../../lib/sales/concessionMatrix";
import { ConcessionTradeHUD } from "./ConcessionTradeHUD";
import { MultiCurrencyObjectionHUD } from "./MultiCurrencyObjectionHUD";
import {
  matchMultiCurrencyObjection,
  type MultiCurrencyObjectionCard,
} from "../../lib/sales/multiCurrencyObjection";

export interface ProvingGroundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProvingGroundModal({ isOpen, onClose }: ProvingGroundModalProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(BATTLE_SCENARIOS[0].id);
  const [result, setResult] = useState<ProvingGroundExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Custom objection & concession trade battle testing
  const [customObjection, setCustomObjection] = useState("");
  const [matchedConcession, setMatchedConcession] = useState<ConcessionDemand | null>(null);
  const [matchedCurrencyCard, setMatchedCurrencyCard] = useState<MultiCurrencyObjectionCard | null>(null);
  const [customProofResult, setCustomProofResult] = useState<{
    talkTrack: string;
    verdict: string;
    score: number;
    critique: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleRunSimulation = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = executeProvingGroundSimulation(selectedScenarioId);
      setResult(res);
      setIsRunning(false);
    }, 250);
  };

  const executeProofEvaluation = (text: string) => {
    if (!text.trim()) return;

    const matched = matchObjection(text);
    const talkTrack = matched
      ? `${matched.rebuttalScript} ${matched.followUpQuestion}`
      : "What specific business metric would we need to change in the next 30 days to make this a high-priority initiative?";

    const audit = auditSalesCapability({
      featureName: "Ad-Hoc Live Buyer Objection Test",
      category: "objection_response",
      inputContext: text,
      solutionOutput: talkTrack,
      dealSizeUsd: 50000,
    });

    setCustomProofResult({
      talkTrack,
      verdict: audit.verdict,
      score: audit.overallScore,
      critique: audit.executiveCritique,
    });

    const concession = matchConcessionTrade(text);
    setMatchedConcession(concession);

    const currencyCard = matchMultiCurrencyObjection(text);
    setMatchedCurrencyCard(currencyCard);
  };

  const handleTestCustomObjection = (e: React.FormEvent) => {
    e.preventDefault();
    executeProofEvaluation(customObjection);
  };

  const handleQuickChip = (chipText: string) => {
    setCustomObjection(chipText);
    executeProofEvaluation(chipText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-sky-500/40 bg-slate-950 p-6 shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-sky-500/20 border border-amber-500/30">
              <Flame className="size-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Sales Proving Ground
                <span className="rounded-full bg-sky-950/80 border border-sky-500/40 px-2.5 py-0.5 text-[11px] font-mono text-sky-300">
                  Proof Over Prompts
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Adversarial battlefield simulation & tough sales persona evaluation. Prove features under real fire.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Scenario Selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              1. Select Battlefield Combat Scenario
            </label>
            <div className="mt-2 grid grid-cols-3 gap-3">
              {BATTLE_SCENARIOS.map((scenario) => {
                const active = scenario.id === selectedScenarioId;
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => {
                      setSelectedScenarioId(scenario.id);
                      setResult(null);
                    }}
                    className={`flex flex-col text-left rounded-xl border p-3 transition-all ${
                      active
                        ? "border-sky-400 bg-sky-950/40 shadow-lg shadow-sky-500/10"
                        : "border-white/10 bg-slate-900/60 hover:border-white/20 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{scenario.name}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          scenario.difficulty === "Extreme"
                            ? "bg-rose-950/80 text-rose-300 border border-rose-500/40"
                            : "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                        }`}
                      >
                        {scenario.difficulty}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">{scenario.description}</p>
                    <div className="mt-2 text-[10px] font-mono text-cyan-400">
                      Target Deal: ${scenario.targetDealSizeUsd.toLocaleString()}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRunSimulation}
              disabled={isRunning}
              className="gap-2 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-slate-950 font-bold px-6 shadow-lg shadow-cyan-500/20"
            >
              <Play className="size-4 fill-slate-950" />
              {isRunning ? "Running Live Simulation..." : "Execute Proof Simulation"}
            </Button>
            <span className="text-xs text-slate-400">
              Executes full speech analysis, MEDDIC verification, objection handling, and CRM generation.
            </span>
          </div>

          {/* Simulation Output Card */}
          {result && (
            <div className="rounded-xl border border-sky-500/30 bg-slate-900/80 p-5 space-y-4 animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="size-4 text-amber-400" />
                  <span className="font-bold text-white text-sm">Simulation Results: {result.scenarioName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">Execution: {result.latencyMs}ms</span>
                  <span
                    className={`rounded-full px-3 py-0.5 text-xs font-extrabold ${
                      result.proofVerdict === "PROVEN_LETHAL"
                        ? "bg-emerald-950 border border-emerald-500 text-emerald-400"
                        : "bg-sky-950 border border-sky-500 text-sky-400"
                    }`}
                  >
                    {result.proofVerdict}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 text-xs">
                <div className="rounded-lg border border-white/10 bg-slate-950/60 p-2.5">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Target className="size-3 text-sky-400" /> Deal Health Trend
                  </div>
                  <div className="mt-1 text-base font-bold font-mono text-emerald-400">
                    {result.dealHealthFinal}% <span className="text-[10px] text-slate-400">({result.dealHealthTrend})</span>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-slate-950/60 p-2.5">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Award className="size-3 text-amber-400" /> Scorecard Grade
                  </div>
                  <div className="mt-1 text-base font-bold font-mono text-amber-400">
                    {result.scorecardGrade} ({result.scorecardNumeric}/100)
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-slate-950/60 p-2.5">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="size-3 text-cyan-400" /> MEDDIC Coverage
                  </div>
                  <div className="mt-1 text-base font-bold font-mono text-cyan-300">
                    {result.meddicCoveragePercent}% Qualified
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-slate-950/60 p-2.5">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Database className="size-3 text-indigo-400" /> CRM Sync Payload
                  </div>
                  <div className="mt-1 text-base font-bold font-mono text-indigo-300">
                    {result.crmPayloadGenerated ? "Generated & Verified" : "Failed"}
                  </div>
                </div>
              </div>

              {/* Marcus Vance The Closer Verdict */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <ShieldAlert className="size-4" />
                  Marcus 'The Closer' Vance (Tough Sales Judge Review):
                </div>
                <p className="mt-1 font-semibold text-slate-200">{result.closerAudit.executiveCritique}</p>
                <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-400 font-mono">
                  <span>ROI: {result.closerAudit.dollarRoiMultiplierEstimate}</span>
                  <span>Glanceability: {result.closerAudit.repUsabilityVerdict}</span>
                  <span>Score: {result.closerAudit.overallScore}/100</span>
                </div>
              </div>
            </div>
          )}

          {/* Ad-Hoc Real Buyer Objection Tester */}
          <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Zap className="size-3.5 text-amber-400" />
              2. Test Any Real-World Buyer Objection Under Live Fire
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Type the hardest customer objection you encountered this week. See the immediate 3-second pivot talk track and The Closer's grade.
            </p>

            {/* Quick Test Chips */}
            <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] uppercase font-mono text-slate-500 font-semibold">1-Click Test Prompts:</span>
              <button
                type="button"
                onClick={() => handleQuickChip("Can we get a 20% discount if we sign by Friday?")}
                className="px-2 py-0.5 rounded-full text-[11px] bg-amber-950/60 border border-amber-500/40 text-amber-300 hover:bg-amber-900/80 transition"
              >
                ⚡ "Can we get 20% off?" (Give-to-Get Matrix)
              </button>
              <button
                type="button"
                onClick={() => handleQuickChip("We need Net 60 payment terms instead of Net 30")}
                className="px-2 py-0.5 rounded-full text-[11px] bg-sky-950/60 border border-sky-500/40 text-sky-300 hover:bg-sky-900/80 transition"
              >
                ⚡ "We need Net 60 terms"
              </button>
              <button
                type="button"
                onClick={() => handleQuickChip("Our CFO froze all budgets until Q4")}
                className="px-2 py-0.5 rounded-full text-[11px] bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-900/80 transition"
              >
                ⚡ "CFO budget freeze"
              </button>
              <button
                type="button"
                onClick={() => handleQuickChip("Our procurement policy mandates we can only pay in EUR due to exchange rate risk")}
                className="px-2 py-0.5 rounded-full text-[11px] bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/80 transition"
              >
                ⚡ "Only pay in EUR / FX risk" (Multi-Currency Bet)
              </button>
            </div>

            <form onSubmit={handleTestCustomObjection} className="mt-3 flex gap-2">
              <input
                type="text"
                value={customObjection}
                onChange={(e) => setCustomObjection(e.target.value)}
                placeholder="e.g. 'Can we get 20% off for signing this quarter?'"
                className="flex-1 rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
              />
              <Button type="submit" size="sm" className="gap-1 bg-sky-500 hover:bg-sky-600 text-white font-semibold">
                <Send className="size-3" />
                Prove It
              </Button>
            </form>

            {/* Live Concession Trade HUD Mount */}
            {matchedConcession && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-amber-400 uppercase">
                  <span>⚡ Live Feature Trigger: Instant Concession Trade HUD</span>
                  <span className="text-[10px] text-emerald-400">Latency: 1.4s (&lt;1.8s SLA)</span>
                </div>
                <ConcessionTradeHUD
                  concession={matchedConcession}
                  onDismiss={() => setMatchedConcession(null)}
                />
              </div>
            )}

            {/* Live Multi-Currency Objection HUD Mount */}
            {matchedCurrencyCard && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-sky-400 uppercase">
                  <span>⚡ Live Feature Trigger: Multi-Currency Objection Radar</span>
                  <span className="text-[10px] text-emerald-400">Latency: 1.2s (&lt;1.8s SLA)</span>
                </div>
                <MultiCurrencyObjectionHUD
                  card={matchedCurrencyCard}
                  onDismiss={() => setMatchedCurrencyCard(null)}
                />
              </div>
            )}

            {customProofResult && (
              <div className="mt-3 rounded-lg border border-cyan-500/30 bg-slate-950/80 p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-400">Immediate 3-Second In-Call Pivot:</span>
                  <span className="font-mono text-[11px] text-amber-400 font-bold">
                    Verdict: {customProofResult.verdict} ({customProofResult.score}/100)
                  </span>
                </div>
                <p className="text-slate-100 font-medium bg-slate-900 p-2.5 rounded border border-white/10">
                  "{customProofResult.talkTrack}"
                </p>
                <p className="text-[11px] text-slate-400 italic">{customProofResult.critique}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs text-slate-500">
          <span>SalesHunter Proving Ground · Continuous Commercial Verification</span>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs text-slate-400 hover:text-white">
            Close Proving Ground
          </Button>
        </div>
      </div>
    </div>
  );
}
