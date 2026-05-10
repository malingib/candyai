import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { readConsent, writeConsent } from "@/lib/consent";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  useEffect(() => {
    const c = readConsent();
    setVisible(!c);
    if (c) setAnalytics(c.analytics);
  }, []);

  if (!visible) return null;

  const acceptAll = () => {
    writeConsent(true);
    setVisible(false);
    toast.success("Preferences saved");
  };

  const saveMinimal = () => {
    writeConsent(false);
    setVisible(false);
    toast.success("Essential-only preferences saved");
  };

  const saveCustom = () => {
    writeConsent(analytics);
    setVisible(false);
    toast.success("Preferences saved");
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[60] md:left-auto md:max-w-xl">
      <Card className="shadow-xl border-border">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold">Privacy & Cookies</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We use essential cookies for login and security. With your permission, we also use analytics cookies to improve performance and reliability.
          </p>

          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked disabled />
            Essential security cookies (always on)
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
            Analytics cookies (optional)
          </label>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={acceptAll}>Accept all</Button>
            <Button size="sm" variant="outline" onClick={saveMinimal}>Essential only</Button>
            <Button size="sm" variant="secondary" onClick={saveCustom}>Save choices</Button>
            <Link to="/legal/privacy" className="text-xs text-muted-foreground hover:underline self-center ml-auto">Privacy notice</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
