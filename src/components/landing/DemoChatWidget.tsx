import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, X, User, Phone, MessageCircle, Bot, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import TurnstileWidget from "@/components/security/TurnstileWidget";

type Message = { role: "user" | "assistant"; content: string };

const MAX_FREE_MESSAGES = 5;
const fallbackWhatsapp = String(import.meta.env.VITE_DEMO_FALLBACK_WHATSAPP || "").trim();
const fallbackCall = String(import.meta.env.VITE_DEMO_FALLBACK_CALL || "").trim();

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
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const fallbackWhatsappDigits = fallbackWhatsapp.replace(/[^0-9]/g, "");

  useEffect(() => {
    if (!userId) return;
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-contact-info`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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
    if (turnstileSiteKey && !turnstileToken) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);
    setMessageCount((c) => c + 1);

    let assistantContent = "";
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat/demo`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
            demo,
            user_id: userId,
            turnstile_token: turnstileToken,
          }),
        }
      );

      if (!resp.ok) {
        let message = "Sorry, the demo assistant is unavailable right now. Please try again.";
        try {
          const payload = await resp.json();
          if (payload?.error && typeof payload.error === "string") message = payload.error;
        } catch {
        }
        throw new Error(message);
      }
      if (!resp.body) throw new Error("Network error");

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
    } catch (error) {
      const text = error instanceof Error && error.message
        ? error.message
        : "Sorry, I'm having trouble connecting. Please try again.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: text },
      ]);
    }

    setIsLoading(false);
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={reduceMotion ? undefined : { scale: 0, opacity: 0 }}
            animate={reduceMotion ? undefined : { scale: 1, opacity: 1 }}
            exit={reduceMotion ? undefined : { scale: 0, opacity: 0 }}
            transition={reduceMotion ? undefined : { type: "spring", stiffness: 300, damping: 20 }}
            onClick={() => setIsOpen(true)}
            aria-label="Open demo chat"
            className="group fixed bottom-6 right-6 z-50 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-blue-700 text-primary-foreground shadow-[0_18px_40px_-14px_hsl(var(--primary)/0.8)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-14px_hsl(var(--primary)/0.9)] active:scale-95"
          >
            <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-primary/30 animate-ping [animation-duration:2.4s]" />
            <span className="pointer-events-none absolute inset-[6px] rounded-full bg-white/15 backdrop-blur-sm" />
            <MessageSquare className="relative z-10 h-7 w-7 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 20, scale: 0.95 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 20, scale: 0.95 }}
            transition={reduceMotion ? undefined : { type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-border/60 bg-card/80 backdrop-blur-2xl shadow-2xl overflow-hidden"
            style={{ height: "560px" }}
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-primary to-blue-700 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/30 overflow-hidden">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary-foreground">Mobiwave AI</p>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50" />
                    <p className="text-xs text-primary-foreground/70">Online</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:flex items-center gap-1 text-[10px] text-primary-foreground/60 bg-white/10 rounded-full px-2.5 py-1">
                  <Sparkles className="h-3 w-3" />
                  Demo
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground/60 hover:text-primary-foreground hover:bg-white/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth" aria-live="polite" aria-atomic="false">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={reduceMotion ? undefined : { opacity: 0, y: 10, scale: 0.97 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                  transition={reduceMotion ? undefined : { duration: 0.3, delay: i === messages.length - 1 ? 0 : 0 }}
                  className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-blue-600/20 ring-1 ring-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-primary to-blue-600 text-primary-foreground rounded-br-md shadow-md"
                        : "bg-muted/70 text-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/70 ring-1 ring-border">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2.5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-blue-600/20 ring-1 ring-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md bg-muted/70 px-4 py-3 text-sm text-muted-foreground">
                    <span className="flex gap-1.5 items-center">
                      <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {(contactInfo.whatsapp_number || contactInfo.call_number) && (
              <div className="border-t border-border/50 px-4 py-2.5 flex items-center justify-center gap-3 bg-muted/30">
                <span className="text-xs text-muted-foreground">Talk to a human:</span>
                {contactInfo.whatsapp_number && (
                  <a
                    href={`https://wa.me/${contactInfo.whatsapp_number.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-green-500 hover:text-green-400 transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                )}
                {contactInfo.call_number && (
                  <a
                    href={`tel:${contactInfo.call_number}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" /> Call
                  </a>
                )}
              </div>
            )}
            {!contactInfo.whatsapp_number && !contactInfo.call_number && !userId && (fallbackWhatsappDigits || fallbackCall) && (
              <div className="border-t border-border/50 px-4 py-2.5 flex items-center justify-center gap-3 bg-muted/30">
                <span className="text-xs text-muted-foreground">Talk to a human:</span>
                {fallbackWhatsappDigits && (
                  <a
                    href={`https://wa.me/${fallbackWhatsappDigits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-green-500 hover:text-green-400 transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                )}
                {fallbackCall && (
                  <a
                    href={`tel:${fallbackCall}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" /> Call
                  </a>
                )}
              </div>
            )}

            <div className="border-t border-border/50 p-4 bg-muted/10">
              {messageCount >= MAX_FREE_MESSAGES ? (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-2"
                >
                  <p className="text-sm text-muted-foreground mb-3">Demo limit reached (5 messages)</p>
                  <Link to="/auth">
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/25 w-full">
                      Sign Up Free
                    </Button>
                  </Link>
                </motion.div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                  <Input
                    aria-label="Type a message"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 text-sm rounded-xl border-border/60 bg-background/50 h-10"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isLoading || !input.trim()}
                    className="bg-gradient-to-br from-primary to-blue-600 text-primary-foreground hover:from-primary/90 hover:to-blue-600/90 rounded-xl h-10 w-10 shadow-md shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              )}
              {turnstileSiteKey && <div className="mt-2"><TurnstileWidget siteKey={turnstileSiteKey} onToken={setTurnstileToken} /></div>}
              {messageCount < MAX_FREE_MESSAGES && (
                <p className="mt-2 text-center text-[11px] text-muted-foreground/60">
                  {MAX_FREE_MESSAGES - messageCount} messages remaining · Powered by Mobiwave AI
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DemoChatWidget;
