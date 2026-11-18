import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LiquidGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  draggable?: boolean;
  expandable?: boolean;
  width?: string;
  height?: string;
  expandedWidth?: string;
  expandedHeight?: string;
  blurIntensity?: "sm" | "md" | "lg" | "xl";
  shadowIntensity?: "none" | "xs" | "sm" | "md" | "lg" | "xl";
  borderRadius?: string;
  glowIntensity?: "none" | "xs" | "sm" | "md" | "lg" | "xl";
}

export const LiquidGlassCard = ({
  children,
  className = "",
  draggable = false,
  expandable = false,
  width,
  height,
  expandedWidth,
  expandedHeight,
  blurIntensity = "xl",
  borderRadius = "18px",
  glowIntensity = "sm",
  shadowIntensity = "md",
  ...props
}: LiquidGlassCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleExpansion = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!expandable) return;
    if ((e.target as HTMLElement).closest("a, button, input, select, textarea")) return;
    setIsExpanded(!isExpanded);
  };

  const blurClasses = {
    sm: "backdrop-blur-sm",
    md: "backdrop-blur-md",
    lg: "backdrop-blur-lg",
    xl: "backdrop-blur-xl",
  };

  const shadowClasses = {
    none: "shadow-none",
    xs: "shadow-sm",
    sm: "shadow-[0_4px_20px_-6px_rgba(11,19,37,0.08)] dark:shadow-[0_8px_28px_-8px_rgba(0,0,0,0.45)]",
    md: "shadow-[0_10px_30px_-10px_rgba(11,19,37,0.12)] dark:shadow-[0_16px_36px_-10px_rgba(0,0,0,0.55)]",
    lg: "shadow-[0_18px_40px_-12px_rgba(11,19,37,0.16)] dark:shadow-[0_22px_44px_-12px_rgba(0,0,0,0.65)]",
    xl: "shadow-[0_24px_52px_-12px_rgba(11,19,37,0.2)] dark:shadow-[0_28px_56px_-12px_rgba(0,0,0,0.75)]",
  };

  const glowRing = {
    none: "",
    xs: "ring-1 ring-[#0B1325]/[0.06] dark:ring-[#A9CDBE]/15",
    sm: "ring-1 ring-[#A9CDBE]/35 dark:ring-[#A9CDBE]/20",
    md: "ring-1 ring-[#A9CDBE]/45 dark:ring-[#A9CDBE]/25",
    lg: "ring-1 ring-[#A9CDBE]/55 dark:ring-[#A9CDBE]/30",
    xl: "ring-1 ring-[#F2B53A]/45 dark:ring-[#F2B53A]/35",
  };

  const containerVariants = expandable
    ? {
        collapsed: {
          width: width || "auto",
          height: height || "auto",
          transition: { duration: 0.4, ease: [0.5, 1.5, 0.5, 1] as const },
        },
        expanded: {
          width: expandedWidth || "auto",
          height: expandedHeight || "auto",
          transition: { duration: 0.4, ease: [0.5, 1.5, 0.5, 1] as const },
        },
      }
    : undefined;

  if (draggable || expandable) {
    return (
      <motion.div
        className={cn(
          "relative overflow-hidden bg-white/80 dark:bg-[#101B33]/85",
          blurClasses[blurIntensity],
          shadowClasses[shadowIntensity],
          glowRing[glowIntensity],
          draggable ? "cursor-grab active:cursor-grabbing" : "",
          expandable ? "cursor-pointer" : "",
          className,
        )}
        style={{
          borderRadius,
          ...(width && !expandable && { width }),
          ...(height && !expandable && { height }),
        }}
        variants={containerVariants}
        animate={expandable ? (isExpanded ? "expanded" : "collapsed") : undefined}
        onClick={expandable ? handleToggleExpansion : undefined}
        drag={draggable}
        dragConstraints={draggable ? { left: 0, right: 0, top: 0, bottom: 0 } : undefined}
        dragElastic={draggable ? 0.3 : undefined}
        dragTransition={draggable ? { bounceStiffness: 300, bounceDamping: 10, power: 0.3 } : undefined}
        whileDrag={draggable ? { scale: 1.02 } : undefined}
        whileHover={{ scale: 1.004 }}
        whileTap={{ scale: 0.996 }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#A9CDBE]/[0.08] via-transparent to-[#F2B53A]/[0.06] dark:from-[#A9CDBE]/[0.06] dark:to-[#F2B53A]/[0.05]"
        />
        <div className="relative z-10">{children}</div>
      </motion.div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-white/85 dark:bg-[#101B33]/90 transition-colors",
        blurClasses[blurIntensity],
        shadowClasses[shadowIntensity],
        glowRing[glowIntensity],
        className,
      )}
      style={{ borderRadius, ...(width && { width }), ...(height && { height }) }}
      {...props}
    >
      {/* Subtle dual-accent sheen visible in both light & dark modes */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#A9CDBE]/[0.07] via-transparent to-[#F2B53A]/[0.05] dark:from-[#A9CDBE]/[0.06] dark:to-[#F2B53A]/[0.04]"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};
