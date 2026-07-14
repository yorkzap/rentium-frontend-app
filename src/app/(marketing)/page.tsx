// src/app/(marketing)/page.tsx
// The homepage, as a server component assembling focused sections. The
// audience is a prospective landlord: lead with the compliance + ledger
// story, keep the page honest (no invented testimonials or customer logos).
import type { Metadata } from "next";
import Hero from "./sections/Hero";
import Problem from "./sections/Problem";
import Product from "./sections/Product";
import Compliance from "./sections/Compliance";
import Audience from "./sections/Audience";
import PricingSection from "./sections/PricingSection";
import FaqSection from "./sections/FaqSection";
import Cta from "./sections/Cta";

export const metadata: Metadata = {
  title: "Rentium — Simply smart rentals",
  description:
    "Property management built for BC landlords: RTB-1 leases, RTB-27 condition inspections, deposit rules and an audit-proof ledger — with a portal tenants actually use.",
};

export default function Home() {
  return (
    <>
      <Hero />
      <Problem />
      <Product />
      <Compliance />
      <Audience />
      <PricingSection />
      <FaqSection />
      <Cta />
    </>
  );
}
