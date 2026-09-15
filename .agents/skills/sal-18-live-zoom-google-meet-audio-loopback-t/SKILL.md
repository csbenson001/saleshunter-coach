---
name: sal-18-live-zoom-google-meet-audio-loopback-t
description: Milestone 4: Audio Hardware & Meeting Tap
---

# SAL-18: Live Zoom / Google Meet Audio Loopback Tap

## 1. Problem Context & Business Goal
## Milestone 4: Audio Hardware & Meeting Tap

Connect system audio loopback and rep microphone directly into the live streaming transcription buffer without requiring external bot attendees.

## Commercial Rationale
Preserves 100% buyer trust and enterprise CISO approval by operating transparently on the rep machine rather than inviting an awkward AI bot into the Zoom room.

## Acceptance Criteria
1. Taps incoming prospect audio from system loopback (macOS CoreAudio / BlackHole / virtual tap) and outgoing microphone.
2. Chronologically interleaves both audio channels into timestamped chunks with <500ms latency.
3. Automatically pauses and flushes memory when meeting ends or disconnects.
4. Includes fallback test harness for headless verification.

## 2. Proven Architecture & Implementation Pattern
Key architectural deliverables and components implemented in SAL-18. Verified in test suite.

## 3. Critical Gotchas, Pitfalls & Anti-Patterns
Preserve established interfaces, avoid regressions in live stream listeners, and ensure clean test environment cleanup.

## 4. Verification Recipe
Run the following command to verify the implementation pattern:
```bash
pnpm test:run && pnpm -r typecheck
```
