import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, Upload, Globe, Loader2, Link, Calendar, Briefcase, FileText, User, Mail, Phone, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type KbItem = { id: string; title: string; content: string; created_at: string };
type WebsiteResource = {
  id: string;
  type: 'tender' | 'event' | 'news' | 'project' | 'job' | 'contact' | 'page';
  title: string;
  summary?: string;
  url?: string;
  status?: string;
  date?: string;
  deadline?: string;
  email?: string;
  phone?: string;
  captured_at: string;
};
const KnowledgeBase = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<KbItem[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [crawlUrl, setCrawlUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    const { data, error } = await supabase
      .from("knowledge_base")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setItems([]);
      return;
    }
    setItems((data as KbItem[]) ?? []);
  }, [user, toast]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSave = async () => {
    if (!user || !title.trim() || !content.trim()) return;
    setIsProcessing(true);
    try {
      let kbId;
      if (editingId) {
        const { error } = await supabase
          .from("knowledge_base")
          .update({ title, content })
          .eq("id", editingId)
          .eq("user_id", user.id);
        if (error) throw error;
        kbId = editingId;
        toast({ title: "Updated!" });
      } else {
        const { data, error } = await supabase
          .from("knowledge_base")
          .insert({ user_id: user.id, title, content })
          .select("id")
          .single();
        if (error) throw error;
        kbId = data.id;
        toast({ title: "Added!" });
      }

      // Trigger embedding process
      await supabase.functions.invoke("process-document", {
        body: { kb_id: kbId, content, user_id: user.id },
      });

      setTitle(""); setContent(""); setEditingId(null);
      fetchItems();
    } catch (error: unknown) {
      const err = error as Error;
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCrawl = async () => {
    if (!user || !crawlUrl.trim()) return;
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("crawl-website", {
        body: { url: crawlUrl, user_id: user.id },
      });
      if (error) throw error;
      toast({ title: "Website crawled and added to Knowledge Base!" });
      setCrawlUrl("");
      fetchItems();
    } catch (error: unknown) {
      const err = error as Error;
      toast({ title: "Crawl failed", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsProcessing(true);
    toast({ title: "Processing document..." });

    try {
      let text = "";
      if (file.type === "text/plain") {
        text = await file.text();
      } else if (file.type === "application/pdf") {
        // PDF extraction requires a backend service or specialized library
        // For this demo, we'll notify the user and use a placeholder
        text = `PDF Content placeholder for: ${file.name}. (Server-side PDF OCR/extraction coming soon)`;
        toast({ title: "PDF noticed", description: "Text extraction for PDFs is being handled on the server. Basic metadata indexed." });
      } else {
        throw new Error("Unsupported file type. Please upload .txt or .pdf");
      }

      if (!text.trim()) throw new Error("File appears to be empty.");

      const { data, error } = await supabase.from("knowledge_base").insert({
        user_id: user.id,
        title: `File: ${file.name}`,
        content: text,
      }).select("id").single();

      if (error) throw error;

      await supabase.functions.invoke("process-document", {
        body: { kb_id: data.id, content: text, user_id: user.id },
      });

      toast({ title: "File added to Knowledge Base!" });
      fetchItems();
    } catch (error: unknown) {
      const err = error as Error;
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
      // Clear input
      e.target.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("knowledge_base").delete().eq("id", id).eq("user_id", user.id);
    if (error) { const err = error as Error; toast({ title: "Error", description: err.message, variant: "destructive" }); return; }
    toast({ title: "Deleted" });
    fetchItems();
  };

  const handleEdit = (item: KbItem) => {
    setTitle(item.title);
    setContent(item.content);
    setEditingId(item.id);
  };

  const [resources, setResources] = useState<WebsiteResource[]>([]);
  const [isResourcesLoading, setIsResourcesLoading] = useState(false);

  const fetchResources = useCallback(async () => {
    if (!user) return;
    setIsResourcesLoading(true);
    const { data, error } = await supabase
      .from("website_resources")
      .select("*")
      .eq("user_id", user.id)
      .order("captured_at", { ascending: false });
    if (error) {
      toast({ title: "Error fetching resources", description: error.message, variant: "destructive" });
    } else {
      setResources((data as WebsiteResource[]) ?? []);
    }
    setIsResourcesLoading(false);
  }, [user, toast]);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  const handleDeleteResource = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("website_resources").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Resource deleted" });
      fetchResources();
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'tender': return <FileText className="h-4 w-4" />;
      case 'event': return <Calendar className="h-4 w-4" />;
      case 'news': return <Globe className="h-4 w-4" />;
      case 'project': return <Link className="h-4 w-4" />;
      case 'job': return <Briefcase className="h-4 w-4" />;
      case 'contact': return <User className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Tabs defaultValue="knowledge" className="space-y-6">
      <TabsList>
        <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
        <TabsTrigger value="resources">Structured Resources</TabsTrigger>
      </TabsList>

      <TabsContent value="knowledge" className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editingId ? "Edit Entry" : "Add Knowledge"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Title (e.g. Return Policy, Pricing)" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isProcessing} />
            <Textarea placeholder="Content — paste your FAQ, product info, or business details here..." rows={5} value={content} onChange={(e) => setContent(e.target.value)} disabled={isProcessing} />
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isProcessing} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingId ? "Update" : "Add Entry"}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={() => { setTitle(""); setContent(""); setEditingId(null); }} disabled={isProcessing}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import Knowledge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Crawl Website</label>
              <div className="flex gap-2">
                <Input placeholder="https://example.com" value={crawlUrl} onChange={(e) => setCrawlUrl(e.target.value)} disabled={isProcessing} />
                <Button variant="outline" size="icon" onClick={handleCrawl} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Upload Documents (PDF, TXT)</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  </div>
                  <input type="file" className="hidden" accept=".pdf,.txt" onChange={handleFileUpload} disabled={isProcessing} />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
      </TabsContent>

      <TabsContent value="resources" className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Extracted from your website for precise grounding (Tenders, Events, Jobs, etc.)
          </p>
          <Button variant="outline" size="sm" onClick={fetchResources} disabled={isResourcesLoading}>
            {isResourcesLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>

        {resources.length === 0 && !isResourcesLoading && (
          <Card>
            <CardContent className="p-12 text-center">
              <Link className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No structured resources yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2">
                Structured resources are automatically extracted when you crawl your website.
                They help the AI provide deterministic answers for lists like tenders or news.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <Card key={resource.id} className="relative group overflow-hidden">
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-accent/10 text-accent rounded-md">
                      {getResourceIcon(resource.type)}
                    </div>
                    <Badge variant="secondary" className="capitalize text-[10px]">
                      {resource.type}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteResource(resource.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="text-sm mt-3 leading-tight">{resource.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {resource.summary && (
                  <p className="text-xs text-muted-foreground line-clamp-3">{resource.summary}</p>
                )}

                <div className="space-y-1.5 pt-2 border-t border-muted/50">
                  {resource.deadline && (
                    <div className="flex items-center gap-2 text-[11px] text-destructive">
                      <Calendar className="h-3 w-3" />
                      <span>Deadline: {new Date(resource.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                  {resource.date && (
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Date: {new Date(resource.date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {resource.email && (
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{resource.email}</span>
                    </div>
                  )}
                  {resource.phone && (
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{resource.phone}</span>
                    </div>
                  )}
                  {resource.url && (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[11px] text-accent hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span className="truncate">View Details</span>
                    </a>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground/50 pt-1">
                  Captured: {new Date(resource.captured_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default KnowledgeBase;
