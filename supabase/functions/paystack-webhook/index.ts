import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { multiRateLimit, rateLimitedResponse } from "../_shared/rate-limit.ts";
import { checkBodyLimit } from "../_shared/body-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

async function hmacSha512Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

type BillingPlan = {
  plan: string;
  amount_kes: number;
  currency: string;
  chats_limit: number;
  leads_limit: number;
  widget_sites_limit: number;
};

async function fetchBillingPlan(
  supabaseAdmin: ReturnType<typeof createClient>,
  plan: string,
): Promise<BillingPlan | null> {
  const { data, error } = await supabaseAdmin
    .from("billing_plans")
    .select("plan, amount_kes, currency, chats_limit, leads_limit, widget_sites_limit")
    .eq("plan", plan)
    .maybeSingle();
  if (error || !data) return null;
  return data as BillingPlan;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = multiRateLimit(req, "paystack-webhook", {
    ip: { limit: 200, windowMs: 60_000 },
    session: { limit: 400, windowMs: 60_000 },
  });
  if (!rl.allowed) return rateLimitedResponse("paystack-webhook", rl.scope!, rl.ctx, corsHeaders);

  const bodyLimitError = checkBodyLimit(req);
  if (bodyLimitError) return bodyLimitError;

  try {
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) return new Response("Webhook secret not configured", { status: 500, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      console.error("paystack-webhook: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response("Server misconfiguration", { status: 500, headers: corsHeaders });
    }

    const signature = req.headers.get("x-paystack-signature");
    if (!signature) return new Response("Missing x-paystack-signature", { status: 400, headers: corsHeaders });

    const raw = await req.text();
    const expected = await hmacSha512Hex(secret, raw);
    if (expected !== signature) return new Response("Invalid signature", { status: 400, headers: corsHeaders });

    const event = JSON.parse(raw);
    const eventType = String(event?.event || "");
    const data = event?.data ?? {};
    const supabase = createClient(supabaseUrl, supabaseKey);
    const metadata = data?.metadata ?? {};
    const userId = typeof metadata?.user_id === "string" ? metadata.user_id : null;

    const { error: billingEventError } = await supabase.from("billing_events").insert({
      user_id: userId,
      provider: "paystack",
      event_type: eventType || "unknown",
      event_id: typeof data?.id === "number" ? String(data.id) : null,
      amount_cents: typeof data?.amount === "number" ? data.amount : null,
      currency: typeof data?.currency === "string" ? data.currency : null,
      payload: event,
    });
    if (billingEventError) {
      console.error("paystack-webhook: failed to log billing event:", billingEventError);
    }

    if (eventType === "charge.success" && userId) {
      const plan = String(metadata?.plan || "").toLowerCase();
      const channel = String(data?.channel || "").toLowerCase();
      if (["growth", "premium", "enterprise"].includes(plan) && channel === "mobile_money") {
        const limits = await fetchBillingPlan(supabase, plan);
        if (limits) {
          const expectedAmount = Number(limits.amount_kes) * 100;
          const paidAmount = Number(data?.amount || 0);
          const paidCurrency = String(data?.currency || "").toUpperCase();
          const expectedCurrency = String(limits.currency || "KES").toUpperCase();
          if (paidAmount === expectedAmount && paidCurrency === expectedCurrency) {
            const now = new Date();
            const billingExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            const graceExpiresAt = new Date(billingExpiresAt.getTime() + 3 * 24 * 60 * 60 * 1000);
            await supabase
              .from("profiles")
              .update({
                plan,
                chats_limit: limits.chats_limit,
                leads_limit: limits.leads_limit,
                widget_sites_limit: limits.widget_sites_limit,
                chats_used: 0,
                leads_used: 0,
                subscription_started_at: now.toISOString(),
                chats_period_started_at: now.toISOString(),
                billing_expires_at: billingExpiresAt.toISOString(),
                grace_expires_at: graceExpiresAt.toISOString(),
                updated_at: now.toISOString(),
              })
              .eq("user_id", userId);
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("paystack-webhook error:", e);
    return new Response("Webhook processing failed", { status: 500, headers: corsHeaders });
  }
});
