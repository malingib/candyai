import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Globe, Shield, ExternalLink, Loader2, Code as CodeIcon, ArrowRight, Earth } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const EmbedCode = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [widgetSitesLimit, setWidgetSitesLimit] = useState(1);
  const [activeOrigins, setActiveOrigins] = useState<string[]>([]);
  const [domainInput, setDomainInput] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [verifyingOrigin, setVerifyingOrigin] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || "https://candyai.lovable.app";

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("widget_sites_limit").eq("user_id", user.id).single().then(({ data }) => setWidgetSitesLimit(Number(data?.widget_sites_limit ?? 1)));
    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      const token = sessionData.session?.access_token;
      if (!token) return;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-widget-domain`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "list" }),
      });
      const payload = await resp.json().catch(() => ({}));
      const domains = Array.isArray(payload?.domains) ? payload.domains : [];
      setActiveOrigins(domains.filter((d: { is_active?: boolean; origin?: string }) => d.is_active).map((d: { origin: string }) => d.origin));
    }).catch(() => setActiveOrigins([]));
  }, [user]);

  const atLimit = useMemo(() => activeOrigins.length >= widgetSitesLimit, [activeOrigins.length, widgetSitesLimit]);

  const embedSnippet = `<!-- Mobiwave AI Chat Widget -->
<script
  src="${PUBLIC_URL}/widget.js"
  data-business-id="${user?.id ?? "YOUR_BUSINESS_ID"}"
  async
></script>`;

  const registerDomain = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token || !domainInput.trim()) return;
    setRegistering(true);
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-widget-domain`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "register", origin: domainInput.trim() }),
    });
    const payload = await resp.json();
    setRegistering(false);
    if (!resp.ok) { toast({ title: "Domain registration failed", description: payload?.error || "Try again", variant: "destructive" }); return; }
    setVerificationToken(payload.verification_token || "");
    toast({ title: "Domain registered", description: "Add the verification meta tag, then click Verify." });
  };

  const verifyDomain = async (origin: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setVerifyingOrigin(origin);
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-widget-domain`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "verify", origin }),
    });
    const payload = await resp.json();
    setVerifyingOrigin(null);
    if (!resp.ok) { toast({ title: "Verification failed", description: payload?.error || "Token not found", variant: "destructive" }); return; }
    toast({ title: "Domain verified", description: `${origin} can now run the widget.` });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopied(true);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl space-y-6"
    >
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-blue-500 to-primary/50" />
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CodeIcon className="h-4 w-4 text-primary" />
            Embed Your AI Agent
          </CardTitle>
          <CardDescription>Copy this snippet and paste it before the closing &lt;/body&gt; tag on your website.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-muted/30 border border-border/50">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Websites used: <span className="font-semibold text-foreground">{activeOrigins.length}</span> /{" "}
              <span className="font-semibold text-foreground">{widgetSitesLimit}</span>
              {atLimit ? <Badge variant="destructive" className="ml-2 text-[10px]">Limit reached</Badge> : ""}
            </p>
          </div>
          <div className="relative group">
            <div className="rounded-xl bg-[#1e293b] p-4 overflow-x-auto shadow-inner">
              <div className="flex items-center gap-2 mb-3 text-xs text-slate-400">
                <CodeIcon className="h-3.5 w-3.5" />
                <span>HTML</span>
              </div>
              <code className="text-sm text-slate-200 font-mono leading-relaxed whitespace-pre">
                {embedSnippet}
              </code>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-3 right-3 gap-1.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleCopy}
            >
              {copied ? (
                <><Check className="h-3.5 w-3.5 text-emerald-500" /> Copied</>
              ) : (
                <><Copy className="h-3.5 w-3.5" /> Copy</>
              )}
            </Button>
          </div>

          {activeOrigins.length > 0 && (
            <div className="mt-4 rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
                Registered Widget Websites
              </p>
              <div className="space-y-2">
                {activeOrigins.map((origin) => (
                  <div key={origin} className="flex items-center justify-between gap-2 rounded-lg bg-background border border-border/30 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Earth className="h-3.5 w-3.5 text-primary shrink-0" />
                      <p className="text-xs text-muted-foreground font-mono truncate">{origin}</p>
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => void verifyDomain(origin)} disabled={verifyingOrigin === origin} className="h-7 text-xs shrink-0">
                      {verifyingOrigin === origin ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 rounded-xl border border-border/50 p-4 space-y-3">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-primary" />
              Register Website for Verification
            </p>
            <div className="flex gap-2">
              <input
                className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                placeholder="https://example.com"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
              />
              <Button size="sm" onClick={() => void registerDomain()} disabled={registering || !domainInput.trim()} className="gap-1.5">
                {registering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                Register
              </Button>
            </div>
            {verificationToken && (
              <div className="rounded-lg bg-[#1e293b] p-3">
                <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
                  <CodeIcon className="h-3 w-3" />
                  <span>Add this meta tag to your website's &lt;head&gt;</span>
                </div>
                <code className="text-xs text-emerald-300 font-mono break-all">{`<meta name="mobiwave-domain-verification" content="${verificationToken}" />`}</code>
              </div>
            )}
          </div>

          {atLimit && (
            <div className="mt-3 rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2 text-xs text-destructive">
              You have reached your website embed limit for this plan. Upgrade billing to embed on more websites.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-blue-500 to-primary/50" />
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-primary" />
            How it works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { step: 1, text: "Copy the embed code above" },
              { step: 2, text: "Paste it into your website's HTML, just before the closing &lt;/body&gt; tag" },
              { step: 3, text: "Your AI chat widget will appear in the bottom-right of your website automatically" },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {step}
                </div>
                <p className="text-sm text-muted-foreground pt-0.5">{text}</p>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-4 pl-9">
              The widget connects to your AI agent and uses your branding. Test it on any HTML page.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default EmbedCode;
