import { ShieldCheck } from "lucide-react";
import Reveal from "@/components/public/Reveal";
import { WobblyCheck } from "@/components/public/illustrations/marks";
import { CanadaMap } from "@/components/public/illustrations/spots";

const BC_RULES = [
  {
    title: "RTB-1 leases",
    body: "generated on the standard BC agreement form",
  },
  {
    title: "RTB-27 inspections",
    body: "move-in and move-out reports, signed and delivered on time",
  },
  {
    title: "Deposit rules",
    body: "capped, tracked apart from income, returned with interest",
  },
  {
    title: "Notices & timelines",
    body: "entry notices and deadlines surfaced before they're problems",
  },
];

export default function Compliance() {
  return (
    <section id="compliance" className="bg-deep text-ink-inverse">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
          <Reveal>
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-brand-bright">
                <ShieldCheck className="h-4 w-4" />
                Built for Canadian tenancy law
              </p>
              <h2 className="text-title mt-3">
                Compliance isn&rsquo;t a feature here. It&rsquo;s the foundation.
              </h2>
              <p className="mt-4 text-base leading-7 text-ink-inverse-muted">
                Every province rents under its own rules, so Rentium encodes
                tenancy law province by province — the rules engine decides
                what each tenancy requires, and the app tells you what&rsquo;s
                due and when. British Columbia&rsquo;s RTB rulebook is live
                today; the rest of Canada is what the engine was built for.
              </p>
              <ul className="mt-8 space-y-4">
                {BC_RULES.map((rule) => (
                  <li key={rule.title} className="flex items-start gap-3">
                    <WobblyCheck className="mt-1 h-5 w-5 shrink-0 text-brand-bright" />
                    <p className="text-sm leading-6">
                      <span className="font-semibold">{rule.title}</span>
                      <span className="text-ink-inverse-muted"> — {rule.body}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="flex flex-col items-center">
              <CanadaMap className="h-52 w-auto sm:h-64" />
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full bg-brand-bright/15 px-3.5 py-1.5 text-xs font-semibold text-brand-bright">
                  Live in British Columbia
                </span>
                <span className="rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-medium text-ink-inverse-muted">
                  More provinces on the way
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
