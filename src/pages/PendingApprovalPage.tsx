import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

const PendingApprovalPage = () => {
  const { user, signOut, refreshProfile } = useAuth();

  return (
    <div className="relative min-h-dvh flex items-center justify-center mesh-bg px-4">
      <div className="absolute right-5 top-5 z-20">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md overflow-hidden border-[#F2B53A]/50 bg-white/90 dark:bg-[#101B33]/95 backdrop-blur-xl shadow-xl">
        <div aria-hidden className="h-1 w-full bg-gradient-to-r from-[#F2B53A] via-[#A9CDBE] to-[#F2B53A]" />
        <CardContent className="pt-8 pb-8 px-8 text-center space-y-5">
          <Badge
            variant="outline"
            className="border-[#F2B53A]/60 bg-[#F2B53A]/20 text-[#8A5A00] dark:text-[#F2B53A]"
          >
            Pending Review
          </Badge>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-balance">Account Pending Approval</h1>
            <p className="text-sm text-muted-foreground mt-2 text-pretty">
              Your account <span className="font-medium text-foreground">{user?.email}</span> is awaiting approval from an administrator.
            </p>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed text-pretty">
              You'll be able to access 1TRIP once an administrator approves and assigns your role.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="outline" onClick={refreshProfile} className="w-full border-[#A9CDBE]/60 hover:bg-[#A9CDBE]/20">
              Check Status
            </Button>
            <Button variant="ghost" onClick={signOut} className="w-full text-muted-foreground">
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApprovalPage;
