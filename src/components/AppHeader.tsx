import { ChevronDown, Database, LogOut, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import NotificationBell from "@/components/NotificationBell";
import SupabaseConfigDialog from "@/components/SupabaseConfigDialog";

const AppHeader = () => {
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const displayName = profile?.name || user?.user_metadata?.full_name || user?.email || "User";
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const avatarUrl = user?.user_metadata?.avatar_url;

  const roleBadge = profile?.role ?? "Unregistered";

  return (
    <header className="h-16 border-b border-border/30 bg-white/40 backdrop-blur-xl flex items-center gap-3 px-4 sticky top-0 z-40">
      {/* Brand */}
      <div className="flex items-center gap-3 mr-2">
        <img src="/onetrip-logo.png" alt="One Trip" className="h-10 w-10 object-contain" />
        <div className="hidden sm:flex flex-col leading-tight">
          <span className="font-bold text-base tracking-tight">One Trip</span>
          <span className="text-[10px] text-muted-foreground -mt-0.5">One System for Efficient Mobility</span>
        </div>
      </div>

      <div className="hidden lg:flex items-center text-xs italic text-muted-foreground ml-4">
        Every trip tracked. Every decision smarter.
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <NotificationBell />
        <Badge variant="outline" className="text-[10px] font-medium">{roleBadge}</Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 h-9 rounded-full pl-1.5 pr-3">
              <Avatar className="h-7 w-7">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden md:inline text-sm font-medium">{displayName}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {isAdmin && (
              <>
                <DropdownMenuItem onClick={() => navigate("/admin")}>
                  <ShieldCheck className="mr-2 h-4 w-4" />Admin Panel
                </DropdownMenuItem>
                <SupabaseConfigDialog
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Database className="mr-2 h-4 w-4" />Database Settings
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
    </header>
  );
};

export default AppHeader;
