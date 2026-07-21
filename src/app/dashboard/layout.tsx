// layout.tsx

// THE app shell. One header, one nav, one place.
//
// The original bug: this layout rendered the chrome, and then EVERY sub-layout
// wrapped its children in <LandlordDashboard>, which rendered its OWN complete
// header and nav. Two navbars, stacked. That was fixed for the landlord.
//
// It was NOT fixed for the tenant: the tenant shell below renders a header, and
// TenantDashboard then renders a second full header inside it — brand, bell,
// avatar and all. Same bug, other half of the app. TenantDashboard is stripped in
// this same change; the chrome lives here and only here.
//
// The other tenant problem this fixes: the tenant shell had NO NAVIGATION AT ALL.
// One dashboard, one long scroll, and everything that wasn't at the top — the
// calendar, the move-out form — was buried below the fold with no way to reach it
// directly. A tenant has fewer things to do than a landlord. Fewer is not zero.

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  DollarSign,
  FileText,
  Home,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Settings,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import NotificationBell from '@/components/dashboard/NotificationBell';
import RamaPanel from '@/components/dashboard/landlord/RamaPanel';

const LANDLORD_NAV = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    exact: true,
  },
  { href: '/dashboard/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/dashboard/properties', label: 'Properties', icon: Building2 },
  { href: '/dashboard/leases', label: 'Leases', icon: FileText },
  { href: '/dashboard/financial', label: 'Financial', icon: DollarSign },
  { href: '/dashboard/insights', label: 'Insights', icon: Sparkles },
  { href: '/dashboard/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Boxes },
  { href: '/dashboard/inquiries', label: 'Inquiries', icon: Inbox },
  { href: '/dashboard/messages', label: 'Messages', icon: Mail },
  {
    href: '/dashboard/settings?tab=channels',
    label: 'Notifications',
    icon: Bell,
  },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

// Three destinations, deliberately.
//
// "Home" is the rent-and-repairs dashboard they'll open most days. "My tenancy"
// is everything with a DATE on it — the calendar, and ending the tenancy — which
// is exactly the material that was previously unreachable. Maintenance stays a
// tab inside Home rather than a nav item, because the tenant's maintenance view
// (TenantMaintenance) is a different component from the landlord's, and
// /dashboard/maintenance already belongs to the landlord's.
const TENANT_NAV = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/tenancy', label: 'My tenancy', icon: Home },
  { href: '/dashboard/messages', label: 'Messages', icon: Mail },
];

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-[hsl(var(--brand))]"
      >
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
      <span className="font-bold tracking-tight">Rentium</span>
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading, token, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (!loading && !checked) {
      setChecked(true);
      if (!isAuthenticated && !token) router.push('/auth/login');
    }
  }, [loading, isAuthenticated, token, router, checked]);

  useEffect(() => {
    setMenu(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[hsl(var(--brand))] border-t-transparent" />
      </div>
    );
  }
  if (checked && !isAuthenticated) return null;

  const isTenant = (user?.user_type || '').toUpperCase().includes('TENANT');
  const initials = (user?.name || user?.email || '?')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  const isActive = (i: { href: string; exact?: boolean }) =>
    i.exact ? pathname === i.href : pathname.startsWith(i.href);

  // ------------------------------------------------------------ tenant shell
  if (isTenant) {
    return (
      <div className="min-h-screen">
        <header
          className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-white px-4 sm:px-6"
          style={{ borderColor: 'hsl(var(--line))' }}
        >
          <div className="flex items-center gap-2.5">
            <Brand />
            <span className="rounded-full bg-[hsl(var(--brand-soft))] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--brand-ink))]">
              Tenant
            </span>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="hidden text-sm text-[hsl(var(--ink-3))] sm:block">
              {user?.name || user?.email}
            </span>
            <Link
              href="/dashboard/settings"
              title="Your account"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--brand))] text-xs font-semibold text-white"
            >
              {initials}
            </Link>
            <button
              onClick={logout}
              title="Log out"
              className="text-[hsl(var(--ink-5))] transition-colors hover:text-[hsl(var(--ink))]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <nav
          className="sticky top-14 z-30 flex gap-1 overflow-x-auto border-b bg-white px-4 sm:px-6"
          style={{ borderColor: 'hsl(var(--line))' }}
        >
          {TENANT_NAV.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                  active
                    ? 'border-[hsl(var(--brand))] text-[hsl(var(--brand-ink))]'
                    : 'border-transparent text-[hsl(var(--ink-3))] hover:text-[hsl(var(--ink))]'
                )}
              >
                <item.icon
                  className={cn(
                    'h-4 w-4',
                    active
                      ? 'text-[hsl(var(--brand))]'
                      : 'text-[hsl(var(--ink-5))]'
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    );
  }

  // ---------------------------------------------------------- landlord shell
  const Nav = ({ onNav }: { onNav?: () => void }) => (
    <nav className="flex-1 space-y-0.5 px-3">
      {LANDLORD_NAV.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNav}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-[hsl(var(--brand-soft))] text-[hsl(var(--brand-ink))]'
                : 'text-[hsl(var(--ink-3))] hover:bg-[hsl(var(--surface-sunken))] hover:text-[hsl(var(--ink))]'
            )}
          >
            <item.icon
              className={cn(
                'h-4 w-4',
                active ? 'text-[hsl(var(--brand))]' : 'text-[hsl(var(--ink-5))]'
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const UserBlock = () => (
    <div
      className="flex items-center gap-3 border-t p-3"
      style={{ borderColor: 'hsl(var(--line))' }}
    >
      <Link
        href="/dashboard/settings"
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[hsl(var(--brand))] text-xs font-semibold text-white"
      >
        {initials}
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {user?.name || 'Landlord'}
        </p>
        <p className="truncate text-[11px] text-[hsl(var(--ink-4))]">
          {user?.email}
        </p>
      </div>
      <button
        onClick={logout}
        title="Log out"
        className="flex-shrink-0 text-[hsl(var(--ink-5))] transition-colors hover:text-[hsl(var(--ink))]"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r bg-white md:flex"
        style={{ borderColor: 'hsl(var(--line))' }}
      >
        <div
          className="flex h-14 items-center border-b px-5"
          style={{ borderColor: 'hsl(var(--line))' }}
        >
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto py-3">
          <Nav />
        </div>
        <UserBlock />
      </aside>

      <header
        className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-white px-4 md:hidden"
        style={{ borderColor: 'hsl(var(--line))' }}
      >
        <Brand />
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setMenu((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[hsl(var(--surface-sunken))]"
          >
            {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {menu && (
        <div className="fixed inset-0 top-14 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/25"
            onClick={() => setMenu(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex-1 overflow-y-auto py-3">
              <Nav onNav={() => setMenu(false)} />
            </div>
            <UserBlock />
          </div>
        </div>
      )}

      <div className="md:pl-[232px]">
        <div
          className="sticky top-0 z-30 hidden h-14 items-center justify-end border-b bg-[hsl(var(--canvas))]/80 px-6 backdrop-blur md:flex"
          style={{ borderColor: 'hsl(var(--line))' }}
        >
          <NotificationBell />
        </div>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      {/* RAMA: landlord shell only; the component itself is gated on the
          backend's /api/rama/config/ flag and renders nothing when off. */}
      <RamaPanel />
    </div>
  );
}
