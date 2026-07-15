// /privacy — the privacy policy, written in the product's plain voice.
// Structured for PIPEDA-style disclosure (what we collect, why, who sees it,
// how long we keep it, your rights). Review with counsel before relying on
// it in a dispute; it reflects how the system actually behaves today.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'What Rentium collects, why, who can see it, and the choices you have — written in plain language.',
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

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-kicker">Legal</p>
      <h1 className="text-display mt-3 text-ink">Privacy Policy</h1>
      <p className="mt-3 text-sm text-ink-4">Last updated {UPDATED}</p>

      <p className="mt-6 text-lg leading-8 text-ink-2">
        Rentium manages tenancies, and tenancies involve personal information —
        names, contact details, leases, money. This page explains what we
        collect, why we collect it, who can see it, and the choices you have.
        It&apos;s written to be read, not skimmed past.
      </p>

      <Section title="What we collect">
        <p>
          <strong>Account information.</strong> Your name, email address, phone
          number, and whether you use Rentium as a landlord or a tenant.
        </p>
        <p>
          <strong>Tenancy records.</strong> The information a tenancy produces:
          lease terms, signatures, property addresses, condition inspection
          reports, maintenance requests and their photos, rent charges, payments
          and deposits. You (or your landlord/tenant) create these records; we
          store them.
        </p>
        <p>
          <strong>Viewing requests.</strong> If you request a viewing through a
          public listing, we collect the name, email and phone number you
          provide so the landlord can respond. That&apos;s the only thing
          it&apos;s used for.
        </p>
        <p>
          <strong>Technical basics.</strong> Log data (IP address, browser type,
          pages requested) kept for security and debugging. We do not run
          third-party advertising trackers.
        </p>
      </Section>

      <Section title="Why we collect it">
        <p>
          To run the service: generating leases, computing legal deadlines,
          keeping the financial ledger, delivering notifications, and letting
          landlords and tenants see the shared record of their own tenancy. We
          don&apos;t sell personal information, and we don&apos;t use your
          tenancy records for advertising.
        </p>
      </Section>

      <Section title="Who can see what">
        <p>
          Visibility follows the tenancy. Your landlord sees the records of
          tenancies they manage. A tenant sees their own lease, their own
          charges and payments (plus the household&apos;s shared charges on a
          joint lease), the visits scheduled for their home, and nothing else.
          Prospective tenants&apos; contact details from viewing requests are
          visible only to the landlord — never to other tenants.
        </p>
        <p>
          Public listing pages show only what a landlord chooses to publish, and
          never a street address — location is shown at neighbourhood precision.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          Tenancy records exist to survive disputes, so they are kept for as
          long as your account is active plus the period your province&apos;s
          tenancy law and tax rules require (typically up to seven years for
          financial records). Viewing-request details for showings that
          didn&apos;t lead anywhere are deleted on a rolling basis.
        </p>
      </Section>

      <Section title="Where it lives">
        <p>
          Data is stored on cloud infrastructure and encrypted in transit.
          Payments themselves never move through Rentium — we record that a
          payment happened; we never hold your banking credentials.
        </p>
      </Section>

      <Section title="Your choices">
        <p>
          You can access and correct your account information from Settings at
          any time. You can export your records. You can ask us to close your
          account and delete personal information that we&apos;re not legally
          required to retain. Email{' '}
          <a
            href="mailto:privacy@rentium.ca"
            className="font-medium text-brand underline"
          >
            privacy@rentium.ca
          </a>{' '}
          and a human will handle it.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          If this policy changes in a way that matters, we&apos;ll tell you in
          the app before the change takes effect — not bury it in a changelog.
        </p>
      </Section>
    </div>
  );
}
