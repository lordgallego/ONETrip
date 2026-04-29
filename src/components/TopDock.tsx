import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Car, Package, ShieldCheck, ChevronDown, Database, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationBell from "@/components/NotificationBell";
import SupabaseConfigDialog from "@/components/SupabaseConfigDialog";

// ─── Glass Effect Wrapper ────────────────────

interface GlassEffectProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const GlassEffect: React.FC<GlassEffectProps> = ({ children, className = "", style = {} }) => {
  const glassStyle: React.CSSProperties = {
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15), 0 0 40px rgba(0, 0, 0, 0.05)",
    transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 2.2)",
    ...style,
  };
  return (
    <div
      className={`relative flex font-semibold overflow-hidden transition-all duration-700 ${className}`}
      style={glassStyle}
    >
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
        style={{
          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
          filter: "url(#glass-distortion)",
          isolation: "isolate",
        }}
      />
      <div
        className="absolute inset-0 z-10 rounded-[inherit]"
        style={{ background: "rgba(255, 255, 255, 0.18)" }}
      />
      <div
        className="absolute inset-0 z-20 rounded-[inherit] overflow-hidden pointer-events-none"
        style={{
          boxShadow:
            "inset 1px 1px 0 0 rgba(255, 255, 255, 0.35), inset -1px -1px 0 0 rgba(255, 255, 255, 0.1)",
        }}
      />
      <div className="relative z-30 w-full">{children}</div>
    </div>
  );
};

// ─── SVG Filter (referenced by GlassEffect) ──

export const GlassFilter: React.FC = () => (
  <svg style={{ display: "none" }} aria-hidden="true">
    <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
      <feTurbulence type="fractalNoise" baseFrequency="0.001 0.005" numOctaves="1" seed="17" result="turbulence" />
      <feComponentTransfer in="turbulence" result="mapped">
        <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
        <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
        <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
      </feComponentTransfer>
      <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
      <feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100" lightingColor="white" result="specLight">
        <fePointLight x="-200" y="-200" z="300" />
      </feSpecularLighting>
      <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage" />
      <feDisplacementMap in="SourceGraphic" in2="softMap" scale="200" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </svg>
);

// ─── Dock Item ───────────────────────────────

interface DockItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active: boolean;
}

const DockItem: React.FC<DockItemProps> = ({ icon, label, href, active }) => (
  <Link
    to={href}
    className="group relative flex flex-col items-center gap-0.5 shrink-0"
    title={label}
  >
    <div
      className={cn(
        "flex h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 items-center justify-center rounded-xl transition-all duration-500",
        active
          ? "bg-black/15 text-foreground scale-110 shadow-lg shadow-black/10"
          : "text-foreground/60 hover:text-foreground hover:bg-black/10 hover:scale-105"
      )}
      style={{ transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 2.2)" }}
    >
      {icon}
    </div>
    <span
      className={cn(
        "hidden md:inline text-[10px] font-medium transition-opacity duration-300",
        active ? "text-foreground opacity-100" : "text-foreground/40 opacity-0 group-hover:opacity-100"
      )}
    >
      {label}
    </span>
  </Link>
);

const DockSeparator = () => (
  <div className="h-8 sm:h-10 w-px bg-foreground/15 mx-0.5 sm:mx-1.5 shrink-0" />
);

// ─── Top Dock (replaces AppHeader) ───────────

export const TopDock: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, isAdmin } = useAuth();

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" || location.pathname === "/dashboard"
                 : location.pathname.startsWith(path);

  const navItems = [
    { icon: <Car className="h-5 w-5 md:h-6 md:w-6" />, label: "Travel", href: "/travel-request" },
    { icon: <Package className="h-5 w-5 md:h-6 md:w-6" />, label: "Padala", href: "/padala-request" },
  ];

  const displayName = profile?.name || user?.user_metadata?.full_name || user?.email || "User";
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const avatarUrl = user?.user_metadata?.avatar_url;
  const roleBadge = profile?.role ?? "Unregistered";

  return (
    <>
      <GlassFilter />
      <div className="sticky top-3 z-50 px-3 sm:px-5 mt-3">
        <GlassEffect className="rounded-2xl sm:rounded-3xl px-2 sm:px-3 h-14 sm:h-16 flex items-center gap-2">
          {/* Brand / home button */}
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 pl-1 pr-2 sm:pr-3 py-1 rounded-xl hover:bg-black/5 transition-colors shrink-0"
            title="Dashboard"
          >
            <img src="/onetrip-logo.png" alt="One Trip" className="h-9 w-9 sm:h-11 sm:w-11 object-contain drop-shadow-sm" />
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="font-bold text-sm tracking-tight">One Trip</span>
              <span className="text-[9px] text-muted-foreground -mt-0.5">One System for Efficient Mobility</span>
            </div>
          </Link>

          <DockSeparator />

          {/* Center nav */}
          <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-center sm:justify-start overflow-x-auto scrollbar-hide">
            {navItems.map((item) => (
              <DockItem
                key={item.href}
                icon={item.icon}
                label={item.label}
                href={item.href}
                active={isActive(item.href)}
              />
            ))}
            {isAdmin && (
              <>
                <DockSeparator />
                <DockItem
                  icon={<ShieldCheck className="h-5 w-5 md:h-6 md:w-6" />}
                  label="Admin"
                  href="/admin"
                  active={isActive("/admin")}
                />
              </>
            )}
          </div>

          {/* Right cluster: bell + role + avatar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <NotificationBell />
            <Badge variant="outline" className="hidden md:inline-flex text-[10px] font-medium bg-white/40">
              {roleBadge}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 h-9 rounded-full pl-1 pr-2 hover:bg-black/5">
                  <Avatar className="h-7 w-7">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs">
                  <p className="font-medium truncate">{displayName}</p>
                  <p className="text-muted-foreground truncate">{user?.email}</p>
                  <Badge variant="outline" className="mt-1 text-[10px]">{roleBadge}</Badge>
                </div>
                <DropdownMenuSeparator />
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
        </GlassEffect>
      </div>
    </>
  );
};

export default TopDock;
