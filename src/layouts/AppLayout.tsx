import { Outlet } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { GlassDock, GlassFilter } from "@/components/GlassDock";

const AppLayout = () => {
  return (
    <>
      <GlassFilter />
      {/* Mesh gradient background for glassmorphism visibility */}
      <div className="fixed inset-0 -z-10 mesh-bg" />
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 overflow-auto pb-32">
          <Outlet />
        </main>
        <footer className="fixed bottom-0 left-0 right-0 px-4 py-2 text-center text-[11px] text-muted-foreground bg-white/30 backdrop-blur-sm border-t border-border/20 z-30 pointer-events-none">
          This is One Trip by OneTeam.
        </footer>
        <GlassDock />
      </div>
    </>
  );
};

export default AppLayout;
