import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, AlertTriangle, Route, Package, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import SupabaseConfigDialog from "@/components/SupabaseConfigDialog";
import { ThemeToggle } from "@/components/ThemeToggle";

const LoginPage = () => {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="relative min-h-screen flex items-center justify-center mesh-bg overflow-hidden px-4 py-12">
      {/* Subtle architectural route lines in Sage (#A9CDBE) and Signal Gold (#F2B53A) */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-35 dark:opacity-25"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M-60 620 C 260 540, 420 220, 740 280 S 1060 440, 1260 160"
          fill="none"
          stroke="#A9CDBE"
          strokeWidth="2"
          strokeDasharray="8 8"
        />
        <path
          d="M-40 240 C 280 340, 520 590, 860 480 S 1120 260, 1260 340"
          fill="none"
          stroke="#F2B53A"
          strokeWidth="1.75"
          strokeDasharray="5 9"
        />
        <circle cx="380" cy="368" r="5" fill="#A9CDBE" />
        <circle cx="848" cy="485" r="5" fill="#F2B53A" />
      </svg>

      {/* Top-right theme switcher */}
      <div className="absolute right-5 top-5 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6 page-enter">
        {/* Branding */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-white dark:bg-[#101B33] ring-2 ring-[#A9CDBE]/60 dark:ring-[#A9CDBE]/40 shadow-xl shadow-[#0B1325]/10 dark:shadow-black/50 p-2">
            <img src="/onetrip-logo.png" alt="1TRIP" className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">1TRIP</h1>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              <span className="font-semibold text-foreground">T</span>racking &amp; <span className="font-semibold text-foreground">R</span>outing
              for <span className="font-semibold text-foreground">I</span>ntelligent <span className="font-semibold text-foreground">P</span>lanning
            </p>
            <p className="text-xs italic text-muted-foreground mt-1">Every trip tracked. Every decision smarter.</p>
          </div>
          {/* Dual-accent capability pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A9CDBE]/70 bg-[#A9CDBE]/25 px-2.5 py-0.5 text-[11px] font-medium text-[#1A4D3B] dark:border-[#A9CDBE]/35 dark:bg-[#A9CDBE]/15 dark:text-[#A9CDBE]">
              <Route className="h-3 w-3" /> Shared Fleet Dispatch
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F2B53A]/70 bg-[#F2B53A]/20 px-2.5 py-0.5 text-[11px] font-medium text-[#8A5A00] dark:border-[#F2B53A]/40 dark:bg-[#F2B53A]/15 dark:text-[#F2B53A]">
              <Package className="h-3 w-3" /> Padala Ride-Along
            </span>
          </div>
        </div>

        {/* Database not configured banner */}
        {!isSupabaseConfigured && (
          <div className="rounded-xl border border-[#F2B53A]/60 bg-[#F2B53A]/15 dark:bg-[#F2B53A]/10 p-3.5 flex items-start gap-2.5 text-[#7A4F00] dark:text-[#F2B53A]">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="text-xs space-y-1.5 flex-1">
              <p className="font-semibold">Database not connected</p>
              <p className="leading-relaxed opacity-90">
                Point 1TRIP at your Supabase project before signing in. Enter your project URL and anon key below.
              </p>
              <SupabaseConfigDialog
                trigger={
                  <Button size="sm" variant="outline" className="gap-1.5 mt-1 h-8 bg-white/80 dark:bg-[#0B1325]/80 hover:bg-white dark:hover:bg-[#111B33]">
                    <Database className="h-3.5 w-3.5" /> Configure Database
                  </Button>
                }
              />
            </div>
          </div>
        )}

        {/* Login Card */}
        <Card className="overflow-hidden border-[#A9CDBE]/45 dark:border-[#A9CDBE]/25 bg-white/90 dark:bg-[#101B33]/95 backdrop-blur-xl shadow-2xl shadow-[#0B1325]/10 dark:shadow-black/60">
          <div
            aria-hidden
            className="h-1 w-full bg-gradient-to-r from-[#A9CDBE] via-[#F2B53A] to-[#A9CDBE]"
          />
          <CardHeader className="text-center pb-4">
            <CardTitle className="font-display text-lg">Welcome</CardTitle>
            <CardDescription>
              Sign in to submit travel and parcel requests, or inspect the live dispatch timeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            <Button
              className="w-full h-11 gap-2.5 text-sm font-semibold shadow-sm"
              size="lg"
              onClick={signInWithGoogle}
              disabled={!isSupabaseConfigured}
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {isSupabaseConfigured ? "Sign in with Google" : "Configure database first"}
            </Button>
            <div className="flex items-start gap-2 rounded-lg bg-muted/60 dark:bg-[#0B1325]/60 p-2.5 text-[11px] text-muted-foreground leading-relaxed">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#256D54] dark:text-[#A9CDBE] mt-0.5" />
              <span>
                Access is restricted to DOST Western Visayas personnel. New accounts are created on first sign-in and approved by an Admin.
              </span>
            </div>

            {isSupabaseConfigured && (
              <div className="pt-2 border-t border-border/50 flex justify-center">
                <SupabaseConfigDialog
                  trigger={
                    <Button variant="ghost" size="sm" className="text-[11px] text-muted-foreground gap-1.5 h-7">
                      <Database className="h-3 w-3" /> Change database
                    </Button>
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#A9CDBE]" />
          1TRIP by OneTeam
          <span className="h-1.5 w-1.5 rounded-full bg-[#F2B53A]" />
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
