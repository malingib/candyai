import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Zap, Plus, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface Canned {
  id: string;
  title: string;
  content: string;
  shortcut: string;
}

interface Props {
  onPick: (content: string) => void;
}

export const CannedResponsePicker = ({ onPick }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Canned[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("canned_responses")
      .select("*")
      .eq("user_id", user.id)
      .order("title");
    if (error) {
      toast({ title: "Failed to load templates", description: error.message, variant: "destructive" });
      setItems([]);
    } else {
      setItems((data ?? []) as Canned[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const filtered = items.filter(
    (i) =>
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.shortcut.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Zap className="h-3.5 w-3.5" /> Templates
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-2 border-b">
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No templates yet.
              <br />
              <Link to="/dashboard/canned-responses" className="text-primary underline mt-1 inline-block">
                Create your first one
              </Link>
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => { onPick(c.content); setOpen(false); }}
                className="w-full text-left p-3 hover:bg-muted/60 transition-colors border-b last:border-b-0"
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="text-sm font-medium truncate">{c.title}</p>
                  {c.shortcut && (
                    <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded shrink-0">
                      /{c.shortcut}
                    </code>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{c.content}</p>
              </button>
            ))
          )}
        </div>
        <div className="p-2 border-t">
          <Button asChild variant="ghost" size="sm" className="w-full justify-start gap-1.5 h-8">
            <Link to="/dashboard/canned-responses">
              <Plus className="h-3.5 w-3.5" /> Manage templates
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
