# Risks

## Vendor APIs the app pins can be retired underneath it

Observed 2026-08-31, live, from `~/Library/Logs/com.saleshunter.coach/saleshunter-coach.log`:

    [stt:me] session ended: The Realtime Beta API is no longer supported.
                            Please use /v1/realtime for the GA API.

Every OpenAI transcription attempt failed. The app sent `OpenAI-Beta: realtime=v1`
and a `transcription_session.update` message — both retired when OpenAI took the
realtime API to GA. The URL was already correct; only the header and the message
shape were stale. Fixed in `src-tauri/src/transcription/openai.rs`.

**The general risk, which is not fixed:** five of the six transcription providers
are pinned to a hand-written wire format with no contract test against the live
vendor. Soniox, Deepgram, AssemblyAI and Gemini can each break exactly this way,
silently, and the first person to find out is whoever is standing in a meeting.
The user-facing message ("Couldn't reach the transcription service. Check your
connection and retry.") also misdirects — it blames the network for a protocol
rejection. Nothing detects this until someone starts a call.

This is the strongest practical argument for the hosted-in-tenant options under
discussion (Azure AI Speech / Amazon Transcribe): a cloud provider's versioned
SDK moves under a deprecation policy, not overnight.

## Three customer-facing falsehoods, live in a public repo right now

These ship to anyone who reads the README or runs the app. They should be closed
before the freeze, not after.

1. **The README sends users to upstream's binaries.** `README.md:38` links
   downloads to `https://github.com/pathorsAI/parley/releases/latest`, and the
   badges at lines 12–13 track upstream's release and CI. Someone following your
   README installs Pathors AI's app, not yours. Line 109 also clones upstream.

2. **Two hardcoded `api.parley.tw` endpoints remain.**
   - `src/lib/cloud/client.ts:14` — the cloud client's default base URL
   - `src/lib/ai/providers.ts:185` — a provider's `baseURL`

   `VITE_COACH_CLOUD_URL` is never set in any env file, so the default is what
   ships. Every hosted feature calls a server Chris does not own, cannot deploy,
   and whose source is unavailable. The upstream repo's own
   `docs/cloud-backend-contract.md` §8 recommends compiling this out.

3. **The README advertises features that do not work.** Line 40 promises live
   translation via a Gemini key, and line 115 promises a virtual-microphone
   driver. Both were assessed as dead. `virtual-mic/` is still on disk.

## Still on disk, assessed as unshippable

`ios/` and `android/` remain. Android is `versionCode = 1`; the iOS App Store
release the README references was upstream's, never submitted under Chris's
name. Both are cloud-only with no BYOK path, hardcoded to a host Chris does not
control. The consolidation plan recommended deleting all three directories
(`ios/`, `android/`, `virtual-mic/`); that has not happened.

## Platform gap

macOS only. `src-tauri/src/` has no Windows capture path. The Electron app in
`saleshunter-live` has one (Rust WASAPI) — which is why that repo is **frozen,
not archived**, despite being superseded.

## Licensing

Apache-2.0 with attribution intact (`README.md:131`). That is correct and must
stay correct. Any commercial packaging decision should be made deliberately and
recorded in decisions.md, not drifted into.
