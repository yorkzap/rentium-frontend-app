import {
  BookOpenCheck, CalendarDays, ClipboardCheck, FileSignature, Users, Wrench,
} from "lucide-react";
import Reveal from "@/components/public/Reveal";

// These map 1:1 to real modules in the product — no aspirational features.
const FEATURES = [
  {
    icon: BookOpenCheck,
    title: "An honest ledger",
    body: "Every charge, payment and expense in one append-only record. Corrections are visible reversals — your books can survive an audit or a dispute.",
  },
  {
    icon: FileSignature,
    title: "Leases that sign themselves",
    body: "Generate the lease, send it, and watch signatures land — with the tenancy moving through clear states from draft to active to ended.",
  },
  {
    icon: ClipboardCheck,
    title: "Condition inspections",
    body: "Move-in and move-out inspections captured room by room, signed by both parties, delivered on the timeline the RTB requires.",
  },
  {
    icon: Wrench,
    title: "Maintenance with memory",
    body: "Requests come in from tenants, become work orders, and stay visible until they're actually resolved — not until everyone forgets.",
  },
  {
    icon: CalendarDays,
    title: "One calendar for the tenancy",
    body: "Viewings, rent dates, inspections, lease ends and entry notices in a single view, for you and for your tenants.",
  },
  {
    icon: Users,
    title: "A portal tenants actually use",
    body: "Documents, rent history, receipts and maintenance in one place for tenants — which means fewer texts at dinner time for you.",
  },
];

export default function Product() {
  return (
    <section id="product" className="border-y border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <Reveal>
          <div className="max-w-2xl">
            <p className="text-kicker">The product</p>
            <h2 className="text-title mt-3 text-ink">
              Everything a tenancy produces, in one system of record.
            </h2>
            <p className="mt-4 text-base leading-7 text-ink-3">
              Rentium isn&rsquo;t a checklist bolted onto a spreadsheet. It&rsquo;s the
              lease, the money, the inspections and the maintenance — connected,
              so nothing falls between tools.
            </p>
          </div>
        </Reveal>
        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.05}>
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft">
                  <f.icon className="h-5 w-5 text-brand" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-ink">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-3">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
