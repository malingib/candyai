import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyTokenInRequest } from "../_shared/jwt-verify.ts";
import { multiRateLimit, rateLimitedResponse, logRequest } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type BillingPlan = {
  plan: string;
  display_name: string;
  amount_kes: number;
  currency: string;
  chats_limit: number;
  leads_limit: number;
  widget_sites_limit: number;
  is_checkout_enabled: boolean;
};

async function fetchCheckoutPlan(
  supabaseAdmin: ReturnType<typeof createClient>,
  plan: string,
): Promise<BillingPlan | null> {
  const { data, error } = await supabaseAdmin
    .from("billing_plans")
    .select("plan, display_name, amount_kes, currency, chats_limit, leads_limit, widget_sites_limit, is_checkout_enabled")
    .eq("plan", plan)
    .eq("is_checkout_enabled", true)
    .maybeSingle();
  if (error || !data) return null;
  return data as BillingPlan;
}

function normalizeMpesaPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  if (/^(\+254|254|0)?7\d{8}$/.test(digits)) {
    if (digits.startsWith("+254")) return digits;
    if (digits.startsWith("254")) return `+${digits}`;
    if (digits.startsWith("07")) return `+254${digits.slice(1)}`;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = multiRateLimit(req, "create-checkout-session", {
    ip: { limit: 10, windowMs: 60_000 },
    user: { limit: 20, windowMs: 60_000 },
    session: { limit: 20, windowMs: 60_000 },
  });
  if (!rl.allowed) return rateLimitedResponse("create-checkout-session", rl.scope!, rl.ctx, corsHeaders);

  const tokenError = await verifyTokenInRequest(req, corsHeaders);
  if (tokenError) {
    logRequest({ function_name: "create-checkout-session", event_type: "unauthorized", status_code: 401, ctx: rl.ctx });
    return tokenError;
  }

  try {
    const { plan, phone } = await req.json();
    if (!plan || typeof plan !== "string") {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const normalizedPhone = typeof phone === "string" ? normalizeMpesaPhone(phone) : null;
    if (!normalizedPhone) {
      return new Response(JSON.stringify({ error: "Valid M-Pesa phone is required (e.g. 07XXXXXXXX)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const auth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: userData, error: userErr } = await auth.auth.getUser(token);
    if (userErr || !userData?.user?.id || !userData.user.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteUrl = Deno.env.get("APP_SITE_URL") || "https://mobiwaveai.co.ke";
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecret) {
      return new Response(JSON.stringify({ error: "Billing not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const cfg = await fetchCheckoutPlan(supabaseAdmin, plan.toLowerCase());
    if (!cfg) {
      return new Response(JSON.stringify({ error: "Plan is not available for checkout" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const paystackResp = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: userData.user.email,
        amount: Number(cfg.amount_kes) * 100,
        currency: cfg.currency || "KES",
        channels: ["mobile_money"],
        callback_url: `${siteUrl}/dashboard/billing?checkout=success`,
        metadata: {
          user_id: userData.user.id,
          plan: cfg.plan,
          label: `${cfg.display_name} (30 days)`,
          payment_method: "mpesa_stk",
          mpesa_phone: normalizedPhone,
        },
      }),
    });

    const data = await paystackResp.json();
    const authUrl = data?.data?.authorization_url;
    if (!paystackResp.ok || !authUrl) {
      console.error("paystack checkout error", data);
      return new Response(JSON.stringify({ error: "Unable to create checkout session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-checkout-session error:", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
