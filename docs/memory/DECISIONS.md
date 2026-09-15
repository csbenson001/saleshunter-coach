# Architectural & Strategic Decision Records (ADRs) — SalesHunter Coach

## ADR-001: Local-First Audio Processing
- **Context**: Sales call transcripts contain sensitive customer pricing, product roadmaps, and confidential commercial terms.
- **Decision**: Ingest and process all audio loopbacks and STT transcription locally on the rep's macOS machine. No streaming audio sent to third-party endpoints.
- **Status**: Accepted & Implemented.

## ADR-002: Tauri Transparent Floating HUD with Dynamic Click-Through
- **Context**: Reps need live cues on top of Zoom/Google Meet without losing clickability on their meeting controls or CRM.
- **Decision**: Use Tauri transparent windows with `set_ignore_cursor_events` dynamically toggled on hover of actionable cards.
- **Status**: Accepted & Implemented (SAL-9).

## ADR-003: Compounding Skills Library vs. Vector Memory
- **Context**: Need agents to learn from past solved tasks without hallucinating obsolete APIs or creating token bloat.
- **Decision**: Reject unstructured vector memory (Hindsight) for engineering agents. Adopt Multica-style Compounding Skills Playbooks (`.agents/skills/<slug>/SKILL.md`) automatically synthesized on issue verification and registered in Paperclip.
- **Status**: Accepted & Implemented.

## ADR-004: Strict TDD Red-Bar Gating & Independent Grader
- **Context**: AI agents often produce code that seems plausible but breaks subtle edge cases.
- **Decision**: Every feature begins with a failing red test written by Spec Writer. Builder implements code to turn test green. Independent Grader with Azure GPT-5.6-Luna verifies from a clean state.
- **Status**: Accepted & Implemented.

## ADR-005: Monthly Budget Ceiling & Hard Stop Auto-Pause
- **Context**: Prevent runaway agent loop costs across 8 active agents.
- **Decision**: Establish a $500.00/month hard budget ceiling with automated hard-stop policy in Paperclip.
- **Status**: Accepted & Implemented.
