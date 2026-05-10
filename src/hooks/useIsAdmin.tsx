import { useEffect, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured, logSupabaseDebug, trackSupabaseRequest } from "@/lib/supabase-safe";

export const useIsAdmin = (userId?: string) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!userId) {
      setIsAdmin(false);
      setLoading(false);
      setError(null);
      return;
    }

    if (!isSupabaseConfigured) {
      logSupabaseDebug("roles:has_role", "disabled", "Supabase environment variables are missing");
      setIsAdmin(false);
      setLoading(false);
      setError("Supabase environment variables are missing.");
      return;
    }

    setLoading(true);
    setError(null);

    getSupabaseClient()
      .then((supabase) => {
        if (!active || !supabase) {
          if (active) {
            setIsAdmin(false);
            setLoading(false);
            setError("Supabase client unavailable.");
          }
          return;
        }

        return trackSupabaseRequest(
          "roles:has_role",
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .eq("role", "admin")
            .maybeSingle(),
        ).then(({ data, error }) => {
          if (!active) return;

          if (error) {
            const message = error.message || "Role lookup failed";
            logSupabaseDebug("roles:has_role", "error", message);
            setIsAdmin(false);
            setError(message);
          } else {
            setIsAdmin(!!data);
            setError(null);
          }

          setLoading(false);
        });
      })
      .catch((err) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Role lookup failed";
        logSupabaseDebug("roles:has_role", "error", message);
        setIsAdmin(false);
        setError(message);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  return { isAdmin, loading, error };
};
