import type { Metadata } from "next";
import Reveal from "@/components/public/Reveal";
import { PricingTiers } from "../sections/PricingSection";
import { FaqList } from "../sections/FaqSection";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple monthly pricing for Rentium. Every plan starts with 30 days free — no credit card required.",
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-kicker">Pricing</p>
          <h1 className="text-display mt-3 text-ink">
            Simple pricing, every feature.
          </h1>
          <p className="mt-4 text-lg leading-8 text-ink-3">
            Pick the plan that fits your portfolio. Every plan starts with 30
            days free, no credit card required, and you can change plans
            anytime.
          </p>
        </div>
      </Reveal>
      <div className="mt-14">
        <PricingTiers />
      </div>
      <div className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-title text-center text-ink">Common questions</h2>
        <div className="mt-8">
          <FaqList />
        </div>
      </div>
    </div>
  );
}
