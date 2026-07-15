import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import Reveal from "@/components/public/Reveal";
import { FaqList } from "../sections/FaqSection";
import { MailNotice } from "@/components/public/illustrations/spots";

export const metadata: Metadata = {
  title: "Help & FAQ",
  description:
    "Answers to common questions about Rentium, plus official BC Residential Tenancy Branch resources.",
};

const RTB_RESOURCES = [
  {
    label: "BC Residential Tenancy Branch",
    href: "https://www2.gov.bc.ca/gov/content/housing-tenancy/residential-tenancies",
    note: "Official guidance on tenancy law in British Columbia.",
  },
  {
    label: "RTB-1 — Residential Tenancy Agreement",
    href: "https://www2.gov.bc.ca/gov/content/housing-tenancy/residential-tenancies/forms",
    note: "The standard BC tenancy agreement form Rentium leases follow.",
  },
  {
    label: "RTB-27 — Condition Inspection Report",
    href: "https://www2.gov.bc.ca/gov/content/housing-tenancy/residential-tenancies/forms",
    note: "The move-in / move-out inspection report format.",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
      <Reveal>
        <div className="flex items-start justify-between gap-8">
          <div>
            <p className="text-kicker">Help</p>
            <h1 className="text-display mt-3 text-ink">How can we help?</h1>
            <p className="mt-4 text-lg leading-8 text-ink-3">
              The answers below cover the questions we hear most. If yours
              isn&rsquo;t here, we&rsquo;re easy to reach from your dashboard.
            </p>
          </div>
          <MailNotice className="mt-2 hidden h-32 shrink-0 sm:block" />
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-ink">
            Frequently asked questions
          </h2>
          <div className="mt-4">
            <FaqList />
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-16">
          <h2 className="text-lg font-semibold text-ink">
            Official BC tenancy resources
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-3">
            Rentium encodes these rules, but the source of truth is always the
            Residential Tenancy Branch.
          </p>
          <ul className="mt-6 space-y-4">
            {RTB_RESOURCES.map((r) => (
              <li key={r.label} className="card card-lift p-5">
                <Link
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-medium text-brand hover:text-brand-hover"
                >
                  {r.label}
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <p className="mt-1.5 text-sm text-ink-3">{r.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  );
}
