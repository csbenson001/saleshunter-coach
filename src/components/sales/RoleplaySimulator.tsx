import { useState } from "react";
import { Bot, ArrowRight, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Persona {
  id: string;
  name: string;
  title: string;
  attitude: string;
  openingPrompt: string;
  testObjection: string;
}

const PERSONAS: Persona[] = [
  {
    id: "cfo",
    name: "Cynthia Vance",
    title: "Skeptical CFO",
    attitude: "Hyper-focused on cost reduction, payback period, and budget freezes.",
    openingPrompt: "We have an ongoing spend freeze for Q3. Why should I approve $49/month per rep for another AI tool?",
    testObjection: "If this doesn't show 5x ROI in the first 30 days, we are canceling.",
  },
  {
    id: "tech_lead",
    name: "Marcus Brody",
    title: "Security & VP of Engineering",
    attitude: "Suspicious of data leaks, audio eavesdropping, and SOC-2 compliance.",
    openingPrompt: "Where is our customer audio processed, and do you train models on our transcripts?",
    testObjection: "Our legal team will never approve cloud streaming of our executive calls.",
  },
  {
    id: "procurement",
    name: "Elena Rostova",
    title: "Procurement Director",
    attitude: "Pushes for 50% discounts and threatens to stick with current vendor Gong.",
    openingPrompt: "We already have an enterprise contract with Gong. Why do we need SalesHunter Coach?",
    testObjection: "Match Gong's annual pricing structure or we won't move forward.",
  },
];

export function RoleplaySimulator() {
  const [selectedPersona, setSelectedPersona] = useState<Persona>(PERSONAS[0]);
  const [userResponse, setUserResponse] = useState("");
  const [feedback, setFeedback] = useState<{ score: number; tip: string; grade: string } | null>(null);

  const handleEvaluate = () => {
    if (!userResponse.trim()) return;

    // Fast heuristic evaluation for practice drilling
    let score = 75;
    const lower = userResponse.toLowerCase();

    // Check for value reframing
    if (lower.includes("roi") || lower.includes("cost") || lower.includes("save") || lower.includes("win rate")) score += 10;
    // Check for asking a counter discovery question
    if (userResponse.includes("?")) score += 10;
    // Check for handling competitor/security specifically
    if (selectedPersona.id === "cfo" && lower.includes("deal")) score += 5;
    if (selectedPersona.id === "tech_lead" && (lower.includes("local") || lower.includes("private") || lower.includes("encrypt"))) score += 5;
    if (selectedPersona.id === "procurement" && (lower.includes("live") || lower.includes("in-ear") || lower.includes("post-call"))) score += 5;

    score = Math.min(98, score);
    const grade = score >= 90 ? "A+" : score >= 80 ? "A" : "B";

    const tip =
      selectedPersona.id === "cfo"
        ? "Strong reframing on deal win rate! Make sure to mention the 7-day trial as a zero-risk validation step."
        : selectedPersona.id === "tech_lead"
        ? "Great emphasis on our local-first architecture! Mentioning that zero bot-joiners are required cements executive trust."
        : "Excellent differentiator between live in-call coaching vs Gong's post-mortem recording archive.";

    setFeedback({ score, tip, grade });
  };

  const handleReset = () => {
    setUserResponse("");
    setFeedback(null);
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-5 text-xs backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <Bot className="size-5 text-sky-400" />
          <div>
            <h3 className="text-sm font-bold text-foreground">AI Sales Pitch &amp; Objection Roleplay Room</h3>
            <p className="text-[11px] text-muted-foreground">Drill high-stakes objections against realistic AI buyer personas</p>
          </div>
        </div>
      </div>

      {/* Persona Selection */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setSelectedPersona(p);
              handleReset();
            }}
            className={`rounded-lg border p-3 text-left transition-all ${
              selectedPersona.id === p.id
                ? "border-sky-500/50 bg-sky-950/30 text-foreground shadow-sm"
                : "border-border/40 bg-background/40 text-muted-foreground hover:bg-muted/30"
            }`}
          >
            <div className="font-bold text-foreground text-xs">{p.name}</div>
            <div className="text-[10px] text-sky-400 font-semibold">{p.title}</div>
            <div className="mt-1 text-[10px] text-muted-foreground line-clamp-2 leading-tight">{p.attitude}</div>
          </button>
        ))}
      </div>

      {/* Persona Dialogue Prompt */}
      <div className="mt-4 rounded-lg border border-border/50 bg-background/80 p-3.5">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <Bot className="size-4 text-sky-400" />
          <span>{selectedPersona.name} ({selectedPersona.title}):</span>
        </div>
        <div className="mt-1 text-xs text-foreground/90 font-medium italic">
          "{selectedPersona.openingPrompt}"
        </div>
      </div>

      {/* Rep Response Input */}
      <div className="mt-3">
        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
          Your Rebuttal / Pitch Response:
        </label>
        <textarea
          rows={3}
          value={userResponse}
          onChange={(e) => setUserResponse(e.target.value)}
          placeholder={`Type your response to ${selectedPersona.name}...`}
          className="w-full rounded-lg border border-border/60 bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
      </div>

      {/* Action Buttons */}
      <div className="mt-2 flex items-center justify-between">
        <Button size="sm" variant="ghost" onClick={handleReset} className="h-7 text-xs text-muted-foreground">
          <RotateCcw className="size-3 mr-1" /> Reset Drill
        </Button>
        <Button
          size="sm"
          onClick={handleEvaluate}
          disabled={!userResponse.trim()}
          className="h-8 gap-1.5 text-xs bg-sky-500 hover:bg-sky-600 text-white font-semibold"
        >
          Evaluate Pitch Drill <ArrowRight className="size-3" />
        </Button>
      </div>

      {/* Instant Feedback Panel */}
      {feedback && (
        <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-950/20 p-3.5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span className="font-bold text-emerald-300">Drill Score: {feedback.score}/100 (Grade: {feedback.grade})</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-emerald-200/90 leading-relaxed">
            {feedback.tip}
          </p>
        </div>
      )}
    </div>
  );
}
