import { ShieldCheck } from "lucide-react";
import Reveal from "@/components/public/Reveal";

const ITEMS = [
  {
    title: "RTB-1 leases",
    body: "Tenancy agreements follow the standard BC form, generated from your property and tenant details.",
  },
  {
    title: "RTB-27 inspections",
    body: "Move-in and move-out condition reports with both signatures, delivered within the required timelines.",
  },
  {
    title: "Deposit rules",
    body: "Security and pet deposits capped, tracked separately from income, and returned with interest on time.",
  },
  {
    title: "Notices & timelines",
    body: "Entry notices, signing deadlines and tenancy-end dates surfaced before they become problems.",
  },
];

export default function Compliance() {
  return (
    <section id="compliance" className="bg-deep text-ink-inverse">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <Reveal>
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-brand-bright">
              <ShieldCheck className="h-4 w-4" />
              Built for the BC RTB
            </p>
            <h2 className="text-title mt-3">
              Compliance isn&rsquo;t a feature here. It&rsquo;s the foundation.
            </h2>
            <p className="mt-4 text-base leading-7 text-ink-inverse-muted">
              The Residential Tenancy Act is encoded into how Rentium works —
              per-province rules decide what each tenancy requires, and the app
              tells you what&rsquo;s due and when. More provinces are coming; the
              rulebook is built to grow.
            </p>
          </div>
        </Reveal>
        <div className="mt-12 grid gap-px overflow-hidden rounded-xl bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.05} className="h-full">
              <div className="h-full bg-deep-raised p-6">
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-inverse-muted">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
