import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import {
  Plus, Send, MessageSquare, Trash2, Menu, X, ArrowLeft, Loader2,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };
type Chat = { id: string; title: string; created_at: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const AiChat = () => {
  const { user, loading: authLoading } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chats list
  useEffect(() => {
    if (!user) return;
    supabase
      .from("ai_chats")
      .select("id, title, created_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => setChats(data ?? []));
  }, [user]);

  // Load messages when chat changes
  useEffect(() => {
    if (!activeChatId) { setMessages([]); return; }
    supabase
      .from("ai_chat_messages")
      .select("role, content")
      .eq("chat_id", activeChatId)
      .order("created_at")
      .then(({ data }) => {
        setMessages((data as Msg[]) ?? []);
      });
  }, [activeChatId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const createChat = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("ai_chats")
      .insert({ user_id: user.id, title: "New Chat" })
      .select("id, title, created_at")
      .single();
    if (error) { toast.error("Failed to create chat"); return; }
    setChats((prev) => [data, ...prev]);
    setActiveChatId(data.id);
    setMessages([]);
  };

  const deleteChat = async (id: string) => {
    await supabase.from("ai_chats").delete().eq("id", id);
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) { setActiveChatId(null); setMessages([]); }
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || !activeChatId || !user) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    // Persist user message
    await supabase.from("ai_chat_messages").insert({
      chat_id: activeChatId,
      role: "user",
      content: userMsg.content,
    });

    // Auto-title on first message
    if (messages.length === 0) {
      const title = userMsg.content.slice(0, 50) + (userMsg.content.length > 50 ? "…" : "");
      await supabase.from("ai_chats").update({ title }).eq("id", activeChatId);
      setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, title } : c)));
    }

    // Stream response
    let assistantContent = "";
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (resp.status === 429) { toast.error("Rate limit exceeded. Try again later."); setIsLoading(false); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted."); setIsLoading(false); return; }
      if (!resp.ok || !resp.body) throw new Error("Stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages([...newMessages, { role: "assistant", content: assistantContent }]);
            }
          } catch { /* partial */ }
        }
      }

      // Persist assistant message
      if (assistantContent) {
        await supabase.from("ai_chat_messages").insert({
          chat_id: activeChatId,
          role: "assistant",
          content: assistantContent,
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to get response");
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, activeChatId, user, messages]);

  if (authLoading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!user) return <Navigate to="/auth" />;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? "w-72" : "w-0"} transition-all duration-200 overflow-hidden border-r bg-muted/30 flex flex-col`}>
        <div className="p-3 border-b flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageSquare className="h-4 w-4 text-accent" />
            Mobiwave Chat
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-3">
          <Button onClick={createChat} className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90" size="sm">
            <Plus className="h-4 w-4" /> New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1 px-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`group flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer mb-1 transition-colors ${
                activeChatId === chat.id ? "bg-accent/10 text-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setActiveChatId(chat.id)}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate flex-1">{chat.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            </div>
          ))}
        </ScrollArea>
        <div className="p-3 border-t">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="w-full gap-2 text-xs text-muted-foreground">
              <ArrowLeft className="h-3 w-3" /> Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-14 border-b flex items-center px-4 gap-3">
          {!sidebarOpen && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>
          )}
          <h2 className="text-sm font-medium text-foreground truncate">
            {activeChatId ? chats.find((c) => c.id === activeChatId)?.title : "Select or create a chat"}
          </h2>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {!activeChatId ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Mobiwave AI Chat</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Your personal AI assistant. Start a new conversation to ask anything.
              </p>
              <Button onClick={createChat} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4" /> Start New Chat
              </Button>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
              {messages.length === 0 && (
                <div className="text-center py-20 text-muted-foreground text-sm">
                  Send a message to start the conversation.
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      msg.role === "user"
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        {activeChatId && (
          <div className="border-t p-4">
            <div className="max-w-3xl mx-auto flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Type your message…"
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                size="icon"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiChat;
