import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center mesh-bg px-4">
      <div className="text-center space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F2B53A]/60 bg-[#F2B53A]/20 px-3 py-1 font-mono text-xs font-semibold text-[#8A5A00] dark:text-[#F2B53A]">
          404 · Route Not Found
        </span>
        <h1 className="font-display text-3xl font-bold">Off the dispatch map</h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
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
