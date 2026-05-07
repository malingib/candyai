import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function hmacSha512Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function planToLimit(plan: string): number {
  if (plan === "growth") return Number(Deno.env.get("GROWTH_PLAN_CHATS_LIMIT") || "3000");
  if (plan === "premium") return Number(Deno.env.get("PREMIUM_PLAN_CHATS_LIMIT") || "10000");
  if (plan === "enterprise") return Number(Deno.env.get("ENTERPRISE_PLAN_CHATS_LIMIT") || "25000");
  return Number(Deno.env.get("FREE_PLAN_CHATS_LIMIT") || "50");
}

function isAllowedPlan(plan: string): boolean {
  return plan === "growth" || plan === "premium" || plan === "enterprise" || plan === "free";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const secret = Deno.env.get("PAYSTACK_SECRET_KEY") || "";
  const sig = req.headers.get("x-paystack-signature") || "";
  const raw = await req.text();
  if (!secret || !sig) return new Response(JSON.stringify({ error: "Webhook secret/signature missing" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const expected = await hmacSha512Hex(secret, raw);
  if (!timingSafeEqual(expected, sig)) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const event = JSON.parse(raw);
  const eventType = String(event?.event || "unknown");
  const evtId = String(event?.data?.id || event?.data?.reference || crypto.randomUUID());

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: inserted, error: insertErr } = await supabase
    .from("paystack_webhook_events")
    .insert({ paystack_event_id: evtId, event_type: eventType, payload: event })
    .select("id")
    .maybeSingle();

  if (insertErr) {
    if (insertErr.code === "23505") {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: insertErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    if (eventType === "charge.success") {
      const metadata = event?.data?.metadata || {};
      const userIdFromMeta = String(metadata?.user_id || "");
      const reference = String(event?.data?.reference || evtId);
      const customerCode = String(event?.data?.customer?.customer_code || "");
      const paidAtRaw = event?.data?.paid_at;
      const paidAt = paidAtRaw ? new Date(paidAtRaw) : null;
      if (!paidAt || Number.isNaN(paidAt.getTime())) {
        throw new Error("Missing or invalid paid_at timestamp");
      }
      const maxAgeSeconds = Number(Deno.env.get("PAYSTACK_WEBHOOK_MAX_AGE_SECONDS") || "259200");
      if (Number.isFinite(maxAgeSeconds) && maxAgeSeconds > 0) {
        const ageSeconds = Math.floor((Date.now() - paidAt.getTime()) / 1000);
        if (ageSeconds > maxAgeSeconds) {
          throw new Error("Stale webhook event rejected by replay-age guard");
        }
      }

      const { data: checkoutSession } = await supabase
        .from("paystack_checkout_sessions")
        .select("user_id, requested_plan, requested_plan_code")
        .eq("reference", reference)
        .maybeSingle();

      const userId = String(checkoutSession?.user_id || userIdFromMeta || "");
      const plan = String(checkoutSession?.requested_plan || "");
      if (!userId || !isAllowedPlan(plan)) {
        throw new Error("Unable to reconcile plan/user from trusted checkout session");
      }

      const accessExpiresAt = new Date(paidAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      if (userId) {
        await supabase.from("profiles").update({
          plan,
          chats_limit: planToLimit(plan),
          subscription_status: "active",
          access_expires_at: accessExpiresAt,
          entitlement_updated_at: new Date().toISOString(),
          paystack_customer_code: customerCode || null,
          billing_customer_id: customerCode || null,
        }).eq("user_id", userId);

        await supabase.from("subscriptions").upsert({
          user_id: userId,
          provider: "paystack",
          provider_customer_id: customerCode || null,
          provider_subscription_id: reference,
          billing_customer_id: customerCode || null,
          billing_subscription_id: reference,
          provider_plan_code: String(checkoutSession?.requested_plan_code || event?.data?.plan_object?.plan_code || ""),
          status: "active",
          current_period_start: paidAt.toISOString(),
          current_period_end: accessExpiresAt,
          metadata: event,
        }, { onConflict: "provider,provider_subscription_id" });

        await supabase
          .from("paystack_checkout_sessions")
          .update({ status: "paid", paid_at: paidAt.toISOString() })
          .eq("reference", reference);
      }
    }

    await supabase.from("paystack_webhook_events").update({ processed_at: new Date().toISOString(), processing_error: null }).eq("id", inserted?.id || "");

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    await supabase.from("paystack_webhook_events").update({ processing_error: e instanceof Error ? e.message : String(e) }).eq("id", inserted?.id || "");
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
