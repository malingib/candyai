import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { GitBranch, Shield, Zap, Eye, Trash2, Plus, ExternalLink, History, GitPullRequest } from "lucide-react";

type Review = {
  id: string;
  repo: string;
  pr_number: number;
  pr_title: string;
  review_body: string;
  created_at: string;
};

const GitHubBot = () => {
  const { user } = useAuth();
  const [token, setToken] = useState("");
  const [savedToken, setSavedToken] = useState<any>(null);
  const [repoInput, setRepoInput] = useState("");
  const [repos, setRepos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("github_tokens")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSavedToken(data);
          setRepos((data.repos as string[]) ?? []);
        }
      });

    // Fetch review history
    supabase
      .from("github_reviews")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setReviews((data as Review[]) ?? []));
  }, [user]);

  const saveToken = async () => {
    if (!user || !token.trim()) return;
    setSaving(true);
    try {
      if (savedToken) {
        await supabase
          .from("github_tokens")
          .update({ token: token.trim(), repos })
          .eq("id", savedToken.id);
      } else {
        const { data } = await supabase
          .from("github_tokens")
          .insert({ user_id: user.id, token: token.trim(), repos })
          .select()
          .single();
        setSavedToken(data);
      }
      toast.success("GitHub token saved!");
    } catch {
      toast.error("Failed to save token");
    }
    setSaving(false);
  };

  const addRepo = () => {
    if (!repoInput.trim() || repos.includes(repoInput.trim())) return;
    setRepos([...repos, repoInput.trim()]);
    setRepoInput("");
  };

  const removeRepo = (r: string) => setRepos(repos.filter((x) => x !== r));

  const disconnectToken = async () => {
    if (!savedToken) return;
    await supabase.from("github_tokens").delete().eq("id", savedToken.id);
    setSavedToken(null);
    setToken("");
    setRepos([]);
    toast.success("Token disconnected");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <GitBranch className="h-6 w-6 text-accent" />
          GitHub Code Review Bot
        </h1>
        <p className="text-muted-foreground mt-1">
          AI-powered code reviews on your pull requests automatically.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: Shield, title: "Connect", desc: "Add your GitHub personal access token with repo permissions." },
          { icon: Eye, title: "Monitor", desc: "The bot watches for new PRs on your selected repositories." },
          { icon: Zap, title: "Review", desc: "AI analyzes diffs and posts inline review comments." },
        ].map(({ icon: Icon, title, desc }) => (
          <Card key={title}>
            <CardContent className="pt-6 text-center">
              <Icon className="h-8 w-8 text-accent mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">{title}</h3>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Setup</CardTitle>
          <CardDescription>
            Create a{" "}
            <a href="https://github.com/settings/tokens/new?scopes=repo" target="_blank" rel="noopener noreferrer" className="text-accent underline inline-flex items-center gap-1">
              GitHub Personal Access Token <ExternalLink className="h-3 w-3" />
            </a>{" "}
            with <code className="text-xs bg-muted px-1 py-0.5 rounded">repo</code> scope.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Personal Access Token</Label>
            <Input type="password" placeholder={savedToken ? "••••••••••••" : "ghp_xxxxxxxxxxxx"} value={token} onChange={(e) => setToken(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Repositories to monitor</Label>
            <div className="flex gap-2">
              <Input placeholder="owner/repo" value={repoInput} onChange={(e) => setRepoInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addRepo()} />
              <Button variant="outline" size="icon" onClick={addRepo}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {repos.map((r) => (
                <Badge key={r} variant="secondary" className="gap-1">
                  {r}
                  <button onClick={() => removeRepo(r)}><Trash2 className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveToken} disabled={saving || (!token.trim() && !savedToken)} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? "Saving…" : savedToken ? "Update" : "Connect"}
            </Button>
            {savedToken && <Button variant="destructive" onClick={disconnectToken}>Disconnect</Button>}
          </div>
        </CardContent>
      </Card>

      {/* Webhook Setup */}
      {savedToken && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Webhook Setup</CardTitle>
            <CardDescription>Add a webhook to each repository so the bot receives PR events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input readOnly value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-webhook`} className="font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-webhook`); toast.success("Copied!"); }}>
                  Copy
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Steps:</strong></p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>Go to your repo → Settings → Webhooks → Add webhook</li>
                <li>Paste the webhook URL above</li>
                <li>Content type: <code className="bg-muted px-1 rounded">application/json</code></li>
                <li>Select "Let me select individual events" → check <strong>Pull requests</strong></li>
                <li>Click "Add webhook"</li>
              </ol>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <div className="h-3 w-3 rounded-full bg-accent animate-pulse" />
              <span className="text-sm font-medium text-foreground">Bot Active</span>
              <span className="text-xs text-muted-foreground">Monitoring {repos.length} {repos.length === 1 ? "repo" : "repos"}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-accent" />
            Review History
          </CardTitle>
          <CardDescription>Past AI reviews posted on your pull requests.</CardDescription>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <GitPullRequest className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p>No reviews yet. Reviews will appear here once the bot reviews a PR.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedReview(expandedReview === review.id ? null : review.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <GitPullRequest className="h-4 w-4 text-accent shrink-0" />
                          <span className="text-sm font-medium text-foreground truncate">
                            #{review.pr_number} {review.pr_title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">{review.repo}</Badge>
                          <span>{new Date(review.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    {expandedReview === review.id && (
                      <div className="mt-3 pt-3 border-t">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto">
                          {review.review_body}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GitHubBot;
