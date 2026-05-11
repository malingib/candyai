import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";

const EmbedCode = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [widgetSitesLimit, setWidgetSitesLimit] = useState(1);
  const [activeOrigins, setActiveOrigins] = useState<string[]>([]);
  const [domainInput, setDomainInput] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [verifyingOrigin, setVerifyingOrigin] = useState<string | null>(null);

  const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || "https://candyai.lovable.app";

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("widget_sites_limit")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => setWidgetSitesLimit(Number(data?.widget_sites_limit ?? 1)));

    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      const token = sessionData.session?.access_token;
      if (!token) return;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-widget-domain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${token}`,
        },
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
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-widget-domain`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "register", origin: domainInput.trim() }),
    });
    const payload = await resp.json();
    if (!resp.ok) {
      toast({ title: "Domain registration failed", description: payload?.error || "Try again", variant: "destructive" });
      return;
    }
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
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "verify", origin }),
    });
    const payload = await resp.json();
    setVerifyingOrigin(null);
    if (!resp.ok) {
      toast({ title: "Verification failed", description: payload?.error || "Token not found", variant: "destructive" });
      return;
    }
    toast({ title: "Domain verified", description: `${origin} can now run the widget.` });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopied(true);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Embed Your AI Agent</CardTitle>
          <CardDescription>Copy this snippet and paste it before the closing &lt;/body&gt; tag on your website.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Websites used: <span className="font-semibold text-foreground">{activeOrigins.length}</span> /{" "}
            <span className="font-semibold text-foreground">{widgetSitesLimit}</span>
            {atLimit ? " (limit reached)" : ""}
          </p>
          <div className="relative">
            <pre className="rounded-lg bg-muted p-4 text-sm overflow-x-auto text-foreground">
              <code>{embedSnippet}</code>
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2 gap-1"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          {activeOrigins.length > 0 && (
            <div className="mt-4 rounded-md border bg-muted/20 p-3">
              <p className="text-xs font-medium text-foreground mb-2">Registered Widget Websites</p>
              <div className="space-y-1">
                {activeOrigins.map((origin) => (
                  <div key={origin} className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground font-mono">{origin}</p>
                    <Button size="sm" variant="outline" onClick={() => void verifyDomain(origin)} disabled={verifyingOrigin === origin}>
                      {verifyingOrigin === origin ? "Verifying..." : "Verify"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4 rounded-md border p-3 space-y-2">
            <p className="text-xs font-medium">Register Website for Verification</p>
            <input
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              placeholder="https://example.com"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
            />
            <Button size="sm" onClick={() => void registerDomain()}>Register Domain</Button>
            {verificationToken && (
              <pre className="rounded bg-muted p-2 text-xs overflow-x-auto">{`<meta name=\"mobiwave-domain-verification\" content=\"${verificationToken}\" />`}</pre>
            )}
          </div>
          {atLimit && (
            <p className="mt-3 text-xs text-destructive">
              You have reached your website embed limit for this plan. Upgrade billing to embed on more websites.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>1. Copy the embed code above</p>
          <p>2. Paste it into your website's HTML, just before the closing &lt;/body&gt; tag</p>
          <p>3. Your AI chat widget will appear in the bottom-right of your website automatically</p>
          <p className="text-xs mt-4">The widget connects to your AI agent and uses your branding. Test it on any HTML page.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmbedCode;
