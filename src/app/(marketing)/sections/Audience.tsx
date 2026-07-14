"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Reveal from "@/components/public/Reveal";

const LANDLORD_POINTS = [
  "See expected vs collected rent — including deposits — the moment you log in",
  "Get told what the RTA requires next: inspections, notices, deadlines",
  "Keep an audit-proof record of every dollar and document",
  "Publish listings and your own branded showcase page",
];

const TENANT_POINTS = [
  "Sign your lease and inspection reports online",
  "See rent history and download receipts anytime",
  "Report maintenance and watch its status — no chasing",
  "Know about visits and inspections before they happen",
];

function Points({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map((point) => (
        <li key={point} className="flex items-start gap-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft">
            <Check className="h-3 w-3 text-brand" />
          </span>
          <span className="text-sm leading-6 text-ink-2">{point}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Audience() {
  return (
    <section id="landlords" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-kicker">Both sides of the tenancy</p>
          <h2 className="text-title mt-3 text-ink">
            Landlords run it. Tenants can finally see it.
          </h2>
        </div>
      </Reveal>
      <Reveal delay={0.05}>
        <Tabs defaultValue="landlords" className="mx-auto mt-10 max-w-2xl">
          <TabsList className="grid w-full grid-cols-2 rounded-full p-1">
            <TabsTrigger value="landlords" className="rounded-full">
              For landlords
            </TabsTrigger>
            <TabsTrigger value="tenants" className="rounded-full" id="tenants">
              For tenants
            </TabsTrigger>
          </TabsList>
          <TabsContent value="landlords" className="card mt-4 p-8">
            <h3 className="text-lg font-semibold text-ink">
              Run every tenancy like you have a back office.
            </h3>
            <Points items={LANDLORD_POINTS} />
            <Button asChild className="mt-8 rounded-full px-6">
              <Link href="/auth/signup">Start managing free</Link>
            </Button>
          </TabsContent>
          <TabsContent value="tenants" className="card mt-4 p-8">
            <h3 className="text-lg font-semibold text-ink">
              Renting with a paper trail that protects you too.
            </h3>
            <Points items={TENANT_POINTS} />
            <Button asChild variant="outline" className="mt-8 rounded-full px-6">
              <Link href="/bc/saanich">Browse rentals</Link>
            </Button>
          </TabsContent>
        </Tabs>
      </Reveal>
    </section>
  );
}
