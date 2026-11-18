import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Car, Package, ShieldCheck } from "lucide-react";

// ─── Glass Effect Wrapper ────────────────────

interface GlassEffectProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const GlassEffect: React.FC<GlassEffectProps> = ({ children, className = "", style = {} }) => {
  const glassStyle: React.CSSProperties = {
    transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 2.2)",
    ...style,
  };
  return (
    <div
      className={cn(
        "relative flex font-semibold overflow-hidden transition-all duration-700",
        "bg-white/80 dark:bg-[#101B33]/90 backdrop-blur-xl",
        "border border-[#0B1325]/15 dark:border-[#A9CDBE]/25",
        "shadow-[0_12px_36px_-8px_rgba(11,19,37,0.18),0_0_0_1px_rgba(169,205,190,0.22)] dark:shadow-[0_16px_44px_-6px_rgba(0,0,0,0.65),0_0_24px_-8px_rgba(169,205,190,0.22)]",
        className,
      )}
      style={glassStyle}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] bg-gradient-to-r from-[#A9CDBE]/[0.08] via-transparent to-[#F2B53A]/[0.08]"
      />
      <div className="relative z-30 w-full">{children}</div>
    </div>
  );
};

// ─── SVG Filter (kept for API compatibility) ─

export const GlassFilter: React.FC = () => null;

// ─── Dock Item ───────────────────────────────

interface DockItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active: boolean;
  accent?: "sage" | "gold";
}

const DockItem: React.FC<DockItemProps> = ({ icon, label, href, active, accent = "sage" }) => (
  <Link
    to={href}
    className="group relative flex flex-col items-center gap-0.5 shrink-0"
    title={label}
  >
    <div
      className={cn(
        "relative flex h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 items-center justify-center rounded-xl transition-all duration-300",
        active
          ? accent === "gold"
            ? "bg-[#F2B53A] text-[#0B1325] scale-105 shadow-md shadow-[#F2B53A]/30"
            : "bg-[#0B1325] text-[#A9CDBE] dark:bg-[#A9CDBE] dark:text-[#0B1325] scale-105 shadow-md shadow-[#A9CDBE]/25"
          : "text-foreground/70 hover:text-foreground hover:bg-[#A9CDBE]/20 dark:hover:bg-[#172544] hover:scale-105"
      )}
    >
      {icon}
    </div>
    <span
      className={cn(
        "hidden md:inline text-[10px] font-medium transition-opacity duration-300",
        active ? "text-foreground opacity-100 font-semibold" : "text-muted-foreground opacity-75 group-hover:opacity-100"
      )}
    >
      {label}
    </span>
  </Link>
);

// ─── Logo home button ────────────────────────

const HomeButton: React.FC<{ active: boolean }> = ({ active }) => (
  <Link to="/dashboard" className="group relative flex flex-col items-center gap-0.5 shrink-0" title="Dashboard">
    <div
      className={cn(
        "flex h-11 w-11 sm:h-12 sm:w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl transition-all duration-300",
        active
          ? "bg-[#A9CDBE]/30 dark:bg-[#A9CDBE]/20 ring-2 ring-[#A9CDBE] dark:ring-[#A9CDBE]/80 scale-105 shadow-md"
          : "hover:bg-[#A9CDBE]/20 dark:hover:bg-[#172544] hover:scale-105"
      )}
    >
      <img src="/onetrip-logo.png" alt="1TRIP" className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 object-contain drop-shadow-sm" />
    </div>
    <span
      className={cn(
        "hidden md:inline text-[10px] font-medium transition-opacity duration-300",
        active ? "text-foreground opacity-100 font-semibold" : "text-muted-foreground opacity-75 group-hover:opacity-100"
      )}
    >
      Timeline
    </span>
  </Link>
);

const DockSeparator = () => (
  <div className="h-8 sm:h-10 w-px bg-[#0B1325]/15 dark:bg-[#A9CDBE]/20 mx-0.5 sm:mx-1.5 shrink-0" />
);

// ─── Main Dock (bottom floating capsule) ─────

export const GlassDock: React.FC = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" || location.pathname === "/dashboard"
                 : location.pathname.startsWith(path);

  const navItems: Array<{ icon: React.ReactNode; label: string; href: string; accent: "sage" | "gold" }> = [
    { icon: <Car className="h-4 w-4 sm:h-5 sm:w-5" />, label: "Travel", href: "/travel-request", accent: "sage" },
    { icon: <Package className="h-4 w-4 sm:h-5 sm:w-5" />, label: "Padala", href: "/padala-request", accent: "gold" },
  ];

  return (
    <div className="fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-1.5rem)] sm:w-auto max-w-[calc(100vw-1.5rem)]">
      <GlassEffect className="rounded-2xl sm:rounded-[28px] p-2 sm:p-2.5 transition-all duration-500 w-full sm:w-auto">
        <div className="flex items-center gap-1.5 sm:gap-2.5 px-1 sm:px-2 overflow-x-auto scrollbar-hide justify-center sm:justify-start">
          <HomeButton active={isActive("/")} />
          <DockSeparator />
          {navItems.map((item) => (
            <DockItem
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
              active={isActive(item.href)}
              accent={item.accent}
            />
          ))}
          {isAdmin && (
            <>
              <DockSeparator />
              <DockItem
                icon={<ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />}
                label="Admin"
                href="/admin"
                active={isActive("/admin")}
                accent="sage"
              />
            </>
          )}
        </div>
      </GlassEffect>
    </div>
  );
};
