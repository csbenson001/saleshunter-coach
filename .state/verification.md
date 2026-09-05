# Verification Ledger

**VERIFIED** means someone exercised it and observed the real result.
**ASSUMED** means it typechecks, tests pass, or upstream said so.

Almost everything here is inherited, which makes the distinction sharper than
usual: upstream's verification is evidence about upstream's build, not this fork's.

## VERIFIED

| Capability | How | When |
|---|---|---|
| The rebrand compiles and the repo is English-only | `3f8c57b` — language picker, `opencc-js` conversion pass, Chinese filler vocabulary and zh-Hant/zh-rTW resources removed; `AppLanguage` is a single-member union so TypeScript flags any new locale branch | 2026-08-17 |

## ASSUMED

| Capability | What is unproven | Cheapest way to prove it |
|---|---|---|
| On-device diarization, prosody DSP, replay-as-of, MCP server, voice typing | Real in upstream. Never run by Chris in this fork | Build and run the app once |
| Signed / notarized build | No build has been produced under the Vandelay Consulting Developer ID | Provision the cert, run the release job |
| Any cloud feature | Points at `api.parley.tw`, a server we do not own. Nothing has ever called `saleshunter-platform` | Set `VITE_COACH_CLOUD_URL`, sign in once |
| iOS / Android | Never submitted under this account | Out of scope; recommended for deletion |

## Live transcription on OpenAI — VERIFIED 2026-08-31

Chris ran a real meeting on the Coach app and read English text off the screen.
Screenshot in the session log. This is the first observed end-to-end live
transcription in this repo; before today it had never run.

Getting there took three defects, each hidden behind the last:

1. `OpenAI-Beta: realtime=v1` + `transcription_session.update` — the retired beta
   API. Server refused the connection outright.
2. Audio sent at 16 kHz; the GA API refuses anything under 24 kHz. The provider
   now upsamples its own leg (`OPENAI_RATE_HZ`), leaving the 16 kHz pipeline that
   recording, prosody and replay depend on untouched.
3. No language was ever pinned — `start_meeting` accepted `language_hints` and
   the front end never sent any. Auto-detection ran per fragment and returned
   Japanese, Arabic, Danish and Icelandic inside an all-English call.

Still ASSUMED, not verified:
- The language pin actually suppressing the foreign characters. The picker ships
  defaulting to English; nobody has run a meeting with it yet.
- Every other provider (Soniox, Deepgram, AssemblyAI, Gemini). Untouched today
  and still unexercised — see risks.md.

## SUPERSEDED — "silent channels invent speech" was the WRONG diagnosis

Written earlier on 2026-08-31, then disproved by a real transcript the same day.
Left here because the reasoning error is the useful part.

The claim was that the system-audio channel hallucinated text out of silence.
It does not. A verified 11:12 transcript showed near-every line appearing TWICE —
once under [You], once under [Them] — including Chris's own sentences arriving in
the far-end channel:

    [You]  I'm still locked out so I think you're gonna have to help me.
    [Them] I'm still locked out, so I think you're gonna have to help me.

That is real audio captured twice, not invention. The routing in
`commands.rs:348-380` is correct — mic to "me", system to "them", no mixing.
The duplication happens in the room: neither party was on headphones, so each
microphone picked up its own speakers.

This also re-explains the earlier garbage. "Mis eifas?" was never invented from
silence — it was a degraded echo of "Let me save this", and with no language
pinned the model dressed the mush up as Icelandic. One root cause, two symptoms.

**The lesson:** the first diagnosis was reached from log lines alone and sounded
plausible. It survived until someone read an actual transcript. A green session
and a coherent theory are not evidence.

## OPEN: two sessions is the wrong design for this app

OpenAI cannot diarize, which forces the two-session branch — double the vendor
cost for one conversation, and a duplicated transcript whenever audio bleeds.
The one-session diarizing branch already exists (`commands.rs:252-254`) and is
what Deepgram/Soniox take.

Not a defect to patch: the fix is to change provider. Untested as of 2026-08-31.

## OPEN: speaker identity needs Teams, not audio analysis

Chris's real meetings run 9 participants in Microsoft Teams. Diarization can only
ever yield "Speaker 1..9", which is unusable at that size. Teams already knows who
speaks (one stream per participant). Routes, in order of build cost: Microsoft
Graph transcript after the meeting (names, no live), or a Teams bot joining the
call (names, live — the WeFlow/Gong architecture). Voice enrolment was considered
and rejected: too much friction for what Teams gives free.

Consent applies before any of it — a bot in a 9-person war room is a recording
participant.
