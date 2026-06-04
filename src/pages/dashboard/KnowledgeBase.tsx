import { useCallback, useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Save,
  Upload,
  Globe,
  Loader2,
  Link,
  Calendar,
  Briefcase,
  FileText,
  User,
  Mail,
  Phone,
  ExternalLink,
  BookText,
  Sparkles,
  Search,
  X,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  FileUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";

type KbItem = { id: string; title: string; content: string; created_at: string };
type WebsiteResource = {
  id: string;
  type: "tender" | "event" | "news" | "project" | "job" | "contact" | "page";
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

interface FileUploadStatus {
  id: string;
  name: string;
  progress: number;
  status: "pending" | "uploading" | "indexing" | "done" | "failed";
  error?: string;
}

interface UrlImportStatus {
  url: string;
  status: "pending" | "crawling" | "done" | "failed";
  error?: string;
}

const resourceAccent: Record<string, string> = {
  tender: "from-rose-500 to-pink-600 text-rose-600 bg-rose-500/10 border-rose-500/20",
  event: "from-amber-500 to-orange-600 text-amber-600 bg-amber-500/10 border-amber-500/20",
  news: "from-blue-500 to-cyan-600 text-blue-600 bg-blue-500/10 border-blue-500/20",
  project: "from-violet-500 to-purple-600 text-violet-600 bg-violet-500/10 border-violet-500/20",
  job: "from-emerald-500 to-teal-600 text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  contact: "from-sky-500 to-indigo-600 text-sky-600 bg-sky-500/10 border-sky-500/20",
  page: "from-slate-500 to-gray-600 text-slate-600 bg-slate-500/10 border-slate-500/20",
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
  const [dragOver, setDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [fileUploads, setFileUploads] = useState<FileUploadStatus[]>([]);
  const [batchUrls, setBatchUrls] = useState("");
  const [urlImports, setUrlImports] = useState<UrlImportStatus[]>([]);
  const [isBatchImporting, setIsBatchImporting] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");

  const wordCount = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0;

  const filteredItems = useMemo(() => {
    let result = items;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) => i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q)
      );
    }
    if (dateFilter === "today") {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      result = result.filter((i) => new Date(i.created_at) >= start);
    } else if (dateFilter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      result = result.filter((i) => new Date(i.created_at) >= weekAgo);
    }
    return result;
  }, [items, searchQuery, dateFilter]);

  const allFilteredSelected = useMemo(
    () => filteredItems.length > 0 && filteredItems.every((i) => selectedIds.has(i.id)),
    [filteredItems, selectedIds]
  );

  const doneFileCount = fileUploads.filter((f) => f.status === "done").length;
  const failedFileCount = fileUploads.filter((f) => f.status === "failed").length;
  const activeFileCount = fileUploads.filter((f) => f.status === "uploading" || f.status === "indexing").length;

  const doneUrlCount = urlImports.filter((u) => u.status === "done").length;
  const failedUrlCount = urlImports.filter((u) => u.status === "failed").length;
  const activeUrlCount = urlImports.filter((u) => u.status === "crawling").length;

  const fetchItems = useCallback(async () => {
    if (!user) {
      setItems([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from("knowledge_base")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setItems([]);
    } else {
      setItems((data as KbItem[]) ?? []);
    }
    setIsLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

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
      await supabase.functions.invoke("process-document", {
        body: { kb_id: kbId, content, user_id: user.id },
      });
      setTitle("");
      setContent("");
      setEditingId(null);
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

  const processSingleFile = async (file: File, uploadId: string) => {
    if (!user) return;
    const setProgress = (progress: number) =>
      setFileUploads((prev) =>
        prev.map((f) => (f.id === uploadId ? { ...f, progress } : f))
      );
    const setStatus = (
      status: FileUploadStatus["status"],
      error?: string
    ) =>
      setFileUploads((prev) =>
        prev.map((f) => (f.id === uploadId ? { ...f, status, error } : f))
      );

    try {
      setStatus("uploading");
      setProgress(10);
      let text = "";
      if (file.type === "text/plain") {
        text = await file.text();
        setProgress(30);
      } else if (file.type === "application/pdf") {
        text = `PDF Content placeholder for: ${file.name}. (Server-side PDF OCR/extraction coming soon)`;
        toast({
          title: "PDF noticed",
          description: "Text extraction for PDFs is being handled on the server. Basic metadata indexed.",
        });
        setProgress(30);
      } else if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        text = `DOCX Content placeholder for: ${file.name}. (Server-side DOCX extraction coming soon)`;
        setProgress(30);
      } else {
        throw new Error("Unsupported file type. Please upload .txt, .pdf, or .docx");
      }
      if (!text.trim()) throw new Error("File appears to be empty.");
      setProgress(50);
      setStatus("indexing");
      const { data, error } = await supabase
        .from("knowledge_base")
        .insert({ user_id: user.id, title: `File: ${file.name}`, content: text })
        .select("id")
        .single();
      if (error) throw error;
      setProgress(75);
      await supabase.functions.invoke("process-document", {
        body: { kb_id: data.id, content: text, user_id: user.id },
      });
      setProgress(100);
      setStatus("done");
    } catch (error: unknown) {
      const err = error as Error;
      setStatus("failed", err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !user) {
      if (e.target) e.target.value = "";
      return;
    }
    const uploads: FileUploadStatus[] = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      progress: 0,
      status: "pending" as const,
    }));
    setFileUploads((prev) => [...prev, ...uploads]);
    if (e.target) e.target.value = "";
    for (let i = 0; i < files.length; i++) {
      await processSingleFile(files[i], uploads[i].id);
    }
    fetchItems();
  };

  const dropFiles = async (files: FileList) => {
    if (!files.length || !user) return;
    const uploads: FileUploadStatus[] = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      progress: 0,
      status: "pending" as const,
    }));
    setFileUploads((prev) => [...prev, ...uploads]);
    for (let i = 0; i < files.length; i++) {
      await processSingleFile(files[i], uploads[i].id);
    }
    fetchItems();
  };

  const processSingleUrl = async (url: string, index: number) => {
    if (!user) return;
    const setUrlStatus = (status: UrlImportStatus["status"], error?: string) =>
      setUrlImports((prev) =>
        prev.map((u, i) => (i === index ? { ...u, status, error: error ?? u.error } : u))
      );
    try {
      setUrlStatus("crawling");
      const { error } = await supabase.functions.invoke("crawl-website", {
        body: { url, user_id: user.id },
      });
      if (error) throw error;
      setUrlStatus("done");
    } catch (error: unknown) {
      const err = error as Error;
      setUrlStatus("failed", err.message);
    }
  };

  const handleBatchUrlImport = async () => {
    if (!user || !batchUrls.trim()) return;
    const urls = batchUrls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    if (urls.length === 0) return;
    setIsBatchImporting(true);
    const newImports: UrlImportStatus[] = urls.map((url) => ({
      url,
      status: "pending" as const,
    }));
    setUrlImports((prev) => [...prev, ...newImports]);
    setBatchUrls("");
    for (let i = 0; i < urls.length; i++) {
      await processSingleUrl(urls[i], urlImports.length + i);
    }
    setIsBatchImporting(false);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("knowledge_base")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      const err = error as Error;
      toast({ title: "Error", description: err.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    fetchItems();
  };

  const handleEdit = (item: KbItem) => {
    setTitle(item.title);
    setContent(item.content);
    setEditingId(item.id);
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!user || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("knowledge_base")
      .delete()
      .in("id", ids)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Deleted ${ids.length} item(s)` });
    setSelectedIds(new Set());
    fetchItems();
  };

  const handleBulkReindex = async () => {
    if (!user || selectedIds.size === 0) return;
    toast({ title: `Re-indexing ${selectedIds.size} item(s)...` });
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      const item = items.find((i) => i.id === id);
      if (!item) continue;
      try {
        await supabase.functions.invoke("process-document", {
          body: { kb_id: id, content: item.content, user_id: user.id },
        });
      } catch {
        // skip individual failures
      }
    }
    toast({ title: "Re-indexing complete!" });
    setSelectedIds(new Set());
    fetchItems();
  };

  const retryFile = (uploadId: string, fileName: string) => {
    const file = fileUploads.find((f) => f.id === uploadId);
    if (!file) return;
    setFileUploads((prev) =>
      prev.map((f) => (f.id === uploadId ? { ...f, progress: 0, status: "pending", error: undefined } : f))
    );
    const fakeFile = new File([""], fileName, { type: "text/plain" });
    processSingleFile(fakeFile, uploadId).then(() => fetchItems());
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

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleDeleteResource = async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("website_resources")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Resource deleted" });
      fetchResources();
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "tender":
        return <FileText className="h-4 w-4" />;
      case "event":
        return <Calendar className="h-4 w-4" />;
      case "news":
        return <Globe className="h-4 w-4" />;
      case "project":
        return <Link className="h-4 w-4" />;
      case "job":
        return <Briefcase className="h-4 w-4" />;
      case "contact":
        return <User className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Tabs defaultValue="knowledge" className="space-y-6">
      <TabsList className="bg-muted/50 p-1 rounded-xl">
        <TabsTrigger value="knowledge" className="rounded-lg data-[state=active]:shadow-sm">
          Knowledge Base
        </TabsTrigger>
        <TabsTrigger value="resources" className="rounded-lg data-[state=active]:shadow-sm">
          Structured Resources
        </TabsTrigger>
      </TabsList>

      <TabsContent value="knowledge" className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {editingId ? <Save className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                </div>
                {editingId ? "Edit Entry" : "Add Knowledge"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Title (e.g. Return Policy, Pricing)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isProcessing}
                className="border-border/50 focus:border-primary/50 transition-colors"
              />
              <Textarea
                placeholder="Content — paste your FAQ, product info, or business details here..."
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isProcessing}
                className="border-border/50 focus:border-primary/50 transition-colors resize-none"
              />
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isProcessing} className="gap-2 shadow-sm">
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingId ? (
                    <Save className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {editingId ? "Update" : "Add Entry"}
                </Button>
                {editingId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTitle("");
                      setContent("");
                      setEditingId(null);
                    }}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Upload className="h-3.5 w-3.5" />
                </div>
                Import Knowledge
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  Crawl Website
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com"
                    value={crawlUrl}
                    onChange={(e) => setCrawlUrl(e.target.value)}
                    disabled={isProcessing}
                    className="border-border/50 focus:border-primary/50 transition-colors"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCrawl}
                    disabled={isProcessing}
                    className="shrink-0"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Globe className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <FileUp className="h-3.5 w-3.5 text-muted-foreground" />
                  Upload Documents (PDF, TXT, DOCX)
                </label>
                <div
                  className={`flex items-center justify-center w-full transition-all duration-200 ${
                    dragOver ? "scale-[1.02]" : ""
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    if (e.dataTransfer.files.length > 0) {
                      dropFiles(e.dataTransfer.files);
                    }
                  }}
                >
                  <label
                    className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
                      dragOver
                        ? "border-primary bg-primary/5 scale-[1.02]"
                        : "border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-border"
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <div
                        className={`p-3 rounded-full mb-3 transition-colors ${
                          dragOver
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="mb-1 text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">Click to upload</span> or drag
                        and drop
                      </p>
                      <p className="text-xs text-muted-foreground">PDF, TXT, or DOCX (max 10MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.txt,.docx"
                      multiple
                      onChange={handleFileUpload}
                      disabled={isProcessing}
                    />
                  </label>
                </div>
              </div>

              {fileUploads.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {fileUploads.map((fu) => (
                    <div key={fu.id} className="flex items-center gap-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="truncate text-muted-foreground">{fu.name}</span>
                          <span className="shrink-0 ml-2">
                            {fu.status === "done" ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            ) : fu.status === "failed" ? (
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                            ) : fu.status === "indexing" ? (
                              <span className="text-primary">Indexing...</span>
                            ) : fu.status === "uploading" ? (
                              <span className="text-muted-foreground">{fu.progress}%</span>
                            ) : (
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </span>
                        </div>
                        {(fu.status === "uploading" || fu.status === "indexing") && (
                          <Progress value={fu.progress} className="h-1" />
                        )}
                        {fu.status === "failed" && (
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-destructive truncate">{fu.error}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 shrink-0"
                              onClick={() => retryFile(fu.id, fu.name)}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Link className="h-3.5 w-3.5 text-muted-foreground" />
                  Batch Import URLs
                </label>
                <Textarea
                  placeholder="Paste one URL per line..."
                  rows={3}
                  value={batchUrls}
                  onChange={(e) => setBatchUrls(e.target.value)}
                  disabled={isBatchImporting}
                  className="border-border/50 focus:border-primary/50 transition-colors resize-none text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchUrlImport}
                  disabled={isBatchImporting || !batchUrls.trim()}
                  className="gap-2 w-full"
                >
                  {isBatchImporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                  Batch Import URLs
                </Button>
                {urlImports.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {urlImports.map((u, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="shrink-0">
                          {u.status === "done" ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          ) : u.status === "failed" ? (
                            <XCircle className="h-3 w-3 text-destructive" />
                          ) : u.status === "crawling" ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                        </span>
                        <span className="truncate flex-1">{u.url}</span>
                        {u.status === "failed" && u.error && (
                          <span className="text-destructive truncate max-w-[120px]">{u.error}</span>
                        )}
                        {u.status === "crawling" && (
                          <span className="text-primary shrink-0">Crawling...</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {(fileUploads.length > 0 && (activeFileCount > 0 || doneFileCount > 0 || failedFileCount > 0)) ||
        (urlImports.length > 0 && (activeUrlCount > 0 || doneUrlCount > 0 || failedUrlCount > 0)) ? (
          <Card className="border-border/50 shadow-sm bg-muted/20">
            <CardContent className="p-3">
              {fileUploads.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    <FileText className="h-3.5 w-3.5 inline mr-1.5" />
                    {doneFileCount + failedFileCount + activeFileCount > 0
                      ? `${doneFileCount + failedFileCount + activeFileCount} file(s)`
                      : "Files"}{" "}
                    —{" "}
                    <span className="text-emerald-500 font-medium">{doneFileCount} done</span>
                    {failedFileCount > 0 && (
                      <>
                        ,{" "}
                        <span className="text-destructive font-medium">{failedFileCount} failed</span>
                      </>
                    )}
                    {activeFileCount > 0 && (
                      <>
                        ,{" "}
                        <span className="text-primary font-medium">{activeFileCount} active</span>
                      </>
                    )}
                  </span>
                  <Progress
                    value={
                      doneFileCount + failedFileCount + activeFileCount > 0
                        ? ((doneFileCount + failedFileCount) /
                            (doneFileCount + failedFileCount + activeFileCount)) *
                          100
                        : 0
                    }
                    className="w-24 h-1.5"
                  />
                </div>
              )}
              {urlImports.length > 0 && fileUploads.length === 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    <Link className="h-3.5 w-3.5 inline mr-1.5" />
                    {doneUrlCount + failedUrlCount + activeUrlCount > 0
                      ? `${doneUrlCount + failedUrlCount + activeUrlCount} URL(s)`
                      : "URLs"}{" "}
                    —{" "}
                    <span className="text-emerald-500 font-medium">{doneUrlCount} done</span>
                    {failedUrlCount > 0 && (
                      <>
                        ,{" "}
                        <span className="text-destructive font-medium">{failedUrlCount} failed</span>
                      </>
                    )}
                    {activeUrlCount > 0 && (
                      <>
                        ,{" "}
                        <span className="text-primary font-medium">{activeUrlCount} active</span>
                      </>
                    )}
                  </span>
                  <Progress
                    value={
                      doneUrlCount + failedUrlCount + activeUrlCount > 0
                        ? ((doneUrlCount + failedUrlCount) /
                            (doneUrlCount + failedUrlCount + activeUrlCount)) *
                          100
                        : 0
                    }
                    className="w-24 h-1.5"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search knowledge base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-border/50 focus:border-primary/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-36 border-border/50">
              <Calendar className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedIds.size > 0 && (
          <Card className="border-primary/30 shadow-sm bg-primary/5">
            <CardContent className="p-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground mr-2">
                {selectedIds.size} selected
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {selectedIds.size} item(s)?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. The selected knowledge base entries will be
                      permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="outline" size="sm" onClick={handleBulkReindex} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                Re-index
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="gap-1.5 ml-auto"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border-border/50">
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              {searchQuery || dateFilter !== "all" ? (
                <>
                  <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <h3 className="text-base font-semibold text-foreground mb-1">No matches found</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Try a different search term or adjust your date filter.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery("");
                      setDateFilter("all");
                    }}
                  >
                    Clear filters
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 border border-border/50 mb-4">
                    <BookText className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-1">No knowledge yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-4">
                    Add your FAQs, product info, and business details so your AI agent can answer
                    accurately.
                  </p>
                  <Button
                    size="sm"
                    onClick={() =>
                      document.querySelector<HTMLInputElement>('input[placeholder="Title (e.g. Return Policy, Pricing)"]')?.focus()
                    }
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add your first entry
                  </Button>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={allFilteredSelected && filteredItems.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <label
                    htmlFor="select-all"
                    className="text-xs text-muted-foreground cursor-pointer select-none"
                  >
                    Select all ({filteredItems.length})
                  </label>
                </div>
                <span className="text-xs text-muted-foreground ml-auto">
                  {items.length} total
                  {(searchQuery || dateFilter !== "all") &&
                    ` · ${filteredItems.length} shown`}
                </span>
              </div>
              <AnimatePresence>
                {filteredItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="group"
                  >
                    <Card
                      className={`cursor-pointer hover:border-primary/30 hover:shadow-md transition-all duration-200 border-border/50 ${
                        selectedIds.has(item.id) ? "ring-1 ring-primary/30 bg-primary/[0.02]" : ""
                      }`}
                    >
                      <CardContent className="flex items-start gap-3 p-4">
                        <div
                          className="pt-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedIds.has(item.id)}
                            onCheckedChange={() => toggleSelectItem(item.id)}
                          />
                        </div>
                        <div
                          className="min-w-0 flex-1"
                          onClick={() => handleEdit(item)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium text-sm leading-tight">{item.title}</h3>
                            <Badge
                              variant="secondary"
                              className="shrink-0 text-[10px] px-1.5 py-0 h-5"
                            >
                              {wordCount(item.content)} words
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {item.content}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(item.created_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </>
          )}
        </div>
      </TabsContent>

      <TabsContent value="resources" className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Extracted from your website for precise grounding (Tenders, Events, Jobs, etc.)
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchResources}
            disabled={isResourcesLoading}
            className="gap-2"
          >
            {isResourcesLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        {resources.length === 0 && !isResourcesLoading && (
          <Card className="border-border/50">
            <CardContent className="p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 border border-border/50 mx-auto mb-4">
                <Link className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-lg font-semibold">No structured resources yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2">
                Structured resources are automatically extracted when you crawl your website. They
                help the AI provide deterministic answers for lists like tenders or news.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => {
            const accent = resourceAccent[resource.type] || resourceAccent.page;
            return (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group"
              >
                <Card className="relative overflow-hidden border-border/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accent.split(" ")[0]}`}
                  />
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-2 rounded-lg ${accent.split(" ").slice(2).join(" ").split("border")[0]}`}
                        >
                          {getResourceIcon(resource.type)}
                        </div>
                        <Badge variant="secondary" className="capitalize text-[10px]">
                          {resource.type}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteResource(resource.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-sm mt-3 leading-tight">{resource.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    {resource.summary && (
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {resource.summary}
                      </p>
                    )}
                    <div className="space-y-1.5 pt-2 border-t border-border/30">
                      {resource.deadline && (
                        <div className="flex items-center gap-2 text-[11px] text-destructive font-medium">
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
                          className="flex items-center gap-2 text-[11px] text-primary hover:underline"
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
              </motion.div>
            );
          })}
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default KnowledgeBase;
