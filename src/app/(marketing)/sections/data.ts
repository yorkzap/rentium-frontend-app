// Marketing copy that is shared across routes: the pricing page and the
// help page reuse these instead of maintaining a second copy.

export const PRICING_TIERS = [
  {
    name: "Starter",
    price: "$19",
    period: "per month",
    description: "For your first rental.",
    features: [
      "Up to 3 properties",
      "RTB-aware leases & e-signing",
      "Full financial ledger",
      "Tenant portal",
      "Maintenance tracking",
    ],
    cta: "Start free trial",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$49",
    period: "per month",
    description: "For a growing portfolio.",
    features: [
      "Up to 10 properties",
      "Everything in Starter",
      "Condition inspections (RTB-27)",
      "Public listing pages & showcase site",
      "Priority support",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "per month",
    description: "For professional managers.",
    features: [
      "Unlimited properties",
      "Everything in Professional",
      "Multi-user access",
      "Custom onboarding",
      "Dedicated support",
    ],
    cta: "Talk to us",
    highlighted: false,
  },
] as const;

export const FAQS = [
  {
    question: "How easy is it to get started with Rentium?",
    answer:
      "Sign up for a free 30-day trial, add your properties, and start using every feature immediately. No credit card is required to try Rentium, and onboarding walks you through setup step by step.",
  },
  {
    question: "What makes Rentium different for BC landlords?",
    answer:
      "Rentium is built around the BC Residential Tenancy Act rather than adapted to it: leases follow the RTB-1 form, move-in and move-out condition inspections follow RTB-27, and deposit handling follows the half-month-rent and interest rules. The app tells you what the Act requires and when.",
  },
  {
    question: "Can I manage multiple properties?",
    answer:
      "Yes. Starter supports up to 3 properties, Professional up to 10, and Enterprise is unlimited — with the same ledger, lease and inspection tools at every tier.",
  },
  {
    question: "What do tenants get?",
    answer:
      "Tenants get their own portal: lease documents and signing, rent history and receipts, maintenance requests with status, and upcoming visits or inspections — no email archaeology.",
  },
  {
    question: "Is my data secure?",
    answer:
      "All data is encrypted in transit and at rest, and financial records are kept in an append-only ledger — entries can be corrected with a visible reversal, never silently edited or deleted. Your books stay auditable by design.",
  },
  {
    question: "What if I rent outside British Columbia?",
    answer:
      "Everything except the BC-specific compliance workflows works anywhere in Canada today. Province-aware rules for more provinces are on the roadmap, and the system is built so new provinces slot in without you changing how you work.",
  },
] as const;
