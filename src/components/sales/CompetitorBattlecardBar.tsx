import { useMemo, useState } from "react";
import { ShieldCheck, Swords, X } from "lucide-react";
import { useI18n, type TranslationKey } from "../../i18n";
import {
  GONG_COEXISTENCE_PROOF,
  detectGongIncumbentObjection,
} from "../../lib/sales/gongCoexistence";
import { useStore } from "../../lib/store";

const OTHER_COMPETITORS = [
  {
    name: "ZoomInfo / Apollo",
    triggerRegex: /\b(zoominfo|apollo)\b/i,
    differentiationKey: "competitor.zoominfo.differentiation" satisfies TranslationKey,
    questionKey: "competitor.zoominfo.question" satisfies TranslationKey,
  },
  {
    name: "Clari",
    triggerRegex: /\bclari\b/i,
    differentiationKey: "competitor.clari.differentiation" satisfies TranslationKey,
    questionKey: "competitor.clari.question" satisfies TranslationKey,
  },
] as const;

export function CompetitorBattlecardBar() {
  const { t } = useI18n();
  const segments = useStore((state) => state.segments);
  const [dismissedSegmentId, setDismissedSegmentId] = useState<string | null>(null);

  const triggeringSegment = useMemo(
    () =>
      segments
        .slice(-8)
        .reverse()
        .find(
          (segment) =>
            segment.isFinal &&
            segment.source !== "me" &&
            detectGongIncumbentObjection(segment.text)
        ) ?? null,
    [segments]
  );
  const matchedOtherCompetitor = useMemo(() => {
    const recentText = segments
      .slice(-5)
      .map((segment) => segment.text)
      .join(" ");
    return OTHER_COMPETITORS.find((competitor) => competitor.triggerRegex.test(recentText)) ?? null;
  }, [segments]);

  if (!triggeringSegment || triggeringSegment.id === dismissedSegmentId) {
    if (!matchedOtherCompetitor) return null;
    return (
      <section className="shrink-0 border-b border-sky-500/30 bg-sky-500/8 px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-sky-300">
          <Swords className="size-4" aria-hidden />
          <span>{t("competitor.detected", { name: matchedOtherCompetitor.name })}</span>
        </div>
        <div className="mt-1 grid gap-1 leading-snug text-foreground/90 lg:grid-cols-2 lg:gap-4">
          <p>{t(matchedOtherCompetitor.differentiationKey)}</p>
          <p>
            <span className="mr-1 font-semibold text-amber-300">{t("competitor.ask")}:</span>
            {t(matchedOtherCompetitor.questionKey)}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="gong-coexistence-defense"
      role="status"
      aria-live="polite"
      className="shrink-0 border-b border-sky-500/30 bg-sky-500/8 px-3 py-2 text-xs"
    >
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-sky-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-foreground">{t("coexistence.detected")}</span>
            <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300">
              {t("coexistence.strategy")}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {t("coexistence.proof", {
                seats: GONG_COEXISTENCE_PROOF.seatCount,
                roi: GONG_COEXISTENCE_PROOF.targetRoiMultiplier,
              })}
            </span>
          </div>
          <div className="mt-1 grid gap-1 leading-snug text-foreground/90 lg:grid-cols-2 lg:gap-4">
            <p>
              <span className="mr-1 font-semibold text-sky-300">{t("coexistence.say")}:</span>
              {t("coexistence.positioning")}
            </p>
            <p>
              <span className="mr-1 font-semibold text-amber-300">{t("coexistence.ask")}:</span>
              {t("coexistence.question")}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label={t("common.dismiss")}
          onClick={() => setDismissedSegmentId(triggeringSegment.id)}
          className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-sky-500/15 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </section>
  );
}
