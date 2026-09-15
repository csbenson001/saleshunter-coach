import type { JSX } from "react";
import type { PreCallDossier } from "../../lib/sales/preCallDossier";

function DossierText({ value }: { value: string }): JSX.Element {
  // Keep prose punctuation readable in static markup while still treating
  // dossier content as untrusted text, never as executable markup.
  const html = value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/** A compact, static presentation surface for the one-minute pre-call glance. */
export function PreCallDossierCard({ dossier }: { dossier: PreCallDossier }): JSX.Element {
  return (
    <article
      aria-label="Pre-call intelligence dossier"
      className="flex max-h-full flex-col gap-3 overflow-auto rounded-xl border border-amber-400/35 bg-slate-950/95 p-4 text-slate-100 shadow-2xl backdrop-blur-md"
    >
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">Pre-call dossier</p>
        <h1 className="mt-1 text-base font-semibold text-white">60-second battlecard</h1>
      </header>

      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-300">Economic Buyer</h2>
        <p className="mt-1 text-sm leading-snug text-slate-200"><DossierText value={dossier.economicBuyerBackground} /></p>
      </section>

      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-300">Last Meeting Blocker</h2>
        <p className="mt-1 text-sm leading-snug text-slate-200"><DossierText value={dossier.lastMeetingBlocker} /></p>
      </section>

      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-300">Competitor Traps</h2>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-sm leading-snug text-slate-200">
          {dossier.competitorTraps.map((trap, index) => <li key={`${index}-${trap}`}><DossierText value={trap} /></li>)}
        </ul>
      </section>

      <section className="border-t border-amber-300/20 pt-3">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">Opening Question</h2>
        <p className="mt-1 text-sm font-medium leading-snug text-amber-50"><DossierText value={dossier.openingQuestion} /></p>
      </section>
    </article>
  );
}
