import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

const PendingApprovalPage = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center mesh-bg px-4">
      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardContent className="pt-10 pb-8 px-8 text-center space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Clock className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Account Pending Approval</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Your account <span className="font-medium text-foreground">{user?.email}</span> is awaiting approval from an administrator.
            </p>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              You'll be able to access 1TRIP once an administrator has assigned you a role. Please check back later.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="outline" onClick={refreshProfile} className="w-full">
              Check Status
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
