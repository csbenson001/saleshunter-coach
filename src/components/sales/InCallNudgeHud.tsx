import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
}: {
  state: InCallHudState;
  onDismiss: () => void;
}) {
  const { t } = useI18n();
  const ratio = state.talkTimeRatio;
  return (
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
          <p className="mt-2 text-[12px] leading-snug text-slate-100">{state.card.rebuttalScript}</p>
          <div className="mt-2 border-t border-amber-300/20 pt-2">
            <div className="text-[9px] font-bold uppercase tracking-wider text-amber-300">{t("hud.followUp")}</div>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-200">{state.card.followUpQuestion}</p>
          </div>
        </section>
      )}
    </main>
  );
}

export function InCallNudgeHud() {
  const [message, setMessage] = useState<InCallHudStateMessage>(() => ({
    state: initialInCallHudState(),
    emittedAtMs: 0,
    cardEmissionId: null,
    cardEmittedAtMs: null,
  }));
  const pendingEmissionAtMs = useRef<number | null>(null);
  const lastEmissionId = useRef<number | null>(null);
  const cardId = message.state.card?.id ?? null;
  const cardEmissionId = message.cardEmissionId;

  useEffect(() => {
    let active = true;
    const subscription = listenForInCallHudState((next) => {
      if (!active) return;
      if (next.cardEmissionId !== null && next.cardEmissionId !== lastEmissionId.current) {
        pendingEmissionAtMs.current = next.cardEmittedAtMs ?? next.emittedAtMs;
        lastEmissionId.current = next.cardEmissionId;
      }
      setMessage(next);
    });
    void helloInCallNudgeHud();
    return () => {
      active = false;
      subscription.then((unlisten) => unlisten()).catch(() => undefined);
    };
  }, []);

  useLayoutEffect(() => {
    if (!cardId || cardEmissionId === null || pendingEmissionAtMs.current === null) return;
    const latencyMs = Date.now() - pendingEmissionAtMs.current;
    log.info("in-call-nudge-hud: card committed", { cardId, cardEmissionId, latencyMs });
    pendingEmissionAtMs.current = null;
  }, [cardEmissionId, cardId]);

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

  return <InCallNudgeHudContent state={message.state} onDismiss={() => void dismiss()} />;
}
