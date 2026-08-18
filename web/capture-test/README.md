# Browser Capture Probe

Answers one question before any web version gets built: **can a browser hear both
sides of a call, and does the far end echo back into the microphone?**

This is the risky assumption behind a web build. The desktop app captures system
audio natively via a Core Audio process tap and cancels echo with a dedicated
DSP module. A browser has neither, so this probe measures what actually happens.

## Running it

It needs a secure context, so serve it over localhost rather than opening the
file directly:

```bash
cd web/capture-test
python3 -m http.server 8899
# open http://127.0.0.1:8899/ in Chrome or Edge
```

Then:

1. Start a call (or play speech) in the app under test — Teams, Zoom, Meet.
2. Click **Start capture**. In the picker choose **Entire Screen** and tick
   **Share system audio**.
3. Let it run ~20 seconds with the far end talking while you stay quiet.
4. Run it twice: once on **speakers**, once on **headphones**.

Test on Windows and macOS separately — they behave differently. Chrome and Edge
only; Safari and Firefox cannot capture system audio at all.

## Reading the result

| Score | Meaning |
|-------|---------|
| < 0.12 | Clean. The mic is not picking up the far end. |
| 0.12–0.25 | Some bleed. Borderline. |
| ≥ 0.25 | Echo present — the far end would be transcribed twice. |

**How the score works.** Echo means the microphone's energy envelope follows the
system audio's envelope at a short, physically plausible delay (speaker → air →
mic). Naively cross-correlating raw waveforms and taking the maximum over many
lags does *not* work — scanning thousands of lags finds a spurious peak, and two
completely unrelated speech signals score ~0.85. So the probe correlates
short-time **energy envelopes** and reports the peak inside the echo window
**minus** a baseline measured at delays too long to be echo. Unrelated speech
scores alike in both windows and cancels toward zero; only a real echo spikes in
the near window.

Verified against synthetic references in headless Chromium: independent speech
scores ~0.02, and a 0.35-gain delayed echo scores ~0.35.

## What it does not tell you

- Whether the recognizer's own output is degraded — this measures acoustics, not
  transcription quality.
- Anything about a Teams **desktop app** on a machine where the user shares only
  a browser tab. Tab-share captures that tab, not the native client.
- Whether the user will remember to tick "share system audio" every call. That
  operational risk is the probe's real finding: if the box is missed you capture
  mic-only and silently lose half the conversation.
