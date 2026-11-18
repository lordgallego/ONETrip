import { Outlet } from "react-router-dom";
import AppHeader from "@/components/AppHeader";

const AppLayout = () => {
  return (
    <>
      <div className="fixed inset-0 -z-10 mesh-bg" />
      <div className="min-h-dvh flex flex-col">
        <AppHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="border-t border-[#0B1325]/10 dark:border-[#A9CDBE]/15 bg-white/60 dark:bg-[#0B1325]/80 backdrop-blur-sm px-4 py-3 text-center text-xs text-muted-foreground">
          1TRIP · DOST Western Visayas Fleet &amp; Padala Dispatch
        </footer>
      </div>
    </>
  );
};

export default AppLayout;
