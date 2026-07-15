import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Reveal from "@/components/public/Reveal";
import { Underline } from "@/components/public/illustrations/marks";
import { LedgerBook } from "@/components/public/illustrations/spots";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why Rentium exists: property management software that takes the legal side of renting as seriously as landlords have to.",
};

const PRINCIPLES = [
  {
    title: "The law is the spec",
    body: "Most rental software is a generic checklist with a Canadian coat of paint. Rentium starts from tenancy law itself — the forms, the deadlines, the deposit rules, encoded province by province beginning with BC's Residential Tenancy Act — and builds the product around what the law actually requires of you.",
  },
  {
    title: "Records you can stand behind",
    body: "Financial history in Rentium is append-only: corrections are visible reversals, never silent edits. When a tenancy ends in a disagreement, your ledger reads like a bank statement, not a story.",
  },
  {
    title: "Both sides see the same truth",
    body: "Tenants get the same documents, the same rent history, the same inspection reports you do. Shared records prevent more disputes than good intentions ever will.",
  },
  {
    title: "Software that tells you things",
    body: "You shouldn't need to remember that a move-in inspection is due or that a deposit clock is running. Rentium watches the tenancy and surfaces what needs doing — before it's overdue.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
      <Reveal>
        <div className="flex items-start justify-between gap-8">
          <div>
            <p className="text-kicker">About Rentium</p>
            <h1 className="text-display mt-3 text-ink">
              Renting runs on trust. Trust runs on{" "}
              <span className="relative inline-block">
                records.
                <Underline />
              </span>
            </h1>
          </div>
          <LedgerBook className="mt-4 hidden h-32 shrink-0 sm:block" />
        </div>
        <p className="mt-5 text-lg leading-8 text-ink-2">
          Rentium was built in British Columbia by people who kept watching the
          same thing happen: good landlords and good tenants ending up in bad
          disputes, because the paperwork lived in five places and the deadlines
          lived in nobody&rsquo;s calendar.
        </p>
      </Reveal>

      <div className="mt-14">
        {PRINCIPLES.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.04}>
            <div className="flex gap-6 border-t border-line py-8 sm:gap-10">
              <span className="text-2xl font-semibold tabular-nums text-brand/60 sm:text-3xl">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 className="text-lg font-semibold text-ink">{p.title}</h2>
                <p className="mt-2 text-base leading-7 text-ink-3">{p.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div className="card mt-16 flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              See it with your own properties.
            </h2>
            <p className="mt-1 text-sm text-ink-3">
              Thirty days free. Every feature. No credit card.
            </p>
          </div>
          <Button asChild className="rounded-full px-6">
            <Link href="/auth/signup">
              Get started
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Reveal>
    </div>
  );
}
