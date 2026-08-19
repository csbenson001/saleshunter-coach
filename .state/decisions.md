# Decision Log

Append-only. Newest first.

---

## 2026-08-19 — Cold until the Nexeo pilot closes

No feature work here for two weeks. Full reasoning in
`saleshunter-revenue/.state/decisions.md`, entry 2026-08-19. The exception is
the three customer-facing falsehoods in [risks.md](risks.md).

## 2026-08-18 — Coach supersedes `saleshunter-live` as the desktop app

Coach is better code; `saleshunter-live` had the commercial scaffolding.
Chris chose Coach. **Tail cost:** `saleshunter-live` keeps the only Windows
capture implementation, so it is frozen rather than archived, and Coach is
macOS-only until that ports.

*Note: an independent survey the same night reached the opposite conclusion —
keep `saleshunter-live` as the shell, freeze parley. That survey's reasoning
(commercial scaffolding is expensive and already built; superior DSP is a
nice-to-have) is worth reading before reversing this, in
`saleshunter-revenue/docs/competitive/2026-08-18-suite-consolidation-plan.md` §2.*

## 2026-08-17 — Fork rather than rewrite, with attribution kept

Rebranded Parley to SalesHunter Coach under Apache-2.0, attribution intact.
**Tail cost:** 337 of 339 commits are someone else's, upstream's remote is still
configured, and every merge from upstream is a decision rather than a routine.
