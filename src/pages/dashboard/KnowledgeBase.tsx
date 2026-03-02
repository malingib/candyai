import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const KnowledgeBase = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchItems = async () => {
    if (!user) return;
    const { data } = await supabase.from("knowledge_base").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setItems(data ?? []);
  };

  useEffect(() => { fetchItems(); }, [user]);

  const handleSave = async () => {
    if (!user || !title.trim() || !content.trim()) return;
    try {
      if (editingId) {
        const { error } = await supabase.from("knowledge_base").update({ title, content }).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Updated!" });
      } else {
        const { error } = await supabase.from("knowledge_base").insert({ user_id: user.id, title, content });
        if (error) throw error;
        toast({ title: "Added!" });
      }
      setTitle(""); setContent(""); setEditingId(null);
      fetchItems();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("knowledge_base").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deleted" });
    fetchItems();
  };

  const handleEdit = (item: any) => {
    setTitle(item.title);
    setContent(item.content);
    setEditingId(item.id);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editingId ? "Edit Entry" : "Add Knowledge"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Title (e.g. Return Policy, Pricing)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Content — paste your FAQ, product info, or business details here..." rows={5} value={content} onChange={(e) => setContent(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
              {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingId ? "Update" : "Add Entry"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={() => { setTitle(""); setContent(""); setEditingId(null); }}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No knowledge base entries yet. Add your FAQs and product info so your AI agent can answer accurately.</p>}
        {items.map((item) => (
          <Card key={item.id} className="cursor-pointer hover:border-accent/50 transition-colors" onClick={() => handleEdit(item)}>
            <CardContent className="flex items-start justify-between p-4">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.content}</p>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default KnowledgeBase;
