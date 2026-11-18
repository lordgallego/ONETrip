import { Bell } from "lucide-react";
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
import { cn } from "@/lib/utils";

const KIND_DOT: Record<NotificationKind, string> = {
  new_request:     "bg-[#256D54] dark:bg-[#A9CDBE]",
  status_change:   "bg-sky-500",
  padala_attached: "bg-[#F2B53A]",
  info:            "bg-muted-foreground",
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
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative size-9 rounded-full border border-[#0B1325]/10 bg-white/70 hover:bg-[#A9CDBE]/25 dark:border-[#A9CDBE]/25 dark:bg-[#111B33]/80 dark:hover:bg-[#172544]"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 font-mono text-[10px] font-bold tabular-nums leading-none flex items-center justify-center rounded-full bg-[#F2B53A] text-[#0B1325] border border-background hover:bg-[#F2B53A]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 max-h-[420px] overflow-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <div>
            <span>Activity feed</span>
            <p className="text-[11px] font-normal text-muted-foreground">
              Recent trip and padala updates
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={(e) => {
                e.preventDefault();
                markAllRead();
              }}
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <p>No activity yet</p>
            <p className="text-xs mt-1">New trip and padala updates will appear here.</p>
          </div>
        ) : (
          notifications.slice(0, 20).map((n) => {
            const dotClass = KIND_DOT[n.kind] ?? KIND_DOT.info;
            return (
              <DropdownMenuItem
                key={n.id}
                className={cn(
                  "flex items-start gap-2.5 py-2.5 px-3 cursor-pointer",
                  n.read && "opacity-60",
                )}
                onClick={() => handleSelect(n.id, n.link)}
              >
                <span className={cn("size-2 rounded-full shrink-0 mt-1.5", dotClass)} aria-hidden />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-sm leading-snug truncate">{n.title}</span>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0 tabular-nums">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {n.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 text-pretty">{n.body}</p>}
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
