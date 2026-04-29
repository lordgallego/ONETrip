import { Outlet } from "react-router-dom";
import AppHeader from "@/components/AppHeader";

const AppLayout = () => {
  return (
    <>
      {/* Mesh gradient background */}
      <div className="fixed inset-0 -z-10 mesh-bg" />
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 overflow-auto pb-12">
          <Outlet />
        </main>
        <footer className="px-4 py-2 text-center text-[11px] text-muted-foreground bg-white/30 backdrop-blur-sm border-t border-border/20">
          This is One Trip by OneTeam.
        </footer>
      </div>
    </>
  );
};

export default AppLayout;
