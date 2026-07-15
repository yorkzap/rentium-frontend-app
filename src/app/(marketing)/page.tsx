// src/app/(marketing)/page.tsx
// The homepage, as a server component assembling focused sections. The
// audience is a prospective landlord: lead with the compliance + ledger
// story, keep the page honest (no invented testimonials or customer logos).
import type { Metadata } from 'next';
import Hero from './sections/Hero';
import Problem from './sections/Problem';
import Product from './sections/Product';
import Autopilot from './sections/Autopilot';
import Compliance from './sections/Compliance';
import Audience from './sections/Audience';
import PricingSection from './sections/PricingSection';
import FaqSection from './sections/FaqSection';
import Cta from './sections/Cta';

export const metadata: Metadata = {
  title: 'Rentium — Simply smart rentals',
  description:
    'Property management built for Canadian tenancy law, launching in BC: RTB-1 leases, RTB-27 condition inspections, deposit rules and an audit-proof ledger — with a portal tenants actually use.',
};

// Structured data for search engines: what this software is, what it costs
// to try, and where it operates. Rendered as JSON-LD, invisible on the page.
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Rentium',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'Property management software built around Canadian tenancy law: compliant leases, condition inspections, deposit tracking and an append-only financial ledger.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'CAD',
    description: '30-day free trial, no credit card required',
  },
  areaServed: { '@type': 'Country', name: 'Canada' },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Hero />
      <Problem />
      <Product />
      <Autopilot />
      <Compliance />
      <Audience />
      <PricingSection />
      <FaqSection />
      <Cta />
    </>
  );
}
