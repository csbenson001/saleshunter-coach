# SalesHunter Coach — Current State

**This file is the entry point. Read it first, every session, before doing anything else.**

Last updated: 2026-08-29 · main @ `72a00bc` · **whole repo cold — mobile reversed 2026-08-29**

---

## Status: cold — mobile and desktop both

**Reversed 2026-08-29.** From 2026-08-19 this file said the iOS and Android apps
were the WeFlow-parity mobile base. WeFlow then demoed their live product to
Nexeo on 2026-08-26, and their CEO said the mobile app does not write structured
CRM fields — it writes an AI summary, "almost like a note." Parity is a lower bar
than that decision assumed; `expo-web-browser` gives Expo the same
`ASWebAuthenticationSession` / Custom Tabs primitive; and the differentiated half
(span verifier, confirm gate, idempotency ledger, `ReviewStage.tsx`) exists only
in the Expo app.

**`sales-hunter-live-app` is the mobile base. `ios/` and `android/` are cold
again.** See [decisions.md](decisions.md), entry 2026-08-19 (mobile), now carrying
a supersede box, and `sales-hunter-live-app/.state/decisions.md` 2026-08-29.

**The Tauri desktop app stays cold** until the Nexeo pilot closes. Unchanged.

The three customer-facing falsehoods in [risks.md](risks.md) remain the only
work this repo takes: a README pointing downloads at upstream is not acceptable
whether or not anything here is shipping.

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
