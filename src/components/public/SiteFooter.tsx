import Link from 'next/link';
import Wordmark from './Wordmark';

// The one public-site footer. Dark editorial close to every public page.
// TODO(local): add a Cities column fed by publicApi getCities().

const COLUMNS: { heading: string; links: { href: string; label: string }[] }[] =
  [
    {
      heading: 'Product',
      links: [
        { href: '/#product', label: 'How it works' },
        { href: '/#autopilot', label: 'On autopilot' },
        { href: '/#compliance', label: 'BC compliance' },
        { href: '/pricing', label: 'Pricing' },
      ],
    },
    {
      heading: 'Explore',
      links: [
        { href: '/bc/saanich', label: 'Browse rentals' },
        { href: '/about', label: 'About' },
        { href: '/help', label: 'Help & FAQ' },
      ],
    },
    {
      heading: 'Get started',
      links: [
        { href: '/auth/signup', label: 'Create an account' },
        { href: '/auth/login', label: 'Log in' },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { href: '/privacy', label: 'Privacy policy' },
        { href: '/terms', label: 'Terms of service' },
      ],
    },
  ];

export default function SiteFooter() {
  return (
    <footer className="bg-deep text-ink-inverse">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs space-y-4">
            <Wordmark tone="dark" />
            <p className="text-sm leading-6 text-ink-inverse-muted">
              Property management that takes the legal side as seriously as you
              do. Built in British Columbia for landlords across Canada,
              designed around each province&rsquo;s tenancy law.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.heading}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-inverse-muted">
                  {col.heading}
                </h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-ink-inverse/90 transition-colors hover:text-brand-bright"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-ink-inverse-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Rentium. All rights reserved.</p>
          <p>Made in BC · Serving Canada · English (Canada)</p>
        </div>
      </div>
    </footer>
  );
}
