import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Zap } from "lucide-react";

interface Canned {
  id: string;
  title: string;
  content: string;
  shortcut: string;
  created_at: string;
}

const CannedResponses = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Canned[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Canned | null>(null);
  const [form, setForm] = useState({ title: "", content: "", shortcut: "" });

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

  useEffect(() => { load(); }, [load]);

  const reset = () => { setForm({ title: "", content: "", shortcut: "" }); setEditing(null); };

  const openCreate = () => { reset(); setDialogOpen(true); };
  const openEdit = (c: Canned) => {
    setEditing(c);
    setForm({ title: c.title, content: c.content, shortcut: c.shortcut ?? "" });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!user || !form.title.trim() || !form.content.trim()) {
      toast({ title: "Title and content are required", variant: "destructive" });
      return;
    }
    const payload = {
      user_id: user.id,
      title: form.title.trim(),
      content: form.content.trim(),
      shortcut: form.shortcut.trim().replace(/^\//, ""),
    };
    const { error } = editing
      ? await supabase.from("canned_responses").update(payload).eq("id", editing.id).eq("user_id", user.id)
      : await supabase.from("canned_responses").insert(payload);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Template updated" : "Template created" });
    setDialogOpen(false);
    reset();
    load();
  };

  const remove = async (id: string) => {
    if (!user) return;
    if (!confirm("Delete this template?")) return;
    const { error } = await supabase.from("canned_responses").delete().eq("id", id).eq("user_id", user.id);
    if (error) { toast({ title: "Failed to delete", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Template deleted" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Canned Responses</h2>
          <p className="text-sm text-muted-foreground">
            Reusable reply templates for support agents — insert with one click from any ticket.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> New template
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <Zap className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No templates yet. Create one to speed up replies.</p>
            </div>
          ) : (
            <div className="divide-y">
              {items.map((c) => (
                <div key={c.id} className="p-4 flex items-start justify-between gap-3 hover:bg-muted/40">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-medium text-sm">{c.title}</p>
                      {c.shortcut && (
                        <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">/{c.shortcut}</code>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">{c.content}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit template" : "New template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Issue acknowledged"
              />
            </div>
            <div className="space-y-2">
              <Label>Shortcut (optional)</Label>
              <Input
                value={form.shortcut}
                onChange={(e) => setForm({ ...form, shortcut: e.target.value })}
                placeholder="ack"
              />
              <p className="text-xs text-muted-foreground">Used for quick search in the picker.</p>
            </div>
            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea
                rows={6}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Hi {{name}}, thanks for reaching out. We've received your request and our team is looking into it..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CannedResponses;
