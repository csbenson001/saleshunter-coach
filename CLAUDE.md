# SalesHunter Coach — repository conventions

SalesHunter Coach is a public, Apache-2.0 macOS app (Tauri 2 + React 19 + TypeScript). Anyone should be able to read the history and contribute, so the repository is kept in one language regardless of who — or what — is writing.

## Write English in the repository

**Everything that lands in the repo or on GitHub is written in English:**

- commit messages
- pull request titles, descriptions, and review comments
- issue titles and bodies
- code comments and identifiers
- release notes (`.github/release-notes/*.md`) and anything published to the Releases page
- documentation (`README.md`, `CONTRIBUTING.md`, `docs/**`)

This holds even when the conversation that produced the change happened in another language — translate on the way in. A contributor who lands on issue #42 should not need a translator to pick it up.

## The app ships in American English only

**The product is American English — there is no second locale.** The upstream
project (Parley) was bilingual zh-TW/en; this fork removed Traditional Chinese
entirely, including the language picker, the Simplified→Traditional conversion
pass (`opencc-js`), the Chinese filler-word vocabulary, and the zh-Hant / zh-rTW
resources on iOS and Android. Do not reintroduce them.

Every user-facing string still lives in `src/i18n/messages.ts` — keep that
indirection so copy stays in one place and is greppable. Never hard-code display
text in a component, including in the secondary windows (settings, voice-typing,
diagnostics). Prefer American spelling and date/number formatting (`en-US`).

The `AppLanguage` type is deliberately a single-member union (`"en"`), so
TypeScript will flag any new locale-conditional branch rather than letting it
rot silently.

## Commit messages

Prefix with the kind of change, then say what changed:

```
[fix] LevelMeter leaked a listener when cleanup beat listen() resolving
[feature] link a recording to a company after the fact
[refactor] scenario becomes per-meeting state instead of a global setting
```

Use `[fix]`, `[feature]`, `[refactor]`, `[chore]`, or `[docs]`. Explain *why* in the body when the diff doesn't make it obvious.

## Before opening a PR

`bunx tsc --noEmit` and `bunx vitest run` must both pass. Add an i18n key to both dictionaries whenever you add user-facing text.
