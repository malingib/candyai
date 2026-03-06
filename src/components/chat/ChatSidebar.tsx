import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Trash2, X, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

type Chat = { id: string; title: string; created_at: string };

interface ChatSidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (id: string) => void;
  onClose: () => void;
}

const ChatSidebar = ({ chats, activeChatId, onSelectChat, onCreateChat, onDeleteChat, onClose }: ChatSidebarProps) => {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MessageSquare className="h-4 w-4 text-accent" />
          Mobiwave Chat
        </Link>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-3">
        <Button onClick={onCreateChat} className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90" size="sm">
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
            onClick={() => onSelectChat(chat.id)}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate flex-1">{chat.title}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }}
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
  );
};

export default ChatSidebar;
