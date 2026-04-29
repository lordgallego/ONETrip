import { createClient } from "@supabase/supabase-js";

/**
 * Supabase config resolution order:
 *  1. localStorage (set via the in-app "Configure Database" dialog)
 *  2. .env.local (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
 *  3. inert placeholders (so the app still mounts and the user can open
 *     the config dialog from the login screen)
 *
 * Changing localStorage values triggers a full reload because the
 * @supabase/supabase-js client is instantiated once at module load.
 */

const LS_URL_KEY = "onetrip.supabase.url";
const LS_ANON_KEY = "onetrip.supabase.anonKey";

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.placeholder";

function readLocalStorage(key: string): string | null {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

const lsUrl = readLocalStorage(LS_URL_KEY);
const lsAnonKey = readLocalStorage(LS_ANON_KEY);

const supabaseUrl =
  lsUrl || import.meta.env.VITE_SUPABASE_URL || PLACEHOLDER_URL;
const supabaseAnonKey =
  lsAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || PLACEHOLDER_KEY;

/** True when we actually have real credentials wired up (not placeholders). */
export const isSupabaseConfigured =
  supabaseUrl !== PLACEHOLDER_URL && supabaseAnonKey !== PLACEHOLDER_KEY;

/** Where the current credentials came from — useful for the settings UI. */
export const supabaseConfigSource: "localStorage" | "env" | "placeholder" =
  lsUrl && lsAnonKey ? "localStorage" : (import.meta.env.VITE_SUPABASE_URL ? "env" : "placeholder");

/** The URL currently in use (safe to show; not a secret). */
export const currentSupabaseUrl = supabaseUrl;

if (!isSupabaseConfigured) {
  console.warn(
    "[One Trip] Supabase is not configured. Open the login screen and click " +
    "'Configure Database' to enter your project URL and anon key, " +
    "or set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env.local.",
  );
}

/**
 * Save credentials to localStorage and reload so the new client takes
 * effect. Pass empty strings (or omit) to clear.
 */
export function setSupabaseConfig(url: string, anonKey: string) {
  if (!url || !anonKey) {
    window.localStorage.removeItem(LS_URL_KEY);
    window.localStorage.removeItem(LS_ANON_KEY);
  } else {
    window.localStorage.setItem(LS_URL_KEY, url.trim());
    window.localStorage.setItem(LS_ANON_KEY, anonKey.trim());
  }
  // Drop any cached auth from the previous project before reloading.
  Object.keys(window.localStorage)
    .filter((k) => k.startsWith("sb-"))
    .forEach((k) => window.localStorage.removeItem(k));
  window.location.reload();
}

export function clearSupabaseConfig() {
  setSupabaseConfig("", "");
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
