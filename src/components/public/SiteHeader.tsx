'use client';

// The one public-site header: marketing pages, city/listing pages, landlord
// showcases, viewing flows. Auth-aware on the right; collapses to a
// disclosure menu on mobile.

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Wordmark from './Wordmark';

const NAV = [
  // TODO(local): feed the browse link from publicApi getCities() once this
  // component is wired into the [province] layouts.
  { href: '/bc/saanich', label: 'Browse rentals' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/help', label: 'Help' },
];

function AuthActions({ onNavigate }: { onNavigate?: () => void }) {
  const { isAuthenticated, loading } = useAuth();

  // While auth state is resolving, hold layout with an invisible placeholder
  // instead of flashing "Log in" at a logged-in user.
  if (loading) return <div className="h-9 w-36" aria-hidden />;

  if (isAuthenticated) {
    return (
      <Button asChild className="rounded-full px-5" onClick={onNavigate}>
        <Link href="/dashboard">Open dashboard</Link>
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Button
        asChild
        variant="ghost"
        className="rounded-full text-ink-2"
        onClick={onNavigate}
      >
        <Link href="/auth/login">Log in</Link>
      </Button>
      <Button asChild className="rounded-full px-5" onClick={onNavigate}>
        <Link href="/auth/signup">Get started</Link>
      </Button>
    </div>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Wordmark />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-active={pathname === item.href}
              className={cn(
                'nav-underline rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'text-ink'
                  : 'text-ink-3 hover:text-ink'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <AuthActions />
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-sunken md:hidden"
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-canvas px-4 pb-6 pt-3 md:hidden">
          <nav className="flex flex-col" aria-label="Main">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={cn(
                  'rounded-lg px-3 py-3 text-base font-medium',
                  pathname === item.href
                    ? 'bg-surface-sunken text-ink'
                    : 'text-ink-2'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 border-t border-line pt-4">
            <AuthActions onNavigate={close} />
          </div>
          <p className="mt-4 text-xs text-ink-4">
            Built for Canadian tenancy law — launching in BC.
          </p>
        </div>
      )}
    </header>
  );
}
