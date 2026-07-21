// page.tsx — Settings, one page.
//
// Account (name, phone, RAMA) and the Public page used to live at two routes
// that each linked to the other; they're now tabs on this one page.
// /dashboard/profile redirects here so old links keep working. The Public
// page tab only exists for landlords — tenants just get their account.

'use client';

import { useEffect, useState } from 'react';
import { BookOpenCheck, Clock, Globe, MessageCircle, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page';
import { cn } from '@/lib/utils';
import ProfileSettings from '@/components/dashboard/profile/ProfileSettings';
import PublicPageSettings from '@/components/dashboard/settings/PublicPageSettings';
import ConstitutionEditor from '@/components/dashboard/settings/ConstitutionEditor';
import ChannelsSettings from '@/components/dashboard/settings/ChannelsSettings';
import AvailabilitySettings from '@/components/dashboard/settings/AvailabilitySettings';

type Tab = 'account' | 'public' | 'hours' | 'constitution' | 'channels';

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'account', label: 'Account & RAMA', icon: User },
  { id: 'public', label: 'Public page', icon: Globe },
  { id: 'hours', label: 'Viewing hours', icon: Clock },
  { id: 'constitution', label: 'Constitution', icon: BookOpenCheck },
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
    if (
      wanted === 'public' ||
      wanted === 'hours' ||
      wanted === 'constitution' ||
      wanted === 'channels'
    ) {
      setTab(wanted);
    }
  }, []);

  // Tenants get a slimmer set: their account plus notification channels
  // (so they can link Telegram for viewing notices). Landlords get everything.
  const visibleTabs = isLandlord
    ? TABS
    : TABS.filter((t) => t.id === 'account' || t.id === 'channels');
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
      {activeTab === 'channels' && (
        <ChannelsSettings showBriefing={isLandlord} />
      )}
    </div>
  );
}
