import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { supabase, supabaseAnon, isSupabaseConfigured } from "./supabase";
import type { User, Session } from "@supabase/supabase-js";

/**
 * One Trip RBAC roles, in increasing order of authority:
 *  - Member       Submits travel + padala requests, sees the timeline.
 *  - Recommender  Can recommend (endorse) pending requests.
 *  - Approver     Final approve / reject on recommended requests.
 *  - Admin        Manages users and role assignments.
 */
export type AppRole = "Member" | "Recommender" | "Approver" | "Admin";

export const APP_ROLES: AppRole[] = ["Member", "Recommender", "Approver", "Admin"];

export interface AppUserProfile {
  id: string;
  email: string;
  name: string | null;
  role: AppRole;
  is_approved: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: AppUserProfile | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isApprover: boolean;
  isRecommender: boolean;
  isMember: boolean;
  canRecommend: boolean;
  canApprove: boolean;
  canManageUsers: boolean;
  isApproved: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  const fetchProfile = useCallback(async (email: string, authUser?: User | null) => {
    // Profile is created automatically by a database trigger on auth.users INSERT.
    // On first login there may be a brief delay — retry once after 1 second.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data } = await supabaseAnon
          .from("app_users")
          .select("*")
          .eq("email", email)
          .single();
        if (data) return data as AppUserProfile;
      } catch {}
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
    }
    // Fallback: synthesize a stub profile so the auth gate can render the
    // pending-approval screen even if the trigger row hasn't been created yet
    // (or if the project has not run the One Trip migrations yet).
    if (authUser) {
      return {
        id: authUser.id,
        email,
        name: (authUser.user_metadata?.full_name as string) ?? null,
        role: "Member" as AppRole,
        is_approved: false,
      };
    }
    return null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.email) {
      const p = await fetchProfile(user.email, user);
      setProfile(p);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // No real Supabase project is wired up yet — skip auth bootstrap
    // entirely so the login screen can render its config dialog.
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.email) {
        const p = await fetchProfile(session.user.email, session.user);
        setProfile(p);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          setSession(null);
          setLoading(false);
          return;
        }
        if (session) {
          setSession(session);
          setUser(session.user);
          if (session.user.email) {
            const p = await fetchProfile(session.user.email, session.user);
            setProfile(p);
          }
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  async function signInWithGoogle() {
    if (!isSupabaseConfigured) {
      console.warn("[One Trip] Supabase is not configured — open the 'Configure Database' dialog first.");
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/dashboard" },
    });
  }

  function signOut() {
    supabase.auth.signOut().finally(() => { window.location.href = "/"; });
  }

  const role = profile?.role;
  const isAdmin = role === "Admin";
  const isApprover = role === "Approver";
  const isRecommender = role === "Recommender";
  const isMember = role === "Member";
  const isApproved = profile?.is_approved === true;
  // Higher roles can also do everything below them.
  const canRecommend = isApproved && (isAdmin || isApprover || isRecommender);
  const canApprove = isApproved && (isAdmin || isApprover);
  const canManageUsers = isApproved && isAdmin;

  return (
    <AuthContext.Provider value={{
      user, profile, session, loading,
      signInWithGoogle, signOut, refreshProfile,
      isAdmin, isApprover, isRecommender, isMember,
      canRecommend, canApprove, canManageUsers, isApproved,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
