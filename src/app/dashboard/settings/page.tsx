// page.tsx — Settings, one page.
//
// Account (name, phone, RAMA) and the Public page used to live at two routes
// that each linked to the other; they're now tabs on this one page.
// /dashboard/profile redirects here so old links keep working. The Public
// page tab only exists for landlords — tenants just get their account.

'use client';

import { useEffect, useState } from 'react';
import {
  BookOpenCheck,
  Brain,
  Clock,
  Globe,
  MessageCircle,
  TrendingUp,
  User,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page';
import { cn } from '@/lib/utils';
import ProfileSettings from '@/components/dashboard/profile/ProfileSettings';
import PublicPageSettings from '@/components/dashboard/settings/PublicPageSettings';
import ConstitutionEditor from '@/components/dashboard/settings/ConstitutionEditor';
import ChannelsSettings from '@/components/dashboard/settings/ChannelsSettings';
import AvailabilitySettings from '@/components/dashboard/settings/AvailabilitySettings';
import MemorySettings from '@/components/dashboard/settings/MemorySettings';
import AutoActionsSettings from '@/components/dashboard/settings/AutoActionsSettings';
import TreasurerSettings from '@/components/dashboard/settings/TreasurerSettings';

type Tab =
  | 'account'
  | 'public'
  | 'hours'
  | 'constitution'
  | 'memory'
  | 'auto'
  | 'treasurer'
  | 'channels';

// Landlord-only tabs, so the tenant filter below stays a single list rather
// than a growing set of exceptions.
const LANDLORD_ONLY: Tab[] = [
  'public',
  'hours',
  'constitution',
  'memory',
  'auto',
  'treasurer',
];

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'account', label: 'Account & RAMA', icon: User },
  { id: 'public', label: 'Public page', icon: Globe },
  { id: 'hours', label: 'Viewing hours', icon: Clock },
  { id: 'constitution', label: 'Constitution', icon: BookOpenCheck },
  { id: 'memory', label: 'Memory', icon: Brain },
  { id: 'auto', label: 'Done automatically', icon: Zap },
  { id: 'treasurer', label: 'Treasurer', icon: TrendingUp },
  { id: 'channels', label: 'Channels', icon: MessageCircle },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const isLandlord =
    (user as { user_type?: string } | null)?.user_type === 'LANDLORD';
  const [tab, setTab] = useState<Tab>('account');

  // Deep links (?tab=public|constitution|channels) after mount — avoids
  // useSearchParams' Suspense requirement and hydration mismatches.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('tab');
    if (wanted && TABS.some((t) => t.id === wanted)) {
      setTab(wanted as Tab);
    }
  }, []);

  // Tenants get a slimmer set: their account plus notification channels
  // (so they can link Telegram for viewing notices). Landlords get everything.
  const visibleTabs = isLandlord
    ? TABS
    : TABS.filter((t) => !LANDLORD_ONLY.includes(t.id));
  const activeTab: Tab = visibleTabs.some((t) => t.id === tab)
    ? tab
    : 'account';

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Settings"
        description="Your account, RAMA preferences, and your public page."
      />

      {visibleTabs.length > 1 && (
        <div
          className="mb-6 flex gap-1 overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ borderColor: 'hsl(var(--line))' }}
        >
          {visibleTabs.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-[hsl(var(--brand))] text-[hsl(var(--brand-ink))]'
                    : 'border-transparent text-[hsl(var(--ink-3))] hover:text-[hsl(var(--ink))]'
                )}
              >
                <t.icon
                  className={cn(
                    'h-4 w-4',
                    active
                      ? 'text-[hsl(var(--brand))]'
                      : 'text-[hsl(var(--ink-5))]'
                  )}
                />
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {activeTab === 'account' && <ProfileSettings />}
      {activeTab === 'public' && <PublicPageSettings />}
      {activeTab === 'hours' && <AvailabilitySettings />}
      {activeTab === 'constitution' && <ConstitutionEditor />}
      {activeTab === 'memory' && <MemorySettings />}
      {activeTab === 'auto' && <AutoActionsSettings />}
      {activeTab === 'treasurer' && <TreasurerSettings />}
      {activeTab === 'channels' && (
        <ChannelsSettings showBriefing={isLandlord} />
      )}
    </div>
  );
}
