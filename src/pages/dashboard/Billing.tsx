import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const plans = [
  { id: "free", name: "Starter", price: "Free Trial (7 days)", chats: 20, features: ["20 chats/month", "30 leads/month", "Basic AI responses", "Mobiwave branding"] },
  { id: "growth", name: "Growth", price: "KES 5,000/30 days", chats: 2000, features: ["2,000 chats/30 days", "1,000 leads/30 days", "Remove branding", "Advanced analytics"] },
  { id: "premium", name: "Premium", price: "KES 10,000/30 days", chats: 10000, features: ["10,000 chats/30 days", "5,000 leads/30 days", "API access", "Dedicated support"] },
  { id: "enterprise", name: "Enterprise", price: "Custom", chats: 99999, features: ["Unlimited chats", "Full API access", "Dedicated account manager", "SLA guarantee"] },
];

const Billing = () => {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState("free");
  const [chatsUsed, setChatsUsed] = useState(0);
  const [chatsLimit, setChatsLimit] = useState(20);
  const [periodStart, setPeriodStart] = useState<string | null>(null);
  const [billingExpiresAt, setBillingExpiresAt] = useState<string | null>(null);
  const [trialExpiresAt, setTrialExpiresAt] = useState<string | null>(null);
  const [startingCheckoutPlan, setStartingCheckoutPlan] = useState<string | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles")
      .select("plan, chats_used, chats_limit, chats_period_started_at, billing_expires_at, trial_expires_at")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
      if (data) {
        setCurrentPlan(data.plan);
        setChatsUsed(data.chats_used ?? 0);
        setChatsLimit(data.chats_limit ?? 20);
        setPeriodStart(data.chats_period_started_at ?? null);
        setBillingExpiresAt(data.billing_expires_at ?? null);
        setTrialExpiresAt((data as { trial_expires_at?: string | null }).trial_expires_at ?? null);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");
    const reference = params.get("reference") || params.get("trxref");
    if (checkoutStatus !== "success" || !reference) return;

    let cancelled = false;
    const run = async () => {
      setVerifyingPayment(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) throw new Error("No active session");

        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-paystack-callback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ reference }),
        });
        const payload = await resp.json();
        if (!resp.ok) throw new Error(payload?.error || "Payment verification failed");
        if (cancelled) return;
        const { data } = await supabase
          .from("profiles")
          .select("plan, chats_used, chats_limit, chats_period_started_at, billing_expires_at, trial_expires_at")
          .eq("user_id", user.id)
          .single();
        if (data) {
          setCurrentPlan(data.plan);
          setChatsUsed(data.chats_used ?? 0);
          setChatsLimit(data.chats_limit ?? 20);
          setPeriodStart(data.chats_period_started_at ?? null);
          setBillingExpiresAt(data.billing_expires_at ?? null);
          setTrialExpiresAt((data as { trial_expires_at?: string | null }).trial_expires_at ?? null);
        }
      } catch (error) {
        console.error(error);
        alert("Payment verification failed. Please contact support if you were charged.");
      } finally {
        if (!cancelled) setVerifyingPayment(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [user]);

  const start = periodStart ? new Date(periodStart) : new Date();
  const resetAt = new Date(start.getFullYear(), start.getMonth() + 1, 1, 0, 0, 0, 0);
  const remaining = Math.max(chatsLimit - chatsUsed, 0);
  const isExpired = !!billingExpiresAt && new Date(billingExpiresAt).getTime() < Date.now();

  const startCheckout = async (planId: string) => {
    if (!user || (planId !== "growth" && planId !== "premium")) return;
    setStartingCheckoutPlan(planId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("No active session");
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ plan: planId }),
      });
      const payload = await resp.json();
      if (!resp.ok || !payload?.url) throw new Error(payload?.error || "Unable to start checkout");
      window.location.href = payload.url;
    } catch (error) {
      console.error(error);
      alert("Unable to start payment. Please try again.");
    } finally {
      setStartingCheckoutPlan(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage & Renewal</CardTitle>
          <CardDescription>
            {remaining} chats remaining out of {chatsLimit}. Usage resets on{" "}
            {resetAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}.
          </CardDescription>
        </CardHeader>
        {billingExpiresAt && (
          <CardContent>
            <p className={`text-sm ${isExpired ? "text-destructive" : "text-muted-foreground"}`}>
              Plan expiry: {new Date(billingExpiresAt).toLocaleString()}
              {isExpired ? " (expired, free tier active)" : ""}
            </p>
            {currentPlan === "free" && trialExpiresAt && (
              <p className="text-sm text-muted-foreground mt-1">
                Free trial expires: {new Date(trialExpiresAt).toLocaleString()}
              </p>
            )}
          </CardContent>
        )}
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <Card key={plan.id} className={isCurrent ? "border-accent" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {isCurrent && <Badge className="bg-accent text-accent-foreground">Current</Badge>}
                </div>
                <CardDescription className="text-lg font-bold text-foreground">{plan.price}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={isCurrent ? "outline" : "default"}
                  className={`w-full ${isCurrent ? "" : "bg-accent text-accent-foreground hover:bg-accent/90"}`}
                  disabled={isCurrent || startingCheckoutPlan === plan.id || verifyingPayment}
                  size="sm"
                  onClick={() => startCheckout(plan.id)}
                >
                  {isCurrent
                    ? "Current Plan"
                    : verifyingPayment
                    ? "Verifying..."
                    : startingCheckoutPlan === plan.id
                    ? "Redirecting..."
                    : "Upgrade"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Payments secured via Paystack. Enterprise plans are provisioned manually by support.
      </p>
    </div>
  );
};

export default Billing;
