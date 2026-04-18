import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const Conversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  // Initial load + realtime for conversations
  useEffect(() => {
    if (!user) return;
    let active = true;

    supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (active) setConversations(data ?? []);
      });

    const channel = supabase
      .channel(`conversations:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setConversations((prev) => {
            if (payload.eventType === "INSERT") {
              if (prev.some((c) => c.id === payload.new.id)) return prev;
              return [payload.new as any, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              return prev.map((c) => (c.id === (payload.new as any).id ? { ...c, ...payload.new } : c));
            }
            if (payload.eventType === "DELETE") {
              return prev.filter((c) => c.id !== (payload.old as any).id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Load + realtime for messages of the selected conversation
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let active = true;
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", selectedId)
      .order("created_at")
      .then(({ data }) => {
        if (active) setMessages(data ?? []);
      });

    const channel = supabase
      .channel(`messages:${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === (payload.new as any).id) ? prev : [...prev, payload.new as any]
          );
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [selectedId]);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="md:col-span-1 space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">All Conversations</h2>
        {conversations.length === 0 && (
          <p className="text-sm text-muted-foreground">No conversations yet. They'll appear here when visitors chat with your AI agent.</p>
        )}
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => setSelectedId(conv.id)}
            className={`w-full text-left rounded-lg border p-3 transition-colors ${selectedId === conv.id ? "border-accent bg-accent/5" : "hover:bg-muted/50"}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate">{conv.visitor_name || "Anonymous Visitor"}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">{conv.status}</Badge>
              <span className="text-xs text-muted-foreground">{format(new Date(conv.created_at), "MMM d, HH:mm")}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="md:col-span-2">
        {selectedId ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Conversation Transcript
                <Badge variant="outline" className="ml-auto text-[10px] gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" style={{ backgroundColor: "#10b981" }} />
                  Live
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages in this conversation.</p>}
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
            Select a conversation to view the transcript
          </div>
        )}
      </div>
    </div>
  );
};

export default Conversations;
