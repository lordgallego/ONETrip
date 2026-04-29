import { Bell, Car, Package, ThumbsUp, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/use-notifications";
import { useNavigate } from "react-router-dom";
import type { NotificationKind } from "@/lib/queries";

const KIND_META: Record<NotificationKind, { icon: typeof Car; tint: string }> = {
  new_request:     { icon: Car,      tint: "text-emerald-600 bg-emerald-100" },
  status_change:   { icon: ThumbsUp, tint: "text-sky-600 bg-sky-100" },
  padala_attached: { icon: Package,  tint: "text-amber-600 bg-amber-100" },
  info:            { icon: Info,     tint: "text-muted-foreground bg-muted" },
};

const NotificationBell = () => {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  const handleSelect = async (id: string, link: string | null) => {
    await markRead(id);
    if (link) navigate(link);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 text-[10px] font-bold leading-none flex items-center justify-center rounded-full"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-h-[440px] overflow-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <div>
            <span>Activity feed</span>
            <p className="text-[10px] font-normal text-muted-foreground">
              New trips & padala — so you don't miss what's on the schedule.
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={(e) => { e.preventDefault(); markAllRead(); }}>
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <Bell className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p>No activity yet.</p>
            <p className="text-[11px] mt-1">When a new trip or padala is added, you'll see it here.</p>
          </div>
        ) : (
          notifications.slice(0, 20).map((n) => {
            const meta = KIND_META[n.kind] ?? KIND_META.info;
            const Icon = meta.icon;
            return (
              <DropdownMenuItem
                key={n.id}
                className={`flex items-start gap-2.5 py-2.5 cursor-pointer ${n.read ? "opacity-60" : ""}`}
                onClick={() => handleSelect(n.id, n.link)}
              >
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${meta.tint}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />}
                    <span className="font-medium text-sm leading-tight">{n.title}</span>
                  </div>
                  {n.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>}
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </span>
                </div>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
