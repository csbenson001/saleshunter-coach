# Co-CEO AI Software Factory: Business Value & Tough Sales Judge Rule

This repository operates as an **AI-Native Software Factory** where technical excellence is strictly subservient to **measurable commercial business value, rep quota attainment, and customer ROI**.

---

## 1. The Core Principle: "No Shelfware"
In traditional automatic AI development, systems often produce code that compiles and passes tests but fails to solve a true business need, leading to churn and dissatisfied users. In `saleshunter`, our mandate is:

> **Every feature must measurably increase a sales rep's win rate, accelerate their deal cycle, prevent deal slippage, or teach them how to be a lethal closer.**

If a feature does not clearly help users make more money, win more deals, or save massive time, it is **rejected as shelfware** regardless of how technically clever it is.

---

## 2. The Dual-Loop Engineering Architecture

### Loop 1: The Ralph Wiggum Technical Loop (Engineering Quality)
- **Zero-Tolerance Quality**: Every change must exit code `0` on `npx tsc --noEmit`, `npm test` (vitest), and `npm run build` (production Vite bundle).
- **The Ponytail Rule**:
  - YAGNI first (no speculative architectural layers).
  - Code reuse first (check existing store, types, and components before writing new ones).
  - Minimal, surgical diffs.
  - Native platform APIs over unnecessary dependencies.

### Loop 2: The Co-CEO & Tough Sales Judge Loop (Commercial Reality)
Every user-facing cue, prompt, objection response, or report must pass evaluation by the **Tough Sales Person Persona Judge**:
**Persona: Marcus "The Closer" Vance** (25-Year Enterprise VP of Sales, $100M+ ARR Builder).

The Judge grades every feature against 4 mandatory criteria:
1. **Win Rate & Pipeline Velocity (30% weight)**: Does it directly attack churn, budget, decision criteria, or the economic buyer?
2. **In-Call Glanceability & Cognitive Load (25% weight)**: Can a rep digest it in **under 3 seconds** while speaking to a prospect? If it takes 15 seconds to read, it ruins the call.
3. **Commercial Spine & Negotiation Leverage (25% weight)**: Does it ask tough, commercial questions that command authority, or does it sound weak, apologetic, and discount-happy?
4. **Direct Dollar ROI Justification (20% weight)**: Does saving just 1 deal per quarter provide a **25x–100x return** on the $49/mo Pro or $79/seat/mo Team subscription?

---

## 3. The 3 Verdicts of The Closer
- **`DEAL_CLOSER_CERTIFIED` (88–100 score)**: Approved for production. High commercial leverage, glanceable, and generates clear pipeline ROI.
- **`CONDITIONAL_PASS` (72–87 score)**: Requires sharpening before major release. Must cut text length and tighten economic discovery questions.
- **`REJECT_AS_SHELFWARE` (<72 score)**: Rejected. Too complex, passive, or fails to provide economic leverage.

---

## 4. Operational Best Practices (Google / Anthropic / OpenAI Factory Model)
1. **Pre-Mortem Testing with Tough Buyer Personas**: Before shipping an AI coaching prompt, run it against adversarial personas:
   - *The Skeptical CFO* (brutal cost scrutiny).
   - *The Vague Non-Committal Director* (no timeline, no urgency).
   - *The Incumbent Loyalist* (stuck with a competitor).
2. **Actionable Outputs Over Academic Summaries**: Note-takers summarize what happened; SalesHunter must tell the rep **what specific question to ask next** to close the deal.
3. **Automated Audit Pipeline**: Execute `node --experimental-strip-types scripts/sales-judge-audit.mjs` as part of CI validation.
