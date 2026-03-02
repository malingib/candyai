import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const EmbedCode = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const embedSnippet = `<!-- Mobiwave AI Chat Widget -->
<script>
  (function() {
    var s = document.createElement('script');
    s.src = '${window.location.origin}/widget.js';
    s.dataset.businessId = '${user?.id ?? "YOUR_BUSINESS_ID"}';
    document.body.appendChild(s);
  })();
</script>`;

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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>1. Copy the embed code above</p>
          <p>2. Paste it into your website's HTML, just before the closing &lt;/body&gt; tag</p>
          <p>3. Your AI chat widget will appear on your website automatically</p>
          <p className="text-xs mt-4">Note: The standalone embed widget is coming in Phase 2. For now, the code above is a placeholder.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmbedCode;
