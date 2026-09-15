import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "../../i18n";
import {
  dismissInCallNudgeHud,
  helloInCallNudgeHud,
  listenForInCallHudState,
  setInCallNudgeHudInteractive,
  type InCallHudStateMessage,
} from "../../lib/sales/inCallNudgeHudBridge";
import {
  initialInCallHudState,
} from "../../lib/sales/inCallNudgeHud";
import type { InCallHudState } from "../../lib/sales/inCallNudgeHud";
import { log } from "../../lib/log";

export function InCallNudgeHudContent({
  state,
  onDismiss,
  emission,
  onCommit,
  whisperSentAtMs,
  onWhisperCommit,
}: {
  state: InCallHudState;
  onDismiss: () => void;
  emission?: { id: number; emittedAtMs: number } | null;
  onCommit?: (measurement: { id: number; latencyMs: number }) => void;
  whisperSentAtMs?: number | null;
  onWhisperCommit?: (latencyMs: number) => void;
}) {
  const { t } = useI18n();
  const ratio = state.talkTimeRatio;
  return (
    <>
      {emission && onCommit && <InCallNudgeHudCommitProbe emission={emission} onCommit={onCommit} />}
      {whisperSentAtMs != null && onWhisperCommit && (
        <InCallNudgeHudWhisperCommitProbe sentAtMs={whisperSentAtMs} onCommit={onWhisperCommit} />
      )}
      <main className="flex h-screen flex-col gap-2 rounded-xl border border-sky-400/30 bg-slate-950/90 p-3 text-slate-100 shadow-2xl backdrop-blur-md">
      <header className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">
          {t("hud.title")}
        </span>
        <div className="flex items-center gap-2 text-[11px] text-slate-300">
          <span>{t("hud.objections")}: {state.objectionCount}</span>
          {ratio ? (
            <span>{t("hud.talkTime")}: {Math.round(ratio.me * 100)}% / {Math.round(ratio.them * 100)}%</span>
          ) : (
            <span>{t("hud.talkTime")} {t("hud.unavailable")}</span>
          )}
        </div>
      </header>

      {state.managerWhisper && (
        <aside
          role="status"
          aria-live="polite"
          className="rounded-lg border border-amber-400/80 bg-amber-500/20 px-2.5 py-2 shadow-[0_0_18px_rgba(251,191,36,0.18)]"
        >
          <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-amber-300">
            {t("hud.managerCoaching")}
          </div>
          <p className="mt-1 text-[12px] font-medium leading-snug text-amber-50">
            {state.managerWhisper.message ?? state.managerWhisper.prompt}
          </p>
        </aside>
      )}

      {state.card && (
        <section className="min-h-0 flex-1 rounded-lg border border-amber-400/40 bg-amber-950/45 p-2.5">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xs font-semibold text-amber-200">{state.card.title}</h1>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t("hud.dismiss")}
              onClick={onDismiss}
              className="-mr-1 -mt-1 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <X />
            </Button>
          </div>
          {state.card.trap && (
            <p className="mt-1.5 text-[11px] leading-snug text-slate-300">{state.card.trap}</p>
          )}
          <p className="mt-2 text-[12px] leading-snug text-slate-100">{state.card.rebuttalScript}</p>
          {state.card.trap ? (
            <p className="mt-2 border-t border-amber-300/20 pt-2 text-[11px] leading-snug text-slate-200">
              {state.card.followUpQuestion}
            </p>
          ) : (
            <div className="mt-2 border-t border-amber-300/20 pt-2">
              <div className="text-[9px] font-bold uppercase tracking-wider text-amber-300">{t("hud.followUp")}</div>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-200">{state.card.followUpQuestion}</p>
            </div>
          )}
        </section>
      )}
      </main>
    </>
  );
}

/** Runs in React's layout-effect phase, immediately after each HUD commit. */
export function InCallNudgeHudCommitProbe({
  emission,
  onCommit,
}: {
  emission: { id: number; emittedAtMs: number } | null;
  onCommit: (measurement: { id: number; latencyMs: number }) => void;
}) {
  const emittedAtMs = emission?.emittedAtMs ?? null;
  const emissionId = emission?.id ?? null;
  useLayoutEffect(() => {
    if (emissionId === null || emittedAtMs === null) return;
    onCommit({ id: emissionId, latencyMs: Math.max(0, Date.now() - emittedAtMs) });
  }, [emissionId, emittedAtMs, onCommit]);
  return null;
}

/** Measures manager-submit to HUD-commit latency at the render seam. */
export function InCallNudgeHudWhisperCommitProbe({
  sentAtMs,
  onCommit,
}: {
  sentAtMs: number;
  onCommit: (latencyMs: number) => void;
}) {
  useLayoutEffect(() => {
    onCommit(Math.max(0, Date.now() - sentAtMs));
  }, [onCommit, sentAtMs]);
  return null;
}

export function InCallNudgeHud() {
  const [message, setMessage] = useState<InCallHudStateMessage>(() => ({
    state: initialInCallHudState(),
    emittedAtMs: 0,
    cardEmissionId: null,
    cardEmittedAtMs: null,
  }));
  const cardId = message.state.card?.id ?? null;

  useEffect(() => {
    let active = true;
    const subscription = listenForInCallHudState((next) => {
      if (!active) return;
      setMessage(next);
    });
    void helloInCallNudgeHud();
    return () => {
      active = false;
      subscription.then((unlisten) => unlisten()).catch(() => undefined);
    };
  }, []);

  const onCommit = useCallback(
    ({ id, latencyMs }: { id: number; latencyMs: number }) => {
      log.info("in-call-nudge-hud: card committed", { cardId, cardEmissionId: id, latencyMs });
    },
    [cardId],
  );
  const onWhisperCommit = useCallback(
    (latencyMs: number) => {
      log.info("in-call-nudge-hud: manager whisper committed", {
        whisperId: message.state.managerWhisper?.id ?? null,
        latencyMs,
      });
    },
    [message.state.managerWhisper?.id],
  );

  async function dismiss() {
    // The window is click-through by default. The bridge enables hit testing
    // while the card is visible; restore pass-through after this interaction.
    await setInCallNudgeHudInteractive(true);
    try {
      await dismissInCallNudgeHud();
    } finally {
      await setInCallNudgeHudInteractive(false);
    }
  }

  return (
    <InCallNudgeHudContent
      state={message.state}
      onDismiss={() => void dismiss()}
      emission={
        message.cardEmissionId === null || message.cardEmittedAtMs === null
          ? null
          : { id: message.cardEmissionId, emittedAtMs: message.cardEmittedAtMs }
      }
      onCommit={onCommit}
      whisperSentAtMs={message.managerWhisperSentAtMs}
      onWhisperCommit={onWhisperCommit}
    />
  );
}
