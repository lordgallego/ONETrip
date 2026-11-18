import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import SupabaseConfigDialog from "@/components/SupabaseConfigDialog";
import { ThemeToggle } from "@/components/ThemeToggle";

const LoginPage = () => {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="relative min-h-dvh flex items-center justify-center mesh-bg overflow-hidden px-4 py-12">
      <div className="absolute right-5 top-5 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6 page-enter">
        {/* Branding */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex size-20 items-center justify-center rounded-2xl bg-white dark:bg-[#101B33] ring-1 ring-[#A9CDBE]/60 dark:ring-[#A9CDBE]/40 shadow-lg p-2">
            <img src="/onetrip-logo.png" alt="1TRIP" className="size-full object-contain" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground text-balance">1TRIP</h1>
            <p className="text-sm font-medium text-muted-foreground mt-1 text-pretty">
              Tracking &amp; Routing for Intelligent Planning
            </p>
          </div>
        </div>

        {/* Database not configured banner */}
        {!isSupabaseConfigured && (
          <div className="rounded-xl border border-[#F2B53A]/60 bg-[#F2B53A]/15 dark:bg-[#F2B53A]/10 p-4 text-xs space-y-2 text-[#7A4F00] dark:text-[#F2B53A]">
            <p className="font-semibold">Database not connected</p>
            <p className="leading-relaxed opacity-90 text-pretty">
              Point 1TRIP at your Supabase project before signing in. Enter your project URL and anon key below.
            </p>
            <SupabaseConfigDialog
              trigger={
                <Button size="sm" variant="outline" className="mt-1 h-8 bg-white/80 dark:bg-[#0B1325]/80 hover:bg-white dark:hover:bg-[#111B33]">
                  Configure Database
                </Button>
              }
            />
          </div>
        )}

        {/* Login Card */}
        <Card className="overflow-hidden border-[#A9CDBE]/45 dark:border-[#A9CDBE]/25 bg-white/90 dark:bg-[#101B33]/95 backdrop-blur-xl shadow-xl">
          <div
            aria-hidden
            className="h-1 w-full bg-gradient-to-r from-[#A9CDBE] via-[#F2B53A] to-[#A9CDBE]"
          />
          <CardHeader className="text-center pb-4">
            <CardTitle className="font-display text-lg">Sign in to 1TRIP</CardTitle>
            <CardDescription className="text-pretty">
              Submit travel and parcel requests, or inspect the live DOST Western Visayas dispatch schedule.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            <Button
              className="w-full h-11 gap-2.5 text-sm font-semibold shadow-sm"
              size="lg"
              onClick={signInWithGoogle}
              disabled={!isSupabaseConfigured}
            >
              <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {isSupabaseConfigured ? "Continue with Google" : "Configure database first"}
            </Button>
            <p className="text-xs text-center text-muted-foreground leading-relaxed text-pretty">
              Restricted to DOST Western Visayas personnel. New accounts are created on first sign-in and approved by an Admin.
            </p>

            {isSupabaseConfigured && (
              <div className="pt-2 border-t border-border/50 flex justify-center">
                <SupabaseConfigDialog
                  trigger={
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
                      Database settings
                    </Button>
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
