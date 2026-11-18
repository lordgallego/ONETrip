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
  return (
    <div
      className={cn(
        "relative flex font-medium overflow-hidden transition-all duration-200 ease-out",
        "bg-white/75 dark:bg-[#101B33]/85",
        "border border-[#0B1325]/10 dark:border-[#A9CDBE]/25",
        "shadow-[0_12px_36px_-8px_rgba(11,19,37,0.16)] dark:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.65)]",
        className,
      )}
      style={style}
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
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] bg-gradient-to-r from-[#A9CDBE]/10 via-transparent to-[#F2B53A]/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
        style={{
          boxShadow:
            "inset 1px 1px 0 0 rgba(255, 255, 255, 0.35), inset -1px -1px 0 0 rgba(169, 205, 190, 0.15)",
        }}
      />
      <div className="relative z-30 w-full">{children}</div>
    </div>
  );
};

// ─── SVG Filter ──────────────────────────────

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
    aria-label={label}
    className="group relative flex flex-col items-center gap-1 shrink-0"
    title={label}
  >
    <div
      className={cn(
        "relative flex size-10 sm:size-12 items-center justify-center rounded-xl transition-transform duration-200 ease-out",
        active
          ? "bg-[#0B1325] text-[#A9CDBE] dark:bg-[#A9CDBE] dark:text-[#0B1325] shadow-sm"
          : "text-foreground/70 hover:text-foreground hover:bg-[#A9CDBE]/20 dark:hover:bg-[#172544] group-hover:-translate-y-0.5"
      )}
    >
      {icon}
    </div>
    <span
      className={cn(
        "hidden md:inline text-[10px] font-medium leading-none transition-opacity duration-200",
        active ? "text-foreground opacity-100" : "text-muted-foreground opacity-70 group-hover:opacity-100"
      )}
    >
      {label}
    </span>
    {active && (
      <span
        aria-hidden
        className="size-1 rounded-full bg-[#F2B53A]"
      />
    )}
  </Link>
);

// ─── Logo home button ────────────────────────

const HomeButton: React.FC<{ active: boolean }> = ({ active }) => (
  <Link
    to="/dashboard"
    aria-label="Dashboard"
    className="group relative flex flex-col items-center gap-1 shrink-0"
    title="Dashboard"
  >
    <div
      className={cn(
        "flex size-10 sm:size-12 items-center justify-center rounded-xl transition-transform duration-200 ease-out",
        active
          ? "bg-[#A9CDBE]/30 dark:bg-[#A9CDBE]/20 ring-1 ring-[#A9CDBE] shadow-sm"
          : "hover:bg-[#A9CDBE]/20 dark:hover:bg-[#172544] group-hover:-translate-y-0.5"
      )}
    >
      <img src="/onetrip-logo.png" alt="1TRIP" className="size-6 sm:size-7 object-contain" />
    </div>
    <span
      className={cn(
        "hidden md:inline text-[10px] font-medium leading-none transition-opacity duration-200",
        active ? "text-foreground opacity-100" : "text-muted-foreground opacity-70 group-hover:opacity-100"
      )}
    >
      Timeline
    </span>
    {active && (
      <span
        aria-hidden
        className="size-1 rounded-full bg-[#F2B53A]"
      />
    )}
  </Link>
);

const DockSeparator = () => (
  <div className="h-7 sm:h-8 w-px bg-[#0B1325]/15 dark:bg-[#A9CDBE]/20 mx-1 sm:mx-1.5 shrink-0" />
);

// ─── Main Dock (bottom floating capsule) ─────

export const GlassDock: React.FC = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" || location.pathname === "/dashboard"
                 : location.pathname.startsWith(path);

  const navItems = [
    { icon: <Car className="size-4 sm:size-5" />, label: "Travel", href: "/travel-request" },
    { icon: <Package className="size-4 sm:size-5" />, label: "Padala", href: "/padala-request" },
  ];

  return (
    <nav
      aria-label="Primary dock navigation"
      className="fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[calc(100vw-1.5rem)]"
    >
      <GlassEffect className="rounded-2xl sm:rounded-3xl px-3 py-2 sm:px-3.5 sm:py-2.5">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide">
          <HomeButton active={isActive("/")} />
          <DockSeparator />
          {navItems.map((item) => (
            <DockItem key={item.href} icon={item.icon} label={item.label} href={item.href} active={isActive(item.href)} />
          ))}
          {isAdmin && (
            <>
              <DockSeparator />
              <DockItem
                icon={<ShieldCheck className="size-4 sm:size-5" />}
                label="Admin"
                href="/admin"
                active={isActive("/admin")}
              />
            </>
          )}
        </div>
      </GlassEffect>
    </nav>
  );
};
