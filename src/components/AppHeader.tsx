import { ChevronDown, Database, LogOut, ShieldCheck, Car, Package, LayoutDashboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { useLocation, useNavigate, Link } from "react-router-dom";
import NotificationBell from "@/components/NotificationBell";
import SupabaseConfigDialog from "@/components/SupabaseConfigDialog";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: typeof Car;
  match: (path: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Timeline",
    href: "/dashboard",
    icon: LayoutDashboard,
    match: (p) => p === "/" || p.startsWith("/dashboard"),
  },
  {
    label: "Travel Request",
    href: "/travel-request",
    icon: Car,
    match: (p) => p.startsWith("/travel-request"),
  },
  {
    label: "Padala",
    href: "/padala-request",
    icon: Package,
    match: (p) => p.startsWith("/padala-request"),
  },
];

const AppHeader = () => {
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const displayName = profile?.name || user?.user_metadata?.full_name || user?.email || "User";
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const avatarUrl = user?.user_metadata?.avatar_url;

  const roleBadge = profile?.role ?? "Unregistered";

  const navItems = isAdmin
    ? [
        ...NAV_ITEMS,
        {
          label: "Admin",
          href: "/admin",
          icon: ShieldCheck,
          match: (p: string) => p.startsWith("/admin"),
        } as NavItem,
      ]
    : NAV_ITEMS;

  return (
    <header className="border-b border-border/30 bg-white/60 backdrop-blur-xl sticky top-0 z-40">
      <div className="h-16 flex items-center gap-3 px-4">
        {/* Brand */}
        <Link to="/dashboard" className="flex items-center gap-3 mr-2 shrink-0">
          <img src="/onetrip-logo.png" alt="One Trip" className="h-10 w-10 object-contain" />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="font-bold text-base tracking-tight">One Trip</span>
            <span className="text-[10px] text-muted-foreground -mt-0.5">One System for Efficient Mobility</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-2">
          {navItems.map((item) => {
            const active = item.match(location.pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-medium">{roleBadge}</Badge>
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
      </div>

      {/* Mobile nav strip */}
      <nav className="md:hidden flex items-center gap-1 px-3 py-2 border-t border-border/30 overflow-x-auto scrollbar-hide">
        {navItems.map((item) => {
          const active = item.match(location.pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-1.5 px-2.5 h-8 rounded-md text-xs font-medium transition-colors shrink-0",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
};

export default AppHeader;
