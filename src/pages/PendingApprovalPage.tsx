import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogOut, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

const PendingApprovalPage = () => {
  const { user, signOut, refreshProfile } = useAuth();

  return (
    <div className="relative min-h-screen flex items-center justify-center mesh-bg px-4">
      <div className="absolute right-5 top-5 z-20">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md overflow-hidden border-[#F2B53A]/50 bg-white/90 dark:bg-[#101B33]/95 backdrop-blur-xl shadow-2xl">
        <div aria-hidden className="h-1 w-full bg-gradient-to-r from-[#F2B53A] via-[#A9CDBE] to-[#F2B53A]" />
        <CardContent className="pt-10 pb-8 px-8 text-center space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F2B53A]/20 text-[#9C6500] dark:bg-[#F2B53A]/15 dark:text-[#F2B53A] ring-1 ring-[#F2B53A]/50">
            <Clock className="h-8 w-8" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">Account Pending Approval</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Your account <span className="font-medium text-foreground">{user?.email}</span> is awaiting approval from an administrator.
            </p>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              You'll be able to access 1TRIP once an administrator approves and assigns your role.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="outline" onClick={refreshProfile} className="w-full gap-2 border-[#A9CDBE]/60 hover:bg-[#A9CDBE]/20">
              <RefreshCw className="h-4 w-4" /> Check Status
            </Button>
            <Button variant="ghost" onClick={signOut} className="w-full text-muted-foreground">
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApprovalPage;
