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

  useEffect(() => {
    if (!user) return;
    supabase.from("conversations").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      setConversations(data ?? []);
    });
  }, [user]);

  useEffect(() => {
    if (!selectedId) return;
    supabase.from("messages").select("*").eq("conversation_id", selectedId).order("created_at").then(({ data }) => {
      setMessages(data ?? []);
    });
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
