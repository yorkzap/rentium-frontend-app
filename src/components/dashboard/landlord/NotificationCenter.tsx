// src/components/dashboard/landlord/NotificationCenter.tsx
'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  FileText,
  Wrench,
  DollarSign,
  MessageSquare,
  AlertTriangle,
  CalendarDays,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  fetchNotifications,
  markAllNotificationsRead,
  type AppNotification,
  type NotificationCategory,
} from '@/lib/engagementApi';

const ICON: Record<NotificationCategory, React.ReactNode> = {
  LEASE: <FileText className="h-5 w-5" />,
  MAINTENANCE: <Wrench className="h-5 w-5" />,
  PAYMENT: <DollarSign className="h-5 w-5" />,
  MESSAGE: <MessageSquare className="h-5 w-5" />,
  SYSTEM: <Bell className="h-5 w-5" />,
};

const ICON_BG: Record<NotificationCategory, string> = {
  LEASE: 'bg-blue-100 text-blue-700',
  MAINTENANCE: 'bg-amber-100 text-amber-700',
  PAYMENT: 'bg-green-100 text-green-700',
  MESSAGE: 'bg-purple-100 text-purple-700',
  SYSTEM: 'bg-surface-sunken text-ink-2',
};

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationCenter() {
  const { token } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  // Visiting this page IS reading. Everything is marked read server-side as
  // soon as the list loads; local is_read stays untouched for this render so
  // the "new" highlight still shows what changed since the last visit.
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const fetched = await fetchNotifications(token);
      setItems(fetched);
      if (fetched.some((n) => !n.is_read)) {
        markAllNotificationsRead(token).catch(() => {
          /* the bell's next poll will reconcile */
        });
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load notifications.'
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = items.filter((n) => !n.is_read).length;
  const weekCount = items.filter(
    (n) => Date.now() - new Date(n.created_at).getTime() < 6048e5
  ).length;

  const filtered = useMemo(() => {
    if (tab === 'all') return items;
    if (tab === 'unread') return items.filter((n) => !n.is_read);
    return items.filter((n) => n.category === tab.toUpperCase());
  }, [items, tab]);

  const onOpen = (n: AppNotification) => {
    // Already marked read when the page loaded — just deep-link.
    if (n.url) router.push(n.url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Notifications</h1>
        <p className="text-ink-3 text-sm mt-1">
          Everything happening across your properties.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="All"
          value={items.length}
          icon={<Bell className="h-5 w-5" />}
          tone="bg-surface-sunken text-ink-2"
        />
        <StatCard
          label="New since last visit"
          value={unreadCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="bg-blue-100 text-blue-700"
        />
        <StatCard
          label="Maintenance"
          value={items.filter((n) => n.category === 'MAINTENANCE').length}
          icon={<Wrench className="h-5 w-5" />}
          tone="bg-amber-100 text-amber-700"
        />
        <StatCard
          label="This week"
          value={weekCount}
          icon={<CalendarDays className="h-5 w-5" />}
          tone="bg-green-100 text-green-700"
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            New{' '}
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="payment">Payments</TabsTrigger>
          <TabsTrigger value="lease">Leases</TabsTrigger>
          <TabsTrigger value="message">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg capitalize">
                {tab === 'all' ? 'All notifications' : tab}
              </CardTitle>
              <CardDescription>
                {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-ink-4" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10">
                  <Bell className="h-12 w-12 text-ink-5 mx-auto mb-3" />
                  <p className="text-sm text-ink-3">
                    You&apos;re all caught up.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start p-4 rounded-lg border cursor-pointer transition-colors ${
                        !n.is_read
                          ? 'bg-canvas border-line'
                          : 'bg-white border-line hover:bg-canvas'
                      }`}
                      onClick={() => onOpen(n)}
                    >
                      <div
                        className={`p-2 rounded-full mr-4 shrink-0 ${ICON_BG[n.category]}`}
                      >
                        {ICON[n.category]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h3
                            className={`font-medium ${!n.is_read ? 'text-ink' : 'text-ink-2'}`}
                          >
                            {n.title}
                            {!n.is_read && (
                              <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-blue-600 align-middle" />
                            )}
                          </h3>
                          <span className="text-xs text-ink-4 whitespace-nowrap">
                            {timeAgo(n.created_at)}
                          </span>
                        </div>
                        {n.body && (
                          <p className="text-sm text-ink-2 mt-1">{n.body}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink-3">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </div>
          <div className={`p-2 rounded-full ${tone}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
