// /terms — terms of service in the product's plain voice. Same caveat as
// the privacy policy: review with counsel before launch; the commitments
// here match how the system actually behaves.
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The agreement between you and Rentium — what the service does, what it costs, and what we each promise.',
};

const UPDATED = 'July 15, 2026';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-base leading-7 text-ink-2">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-kicker">Legal</p>
      <h1 className="text-display mt-3 text-ink">Terms of Service</h1>
      <p className="mt-3 text-sm text-ink-4">Last updated {UPDATED}</p>

      <p className="mt-6 text-lg leading-8 text-ink-2">
        These are the terms between you and Rentium when you use the service,
        whether as a landlord, a tenant, or a visitor requesting a viewing.
        Short version: we run the software carefully, your records stay yours,
        and neither of us pretends this replaces legal advice.
      </p>

      <Section title="What Rentium is (and isn't)">
        <p>
          Rentium is property-management software: it produces lease documents,
          tracks tenancy records, computes deadlines from provincial tenancy
          rules, and keeps a financial ledger. It is{' '}
          <strong>not a law firm</strong> and nothing it produces is legal
          advice. Documents and deadline calculations are based on our reading
          of published tenancy law; you remain responsible for your own
          compliance, and for anything unusual you should talk to a professional
          or your provincial tenancy branch.
        </p>
        <p>
          Rentium also does not move money. Rent is paid however you and your
          landlord/tenant arrange it; the ledger records what happened.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          You need accurate information on your account, you&apos;re responsible
          for what happens under your login, and you&apos;ll keep your password
          to yourself. Landlord accounts may only manage properties they
          genuinely own or are authorized to manage.
        </p>
      </Section>

      <Section title="Your content and records">
        <p>
          The records you create — leases, inspections, ledger entries, photos —
          belong to you. You give us the licence needed to store and display
          them to the people your tenancy shares them with, and nothing more.
          You can export your records at any time.
        </p>
        <p>
          Because tenancy records are shared records, some of them can&apos;t be
          unilaterally deleted while the other party still has a legal interest
          in them (a signed lease, a payment history). The ledger is append-only
          by design: corrections are recorded as visible reversals, not silent
          edits.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>
          Don&apos;t use Rentium to break tenancy or human-rights law, to harass
          anyone, to publish listings for properties you have no right to let,
          or to probe or overload the service. We can suspend accounts that do.
        </p>
      </Section>

      <Section title="Pricing and trial">
        <p>
          New landlord accounts start with a 30-day free trial, no credit card
          required. Paid plans and their prices are shown on the{' '}
          <Link href="/pricing" className="font-medium text-brand underline">
            pricing page
          </Link>{' '}
          before you commit. Tenants never pay to use their portal.
        </p>
      </Section>

      <Section title="Service and liability">
        <p>
          We aim to keep the service available and your data intact, with
          backups and monitoring, but the service is provided &quot;as is&quot;.
          To the extent the law allows, our liability is limited to the amount
          you&apos;ve paid us in the twelve months before a claim. Nothing in
          these terms limits liability that can&apos;t be limited under
          applicable law.
        </p>
      </Section>

      <Section title="Ending things">
        <p>
          You can close your account whenever you like; export your records
          first. We can end or suspend service for breach of these terms, with
          notice and your data made available for export except where the breach
          makes that impossible.
        </p>
      </Section>

      <Section title="Changes and contact">
        <p>
          If these terms change materially, we&apos;ll tell you in the app
          before the change applies. Questions:{' '}
          <a
            href="mailto:hello@rentium.ca"
            className="font-medium text-brand underline"
          >
            hello@rentium.ca
          </a>
          . These terms are governed by the laws of British Columbia and Canada.
        </p>
      </Section>
    </div>
  );
}
