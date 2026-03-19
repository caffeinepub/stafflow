import { Bell, Check, Megaphone, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AppNotification,
  getNotifications,
  getUnreadCount,
  markAllRead,
} from "../utils/notifications";

interface Props {
  userId: string;
  t: (k: string) => string;
}

function typeIcon(type: AppNotification["type"]) {
  switch (type) {
    case "leave_approved":
    case "overtime_approved":
    case "swap_approved":
      return "✅";
    case "leave_rejected":
    case "overtime_rejected":
    case "swap_rejected":
      return "❌";
    case "announcement":
      return "📢";
    default:
      return "🔔";
  }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function NotificationBell({ userId, t }: Props) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    setNotifications(getNotifications(userId));
    setUnread(getUnreadCount(userId));
  }, [userId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleOpen() {
    setOpen((v) => !v);
    if (!open) refresh();
  }

  function handleMarkAll() {
    markAllRead(userId);
    refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-ocid="notifications.button"
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label={t("notifications")}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          data-ocid="notifications.popover"
          className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-sm">
              {t("notificationCenter")}
            </span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  type="button"
                  data-ocid="notifications.confirm_button"
                  onClick={handleMarkAll}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Check size={12} /> {t("markAllRead")}
                </button>
              )}
              <button
                type="button"
                data-ocid="notifications.close_button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div
                data-ocid="notifications.empty_state"
                className="flex flex-col items-center justify-center py-10 text-muted-foreground"
              >
                <Megaphone size={28} className="mb-2 opacity-40" />
                <span className="text-sm">{t("noNotifications")}</span>
              </div>
            ) : (
              notifications.map((n, idx) => (
                <div
                  key={n.id}
                  data-ocid={`notifications.item.${idx + 1}`}
                  className={`flex gap-3 px-4 py-3 border-b border-border last:border-0 transition-colors ${
                    n.read ? "opacity-70" : "bg-blue-500/5"
                  }`}
                >
                  <span className="text-base flex-shrink-0 mt-0.5">
                    {typeIcon(n.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-snug break-words">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatTime(n.timestamp)}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
