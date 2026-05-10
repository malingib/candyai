import { useEffect, useState } from "react";
import { beginSupabaseDebug, finishSupabaseDebug, getSupabaseClient, isSupabaseConfigured, logSupabaseDebug, trackSupabaseRequest } from "@/lib/supabase-safe";
import type { User } from "@supabase/supabase-js";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let unsubscribe = () => {};

    if (!isSupabaseConfigured) {
      logSupabaseDebug("auth:getSession", "disabled", "Supabase environment variables are missing");
      setLoading(false);
      return;
    }

    getSupabaseClient()
      .then((supabase) => {
        if (!mounted || !supabase) {
          if (mounted) setLoading(false);
          return;
        }

        const authSubscription = supabase.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user ?? null);
          setLoading(false);
        });
        unsubscribe = () => authSubscription.data.subscription.unsubscribe();

        return trackSupabaseRequest("auth:getSession", supabase.auth.getSession())
          .then(({ data: { session } }) => {
            if (!mounted) return;
            setUser(session?.user ?? null);
          })
          .catch((error) => {
            if (!mounted) return;
            logSupabaseDebug("auth:getSession", "error", error instanceof Error ? error.message : "Unable to restore session");
            setUser(null);
          })
          .finally(() => {
            if (mounted) setLoading(false);
          });
      })
      .catch((error) => {
        if (!mounted) return;
        logSupabaseDebug("auth:init", "error", error instanceof Error ? error.message : "Unable to initialize auth");
        setLoading(false);
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const debugId = beginSupabaseDebug("auth:signOut");
    const supabase = await getSupabaseClient();
    if (!supabase) {
      finishSupabaseDebug(debugId, "disabled", "Supabase client unavailable");
      return;
    }

    try {
      await supabase.auth.signOut();
      finishSupabaseDebug(debugId, "success");
    } catch (error) {
      finishSupabaseDebug(debugId, "error", error instanceof Error ? error.message : "Sign out failed");
    }
  };

  return { user, loading, signOut };
};
