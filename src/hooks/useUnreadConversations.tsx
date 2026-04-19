import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
    let active = true;
    supabase
      .from("conversations")
      .select("id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!active) return;
        ownedConvIds.current = new Set((data ?? []).map((c) => c.id));
      });

    const convChannel = supabase
      .channel(`unread-conversations:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations", filter: `user_id=eq.${user.id}` },
        (payload) => {
          ownedConvIds.current.add((payload.new as any).id);
          if (location.pathname !== "/dashboard/conversations") {
            setUnreadCount((c) => c + 1);
          }
        }
      )
      .subscribe();

    const msgChannel = supabase
      .channel(`unread-messages:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as any;
          // Only count visitor messages from owned conversations
          if (m.role !== "user") return;
          if (!ownedConvIds.current.has(m.conversation_id)) return;
          if (location.pathname === "/dashboard/conversations") return;
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(convChannel);
      supabase.removeChannel(msgChannel);
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
