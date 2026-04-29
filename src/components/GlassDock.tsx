import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  Car,
  Package,
  ShieldCheck,
} from "lucide-react";

// ─── Glass Effect Wrapper ────────────────────

interface GlassEffectProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const GlassEffect: React.FC<GlassEffectProps> = ({ children, className = "", style = {} }) => {
  const glassStyle = {
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
        style={{ background: "rgba(255, 255, 255, 0.12)" }}
      />
      <div
        className="absolute inset-0 z-20 rounded-[inherit] overflow-hidden"
        style={{
          boxShadow:
            "inset 1px 1px 0 0 rgba(255, 255, 255, 0.3), inset -1px -1px 0 0 rgba(255, 255, 255, 0.1)",
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
    className="group relative flex flex-col items-center gap-0.5 shrink-0"
    title={label}
  >
    <div
      className={`flex h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 items-center justify-center rounded-xl transition-all duration-500 ${
        active
          ? "bg-black/15 text-foreground scale-110 shadow-lg shadow-black/10"
          : "text-foreground/60 hover:text-foreground hover:bg-black/10 hover:scale-105"
      }`}
      style={{ transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 2.2)" }}
    >
      {icon}
    </div>
    <span className={`hidden md:inline text-[10px] font-medium transition-opacity duration-300 ${active ? "text-foreground opacity-100" : "text-foreground/40 opacity-0 group-hover:opacity-100"}`}>
      {label}
    </span>
  </Link>
);

// ─── DOST Logo Home Button ───────────────────

const DostLogo: React.FC<{ active: boolean }> = ({ active }) => (
  <Link to="/" className="group relative flex flex-col items-center gap-0.5 shrink-0" title="Dashboard">
    <div
      className={`flex h-11 w-11 sm:h-14 sm:w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl transition-all duration-500 ${
        active
          ? "bg-black/15 scale-110 shadow-lg shadow-black/10"
          : "hover:bg-black/10 hover:scale-105"
      }`}
      style={{ transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 2.2)" }}
    >
      <img src="/onetrip-logo.png" alt="One Trip" className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 object-contain drop-shadow-sm" />
    </div>
    <span className={`hidden md:inline text-[10px] font-medium transition-opacity duration-300 ${active ? "text-foreground opacity-100" : "text-foreground/40 opacity-0 group-hover:opacity-100"}`}>
      Home
    </span>
  </Link>
);

// ─── Separator ───────────────────────────────

const DockSeparator = () => (
  <div className="h-8 sm:h-10 w-px bg-foreground/15 mx-0.5 sm:mx-1.5 shrink-0" />
);

// ─── Main Dock Component ─────────────────────

export const GlassDock: React.FC = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" || location.pathname === "/dashboard" : location.pathname.startsWith(path);

  // Home (logo) already navigates to "/" which is the Dashboard, so we
  // don't repeat a "Timeline / Dashboard" entry here.
  const navItems = [
    { icon: <Car className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />, label: "Travel", href: "/travel-request" },
    { icon: <Package className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />, label: "Padala", href: "/padala-request" },
  ];

  return (
    <div className="fixed bottom-10 sm:bottom-12 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-1.5rem)] sm:w-auto max-w-[calc(100vw-1.5rem)]">
      <GlassEffect className="rounded-2xl sm:rounded-[32px] p-2 sm:p-3 transition-all duration-700 w-full sm:w-auto">
        <div className="flex items-center gap-1 sm:gap-2 px-0.5 sm:px-1.5 overflow-x-auto scrollbar-hide justify-center sm:justify-start">
          {/* DOST Logo → Dashboard */}
          <DostLogo active={isActive("/")} />

          <DockSeparator />

          {/* Nav Items */}
          {navItems.map((item) => (
            <DockItem key={item.href} icon={item.icon} label={item.label} href={item.href} active={isActive(item.href)} />
          ))}

          {/* Admin */}
          {isAdmin && (
            <>
              <DockSeparator />
              <DockItem
                icon={<ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
                label="Admin"
                href="/admin"
                active={isActive("/admin")}
              />
            </>
          )}
        </div>
      </GlassEffect>
    </div>
  );
};
