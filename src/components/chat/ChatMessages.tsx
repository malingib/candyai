import { forwardRef } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Msg = { role: "user" | "assistant"; content: string; attachments?: string[] };

interface ChatMessagesProps {
  activeChatId: string | null;
  messages: Msg[];
  isLoading: boolean;
  onCreateChat: () => void;
}

const ChatMessages = forwardRef<HTMLDivElement, ChatMessagesProps>(
  ({ activeChatId, messages, isLoading, onCreateChat }, ref) => {
    if (!activeChatId) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Mobiwave AI Chat</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            Your personal AI assistant. Start a new conversation to ask anything.
          </p>
          <Button onClick={onCreateChat} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4" /> Start New Chat
          </Button>
        </div>
      );
    }

    return (
      <div ref={ref} className="flex-1 overflow-y-auto">
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
                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {msg.attachments.map((url, j) => {
                      const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
                      return isImage ? (
                        <img key={j} src={url} alt="attachment" className="max-w-[200px] max-h-[200px] rounded-lg object-cover" />
                      ) : (
                        <a key={j} href={url} target="_blank" rel="noopener noreferrer" className="text-xs underline text-accent">
                          📎 {url.split("/").pop()}
                        </a>
                      );
                    })}
                  </div>
                )}
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
      </div>
    );
  }
);

ChatMessages.displayName = "ChatMessages";
export default ChatMessages;
