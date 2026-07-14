import { FileWarning, Landmark, Scale } from "lucide-react";
import Reveal from "@/components/public/Reveal";

const PAINS = [
  {
    icon: Scale,
    title: "The Act doesn't wait",
    body: "Move-in inspections, deposit deadlines, notice periods — the RTA has rules with real consequences, and a spreadsheet won't remind you about any of them.",
  },
  {
    icon: Landmark,
    title: "Money without a paper trail",
    body: "Rent in e-transfers, deposits in a shoebox, expenses in your head. When a dispute lands, \"I'm pretty sure they paid\" is not a record.",
  },
  {
    icon: FileWarning,
    title: "Documents everywhere and nowhere",
    body: "The lease is a PDF in email, the inspection is photos on your phone, the agreement to end tenancy is… somewhere. One tenancy, five filing systems.",
  },
];

export default function Problem() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
      <Reveal>
        <div className="max-w-2xl">
          <p className="text-kicker">Why Rentium exists</p>
          <h2 className="text-title mt-3 text-ink">
            Being a landlord is a legal role. Most tools treat it like a to-do
            list.
          </h2>
        </div>
      </Reveal>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {PAINS.map((pain, i) => (
          <Reveal key={pain.title} delay={i * 0.05}>
            <div className="card h-full p-6">
              <pain.icon className="h-5 w-5 text-brand" />
              <h3 className="mt-4 text-base font-semibold text-ink">{pain.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-3">{pain.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
