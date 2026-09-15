# SAL-15 — Competitive Micro-Kill-Sheets

These cards follow the Marcus Vance Glanceability Standard: trigger, buyer trap, exact counter-strike, and pivot question. Character counts include the three line breaks and remain below the 280-character HUD limit.

The executable source of truth is `src/lib/sales/competitiveBattlecards.ts`.

## Detection heuristics

| Competitor | Case-insensitive transcript pattern | Covered acoustic/text forms |
| --- | --- | --- |
| Gong | `\bgong(?:[.\s]+(?:dot\s+)?io)?\b` | Gong, Gong.io, Gong dot io |
| Chorus | `\bchorus(?:[.\s]+(?:dot\s+)?ai)?\b` | Chorus, Chorus.ai, Chorus dot AI |
| Clari | `\bclar(?:i|y)\b` | Clari, Clary |
| Weflow | `\bwe(?:[\s-]+)?flow\b` | Weflow, We Flow, We-Flow |
| Scratchpad | `\bscratch[\s-]*pad\b` | Scratchpad, Scratch Pad, Scratch-Pad |

Matching uses word boundaries so longer unrelated words such as “clarity,” “workflows,” and “choruses” do not trigger cards. A competitor match takes precedence over the generic objection matcher and is emitted directly to the floating live-call HUD.

## Cards

### Gong — 221 characters

```text
[GONG MENTIONED]
Trap: Recording means reps are coached.
Say: “Gong gives managers an autopsy after the deal dies. We coach the rep while the deal is live.”
Ask: “How does Gong help a rep handle this objection right now?”
```

### Chorus — 221 characters

```text
[CHORUS MENTIONED]
Trap: Call intelligence means live guidance.
Say: “Chorus explains calls later. We coach the rep during the moment that changes the deal.”
Ask: “How does Chorus help a rep respond before the call ends?”
```

### Clari — 242 characters

```text
[CLARI MENTIONED]
Trap: Forecast accuracy means execution support.
Say: “Clari predicts the outcome. We flag MEDDIC gaps and coach the next move while the call is live.”
Ask: “Which MEDDIC gap can Clari help a rep close in this conversation?”
```

### Weflow — 221 characters

```text
[WEFLOW MENTIONED]
Trap: Faster CRM updates mean active selling help.
Say: “Weflow makes notes faster. We eliminate note-taking and defend margin live.”
Ask: “What protects margin when procurement pushes during the call?”
```

### Scratchpad — 251 characters

```text
[SCRATCHPAD MENTIONED]
Trap: Cleaner CRM data means better objection handling.
Say: “Scratchpad improves CRM hygiene. We coach the rep live and capture the call without manual notes.”
Ask: “What helps the rep handle a pricing challenge in the moment?”
```

## Verification

Automated coverage asserts the complete five-competitor catalog, canonical and STT-oriented trigger variants, near-miss rejection, exact four-line structure, the 280-character ceiling, and rendering in the floating HUD without an extra fifth label.
