import { useEffect, useState, useCallback, useRef } from "react";

/**
 * Simple data fetcher with tab-focus refresh.
 * Uses anon Supabase client (via queries.ts) — never depends on auth.
 */
export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const isFetching = useRef(false);

  const load = useCallback(async (showLoading: boolean) => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const result = await fetcherRef.current();
      setData(result);
    } catch (e: any) {
      console.error("Fetch error:", e);
      setError(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, []);

  // Fetch on mount and when deps change
  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps]);

  // Silent refetch when tab becomes visible
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        load(false);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  return { data, loading, error, refetch: () => load(true) };
}
