import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { fetchNotifications, markNotificationRead, type Notification } from "@/lib/queries";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  pushLocal: (n: { title: string; body?: string; link?: string }) => void;
  refetch: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * Site-wide notifications: polls Supabase for new notifications, fires
 * a sonner toast when a fresh one arrives, and exposes the list to the
 * header bell dropdown. Falls back gracefully if the table doesn't exist.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const lastSeenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const refetch = useCallback(async () => {
    const list = await fetchNotifications(user?.id ?? null);
    if (initializedRef.current) {
      // Anything we haven't seen before triggers a toast.
      list.forEach((n) => {
        if (!lastSeenIdsRef.current.has(n.id) && !n.read) {
          toast(n.title, { description: n.body ?? undefined });
        }
      });
    }
    lastSeenIdsRef.current = new Set(list.map((n) => n.id));
    initializedRef.current = true;
    setNotifications(list);
  }, [user?.id]);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, 20_000);  // poll every 20s
    return () => clearInterval(interval);
  }, [refetch]);

  const markRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // ignore — table may not exist
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await Promise.allSettled(unread.map((n) => markNotificationRead(n.id)));
  }, [notifications]);

  /**
   * Optimistic local-only notification (also fires a toast). Useful right
   * after a successful submit so the user sees immediate feedback even
   * before the server-side row propagates.
   */
  const pushLocal = useCallback((n: { title: string; body?: string; link?: string }) => {
    toast(n.title, { description: n.body });
    const local: Notification = {
      id: `local-${Date.now()}`,
      user_id: user?.id ?? null,
      title: n.title,
      body: n.body ?? null,
      link: n.link ?? null,
      kind: "info",
      read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [local, ...prev]);
    lastSeenIdsRef.current.add(local.id);
  }, [user?.id]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, pushLocal, refetch }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
