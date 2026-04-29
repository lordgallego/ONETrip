import { createClient } from "@supabase/supabase-js";

/**
 * Supabase env vars. We fall back to placeholders during local scaffolding
 * so the app still mounts (and shows the login screen) before the user
 * wires their project. At runtime, every query gracefully no-ops when the
 * tables aren't reachable — see `safeSelect` in queries.ts.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  // dummy anon key, structurally valid but inert.
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.placeholder";

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    "[One Trip] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. " +
    "Authentication and data persistence will not work until you create a .env.local file. " +
    "See README.md.",
  );
}

/** Auth client — used for sign-in, sign-out, session management. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Anon client — used for public-read queries. Never attaches a JWT,
 * so queries always use the anon key. RLS exposes public SELECT.
 */
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
