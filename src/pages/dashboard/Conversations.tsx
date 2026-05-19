import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, ChevronRight, Send, Ticket as TicketIcon, Users, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RealtimeChannel } from "@supabase/supabase-js";

const PAGE_SIZE = 10;

const Conversations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<{id: string; visitor_name: string | null; visitor_email?: string | null; status: string; created_at: string; message_count?: number; user_message_count?: number}[]>([]);
  const [filter, setFilter] = useState<"engaged" | "all">("engaged");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{id: string; role: string; content: string; created_at: string}[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [converting, setConverting] = useState(false);
  const [visitorTyping, setVisitorTyping] = useState(false);
  const visitorTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // Broadcast the message to the widget so it shows up in real-time without RLS SELECT
    if (typingChannelRef.current) {
      typingChannelRef.current.send({
        type: "broadcast",
        event: "agent_message",
        payload: { content: text, role: "assistant", event: "agent_message" }
      });
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
      .select("*, messages(role)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!active) return;
const enriched = (data ?? []).map((c: { id: string; messages?: { role: string }[] }) => {
           const msgs = c.messages || [];
           return {
             ...c,
             message_count: msgs.length,
             user_message_count: msgs.filter((m: { role: string }) => m.role === "user").length,
           };
         });
        setConversations(enriched);
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
               return [{ id: payload.new.id, visitor_name: payload.new.visitor_name, status: payload.new.status, created_at: payload.new.created_at, message_count: 0, user_message_count: 0, ...payload.new } as unknown as typeof prev[0], ...prev];
             }
            if (payload.eventType === "UPDATE") {
              return prev.map((c) => (c.id === payload.new.id ? { ...c, ...payload.new } : c));
            }
            if (payload.eventType === "DELETE") {
              return prev.filter((c) => c.id !== payload.old.id);
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
             prev.some((m) => m.id === payload.new.id) ? prev : [...prev, { id: payload.new.id, role: payload.new.role, content: payload.new.content, created_at: payload.new.created_at } as unknown as typeof prev[0]]
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
    ch.on("broadcast", { event: "visitor_typing" }, (payload) => {
      const isTyping = !!(payload?.payload as {typing?: boolean})?.typing;
      setVisitorTyping(isTyping);
      if (visitorTypingTimerRef.current) clearTimeout(visitorTypingTimerRef.current);
      if (isTyping) {
        // auto-clear if no follow-up event arrives
        visitorTypingTimerRef.current = setTimeout(() => setVisitorTyping(false), 4000);
      }
    });
    ch.subscribe();
    typingChannelRef.current = ch;
    setVisitorTyping(false);
    return () => {
      try { ch.send({ type: "broadcast", event: "typing", payload: { typing: false } }); } catch { /* ignore */ }
      supabase.removeChannel(ch);
      typingChannelRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (visitorTypingTimerRef.current) clearTimeout(visitorTypingTimerRef.current);
      lastTypingSentRef.current = 0;
      setVisitorTyping(false);
    };
  }, [selectedId]);

  const engaged = conversations.filter((c) => (c.user_message_count ?? 0) > 0);
  const visitors = conversations.filter((c) => (c.user_message_count ?? 0) === 0);
  const list = filter === "engaged" ? engaged : conversations;
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = list.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getSentimentBadge = (sentiment?: string) => {
    switch (sentiment) {
      case "positive": return <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Positive</Badge>;
      case "negative": return <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">Negative</Badge>;
      case "neutral": return <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">Neutral</Badge>;
      default: return null;
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className={`md:col-span-1 space-y-2 ${selectedId ? "hidden md:block" : ""}`}>
        <div className="flex items-center justify-between mb-2 gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Inbox</h2>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" /> {visitors.length} visitor{visitors.length === 1 ? "" : "s"}
          </span>
        </div>
        <Tabs value={filter} onValueChange={(v) => { setFilter(v as "engaged" | "all"); setPage(1); }}>
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="engaged" className="text-xs">Conversations ({engaged.length})</TabsTrigger>
            <TabsTrigger value="all" className="text-xs">All ({conversations.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        {list.length === 0 && (
          <p className="text-sm text-muted-foreground pt-3">
            {filter === "engaged"
              ? "No active conversations yet. Visitors who reply will appear here."
              : "No visitors yet. They'll appear here when they open the chat widget."}
          </p>
        )}
        {pageItems.map((conv) => {
          const engagedConv = (conv.user_message_count ?? 0) > 0;
          return (
            <button
              key={conv.id}
              onClick={() => setSelectedId(conv.id)}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${selectedId === conv.id ? "border-accent bg-accent/5" : "hover:bg-muted/50"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">{conv.visitor_name || "Anonymous Visitor"}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant={engagedConv ? "default" : "outline"} className="text-[10px]">
                  {engagedConv ? `${conv.user_message_count} msg${conv.user_message_count === 1 ? "" : "s"}` : "Visitor"}
                </Badge>
                {getSentimentBadge((conv as any).sentiment)}
                <Badge variant="secondary" className="text-[10px]">{conv.status}</Badge>
                <span className="text-xs text-muted-foreground">{format(new Date(conv.created_at), "MMM d, HH:mm")}</span>
              </div>
            </button>
          );
        })}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="h-7 px-2 text-xs">
              <ChevronLeft className="h-3 w-3" /> Prev
            </Button>
            <span className="text-xs text-muted-foreground">Page {currentPage} / {totalPages}</span>
            <Button variant="ghost" size="sm" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="h-7 px-2 text-xs">
              Next <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      <div className={`md:col-span-2 ${!selectedId ? "hidden md:block" : ""}`}>
        {selectedId ? (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 md:hidden mb-2">
                <Button size="sm" variant="ghost" className="-ml-2 h-8 px-2" onClick={() => setSelectedId(null)}>
                  ← Back
                </Button>
              </div>
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                <MessageSquare className="h-4 w-4" />
                <span className="truncate">Transcript</span>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#10b981" }} />
                  Live
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto gap-1.5 text-xs"
                  onClick={handleConvertToTicket}
                  disabled={converting}
                >
                  <TicketIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{converting ? "Creating..." : "Convert to ticket"}</span>
                  <span className="sm:hidden">{converting ? "…" : "Ticket"}</span>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[60vh] md:max-h-[420px] overflow-y-auto">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] sm:max-w-[80%] rounded-lg px-3 py-2 text-sm break-words ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages in this conversation.</p>}
              {visitorTyping && (
                <div className="flex justify-end">
                  <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-muted-foreground">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                    Visitor is typing…
                  </div>
                </div>
              )}
            </CardContent>
            <div className="border-t p-3 space-y-2">
              <Textarea
                value={reply}
                onChange={(e) => handleReplyChange(e.target.value)}
                placeholder="Type your reply..."
                rows={2}
                disabled={sending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
              />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[11px] text-muted-foreground hidden sm:block">Tip: Cmd/Ctrl+Enter to send.</p>
                <Button size="sm" onClick={handleSendReply} disabled={sending || !reply.trim()} className="gap-1.5 ml-auto">
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
