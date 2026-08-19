# SalesHunter Coach — Current State

**This file is the entry point. Read it first, every session, before doing anything else.**

Last updated: 2026-08-19 · main @ `72a00bc` · **COLD — see below before committing anything**

---

## Status: cold, deliberately

On 2026-08-19 Chris chose the Nexeo field pilot (`sales-hunter-live-app` +
`saleshunter-revenue`) for the next two weeks. **This repo and
`saleshunter-platform` receive no feature work until that pilot closes.**

Cold is not dead. The reasoning, and what would flip it back on, is in
`saleshunter-revenue/.state/decisions.md`, entry 2026-08-19.

The three fixes in [risks.md](risks.md) are the exception — they are
customer-facing falsehoods in a public repo and should be closed *before* the
freeze, not after.

---

## What this is

A Tauri 2 + React 19 + TypeScript macOS app: on-device CAM++ speaker
diarization, Rust prosody DSP, replay-as-of-timestamp, a ~40-tool MCP server,
and voice typing. Technically the strongest code in the SalesHunter portfolio.

**It is a fork.** 337 of 339 commits are upstream Pathors AI (`parley`,
Apache-2.0). Two commits are Chris's: the rebrand and a website fix. The
`upstream` remote still points at `pathorsAI/parley`.

`saleshunter-platform` (Hono on Railway) is the backend built to replace
upstream's `api.parley.tw`. **The two are not connected yet** — see risks.

---

## Where verification stands

Nothing in this fork has been verified by Chris. The upstream project's tests
pass, and the desktop capabilities are real, but:

- No build has ever been signed or notarized under Vandelay Consulting's cert
- The rebrand has never been run as a packaged app
- Nothing has ever talked to `saleshunter-platform`

See [verification.md](verification.md).

---

## Pointers

- [risks.md](risks.md) — read this one first; it is the whole reason this file exists.
- [verification.md](verification.md) — proven vs assumed.
- [decisions.md](decisions.md) — what was decided and why.
- [backlog.md](backlog.md) — what a thaw would have to do.

Repository conventions (English-only, en-US, i18n indirection) live in
[../CLAUDE.md](../CLAUDE.md). This directory is state; CLAUDE.md is doctrine.
