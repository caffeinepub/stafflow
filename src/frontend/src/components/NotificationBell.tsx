import { Bell, Check, Loader2, Megaphone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  useMarkNotificationRead,
  useNotificationsByPersonnel,
  useUnreadCount,
} from "../hooks/useQueries";

interface Props {
  personnelId: string;
}

function formatTime(ts: bigint): string {
  try {
    const d = new Date(Number(ts) / 1_000_000);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function NotificationBell({ personnelId }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifications = [], isLoading } =
    useNotificationsByPersonnel(personnelId);
  const { data: unreadBig = 0n } = useUnreadCount(personnelId);
  const markReadMutation = useMarkNotificationRead(personnelId);

  const unread = Number(unreadBig);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleMarkRead(id: string) {
    markReadMutation.mutate(id);
  }

  const sorted = [...notifications].sort(
    (a, b) => Number(b.createdAt) - Number(a.createdAt),
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-ocid="notifications.button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Bildirimler"
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
            <span className="font-semibold text-sm">Bildirimler</span>
            <button
              type="button"
              data-ocid="notifications.close_button"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div
                data-ocid="notifications.loading_state"
                className="flex items-center justify-center py-8 text-muted-foreground gap-2"
              >
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Yükleniyor...</span>
              </div>
            ) : sorted.length === 0 ? (
              <div
                data-ocid="notifications.empty_state"
                className="flex flex-col items-center justify-center py-10 text-muted-foreground"
              >
                <Megaphone size={28} className="mb-2 opacity-40" />
                <span className="text-sm">Bildirim yok</span>
              </div>
            ) : (
              sorted.map((n, idx) => (
                <div
                  key={n.id}
                  data-ocid={`notifications.item.${idx + 1}`}
                  className={`flex gap-3 px-4 py-3 border-b border-border last:border-0 transition-colors ${
                    n.isRead ? "opacity-70" : "bg-blue-500/5"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-snug break-words">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatTime(n.createdAt)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <button
                      type="button"
                      data-ocid={`notifications.confirm_button.${idx + 1}`}
                      onClick={() => handleMarkRead(n.id)}
                      className="flex-shrink-0 mt-0.5 p-1 rounded hover:bg-muted transition-colors text-blue-400"
                      title="Okundu işaretle"
                    >
                      <Check size={12} />
                    </button>
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
