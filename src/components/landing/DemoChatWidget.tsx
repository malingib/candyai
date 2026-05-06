import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, X, User, Phone, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

type Message = { role: "user" | "assistant"; content: string };

const MAX_FREE_MESSAGES = 5;

interface DemoChatWidgetProps {
  userId?: string;
  demo?: boolean;
}

const DemoChatWidget = ({ userId, demo = true }: DemoChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! 👋 I'm a Mobiwave AI demo agent. Ask me anything about how AI chat agents can help your business. You have 5 free messages to try." },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [contactInfo, setContactInfo] = useState({ whatsapp_number: "", call_number: "", business_name: "" });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-contact-info`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ user_id: userId }),
    })
      .then((r) => r.json())
      .then((data) => setContactInfo(data))
      .catch(console.error);
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (messageCount >= MAX_FREE_MESSAGES) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);
    setMessageCount((c) => c + 1);

    let assistantContent = "";
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
            demo,
            user_id: userId,
          }),
        }
      );

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
              const content = assistantContent;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && prev.length > 1) {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content } : m);
                }
                return [...prev, { role: "assistant", content }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again." },
      ]);
    }

    setIsLoading(false);
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open demo chat"
          className="group fixed bottom-6 right-6 z-50 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-blue-700 text-primary-foreground shadow-[0_18px_40px_-14px_hsl(var(--primary)/0.8)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-14px_hsl(var(--primary)/0.9)] active:scale-95"
        >
          <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-primary/30 animate-ping [animation-duration:2.4s]" />
          <span className="pointer-events-none absolute inset-[6px] rounded-full bg-white/15 backdrop-blur-sm" />
          <MessageSquare className="relative z-10 h-7 w-7 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden" style={{ height: "520px" }}>
          {/* Header */}
          <div className="flex items-center justify-between bg-primary px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 overflow-hidden">
                <img src="/logo.png" alt="Mobiwave" className="h-6 w-6 object-contain" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-foreground">Mobiwave AI</p>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  <p className="text-xs text-primary-foreground/70">Online</p>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                    <img src="/logo.png" alt="" className="h-5 w-5 object-contain" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                  <img src="/logo.png" alt="" className="h-5 w-5 object-contain" />
                </div>
                <div className="rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
                  <span className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Contact bar */}
          {(contactInfo.whatsapp_number || contactInfo.call_number) && (
            <div className="border-t px-3 py-2 flex items-center justify-center gap-3">
              <span className="text-xs text-muted-foreground">Talk to a human:</span>
              {contactInfo.whatsapp_number && (
                <a href={`https://wa.me/${contactInfo.whatsapp_number.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:underline">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              )}
              {contactInfo.call_number && (
                <a href={`tel:${contactInfo.call_number}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  <Phone className="h-3.5 w-3.5" /> Call
                </a>
              )}
            </div>
          )}
          {!contactInfo.whatsapp_number && !contactInfo.call_number && !userId && (
            <div className="border-t px-3 py-2 flex items-center justify-center gap-3">
              <span className="text-xs text-muted-foreground">Talk to a human:</span>
              <a href="https://wa.me/254700000000" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:underline">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
              <a href="tel:+254700000000" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <Phone className="h-3.5 w-3.5" /> Call
              </a>
            </div>
          )}

          {/* Input */}
          <div className="border-t p-3">
            {messageCount >= MAX_FREE_MESSAGES ? (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Demo limit reached (5 messages)</p>
                <Link to="/auth">
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
                    Sign Up Free →
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 text-sm rounded-xl"
                  disabled={isLoading}
                />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            )}
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {MAX_FREE_MESSAGES - messageCount} messages remaining · Powered by Mobiwave AI
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default DemoChatWidget;
