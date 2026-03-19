export type NotificationType =
  | "leave_approved"
  | "leave_rejected"
  | "overtime_approved"
  | "overtime_rejected"
  | "swap_approved"
  | "swap_rejected"
  | "announcement";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  timestamp: string;
  read: boolean;
}

function storageKey(userId: string) {
  return `sf_notifications_${userId}`;
}

function loadNotifications(userId: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    return JSON.parse(raw) as AppNotification[];
  } catch {
    return [];
  }
}

function saveNotifications(userId: string, list: AppNotification[]): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(list));
  } catch {
    // ignore storage errors
  }
}

export function addNotification(
  userId: string,
  type: NotificationType,
  message: string,
): void {
  const list = loadNotifications(userId);
  list.unshift({
    id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId,
    type,
    message,
    timestamp: new Date().toISOString(),
    read: false,
  });
  // keep max 100
  saveNotifications(userId, list.slice(0, 100));
}

export function getNotifications(userId: string): AppNotification[] {
  return loadNotifications(userId);
}

export function markAllRead(userId: string): void {
  const list = loadNotifications(userId);
  saveNotifications(
    userId,
    list.map((n) => ({ ...n, read: true })),
  );
}

export function getUnreadCount(userId: string): number {
  return loadNotifications(userId).filter((n) => !n.read).length;
}
