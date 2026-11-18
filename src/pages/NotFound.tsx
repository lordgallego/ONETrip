import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh items-center justify-center mesh-bg px-4">
      <div className="text-center space-y-3">
        <span className="inline-flex items-center rounded-full border border-[#F2B53A]/60 bg-[#F2B53A]/20 px-3 py-1 font-mono text-xs font-semibold tabular-nums text-[#8A5A00] dark:text-[#F2B53A]">
          404
        </span>
        <h1 className="font-display text-3xl font-bold text-balance">Page not found</h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto text-pretty">
          The page you requested doesn't exist in 1TRIP.
        </p>
        <div className="pt-2">
          <Button asChild>
            <Link to="/">Return to Timeline</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
