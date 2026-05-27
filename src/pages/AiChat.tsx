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
import ChatControls, { type ModelConfig } from "@/components/chat/ChatControls";

type Msg = { role: "user" | "assistant"; content: string; attachments?: string[] };
type Chat = { id: string; title: string; created_at: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_ATTACHMENTS = 10;
const MIN_SEND_INTERVAL_MS = 1000;

const sanitizeText = (value: string, max = MAX_MESSAGE_LENGTH) =>
  value.replace(/\s+/g, " ").trim().slice(0, max);

const isSafeAttachmentUrl = (value: string) => {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

const STORAGE_KEY = "candyai-chat-config";

function loadModelConfig(): ModelConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.model === "string" && typeof parsed.temperature === "number") {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return { model: "google/gemini-3-flash-preview", temperature: 0.7 };
}

function saveModelConfig(config: ModelConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch { /* ignore */ }
}

const AiChat = () => {
  const { user, loading: authLoading } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [modelConfig, setModelConfig] = useState<ModelConfig>(loadModelConfig);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSendAtRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { saveModelConfig(modelConfig); }, [modelConfig]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("ai_chats")
      .select("id, title, created_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load chats:", error);
          toast.error("Failed to load conversations");
          return;
        }
        setChats(data ?? []);
      });
  }, [user]);

  useEffect(() => {
    if (!activeChatId) { setMessages([]); return; }
    supabase
      .from("ai_chat_messages")
      .select("role, content")
      .eq("chat_id", activeChatId)
      .order("created_at")
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load messages:", error);
          toast.error("Failed to load messages");
          return;
        }
        const typedData = (data as Array<{ role: "user" | "assistant"; content: string }>) ?? [];
        setMessages(typedData.map(m => ({ role: m.role, content: m.content })));
      });
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

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  const streamResponse = useCallback(async (
    payloadMessages: Msg[],
    chatId: string,
  ) => {
    const abortController = new AbortController();
    abortRef.current = abortController;

    let assistantContent = "";
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: payloadMessages.map((m) => ({ role: m.role, content: m.content })),
          user_id: user?.id,
          model: modelConfig.model,
          temperature: modelConfig.temperature,
        }),
        signal: abortController.signal,
      });

      if (resp.status === 429) { toast.error("Rate limit exceeded. Try again later."); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted."); return; }
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
              setMessages((prev) => {
                const withoutLast = prev[prev.length - 1]?.role === "assistant"
                  ? prev.slice(0, -1)
                  : prev;
                return [...withoutLast, { role: "assistant", content: assistantContent }];
              });
            }
          } catch { /* partial */ }
        }
      }

      if (assistantContent) {
        await supabase.from("ai_chat_messages").insert({
          chat_id: chatId,
          role: "assistant",
          content: assistantContent,
        });
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        if (assistantContent) {
          await supabase.from("ai_chat_messages").insert({
            chat_id: chatId,
            role: "assistant",
            content: assistantContent,
          }).catch(() => {});
        }
        return;
      }
      console.error(e);
      toast.error("Failed to get response");
    } finally {
      abortRef.current = null;
      setIsLoading(false);
    }
  }, [user, modelConfig]);

  const sendMessage = useCallback(async (text: string, attachments: string[]) => {
    const now = Date.now();
    if (now - lastSendAtRef.current < MIN_SEND_INTERVAL_MS) return;
    const cleanText = sanitizeText(text);
    const cleanAttachments = attachments.filter(isSafeAttachmentUrl).slice(0, MAX_ATTACHMENTS);
    if ((!cleanText && cleanAttachments.length === 0) || isLoading || !activeChatId || !user) return;
    lastSendAtRef.current = now;

    const content = cleanAttachments.length > 0
      ? `${cleanText}\n\n${cleanAttachments.map((u) => `![attachment](${u})`).join("\n")}`.trim()
      : cleanText;

    const userMsg: Msg = { role: "user", content, attachments: cleanAttachments };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    await supabase.from("ai_chat_messages").insert({
      chat_id: activeChatId,
      role: "user",
      content,
    });

    if (messages.length === 0) {
      const title = cleanText.slice(0, 50) + (cleanText.length > 50 ? "\u2026" : "") || "File upload";
      await supabase.from("ai_chats").update({ title }).eq("id", activeChatId);
      setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, title } : c)));
    }

    await streamResponse(newMessages, activeChatId);
  }, [isLoading, activeChatId, user, messages, streamResponse]);

  const regenerate = useCallback(async () => {
    if (isLoading || !activeChatId || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    const lastIsAssistant = lastMsg?.role === "assistant";
    const payloadMessages = lastIsAssistant ? messages.slice(0, -1) : messages;

    setIsLoading(true);
    if (lastIsAssistant) {
      setMessages(payloadMessages);
    }
    await streamResponse(payloadMessages, activeChatId);
  }, [isLoading, activeChatId, messages, streamResponse]);

  if (authLoading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!user) return <Navigate to="/auth" />;

  return (
    <div className="flex h-screen bg-background">
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

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 border-b flex items-center px-4 gap-3">
          {!sidebarOpen && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>
          )}
          <h2 className="text-sm font-medium text-foreground truncate flex-1">
            {activeChatId ? chats.find((c) => c.id === activeChatId)?.title : "Select or create a chat"}
          </h2>
        </div>

        <ChatControls
          config={modelConfig}
          onChange={setModelConfig}
          open={showControls}
          onToggle={() => setShowControls((v) => !v)}
        />

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
              onRegenerate={regenerate}
            />
            <ChatInput onSend={sendMessage} isLoading={isLoading} userId={user.id} onStop={stopGeneration} />
          </>
        )}
      </div>
    </div>
  );
};

export default AiChat;
