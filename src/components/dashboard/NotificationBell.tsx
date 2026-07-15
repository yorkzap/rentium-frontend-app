// src/components/dashboard/NotificationBell.tsx
//
// Live notification bell backed by /api/notifications/ (events app).
// Drop this into any header for either role — it's entirely self-contained:
// polls the unread count every 60s (paused while the tab is hidden), loads
// the feed when opened, supports mark-read (navigates to the notification's
// deep link) and mark-all-read.
//
// Usage:  <NotificationBell />   — that's it. Auth comes from useAuth().

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Bell,
    CheckCheck,
    Loader2,
    Wrench,
    CreditCard,
    FileText,
    MessageSquare,
    Info,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
    AppNotification,
    NotificationCategory,
    fetchNotifications,
    fetchUnreadCount,
    markAllNotificationsRead,
    markNotificationRead,
} from "@/lib/engagementApi";

const POLL_INTERVAL_MS = 60_000;

const CATEGORY_ICONS: Record<NotificationCategory, React.ComponentType<{ className?: string }>> = {
    MAINTENANCE: Wrench,
    PAYMENT: CreditCard,
    LEASE: FileText,
    MESSAGE: MessageSquare,
    SYSTEM: Info,
};

const CATEGORY_COLORS: Record<NotificationCategory, string> = {
    MAINTENANCE: "text-amber-600 bg-amber-50",
    PAYMENT: "text-emerald-600 bg-emerald-50",
    LEASE: "text-blue-600 bg-blue-50",
    MESSAGE: "text-violet-600 bg-violet-50",
    SYSTEM: "text-slate-600 bg-slate-100",
};

function timeAgo(iso: string): string {
    try {
        return formatDistanceToNow(parseISO(iso), { addSuffix: true });
    } catch {
        return "";
    }
}

export default function NotificationBell() {
    const { token } = useAuth();
    const router = useRouter();

    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoadingFeed, setIsLoadingFeed] = useState(false);
    const [isMarkingAll, setIsMarkingAll] = useState(false);

    // --- Unread count polling (paused while the tab is hidden) ---
    const refreshCount = useCallback(async () => {
        if (!token || document.hidden) return;
        try {
            setUnreadCount(await fetchUnreadCount(token));
        } catch {
            /* silent — a bell should never break the dashboard */
        }
    }, [token]);

    useEffect(() => {
        if (!token) return;
        refreshCount();
        const interval = setInterval(refreshCount, POLL_INTERVAL_MS);
        const onVisible = () => {
            if (!document.hidden) refreshCount();
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [token, refreshCount]);

    // --- Lazy-load the feed when the dropdown opens ---
    const loadFeed = useCallback(async () => {
        if (!token) return;
        setIsLoadingFeed(true);
        try {
            const items = await fetchNotifications(token);
            setNotifications(items.slice(0, 15));
        } catch {
            setNotifications([]);
        } finally {
            setIsLoadingFeed(false);
        }
    }, [token]);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open) loadFeed();
    };

    // --- Actions ---
    const handleNotificationClick = async (notification: AppNotification) => {
        // Optimistic mark-read, then deep-link
        if (!notification.is_read) {
            setNotifications((prev) =>
                prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)),
            );
            setUnreadCount((c) => Math.max(0, c - 1));
            if (token) {
                markNotificationRead(token, notification.id).catch(() => {
                    /* refresh will reconcile */
                });
            }
        }
        setIsOpen(false);
        if (notification.url) router.push(notification.url);
    };

    const handleMarkAllRead = async () => {
        if (!token || isMarkingAll) return;
        setIsMarkingAll(true);
        try {
            await markAllNotificationsRead(token);
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch {
            /* silent */
        } finally {
            setIsMarkingAll(false);
        }
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-2.5">
                    <p className="text-sm font-semibold">Notifications</p>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-slate-500"
                        onClick={handleMarkAllRead}
                        disabled={isMarkingAll || unreadCount === 0}
                    >
                        {isMarkingAll ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                            <CheckCheck className="mr-1 h-3 w-3" />
                        )}
                        Mark all read
                    </Button>
                </div>

                {/* Feed */}
                <div className="max-h-96 overflow-y-auto">
                    {isLoadingFeed ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-slate-500">
                            No notifications yet.
                        </div>
                    ) : (
                        notifications.map((notification) => {
                            const Icon = CATEGORY_ICONS[notification.category] ?? Info;
                            const colorClasses =
                                CATEGORY_COLORS[notification.category] ?? CATEGORY_COLORS.SYSTEM;
                            return (
                                <button
                                    key={notification.id}
                                    type="button"
                                    onClick={() => handleNotificationClick(notification)}
                                    className={cn(
                                        "flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50",
                                        !notification.is_read && "bg-blue-50/50",
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                                            colorClasses,
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span
                                            className={cn(
                                                "block truncate text-sm",
                                                notification.is_read
                                                    ? "font-normal text-slate-700"
                                                    : "font-semibold text-slate-900",
                                            )}
                                        >
                                            {notification.title}
                                        </span>
                                        {notification.body && (
                                            <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">
                                                {notification.body}
                                            </span>
                                        )}
                                        <span className="mt-1 block text-[11px] text-slate-400">
                                            {timeAgo(notification.created_at)}
                                        </span>
                                    </span>
                                    {!notification.is_read && (
                                        <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
