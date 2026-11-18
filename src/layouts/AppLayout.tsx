import { Outlet } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { GlassDock, GlassFilter } from "@/components/GlassDock";

const AppLayout = () => {
  return (
    <>
      <GlassFilter />
      {/* Ambient dual-accent mesh background */}
      <div className="fixed inset-0 -z-10 mesh-bg" />
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        {/* pb-32 reserves space for the fixed bottom dock + footer so
            page content never sits behind them. */}
        <main className="flex-1 overflow-auto pb-32">
          <Outlet />
        </main>
        <footer className="fixed bottom-0 left-0 right-0 px-4 py-1.5 text-center text-[10px] text-muted-foreground bg-white/75 dark:bg-[#0B1325]/90 backdrop-blur-md border-t border-[#0B1325]/10 dark:border-[#A9CDBE]/15 z-30 pointer-events-none flex items-center justify-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#A9CDBE]" aria-hidden />
          <span>1TRIP by OneTeam · Tracking &amp; Routing for Intelligent Planning</span>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#F2B53A]" aria-hidden />
        </footer>
        <GlassDock />
      </div>
    </>
  );
};

export default AppLayout;
