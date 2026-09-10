import { useEffect, useRef, useState } from "react";
import {
  Bell, Check, CheckCheck, Trash2, LogIn, LogOut as LogOutIcon,
  Zap, Megaphone, ScrollText, MessageSquareWarning, UtensilsCrossed,
  IndianRupee, Loader2, DoorOpen, Building, Ticket as TicketIcon, BedDouble,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  fetchMyNotifications, getUnreadNotificationCount,
  markNotificationAsRead, markAllNotificationsAsRead, deleteNotification,
  getUserRole,
} from "@/lib/store";
import type { AppNotification, NotificationType } from "@/lib/types";

/* ── Per-type icon + color ── */
const typeMeta: Record<NotificationType, { icon: any; color: string; bg: string }> = {
  CHECK_IN:             { icon: LogIn,               color: "text-emerald-500", bg: "bg-emerald-50" },
  CHECK_OUT:            { icon: LogOutIcon,           color: "text-gray-500",    bg: "bg-gray-50" },
  ROOM_ADDED:           { icon: DoorOpen,             color: "text-teal-500",    bg: "bg-teal-50" },
  FLAT_ADDED:           { icon: Building,             color: "text-teal-500",    bg: "bg-teal-50" },
  EB_READING:           { icon: Zap,                 color: "text-yellow-500",  bg: "bg-yellow-50" },
  ANNOUNCEMENT:         { icon: Megaphone,           color: "text-cyan-500",    bg: "bg-cyan-50" },
  RULE_REGULATION:      { icon: ScrollText,          color: "text-indigo-500",  bg: "bg-indigo-50" },
  COMPLAINT:            { icon: MessageSquareWarning, color: "text-red-500",    bg: "bg-red-50" },
  FOOD_TIMETABLE:       { icon: UtensilsCrossed,     color: "text-orange-500",  bg: "bg-orange-50" },
  PAYMENT_REMINDER:     { icon: IndianRupee,         color: "text-amber-500",   bg: "bg-amber-50" },
  PAYMENT_DUE:          { icon: IndianRupee,         color: "text-red-500",     bg: "bg-red-50" },
  PAYMENT_SUBMITTED:    { icon: IndianRupee,         color: "text-blue-500",    bg: "bg-blue-50" },
  PAYMENT_CONFIRMATION: { icon: IndianRupee,         color: "text-emerald-500", bg: "bg-emerald-50" },
  PAYMENT_REJECTED:     { icon: IndianRupee,         color: "text-red-500",     bg: "bg-red-50" },
  TICKET_CREATED:       { icon: TicketIcon,          color: "text-violet-500",  bg: "bg-violet-50" },
  TICKET_REPLY:         { icon: TicketIcon,          color: "text-blue-500",    bg: "bg-blue-50" },
  TICKET_STATUS_UPDATE: { icon: TicketIcon,          color: "text-amber-500",   bg: "bg-amber-50" },
  BED_LIMIT_DECISION:   { icon: BedDouble,           color: "text-emerald-500", bg: "bg-emerald-50" },
};

/** Lightweight relative time, e.g. "5m ago", "3h ago", "2d ago". */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}

const POLL_MS = 30_000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // SUPER_ADMIN sees every notification in the system as an audit feed, not
  // a personal inbox — the backend rejects read/delete mutations from this
  // role (it would otherwise silently flip another user's read status), so
  // the panel here is view-only.
  const isReadOnly = getUserRole()?.toUpperCase() === "SUPER_ADMIN";

  const loadUnreadCount = async () => {
    try {
      setUnread(await getUnreadNotificationCount());
    } catch {
      /* silent — bell just won't show a badge this cycle */
    }
  };

  const loadList = async () => {
    setLoading(true);
    try {
      const list = await fetchMyNotifications();
      setItems(list);
      setUnread(list.filter((n) => !n.isRead).length);
    } catch {
      /* keep previous list on failure */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnreadCount();
    const id = setInterval(loadUnreadCount, POLL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (open) loadList();
  }, [open]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const handleMarkRead = async (n: AppNotification) => {
    if (n.isRead || isReadOnly) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await markNotificationAsRead(n.id);
    } catch {
      loadList(); // resync on failure
    }
  };

  const handleMarkAllRead = async () => {
    if (isReadOnly) return;
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
    try {
      await markAllNotificationsAsRead();
    } catch {
      loadList();
    }
  };

  const handleDelete = async (id: number) => {
    if (isReadOnly) return;
    const wasUnread = items.find((n) => n.id === id)?.isRead === false;
    setItems((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) setUnread((u) => Math.max(0, u - 1));
    try {
      await deleteNotification(id);
    } catch {
      loadList();
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative p-2 !bg-transparent !border-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100/60 rounded-full transition-colors group"
      >
        <Bell className="h-[18px] w-[18px] transition-transform group-hover:rotate-12" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-semibold ring-2 ring-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[22rem] max-w-[90vw] bg-white rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 z-40">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white">
            <h3 className="text-sm font-semibold text-gray-800">
              {isReadOnly ? "Notifications (all users)" : "Notifications"}
            </h3>
            {!isReadOnly && unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 !bg-transparent !border-0 !p-0 text-[11px] font-medium !text-blue-600 hover:!text-blue-700"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                <Bell className="h-8 w-8 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">You're all caught up</p>
              </div>
            ) : (
              items.map((n) => {
                const meta = typeMeta[n.type] ?? typeMeta.ANNOUNCEMENT;
                const Icon = meta.icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleMarkRead(n)}
                    className={cn(
                      "flex gap-3 px-4 py-3 border-b border-gray-50 transition-colors",
                      !isReadOnly && "cursor-pointer hover:bg-gray-50/80",
                      !n.isRead && "bg-blue-50/40"
                    )}
                  >
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", meta.bg)}>
                      <Icon className={cn("h-4 w-4", meta.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-[13px] leading-snug", !n.isRead ? "font-semibold text-gray-800" : "font-medium text-gray-600")}>
                          {n.title}
                        </p>
                        {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                      </div>
                      <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10.5px] text-gray-400">
                          {n.branchName ? `${n.branchName} · ` : ""}{timeAgo(n.createdAt)}
                        </span>
                        {!isReadOnly && (
                          <div className="flex items-center gap-2">
                            {!n.isRead && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMarkRead(n); }}
                                title="Mark as read"
                                className="text-gray-300 hover:text-blue-500"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                              title="Delete"
                              className="text-gray-300 hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}