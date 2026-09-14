# SalesHunter Coach — Developer Guide

## Prerequisites

- Node.js and the checked-in `bun.lock` workflow. `npm` can run the Vitest/typecheck checks in this checkout.
- Rust stable and a current Cargo for `src-tauri` (the lockfile is version 4).
- macOS is required for the full desktop capture/virtual-mic workflow.
- Xcode and Swift tooling for iOS; Android Studio/JDK plus the checked-in Gradle wrapper for Android.

## Install and run

```bash
bun install
bun run dev                 # browser development UI
bun run tauri dev           # full native desktop app
```

The Tauri config runs `bun run dev` before native development and expects Vite at `http://localhost:1420`. Configure provider keys in the app Settings; do not commit `.env` or credentials.

## Verification commands

```bash
npm test                    # vitest run; 31 files / 241 tests verified here
npx tsc --noEmit            # TypeScript validation; clean here
cargo test --manifest-path src-tauri/Cargo.toml
bun run build               # TypeScript + Vite production bundle
```

For mobile modules:

```bash
cd android && ./gradlew test
cd ios/CoachKit && swift test
```

The local Cargo in the analysis environment rejected `src-tauri/Cargo.lock` because it predates lockfile format v4. Upgrade Rust/Cargo before treating that result as a product failure. Vitest emits expected jsdom warnings when Zustand persistence has no browser storage; the test assertions still pass.

## Development boundaries

- Keep user-facing coaching glanceable during a call; put detailed reasoning in replay/debrief surfaces.
- Preserve the commercial rule encoded in the product: a concession should be paired with a term or scope trade, never offered as an unearned discount.
- Keep local-first behavior explicit. New network calls require a provider/cloud boundary and an error path.
- Extend existing seams: React state in `src/lib/store.ts`, analysis runners under `src/lib/analysis/`, provider adapters under `src-tauri/src/transcription/`, and persistence through history/cloud helpers.
- Avoid editing generated `dist/`, `src-tauri/target/`, bundled model binaries, or lockfiles unless a dependency/toolchain change is intentional.
- The execution workflow is test-first for behavioral changes: add a focused failing test, implement the smallest production change, refactor, then run the relevant checks.

## Native debugging

1. Check microphone, Screen & System Audio Recording, Accessibility, and Input Monitoring permissions from the app's Permissions settings.
2. Use the native Diagnostics menu to inspect rotating logs and clear analysis/speaker caches.
3. For capture issues, trace the event path from `commands.rs`/`capture.rs` to `src/lib/tauriEvents.ts` and the Zustand meeting state.
4. For analysis issues, inspect the `realtime` versus `deep` lane, provider key/model selection, cache key, and `studyPipeline` stage status.
5. For cloud issues, distinguish authentication (`401`) from resource authorization (`403`) and compare the desktop/mobile contract docs.

## Release surfaces

- `.github/workflows/release.yml` builds and publishes the macOS Tauri package, with optional cloud edition upload.
- `.github/workflows/ios-release.yml` and `android-release.yml` package mobile clients.
- `virtual-mic/build.sh` builds the macOS virtual microphone driver; the desktop package bundles it as an installable resource.
- Signing, notarization, updater keys, and cloud deployment tokens are CI secrets. Never reproduce them in source or documentation.

## Recommended ownership for the next four weeks

Use the existing Paperclip roles as the minimum delivery team:

| Owner | Focus | Exit evidence |
| --- | --- | --- |
| Foreman | product sequencing, architecture decisions, commercial scope | one prioritized four-week roadmap |
| Spec Writer | acceptance tests and contracts before implementation | failing test/spec linked to each task |
| Builder | desktop/native/mobile implementation | focused tests, typecheck, relevant platform checks |
| Call Replay Evaluator | holdout-call quality and live/replay regression | scored replay set and latency/error findings |
| Grader | independent release gate | reproducible green verification and risk disposition |

The current Builder account is not permitted to hire agents; adding CEO, growth, design, or platform specialists requires board/Foreman governance rather than an unauthorized API call.
