# Backlog — what a thaw would have to do

Not scheduled. This repo is cold. Listed so a future session does not re-derive it.

## Before anything else — the falsehoods

1. Repoint README downloads, badges and clone URL at this repo. (~1h)
2. Replace both `api.parley.tw` endpoints and set `VITE_COACH_CLOUD_URL` to the
   Railway platform. (~2h)
3. Delete the live-translation and virtual-mic claims from the README, and
   delete `virtual-mic/`. (~1h)

## To make Coach a product

| Work | Note | Cost |
|---|---|---|
| Wire Coach to `saleshunter-platform` | The backend exists, is deployed, and has **zero clients**. This is the single highest-value item | 3–5d |
| Device-code sign-in in the client | The platform implemented device-code confirmation specifically because PKCE was verified *not* to close the login CSRF. The client half does not exist | 2–3d |
| Signed + notarized build | Blocked on the Apple Developer ID cert — calendar time, start early | 1d + waiting |
| Delete `ios/` and `android/` | Assessed as unshippable | 0.5d |
| Windows capture | Port from `saleshunter-live`'s Rust WASAPI path. The reason that repo is frozen, not archived | 5–10d |
