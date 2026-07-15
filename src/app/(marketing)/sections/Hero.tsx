import Link from 'next/link';
import { ArrowRight, CalendarClock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Reveal from '@/components/public/Reveal';
import { Underline, Sparkles } from '@/components/public/illustrations/marks';

// The hero visual is a hand-built composition of the product's real surfaces
// (ledger summary + action items), illustrative numbers only. Swap for real
// screenshots once a seeded demo account exists.
function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden>
      <div className="card rotate-[0.75deg] space-y-4 p-5 shadow-[0_24px_60px_-30px_rgba(14,42,46,0.35)]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-ink-3">July at a glance</p>
          <span className="rounded-full bg-ok-soft px-2.5 py-0.5 text-xs font-medium text-ok-ink">
            All rent in
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Rent expected', '$4,350'],
            ['Collected', '$4,350'],
            ['Deposits held', '$2,125'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-surface-sunken p-3">
              <p className="text-[11px] text-ink-4">{label}</p>
              <p className="mt-1 text-lg font-semibold tracking-tight">
                {value}
              </p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {[
            ['Maple St · Unit 2', 'Paid Jul 1'],
            ['Oak Ave · Suite B', 'Paid Jul 1'],
            ['Fern Rd · Main', 'Paid Jul 2'],
          ].map(([unit, status]) => (
            <div
              key={unit}
              className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5"
            >
              <span className="text-sm font-medium">{unit}</span>
              <span className="flex items-center gap-1.5 text-xs text-ok-ink">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card absolute -bottom-12 -left-4 w-64 -rotate-2 space-y-2 bg-white p-4 shadow-[0_20px_50px_-25px_rgba(14,42,46,0.4)] sm:-left-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-4">
          Needs attention
        </p>
        <div className="flex items-start gap-2.5 rounded-lg bg-warn-soft p-3">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-warn-ink" />
          <p className="text-xs leading-5 text-warn-ink">
            Schedule the move-in condition inspection for Oak Ave — required by
            BC RTB.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="overflow-hidden border-b border-line">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-24">
        <Reveal>
          <div className="max-w-xl">
            <p className="text-kicker">
              Property management for Canadian landlords
            </p>
            <h1 className="text-display mt-4 text-ink">
              The paperwork side of renting, finally{' '}
              <span className="relative inline-block">
                handled.
                <Underline />
              </span>
            </h1>
            <p className="mt-5 text-lg leading-8 text-ink-2">
              Compliant leases, condition inspections, deposit rules and an
              audit-proof ledger — Rentium keeps you on the right side of your
              province&rsquo;s tenancy law while it runs the day-to-day.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-full px-7">
                <Link href="/auth/signup">
                  Start your free trial
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full px-7"
              >
                <Link href="/#product">See how it works</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-ink-4">
              30 days free · No credit card required
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="relative">
            <Sparkles className="absolute -right-2 -top-8 text-brand" />
            <HeroVisual />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
