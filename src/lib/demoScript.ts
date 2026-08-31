import { useStore } from "./store";
import type { Source } from "./types";

/**
 * The DEMO SCRIPT. A canned six-line conversation for showing the app without a
 * microphone — demos, screenshots, walkthroughs.
 *
 * It is NOT a fallback. It runs only when Settings.demoScript is explicitly on.
 * It used to run automatically whenever no transcription key was configured,
 * which meant the app could sit in a real meeting playing a script while the
 * screen said LIVE — the operator would only find out afterwards, when there
 * was nothing to review. `meeting/start.ts` now refuses to start instead.
 *
 * It emits partial segments that grow word by word and then settle, through the
 * same `upsertSegment` path real transcript events use, so what a demo shows is
 * shaped like the real thing.
 */

const SCRIPT: { source: Source; speaker: number; text: string }[] = [
  { source: "me", speaker: 0, text: "Thanks for taking the time today. Could you walk me through how your team handles delivery timelines?" },
  { source: "them", speaker: 1, text: "Absolutely. We always ship on time, every single project, no exceptions — we're known for it." },
  { source: "me", speaker: 0, text: "That's great to hear. Can you share a recent example with specific dates?" },
  { source: "them", speaker: 2, text: "Well, dates vary, but trust me, our clients are always happy. Let's talk about pricing instead." },
  { source: "me", speaker: 0, text: "Sure, but I'd still like to understand the timeline guarantees in the contract." },
  { source: "them", speaker: 1, text: "The standard terms require full payment upfront and a twelve-month lock-in, that's non-negotiable." },
];

let timer: ReturnType<typeof setTimeout> | null = null;

export function startDemoScript() {
  stopDemoScript();
  const { meetingStartedAt } = useStore.getState();
  const base = meetingStartedAt ?? Date.now();
  let line = 0;

  function emitLine() {
    const status = useStore.getState().meetingStatus;
    // Paused → hold this position and poll for resume (the dev stand-in for the
    // backend's dropped-audio pause); anything else ends the stream.
    if (status === "paused") {
      timer = setTimeout(emitLine, 300);
      return;
    }
    if (status !== "recording") return;
    if (line >= SCRIPT.length) return;

    const { source, speaker, text } = SCRIPT[line];
    const id = `mock-${line}`;
    const words = text.split(" ");
    const startMs = Date.now() - base;
    let wordIdx = 0;

    function emitWord() {
      const status = useStore.getState().meetingStatus;
      if (status === "paused") {
        timer = setTimeout(emitWord, 300);
        return;
      }
      if (status !== "recording") return;
      wordIdx++;
      const partial = words.slice(0, wordIdx).join(" ");
      const isFinal = wordIdx >= words.length;
      useStore.getState().upsertSegment({
        id,
        source,
        speaker,
        text: partial,
        isFinal,
        startMs,
        endMs: Date.now() - base,
      });
      if (!isFinal) {
        timer = setTimeout(emitWord, 90 + Math.random() * 120); // NOSONAR — non-cryptographic jitter for mock stream timing, not security-sensitive
      } else {
        line++;
        timer = setTimeout(emitLine, 1200);
      }
    }
    emitWord();
  }

  timer = setTimeout(emitLine, 600);
}

export function stopDemoScript() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}
