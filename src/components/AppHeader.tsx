import { ChevronDown, Database, LogOut, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import NotificationBell from "@/components/NotificationBell";
import SupabaseConfigDialog from "@/components/SupabaseConfigDialog";
import { ThemeToggle } from "@/components/ThemeToggle";

const AppHeader = () => {
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const displayName = profile?.name || user?.user_metadata?.full_name || user?.email || "User";
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const avatarUrl = user?.user_metadata?.avatar_url;
  const roleBadge = profile?.role ?? "Unregistered";

  return (
    <header className="sticky top-0 z-40 border-b border-[#0B1325]/10 dark:border-[#A9CDBE]/15 bg-white/80 dark:bg-[#0B1325]/90 backdrop-blur-xl">
      {/* Signature dual-accent transit line across both light & dark modes */}
      <div
        aria-hidden
        className="h-[2px] w-full bg-gradient-to-r from-[#A9CDBE] via-[#F2B53A] to-[#A9CDBE]"
      />
      <div className="h-16 flex items-center gap-3 px-4 sm:px-6 max-w-[1600px] mx-auto">
        {/* Brand */}
        <Link
          to="/dashboard"
          className="flex items-center gap-3 mr-2 shrink-0 hover:opacity-90 transition"
          title="1TRIP — Tracking & Routing for Intelligent Planning"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-[#111B33] ring-1 ring-[#A9CDBE]/50 dark:ring-[#A9CDBE]/30 shadow-sm p-1">
            <img src="/onetrip-logo.png" alt="1TRIP" className="h-full w-full object-contain" />
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="font-display font-bold text-base tracking-tight text-foreground">1TRIP</span>
            <span className="text-[10px] text-muted-foreground -mt-0.5">Tracking &amp; Routing for Intelligent Planning</span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground ml-3 pl-3 border-l border-border/60">
          <span className="h-2 w-2 rounded-full bg-[#A9CDBE]" aria-hidden />
          <span className="italic">Every trip tracked. Every decision smarter.</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <NotificationBell />
          <Badge
            variant="outline"
            className="hidden sm:inline-flex text-[10px] font-semibold border-[#A9CDBE]/60 bg-[#A9CDBE]/20 text-[#0B1325] dark:border-[#A9CDBE]/35 dark:bg-[#A9CDBE]/15 dark:text-[#A9CDBE]"
          >
            {roleBadge}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 h-9 rounded-full pl-1.5 pr-3 hover:bg-[#A9CDBE]/20 dark:hover:bg-[#182544]"
              >
                <Avatar className="h-7 w-7 ring-1 ring-[#F2B53A]/60">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                  <AvatarFallback className="text-xs font-semibold bg-[#0B1325] text-[#F2B53A] dark:bg-[#A9CDBE] dark:text-[#0B1325]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm font-medium">{displayName}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-xs">
                <p className="font-medium truncate">{displayName}</p>
                <p className="text-muted-foreground truncate">{user?.email}</p>
                <Badge
                  variant="outline"
                  className="mt-1.5 text-[10px] border-[#F2B53A]/60 bg-[#F2B53A]/15 text-[#0B1325] dark:text-[#F2B53A]"
                >
                  {roleBadge}
                </Badge>
              </div>
              <DropdownMenuSeparator />
              {isAdmin && (
                <>
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <ShieldCheck className="mr-2 h-4 w-4 text-[#2C6451] dark:text-[#A9CDBE]" />
                    Admin Panel
                  </DropdownMenuItem>
                  <SupabaseConfigDialog
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Database className="mr-2 h-4 w-4 text-[#C68914] dark:text-[#F2B53A]" />
                        Database Settings
                      </DropdownMenuItem>
                    }
                  />
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
