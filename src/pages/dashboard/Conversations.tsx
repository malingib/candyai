import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, ChevronRight, Send, Ticket as TicketIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import type { RealtimeChannel } from "@supabase/supabase-js";

const Conversations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [converting, setConverting] = useState(false);

  // Broadcast channel for "agent is typing"
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);

  const sendTyping = (typing: boolean) => {
    const ch = typingChannelRef.current;
    if (!ch) return;
    ch.send({ type: "broadcast", event: "typing", payload: { typing } });
  };

  const handleReplyChange = (value: string) => {
    setReply(value);
    if (!typingChannelRef.current) return;
    const now = Date.now();
    if (value.length > 0 && now - lastTypingSentRef.current > 1500) {
      lastTypingSentRef.current = now;
      sendTyping(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      lastTypingSentRef.current = 0;
      sendTyping(false);
    }, 2500);
  };

  const handleSendReply = async () => {
    const text = reply.trim();
    if (!text || !selectedId || !user || sending) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedId,
      role: "assistant",
      content: text,
    });
    setSending(false);
    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
      return;
    }
    setReply("");
    sendTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", selectedId);
  };

  const handleConvertToTicket = async () => {
    if (!selectedId || !user || converting) return;
    const conv = conversations.find((c) => c.id === selectedId);
    if (!conv) return;
    setConverting(true);

    const visitorName = conv.visitor_name || "Anonymous Visitor";
    const visitorEmail = conv.visitor_email || "";
    const transcript = messages
      .map((m) => `[${m.role === "user" ? "Visitor" : "Agent/AI"}] ${m.content}`)
      .join("\n\n");
    const subject = `Chat with ${visitorName} — ${format(new Date(conv.created_at), "MMM d, HH:mm")}`;
    const description = transcript || "No messages yet.";

    const { data, error } = await supabase
      .from("tickets")
      .insert({
        user_id: user.id,
        conversation_id: selectedId,
        subject,
        description,
        customer_name: visitorName,
        customer_email: visitorEmail,
        priority: "medium",
        status: "open",
        tags: ["from-chat"],
      })
      .select("id")
      .single();
    setConverting(false);

    if (error) {
      toast({ title: "Failed to create ticket", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Ticket created", description: "Opening tickets dashboard..." });
    navigate(`/dashboard/tickets?focus=${data.id}`);
  };


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

  // Broadcast typing channel for the selected conversation
  useEffect(() => {
    if (!selectedId) {
      typingChannelRef.current = null;
      return;
    }
    const ch = supabase.channel(`widget-typing:${selectedId}`, {
      config: { broadcast: { self: false } },
    });
    ch.subscribe();
    typingChannelRef.current = ch;
    return () => {
      try { ch.send({ type: "broadcast", event: "typing", payload: { typing: false } }); } catch {}
      supabase.removeChannel(ch);
      typingChannelRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      lastTypingSentRef.current = 0;
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
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                <MessageSquare className="h-4 w-4" />
                Conversation Transcript
                <Badge variant="outline" className="text-[10px] gap-1">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#10b981" }} />
                  Live
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto gap-1.5"
                  onClick={handleConvertToTicket}
                  disabled={converting}
                >
                  <TicketIcon className="h-3.5 w-3.5" />
                  {converting ? "Creating..." : "Convert to ticket"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[420px] overflow-y-auto">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages in this conversation.</p>}
            </CardContent>
            <div className="border-t p-3 space-y-2">
              <Textarea
                value={reply}
                onChange={(e) => handleReplyChange(e.target.value)}
                placeholder="Type your reply to the visitor..."
                rows={2}
                disabled={sending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">Tip: Cmd/Ctrl+Enter to send. Visitor sees a typing indicator while you write.</p>
                <Button size="sm" onClick={handleSendReply} disabled={sending || !reply.trim()} className="gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  {sending ? "Sending..." : "Send reply"}
                </Button>
              </div>
            </div>
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
