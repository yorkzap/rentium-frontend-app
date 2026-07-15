import Reveal from "@/components/public/Reveal";
import { WobblyCheck } from "@/components/public/illustrations/marks";
import {
  HouseKeys, InspectionWalk, LedgerBook,
} from "@/components/public/illustrations/spots";
import { cn } from "@/lib/utils";

// Three editorial feature rows, illustration on one side and the case on the
// other — not a grid of icon tiles. Every claim maps to a real module.
const ROWS = [
  {
    art: LedgerBook,
    kicker: "The money",
    title: "An honest ledger",
    body: "Every charge, payment, deposit and expense in one append-only record. Corrections are visible reversals — never silent edits — so your books can survive an audit or a dispute hearing.",
    points: [
      "Rent expected vs collected, month by month",
      "Deposits tracked separately from income, as the law requires",
      "Receipts your tenants can download themselves",
    ],
  },
  {
    art: InspectionWalk,
    kicker: "The legal record",
    title: "Leases and inspections that keep up with the law",
    body: "Generate the lease, collect signatures online, and walk the move-in inspection room by room — signed by both parties and delivered on the timeline your province requires.",
    points: [
      "Tenancies move through clear states, draft to active to ended",
      "Condition reports with both signatures, delivered on time",
      "The app tells you what's due next — before it's overdue",
    ],
  },
  {
    art: HouseKeys,
    kicker: "The day-to-day",
    title: "Maintenance, viewings and one shared calendar",
    body: "Tenant requests become work orders that stay visible until resolved. Viewings, rent dates, inspections and entry notices land on one calendar — yours and your tenants'.",
    points: [
      "A portal tenants actually use — fewer texts at dinner time",
      "Entry notices and visits announced ahead, automatically",
      "Public listing pages and your own branded showcase site",
    ],
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
          </div>
        </Reveal>

        <div className="mt-16 space-y-20 lg:space-y-24">
          {ROWS.map((row, i) => (
            <Reveal key={row.title}>
              <div
                className={cn(
                  "grid items-center gap-10 lg:grid-cols-2 lg:gap-16",
                )}
              >
                <div
                  className={cn(
                    "flex justify-center",
                    i % 2 === 1 && "lg:order-2",
                  )}
                >
                  <row.art className="h-48 sm:h-56" />
                </div>
                <div className={cn(i % 2 === 1 && "lg:order-1")}>
                  <p className="text-kicker">{row.kicker}</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                    {row.title}
                  </h3>
                  <p className="mt-3 text-base leading-7 text-ink-3">{row.body}</p>
                  <ul className="mt-5 space-y-2.5">
                    {row.points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-sm leading-6 text-ink-2">
                        <WobblyCheck className="mt-1 shrink-0 text-brand" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
