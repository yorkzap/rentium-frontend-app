// ChannelsSettings.tsx
//
// Where RAMA reaches you outside the app. Telegram today; the same list
// grows a row per channel as email/WhatsApp land — no new UI shape needed.

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Loader2,
  Mail,
  MessageCircle,
  Send,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  createTelegramLinkCode,
  deleteChannel,
  fetchChannels,
  updateChannel,
  type ChannelAccount,
  type TelegramLinkCode,
} from '@/lib/ramaApi';
import { Skeleton } from '@/components/ui/page';

const CATEGORIES = [
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'PAYMENT', label: 'Payments' },
  { value: 'LEASE', label: 'Leases' },
  { value: 'MESSAGE', label: 'Messages' },
];

export default function ChannelsSettings({
  showBriefing = true,
}: {
  /** The morning briefing is a landlord digest — hidden for tenants. */
  showBriefing?: boolean;
}) {
  const { token, user } = useAuth();
  const [channels, setChannels] = useState<ChannelAccount[] | null>(null);
  const [linkCode, setLinkCode] = useState<TelegramLinkCode | null>(null);
  const [linking, setLinking] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const { channels } = await fetchChannels(token);
      setChannels(channels);
      // A pending (unverified) link code already exists — surface it.
      const pending = channels.find((c) => !c.verified && c.link_code);
      if (pending)
        setLinkCode(
          (prev) =>
            prev ?? {
              link_code: pending.link_code,
              expires_at: '',
              bot_username: '',
              instructions: `Send /link ${pending.link_code} to the bot.`,
            }
        );
    } catch {
      setChannels([]);
    }
  }, [token]);

  useEffect(() => {
    load();
    // Poll while a link is pending — picks up verification without a manual refresh.
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  const startTelegramLink = async () => {
    if (!token) return;
    setLinking(true);
    try {
      const code = await createTelegramLinkCode(token);
      setLinkCode(code);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't start linking.");
    } finally {
      setLinking(false);
    }
  };

  const toggleCategory = async (channel: ChannelAccount, category: string) => {
    if (!token) return;
    const cats = (channel.prefs.categories as string[] | undefined) ?? [];
    const next = cats.includes(category)
      ? cats.filter((c) => c !== category)
      : [...cats, category];
    const updated = await updateChannel(token, channel.id, {
      prefs: { ...channel.prefs, categories: next },
    });
    setChannels((prev) =>
      (prev ?? []).map((c) => (c.id === channel.id ? { ...c, ...updated } : c))
    );
  };

  const unlink = async (channel: ChannelAccount) => {
    if (!token) return;
    await deleteChannel(token, channel.id);
    setChannels((prev) => (prev ?? []).filter((c) => c.id !== channel.id));
    if (channel.link_code) setLinkCode(null);
    toast.success('Unlinked.');
  };

  if (!channels) return <Skeleton className="h-48 w-full rounded-xl" />;

  const telegram = channels.find(
    (c) => c.channel_type === 'TELEGRAM' && c.verified
  );

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--brand)/0.12)] text-[hsl(var(--brand))]">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Channels</h2>
            <p className="mt-0.5 text-sm text-[hsl(var(--ink-4))]">
              Where RAMA reaches you outside the app — talk to the General from
              Telegram, and get notified there instead of (or as well as) the
              in-app bell.
            </p>
          </div>
        </div>
      </div>

      <section className="card p-5">
        <h3 className="font-semibold">Telegram</h3>
        {telegram ? (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-[hsl(var(--surface-sunken))] p-3">
            <div>
              <p className="text-sm font-medium">
                {telegram.display_name || 'Linked'}
              </p>
              <p className="text-xs text-[hsl(var(--ink-4))]">
                Message the bot any time — it&apos;s the General.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => {
                  const active = (
                    (telegram.prefs.categories as string[] | undefined) ?? []
                  ).includes(c.value);
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => toggleCategory(telegram, c.value)}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                        active
                          ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand)/0.1)] text-[hsl(var(--brand))]'
                          : 'border-[hsl(var(--line))] text-[hsl(var(--ink-3))]'
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[10px] text-[hsl(var(--ink-4))]">
                Nothing selected = notified about everything.
              </p>
              {showBriefing && (
                <label className="mt-3 flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={Boolean(telegram.prefs.briefing)}
                    onChange={() =>
                      updateChannel(token!, telegram.id, {
                        prefs: {
                          ...telegram.prefs,
                          briefing: !telegram.prefs.briefing,
                        },
                      }).then(load)
                    }
                    className="h-3.5 w-3.5 accent-[hsl(var(--brand))]"
                  />
                  5-minute morning briefing (7am)
                </label>
              )}
            </div>
            <button
              type="button"
              onClick={() => unlink(telegram)}
              title="Unlink"
              className="rounded-lg p-2 text-[hsl(var(--ink-4))] hover:bg-white hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : linkCode ? (
          <div className="mt-3 rounded-lg bg-[hsl(var(--surface-sunken))] p-4 text-center">
            <p className="text-sm">
              Message{' '}
              <span className="font-medium">
                @{linkCode.bot_username || 'the Rentium bot'}
              </span>
              :
            </p>
            <p className="mt-2 font-mono text-lg font-semibold tracking-wide">
              /link {linkCode.link_code}
            </p>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-[hsl(var(--ink-4))]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Waiting for you to send it… (expires in 10 minutes)
            </p>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-[hsl(var(--ink-4))]">Not linked yet.</p>
            <button
              type="button"
              onClick={startTelegramLink}
              disabled={linking}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--brand))] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {linking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Link Telegram
            </button>
          </div>
        )}
      </section>

      <section className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--surface-sunken))] text-[hsl(var(--ink-3))]">
              <Mail className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-semibold">Email</h3>
              <p className="mt-0.5 text-sm text-[hsl(var(--ink-4))]">
                Notifications also go to your account email
                {user?.email ? (
                  <>
                    {' '}
                    <span className="font-medium text-[hsl(var(--ink-2))]">
                      {user.email}
                    </span>
                  </>
                ) : null}
                . No setup needed.
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[hsl(var(--ok-ink)/0.12)] px-2.5 py-1 text-xs font-medium text-[hsl(var(--ok-ink))]">
            <Check className="h-3.5 w-3.5" /> Active
          </span>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--surface-sunken))] text-[hsl(var(--ink-3))]">
              <Send className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-semibold">WhatsApp</h3>
              <p className="mt-0.5 text-sm text-[hsl(var(--ink-4))]">
                Chat with the General and get notices on WhatsApp — same idea as
                Telegram.
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full border border-[hsl(var(--line))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--ink-4))]">
            Coming soon
          </span>
        </div>
      </section>
    </div>
  );
}
