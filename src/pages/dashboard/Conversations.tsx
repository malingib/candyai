import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, ChevronRight, Send, Ticket as TicketIcon, Users, ChevronLeft, Inbox, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const visitorTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    const { data, error } = await supabase
      .from("tickets")
      .insert({
        user_id: user.id,
        conversation_id: selectedId,
        subject,
        description: transcript || "No messages yet.",
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
          return { ...c, message_count: msgs.length, user_message_count: msgs.filter((m: { role: string }) => m.role === "user").length };
        });
        setConversations(enriched);
      });
    const channel = supabase
      .channel(`conversations:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations", filter: `user_id=eq.${user.id}` }, (payload) => {
        setConversations((prev) => {
          if (payload.eventType === "INSERT") {
            if (prev.some((c) => c.id === payload.new.id)) return prev;
            return [{ id: payload.new.id, visitor_name: payload.new.visitor_name, status: payload.new.status, created_at: payload.new.created_at, message_count: 0, user_message_count: 0, ...payload.new } as unknown as typeof prev[0], ...prev];
          }
          if (payload.eventType === "UPDATE") return prev.map((c) => (c.id === payload.new.id ? { ...c, ...payload.new } : c));
          if (payload.eventType === "DELETE") return prev.filter((c) => c.id !== payload.old.id);
          return prev;
        });
      })
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    let active = true;
    supabase.from("messages").select("*").eq("conversation_id", selectedId).order("created_at").then(({ data }) => {
      if (active) setMessages(data ?? []);
    });
    const channel = supabase
      .channel(`messages:${selectedId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedId}` }, (payload) => {
        setMessages((prev) => prev.some((m) => m.id === payload.new.id) ? prev : [...prev, { id: payload.new.id, role: payload.new.role, content: payload.new.content, created_at: payload.new.created_at } as unknown as typeof prev[0]]);
      })
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) { typingChannelRef.current = null; return; }
    const ch = supabase.channel(`widget-typing:${selectedId}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "visitor_typing" }, (payload) => {
      const isTyping = !!(payload?.payload as {typing?: boolean})?.typing;
      setVisitorTyping(isTyping);
      if (visitorTypingTimerRef.current) clearTimeout(visitorTypingTimerRef.current);
      if (isTyping) visitorTypingTimerRef.current = setTimeout(() => setVisitorTyping(false), 4000);
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
      case "positive": return <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">Positive</Badge>;
      case "negative": return <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20">Negative</Badge>;
      case "neutral": return <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">Neutral</Badge>;
      default: return null;
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-3 h-[calc(100vh-8rem)]">
      <div className={`md:col-span-1 flex flex-col gap-3 ${selectedId ? "hidden md:flex" : ""}`}>
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Inbox</h2>
          </div>
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
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
          {list.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground max-w-[200px]">
                {filter === "engaged"
                  ? "No active conversations yet. Visitors who reply will appear here."
                  : "No visitors yet. They'll appear here when they open the chat widget."}
              </p>
            </div>
          )}
          <AnimatePresence mode="popLayout">
            {pageItems.map((conv) => {
              const engagedConv = (conv.user_message_count ?? 0) > 0;
              return (
                <motion.button
                  key={conv.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full text-left rounded-xl border p-3 transition-all duration-200 ${
                    selectedId === conv.id
                      ? "border-primary/50 bg-primary/5 shadow-sm shadow-primary/5"
                      : "border-border/50 hover:border-border hover:bg-muted/40 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{conv.visitor_name || "Anonymous Visitor"}</span>
                    <ChevronRight className={`h-4 w-4 shrink-0 transition-all ${selectedId === conv.id ? "text-primary translate-x-0.5" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <Badge variant={engagedConv ? "default" : "outline"} className="text-[10px]">
                      {engagedConv ? `${conv.user_message_count} msg${conv.user_message_count === 1 ? "" : "s"}` : "Visitor"}
                    </Badge>
                    {getSentimentBadge((conv as unknown as Record<string, string | undefined>).sentiment)}
                    <Badge variant="secondary" className="text-[10px]">{conv.status}</Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(conv.created_at), "MMM d, HH:mm")}</span>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <Button variant="ghost" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="h-7 px-2 text-xs">
                <ChevronLeft className="h-3 w-3" /> Prev
              </Button>
              <span className="text-xs text-muted-foreground">{currentPage} / {totalPages}</span>
              <Button variant="ghost" size="sm" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="h-7 px-2 text-xs">
                Next <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedId ? (
          <motion.div
            key={selectedId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="md:col-span-2 flex flex-col"
          >
            <Card className="flex-1 flex flex-col overflow-hidden border-border/50 shadow-sm">
              <CardHeader className="pb-3 shrink-0 border-b border-border/50">
                <div className="flex items-center gap-2 md:hidden mb-2">
                  <Button size="sm" variant="ghost" className="-ml-2 h-8 px-2" onClick={() => setSelectedId(null)}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                </div>
                <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </div>
                  <span className="truncate">Transcript</span>
                  <Badge variant="outline" className="text-[10px] gap-1.5 border-emerald-500/20 bg-emerald-500/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
                    <span className="sm:hidden">{converting ? "..." : "Ticket"}</span>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-3 p-4 bg-muted/20" style={{ maxHeight: "55vh" }}>
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No messages in this conversation.</p>
                  </div>
                )}
                <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm break-words shadow-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-card border border-border/50 rounded-tl-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {visitorTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-sm bg-card border border-border/50 px-4 py-3 shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-xs text-muted-foreground">Visitor is typing</span>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>
              <div className="border-t border-border/50 p-4 space-y-3 shrink-0 bg-card">
                <div className="relative">
                  <Textarea
                    value={reply}
                    onChange={(e) => handleReplyChange(e.target.value)}
                    placeholder="Type your reply..."
                    rows={2}
                    disabled={sending}
                    className="resize-none pr-12 bg-muted/30 border-border/50 focus:bg-background transition-all duration-200"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground hidden sm:block">Cmd/Ctrl+Enter to send</p>
                  <Button
                    size="sm"
                    onClick={handleSendReply}
                    disabled={sending || !reply.trim()}
                    className="gap-1.5 ml-auto shadow-sm"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {sending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="hidden md:flex md:col-span-2 items-center justify-center"
          >
            <div className="flex flex-col items-center text-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 border border-border/50 mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">No conversation selected</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Select a conversation from the inbox to view the transcript and reply.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Conversations;
