import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "relative size-9 rounded-full border border-[#0B1325]/10 bg-white/70 text-[#0B1325] hover:border-[#F2B53A]/60 hover:bg-[#A9CDBE]/25 dark:border-[#A9CDBE]/25 dark:bg-[#111B33]/80 dark:text-[#A9CDBE] dark:hover:border-[#F2B53A]/60 dark:hover:bg-[#172544]",
        className,
      )}
    >
      <Sun className="size-4 rotate-0 scale-100 transition-transform duration-200 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 text-[#F2B53A] transition-transform duration-200 dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
