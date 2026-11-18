import { Outlet } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { GlassDock, GlassFilter } from "@/components/GlassDock";

const AppLayout = () => {
  return (
    <>
      <GlassFilter />
      <div className="fixed inset-0 -z-10 mesh-bg" />
      <div className="min-h-dvh flex flex-col">
        <AppHeader />
        {/* pb-32 reserves space for the fixed bottom GlassDock + footer */}
        <main className="flex-1 overflow-auto pb-32">
          <Outlet />
        </main>
        <footer className="fixed bottom-0 left-0 right-0 px-4 py-1.5 text-center text-[10px] text-muted-foreground bg-white/75 dark:bg-[#0B1325]/90 backdrop-blur-md border-t border-[#0B1325]/10 dark:border-[#A9CDBE]/15 z-30 pointer-events-none">
          1TRIP by OneTeam · Tracking &amp; Routing for Intelligent Planning
        </footer>
        <GlassDock />
      </div>
    </>
  );
};

export default AppLayout;
