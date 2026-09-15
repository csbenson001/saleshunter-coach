import { useEffect, useReducer, useRef } from "react";
import { useStore } from "../store";
import { talkTimeRatio } from "../analysis/delivery";
import { matchObjection } from "./objectionBuster";
import { matchConcessionTrade } from "./concessionMatrix";
import {
  competitiveKillCardForHud,
  matchCompetitiveKillCard,
} from "./competitiveBattlecards";
import {
  broadcastInCallHudState,
  destroyInCallNudgeHudWindow,
  ensureInCallNudgeHudWindow,
  listenForInCallHudRequests,
  listenForManagerWhispers,
  setInCallNudgeHudInteractive,
} from "./inCallNudgeHudBridge";
import {
  initialInCallHudState,
  createInCallHudCardEmission,
  reduceInCallHudState,
  shouldShowInCallNudgeHud,
  type HudWhisperSeat,
  type InCallHudEvent,
} from "./inCallNudgeHud";
import { isTauri } from "../tauriEvents";
import { log } from "../log";

/** Keep the main window as the single source of truth for live HUD state. */
export function useInCallNudgeHudHost(seat?: HudWhisperSeat): void {
  const meetingStatus = useStore((s) => s.meetingStatus);
  const meetingStartedAt = useStore((s) => s.meetingStartedAt);
  const segments = useStore((s) => s.segments);
  const [state, dispatch] = useReducer(
    (current: ReturnType<typeof initialInCallHudState>, event: InCallHudEvent) =>
      reduceInCallHudState(current, event, Date.now()),
    undefined,
    initialInCallHudState,
  );
  const stateRef = useRef(state);
  const seenSegmentId = useRef<string | null>(null);
  const objectionCount = useRef(0);
  const meetingRef = useRef<number | null>(null);
  const cardEmission = useRef<{ id: number; emittedAtMs: number } | null>(null);
  stateRef.current = state;

  // Reset state and detection counters for each recording. Paused meetings are
  // intentionally not considered active: the HUD is meeting-only and is hidden
  // until recording resumes.
  useEffect(() => {
    if (meetingStatus !== "recording" || meetingStartedAt === meetingRef.current) return;
    meetingRef.current = meetingStartedAt;
    seenSegmentId.current = null;
    objectionCount.current = 0;
    cardEmission.current = null;
    dispatch({ type: "dismiss-card" });
    dispatch({ type: "dismiss-whisper" });
    dispatch({ type: "metrics", objectionCount: 0, talkTimeRatio: null });
  }, [meetingStartedAt, meetingStatus]);

  // Feed the HUD from the existing live transcript primitives. Reducer dispatch
  // is synchronous; no debounce or request sits between a matched utterance and
  // the state that the HUD window receives.
  useEffect(() => {
    if (meetingStatus !== "recording") return;
    dispatch({
      type: "metrics",
      objectionCount: objectionCount.current,
      talkTimeRatio: talkTimeRatio(segments),
    });

    const latest = [...segments].reverse().find((segment) => segment.isFinal);
    if (!latest || latest.id === seenSegmentId.current) return;
    seenSegmentId.current = latest.id;

    // Check concession trades first (e.g. discount / terms pressure)
    const concession = matchConcessionTrade(latest.text);
    if (concession) {
      objectionCount.current += 1;
      const tradeOptions = (concession.recommendedTradeDemands || []).map((t) => t.label);
      const emission = createInCallHudCardEmission(
        cardEmission.current?.id ?? null,
        concession.id,
        Date.now(),
      );
      cardEmission.current = { id: emission.id, emittedAtMs: emission.emittedAtMs };
      dispatch({
        type: "metrics",
        objectionCount: objectionCount.current,
        talkTimeRatio: talkTimeRatio(segments),
      });
      dispatch({
        type: "objection-card",
        card: {
          id: concession.id,
          title: concession.category === "discount" ? "Discount Pressure Detected" : "Concession Pressure Detected",
          rebuttalScript: concession.exactCounterpunchScript || "Trade price for commitment: require annual pre-pay or a 2-year agreement before discussing any discount.",
          followUpQuestion: "What specific metric does finance need to confirm before we finalize?",
          tradeOptions,
        },
      });
      return;
    }

    const competitiveCard = matchCompetitiveKillCard(latest.text);
    const card = competitiveCard
      ? competitiveKillCardForHud(competitiveCard)
      : matchObjection(latest.text);
    if (!card) return;
    objectionCount.current += 1;
    const emission = createInCallHudCardEmission(
      cardEmission.current?.id ?? null,
      card.id,
      Date.now(),
    );
    cardEmission.current = { id: emission.id, emittedAtMs: emission.emittedAtMs };
    dispatch({
      type: "metrics",
      objectionCount: objectionCount.current,
      talkTimeRatio: talkTimeRatio(segments),
    });
    dispatch({
      type: "objection-card",
      card: {
        id: card.id,
        title: card.title,
        trap: "trap" in card ? card.trap : undefined,
        rebuttalScript: card.rebuttalScript,
        followUpQuestion: card.followUpQuestion,
      },
    });
  }, [meetingStatus, segments]);

  // Expiry is driven by explicit ticks rather than a reducer-owned timer. This
  // keeps the pure contract deterministic while ensuring both windows agree on
  // the dismissal boundary.
  useEffect(() => {
    if (meetingStatus !== "recording") return;
    const timer = (typeof window !== "undefined" && typeof window.setInterval === "function") ? window.setInterval : setInterval;
    const clear = (typeof window !== "undefined" && typeof window.clearInterval === "function") ? window.clearInterval : clearInterval;
    const id = timer(() => dispatch({ type: "tick" }), 250);
    return () => clear(id);
  }, [meetingStatus]);

  // Broadcast after React has reduced the event so the secondary window only
  // ever sees complete immutable state snapshots.
  useEffect(() => {
    if (!isTauri() || !shouldShowInCallNudgeHud(meetingStatus)) return;
    void broadcastInCallHudState(state, cardEmission.current).catch((error) =>
      log.warn("in-call-nudge-hud: state broadcast failed", { error: String(error) }),
    );
  }, [meetingStatus, state]);

  useEffect(() => {
    let active = true;
    if (isTauri() && shouldShowInCallNudgeHud(meetingStatus)) {
      void ensureInCallNudgeHudWindow()
        .then(() => setInCallNudgeHudInteractive(stateRef.current.card !== null))
        .catch((error) => log.warn("in-call-nudge-hud: open failed", { error: String(error) }));
    } else if (isTauri()) {
      void destroyInCallNudgeHudWindow();
    }

    const requests = listenForInCallHudRequests({
      onHello: () => {
        if (active && meetingStatus === "recording") {
          void broadcastInCallHudState(stateRef.current, cardEmission.current);
        }
      },
      onDismiss: () => {
        if (active) dispatch({ type: "dismiss-card" });
      },
    });
    const whispers = listenForManagerWhispers((whisper) => {
      if (active && meetingStatus === "recording") dispatch({ type: "manager-whisper", whisper });
    }, seat);
    requests.catch((error) => log.warn("in-call-nudge-hud: request listener failed", { error: String(error) }));
    whispers.catch((error) => log.warn("in-call-nudge-hud: manager whisper listener failed", { error: String(error) }));
    return () => {
      active = false;
      requests.then((unlisten) => unlisten()).catch(() => undefined);
      whispers.then((unlisten) => unlisten()).catch(() => undefined);
    };
  }, [meetingStatus, seat?.callId, seat?.repId]);
}
