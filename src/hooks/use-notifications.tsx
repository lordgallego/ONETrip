import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { fetchNotifications, markNotificationRead, type Notification } from "@/lib/queries";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * Site-wide notifications: polls Supabase for new entries and fires a
 * toast for any newly-arrived unread item. The bell only ever shows
 * DB-backed notifications — no client-only mock rows.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isApproved } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const lastSeenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const refetch = useCallback(async () => {
    const list = await fetchNotifications(user?.id ?? null);
    if (initializedRef.current) {
      // Anything we haven't seen before triggers a toast.
      list.forEach((n) => {
        if (!lastSeenIdsRef.current.has(n.id) && !n.read) {
          toast(n.title, {
            description: n.body ?? undefined,
            duration: 6000,
          });
        }
      });
    }
    lastSeenIdsRef.current = new Set(list.map((n) => n.id));
    initializedRef.current = true;
    setNotifications(list);
  }, [user?.id]);

  useEffect(() => {
    if (!isApproved) return;
    refetch();
    // Poll every 10s — short enough to feel live, long enough to not hammer
    // Supabase. (Realtime channels would be ideal but require enabling the
    // postgres-changes feature on the project.)
    const interval = setInterval(refetch, 10_000);
    return () => clearInterval(interval);
  }, [refetch, isApproved]);

  // Refetch when the tab regains focus so users coming back from another
  // window see the latest activity immediately.
  useEffect(() => {
    const onFocus = () => { if (isApproved) refetch(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetch, isApproved]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await markNotificationRead(id);
    } catch {
      // ignore — table may not exist yet, optimistic update is fine
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await Promise.allSettled(unread.map((n) => markNotificationRead(n.id)));
  }, [notifications]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, refetch }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
