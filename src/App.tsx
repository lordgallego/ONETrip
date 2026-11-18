import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { NotificationProvider } from "@/hooks/use-notifications";
import LoginPage from "./pages/LoginPage";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import VehicleRequestPage from "./pages/VehicleRequestPage";
import PadalaRequestPage from "./pages/PadalaRequestPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import PendingApprovalPage from "./pages/PendingApprovalPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isApproved } = useAuth();
  if (!isAdmin || !isApproved) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AuthGate() {
  const { user, loading, isApproved, profile } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (loading && !timedOut) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 mesh-bg">
        <div className="size-10 rounded-xl border border-[#A9CDBE]/50 bg-[#0B1325]/90 dark:bg-[#111B33] flex items-center justify-center shadow-lg">
          <span className="size-2.5 rounded-full bg-[#F2B53A] animate-pulse" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Loading 1TRIP dispatch…</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (profile && !isApproved) {
    return <PendingApprovalPage />;
  }

  return (
    <NotificationProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/travel-request" element={<VehicleRequestPage />} />
          <Route path="/padala-request" element={<PadalaRequestPage />} />
          <Route path="/admin" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </NotificationProvider>
  );
}

const App = () => {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" storageKey="onetrip-theme" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner
            position="bottom-right"
            closeButton
            richColors
            duration={5500}
            offset={24}
            style={{ zIndex: 9999 } as React.CSSProperties}
          />
          <BrowserRouter>
            <AuthProvider>
              <AuthGate />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
