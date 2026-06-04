import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Phone, ChevronRight, Shield, TrendingUp, Loader2 } from "lucide-react";
import { formatCycleResetDate } from "@/lib/billing-cycle";
import { toast } from "sonner";
import { motion } from "framer-motion";

type BillingPlanRow = {
  plan: "free" | "growth" | "premium" | "enterprise";
  display_name: string;
  amount_kes: number;
  chats_limit: number;
  leads_limit: number;
  widget_sites_limit: number;
  trial_days: number;
  is_checkout_enabled: boolean;
};

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
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [plans, setPlans] = useState<BillingPlanRow[]>([]);

  const normalizeMpesaPhone = (value: string): string | null => {
    const digits = value.replace(/[^\d+]/g, "");
    if (/^(\+254|254|0)?7\d{8}$/.test(digits)) {
      if (digits.startsWith("+254")) return digits;
      if (digits.startsWith("254")) return `+${digits}`;
      if (digits.startsWith("07")) return `+254${digits.slice(1)}`;
    }
    return null;
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("plan, chats_used, chats_limit, chats_period_started_at, billing_expires_at, trial_expires_at").eq("user_id", user.id).single().then(({ data }) => {
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
    supabase.from("billing_plans").select("plan, display_name, amount_kes, chats_limit, leads_limit, widget_sites_limit, trial_days, is_checkout_enabled").eq("is_public", true).then(({ data }) => {
      if (!data) return;
      const order = ["free", "growth", "premium", "enterprise"];
      setPlans((data as BillingPlanRow[]).sort((a, b) => order.indexOf(a.plan) - order.indexOf(b.plan)));
    });
  }, []);

  const planFeatureMap = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const p of plans) {
      out[p.plan] = [
        `${p.chats_limit.toLocaleString()} chats/30 days`,
        `${p.leads_limit.toLocaleString()} leads/30 days`,
        `${p.widget_sites_limit} website embed${p.widget_sites_limit > 1 ? "s" : ""}`,
        p.plan === "free" ? "Basic AI responses" : p.plan === "enterprise" ? "Dedicated account manager" : "Priority support",
      ];
    }
    return out;
  }, [plans]);

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");
    const reference = params.get("reference") || params.get("trxref");
    if (checkoutStatus !== "success" || !reference) return;
    setPromoMessage("Payment detected. Verifying your M-Pesa STK transaction...");
    let cancelled = false;
    const run = async () => {
      setVerifyingPayment(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) throw new Error("No active session");
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-paystack-callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({ reference }),
        });
        const payload = await resp.json();
        if (!resp.ok) throw new Error(payload?.error || "Payment verification failed");
        if (cancelled) return;
        const { data } = await supabase.from("profiles").select("plan, chats_used, chats_limit, chats_period_started_at, billing_expires_at, trial_expires_at").eq("user_id", user.id).single();
        if (data) {
          setCurrentPlan(data.plan);
          setChatsUsed(data.chats_used ?? 0);
          setChatsLimit(data.chats_limit ?? 20);
          setPeriodStart(data.chats_period_started_at ?? null);
          setBillingExpiresAt(data.billing_expires_at ?? null);
          setTrialExpiresAt((data as { trial_expires_at?: string | null }).trial_expires_at ?? null);
        }
        setPromoMessage("Upgrade successful. Your paid plan is now active.");
      } catch (error) {
        console.error(error);
        setPromoMessage("We could not verify payment yet. If STK was charged, contact support with your reference.");
        toast.error("Payment verification failed. Contact support if you were charged.");
      } finally { if (!cancelled) setVerifyingPayment(false); }
    };
    run();
    return () => { cancelled = true; };
  }, [user]);

  const remaining = Math.max(chatsLimit - chatsUsed, 0);
  const isExpired = !!billingExpiresAt && new Date(billingExpiresAt).getTime() < Date.now();
  const usagePercent = chatsLimit > 0 ? Math.min((chatsUsed / chatsLimit) * 100, 100) : 0;

  const startCheckout = async (planId: string) => {
    if (!user || (planId !== "growth" && planId !== "premium")) return;
    const normalizedPhone = normalizeMpesaPhone(mpesaPhone);
    if (!normalizedPhone) { setPromoMessage("Enter a valid Safaricom M-Pesa number (e.g. 07XXXXXXXX)."); return; }
    setStartingCheckoutPlan(planId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("No active session");
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ plan: planId, phone: normalizedPhone }),
      });
      const payload = await resp.json();
      if (!resp.ok || !payload?.url) throw new Error(payload?.error || "Unable to start checkout");
      setPromoMessage("Redirecting to M-Pesa STK checkout. Complete the prompt on your phone.");
      window.location.href = payload.url;
    } catch (error) {
      console.error(error);
      setPromoMessage(error instanceof Error ? error.message : "Unable to start M-Pesa STK checkout.");
      toast.error("Unable to start payment. Please try again.");
    } finally { setStartingCheckoutPlan(null); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-blue-500 to-primary/50" />
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Usage & Renewal
          </CardTitle>
          <CardDescription>
            {remaining} chats remaining out of {chatsLimit}. Usage resets on{" "}
            {formatCycleResetDate(periodStart)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative h-3 rounded-full bg-muted/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-blue-500 to-primary/70 transition-all duration-1000"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          {billingExpiresAt && (
            <p className={`text-sm ${isExpired ? "text-destructive" : "text-muted-foreground"}`}>
              Plan expiry: {new Date(billingExpiresAt).toLocaleString()}
              {isExpired ? " (expired, free tier active)" : ""}
            </p>
          )}
          {currentPlan === "free" && trialExpiresAt && (
            <p className="text-sm text-muted-foreground mt-1">
              Free trial expires: {new Date(trialExpiresAt).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-gradient-to-br from-primary/[0.03] to-primary/[0.06] shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-blue-500 to-purple-500" />
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            Upgrade via M-Pesa STK
          </CardTitle>
          <CardDescription>
            M-Pesa is now the only checkout method. Enter your Safaricom number and confirm the STK prompt to upgrade instantly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="07XXXXXXXX or +2547XXXXXXXX"
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
            </div>
            <Badge variant="secondary" className="h-10 px-3 inline-flex items-center gap-1.5 shrink-0">
              <Shield className="h-3.5 w-3.5" />
              Secured
            </Badge>
          </div>
          {promoMessage && (
            <div className="rounded-lg bg-muted/50 border border-border/50 px-3 py-2 text-sm text-foreground">
              {promoMessage}
            </div>
          )}
          {currentPlan === "free" && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Promo: Upgrade today and unlock branding removal, higher chat limits, and advanced analytics immediately.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.plan === currentPlan;
          const isRecommended = plan.plan === "growth";
          const price = plan.plan === "free"
            ? `Free Trial (${plan.trial_days || 7} days)`
            : plan.plan === "enterprise"
            ? "Custom"
            : `KES ${plan.amount_kes.toLocaleString()}/30 days`;
          return (
            <motion.div
              key={plan.plan}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ["free", "growth", "premium", "enterprise"].indexOf(plan.plan) * 0.08 }}
              className="relative"
            >
              {isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/20 px-3 py-0.5 text-[10px] font-semibold gap-1">
                    <Sparkles className="h-3 w-3" />
                    Recommended
                  </Badge>
                </div>
              )}
              <Card className={`h-full border-border/50 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                isCurrent ? "border-primary/50 ring-1 ring-primary/20" : isRecommended ? "border-primary/30" : ""
              }`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{plan.display_name}</CardTitle>
                    {isCurrent && <Badge className="bg-primary text-primary-foreground shadow-sm">Current</Badge>}
                  </div>
                  <CardDescription className={`text-lg font-bold ${plan.plan === "free" ? "text-foreground" : "text-foreground"}`}>
                    {price}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5 text-sm text-muted-foreground mb-5">
                    {(planFeatureMap[plan.plan] || []).map((f, i) => (
                      <motion.li
                        key={f}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-2.5"
                      >
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                          <Check className="h-3 w-3" />
                        </div>
                        {f}
                      </motion.li>
                    ))}
                  </ul>
                  <Button
                    variant={isCurrent ? "outline" : isRecommended ? "default" : "default"}
                    className={`w-full gap-2 ${
                      isCurrent
                        ? ""
                        : isRecommended
                        ? "bg-gradient-to-r from-primary to-blue-600 text-primary-foreground hover:from-primary/90 hover:to-blue-600/90 shadow-md"
                        : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    }`}
                    disabled={isCurrent || startingCheckoutPlan === plan.plan || verifyingPayment || !plan.is_checkout_enabled}
                    size="sm"
                    onClick={() => startCheckout(plan.plan)}
                  >
                    {isCurrent
                      ? "Current Plan"
                      : verifyingPayment
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying...</>
                      : startingCheckoutPlan === plan.plan
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Redirecting...</>
                      : plan.is_checkout_enabled
                      ? <><ChevronRight className="h-3.5 w-3.5" /> Upgrade</>
                      : "Contact Sales"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Payments secured via Paystack M-Pesa mobile money (STK). Enterprise plans are provisioned manually by support.
      </p>
    </motion.div>
  );
};

export default Billing;
