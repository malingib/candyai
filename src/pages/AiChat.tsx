import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Menu, Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatMessages from "@/components/chat/ChatMessages";
import ChatInput from "@/components/chat/ChatInput";

type Msg = { role: "user" | "assistant"; content: string; attachments?: string[] };
type Chat = { id: string; title: string; created_at: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const AiChat = () => {
  const { user, loading: authLoading } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("ai_chats")
      .select("id, title, created_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => setChats(data ?? []));
  }, [user]);

  useEffect(() => {
    if (!activeChatId) { setMessages([]); return; }
    supabase
      .from("ai_chat_messages")
      .select("role, content")
      .eq("chat_id", activeChatId)
      .order("created_at")
      .then(({ data }) => setMessages((data as Msg[]) ?? []));
  }, [activeChatId]);

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

  const sendMessage = useCallback(async (text: string, attachments: string[]) => {
    if ((!text && attachments.length === 0) || isLoading || !activeChatId || !user) return;

    const content = attachments.length > 0
      ? `${text}\n\n${attachments.map((u) => `![attachment](${u})`).join("\n")}`.trim()
      : text;

    const userMsg: Msg = { role: "user", content, attachments };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    await supabase.from("ai_chat_messages").insert({
      chat_id: activeChatId,
      role: "user",
      content,
    });

    if (messages.length === 0) {
      const title = text.slice(0, 50) + (text.length > 50 ? "…" : "") || "File upload";
      await supabase.from("ai_chats").update({ title }).eq("id", activeChatId);
      setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, title } : c)));
    }

    let assistantContent = "";
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages.map((m) => ({ role: m.role, content: m.content })) }),
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
  }, [isLoading, activeChatId, user, messages]);

  if (authLoading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!user) return <Navigate to="/auth" />;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? "w-72" : "w-0"} transition-all duration-200 overflow-hidden border-r bg-muted/30 flex flex-col`}>
        <ChatSidebar
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={setActiveChatId}
          onCreateChat={createChat}
          onDeleteChat={deleteChat}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
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

        {!activeChatId ? (
          <ChatMessages activeChatId={null} messages={[]} isLoading={false} onCreateChat={createChat} />
        ) : (
          <>
            <ChatMessages
              ref={scrollRef}
              activeChatId={activeChatId}
              messages={messages}
              isLoading={isLoading}
              onCreateChat={createChat}
            />
            <ChatInput onSend={sendMessage} isLoading={isLoading} userId={user.id} />
          </>
        )}
      </div>
    </div>
  );
};

export default AiChat;
