# Institutional Executive Memory — SalesHunter Coach

*Maintained by: Chris Benson (Founder / Board) & Marcus "The Closer" Vance (Co-CEO)*
*Last Updated: 2026-09-15*

---

## 1. Board Identity & Preferences (Chris Benson)
- **Role**: Founder, Executive Board, Final Human Authority.
- **Budget Governance**: Hard monthly ceiling of **$500.00/mo** (`$50000 cents`). Never exceed. Hard-stop auto-pause policy enabled in Paperclip.
- **Reporting Style**: Concise, high-signal executive summaries. Highlight concrete metrics (tests passing, spend, token usage, latency) rather than verbose prose.
- **Verification Rule**: 100% test coverage, green vitest suites, clean typecheck (`npx tsc --noEmit`), and zero regressions before any deliverable is marked complete.

---

## 2. Core Non-Negotiable Invariants
1. **Local-First Security & Zero Cloud Leak**:
   - Live microphone streams, audio buffers, and raw conversation transcripts must never touch third-party cloud servers without explicit, encrypted user initiation.
   - API keys and tokens must reside strictly in secure local OS keyrings (macOS Keychain) or environment variables—never committed in plaintext.
2. **The <3s Glanceability Rule**:
   - In-call overlay cues and battlecards must contain fewer than 25 words with zero conversational fluff.
   - Sales reps are in high-pressure discovery and negotiation calls; cognitive load must remain near zero.
3. **The Commercial Spine (Concession Defense)**:
   - Discount requests must immediately trigger required non-monetary trades (annual upfront payment, multi-year lock-in, public case study commitment). Never give away margin for free.
4. **Compounding Skills Playbooks**:
   - Every solved task must be distilled into a reusable playbook in `.agents/skills/<slug>/SKILL.md` so future agents inherit proven patterns rather than re-inventing solutions from scratch.

---

## 3. Product Roadmap & Strategic Milestones
- **Phase 1: Commercial Spine & Weflow Parity (COMPLETED & 100% GREEN)**:
  - SAL-1 through SAL-17 closed.
  - Transparent floating HUD, click-through windowing, real-time objection detection, concession matrix trading, MEDDPICC qualification tracker, local CRM deal memo export, competitor killcards.
- **Phase 2: Live Desktop Audio Pipeline & Executive Intelligence (ACTIVE)**:
  - SAL-2: Deterministic holdout replay benchmark runner.
  - SAL-18: Virtual audio loopback tap for Zoom & Google Meet.
  - SAL-19: Manager command center & live whisper grid.
  - SAL-20: 60-second pre-call intelligence dossier & buyer battlecard.
  - SAL-21: Bidirectional Salesforce & HubSpot OAuth sync.
  - SAL-22: Post-call executive deal memo & MEDDPICC risk scorecard.
