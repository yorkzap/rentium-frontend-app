import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WobblyCheck } from '@/components/public/illustrations/marks';
import Reveal from '@/components/public/Reveal';
import { PRICING_TIERS } from './data';
import { cn } from '@/lib/utils';

export function PricingTiers() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {PRICING_TIERS.map((tier, i) => (
        <Reveal key={tier.name} delay={i * 0.05} className="h-full">
          <div
            className={cn(
              'card card-lift relative flex h-full flex-col p-7',
              tier.highlighted &&
                'border-brand shadow-[0_20px_50px_-25px_rgba(15,118,110,0.35)]'
            )}
          >
            {tier.highlighted && (
              <span className="absolute -top-3 left-7 rounded-full bg-brand px-3 py-1 text-xs font-medium text-white">
                Most popular
              </span>
            )}
            <h3 className="text-base font-semibold text-ink">{tier.name}</h3>
            <p className="mt-1 text-sm text-ink-3">{tier.description}</p>
            <p className="mt-5">
              <span className="text-4xl font-semibold tracking-tight text-ink">
                {tier.price}
              </span>
              <span className="ml-1.5 text-sm text-ink-4">{tier.period}</span>
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              {tier.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2.5 text-sm text-ink-2"
                >
                  <WobblyCheck className="mt-0.5 shrink-0 text-brand" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              asChild
              variant={tier.highlighted ? 'default' : 'outline'}
              className="mt-8 w-full rounded-full"
            >
              <Link href="/auth/signup">{tier.cta}</Link>
            </Button>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export default function PricingSection() {
  return (
    <section id="pricing" className="border-y border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-kicker">Pricing</p>
            <h2 className="text-title mt-3 text-ink">
              Costs less than one hour of a dispute hearing.
            </h2>
            <p className="mt-4 text-base leading-7 text-ink-3">
              Every plan starts with 30 days free. No credit card required.
            </p>
          </div>
        </Reveal>
        <div className="mt-12">
          <PricingTiers />
        </div>
      </div>
    </section>
  );
}
