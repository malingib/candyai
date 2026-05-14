import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getSupabaseClient, isSupabaseConfigured, logSupabaseDebug, trackSupabaseRequest } from "@/lib/supabase-safe";

type UnreadCtx = {
  unreadCount: number;
  resetUnread: () => void;
};

const Ctx = createContext<UnreadCtx>({ unreadCount: 0, resetUnread: () => {} });

export const UnreadConversationsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const ownedConvIds = useRef<Set<string>>(new Set());
  const onConvPage = location.pathname === "/dashboard/conversations";

  // Reset when user opens the conversations page
  useEffect(() => {
    if (onConvPage) setUnreadCount(0);
  }, [onConvPage, location.pathname]);

  // Load owned conversation IDs (so we can filter incoming messages)
  useEffect(() => {
    if (!user) {
      ownedConvIds.current = new Set();
      setUnreadCount(0);
      return;
    }

    if (!isSupabaseConfigured) {
      logSupabaseDebug("conversations:unread", "disabled", "Supabase environment variables are missing");
      ownedConvIds.current = new Set();
      setUnreadCount(0);
      return;
    }

    let active = true;
    let convChannel: import("@supabase/supabase-js").RealtimeChannel | null = null;
    let msgChannel: import("@supabase/supabase-js").RealtimeChannel | null = null;

    getSupabaseClient()
      .then((supabase) => {
        if (!active || !supabase) return;

        return trackSupabaseRequest(
          "conversations:owned-list",
          supabase.from("conversations").select("id").eq("user_id", user.id),
        ).then(({ data }) => {
          if (!active) return;
          ownedConvIds.current = new Set((data ?? []).map((c) => c.id));

          convChannel = supabase
            .channel(`unread-conversations:${user.id}`)
            .on(
              "postgres_changes",
              { event: "INSERT", schema: "public", table: "conversations", filter: `user_id=eq.${user.id}` },
              (payload) => {
                ownedConvIds.current.add(payload.new.id);
                if (location.pathname !== "/dashboard/conversations") {
                  setUnreadCount((c) => c + 1);
                }
              },
            )
            .subscribe();

          msgChannel = supabase
            .channel(`unread-messages:${user.id}`)
            .on(
              "postgres_changes",
              { event: "INSERT", schema: "public", table: "messages" },
              (payload) => {
                const m = payload.new as { role?: string; conversation_id?: string };
                if (m.role !== "user") return;
                if (!ownedConvIds.current.has(m.conversation_id || "")) return;
                if (location.pathname === "/dashboard/conversations") return;
                setUnreadCount((c) => c + 1);
              },
            )
            .subscribe();
        });
      })
      .catch((error) => {
        if (!active) return;
        logSupabaseDebug(
          "conversations:unread",
          "error",
          error instanceof Error ? error.message : "Failed to initialize unread subscription",
        );
      });

    return () => {
      active = false;
      getSupabaseClient().then((supabase) => {
        if (!supabase) return;
        if (convChannel) supabase.removeChannel(convChannel);
        if (msgChannel) supabase.removeChannel(msgChannel);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <Ctx.Provider value={{ unreadCount, resetUnread: () => setUnreadCount(0) }}>
      {children}
    </Ctx.Provider>
  );
};

export const useUnreadConversations = () => useContext(Ctx);
