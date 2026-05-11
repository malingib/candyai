import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyTokenInRequest } from "../_shared/jwt-verify.ts";
import { multiRateLimit, rateLimitedResponse, logRequest } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function limitsForPlan(plan: string): { chats: number; leads: number } {
  if (plan === "growth") return { chats: 2000, leads: 1000 };
  if (plan === "premium") return { chats: 10000, leads: 5000 };
  if (plan === "enterprise") return { chats: 99999, leads: 20000 };
  return { chats: 20, leads: 30 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = multiRateLimit(req, "verify-paystack-callback", {
    ip: { limit: 20, windowMs: 60_000 },
    user: { limit: 30, windowMs: 60_000 },
    session: { limit: 30, windowMs: 60_000 },
  });
  if (!rl.allowed) return rateLimitedResponse("verify-paystack-callback", rl.scope!, rl.ctx, corsHeaders);

  const tokenError = await verifyTokenInRequest(req);
  if (tokenError) {
    logRequest({ function_name: "verify-paystack-callback", event_type: "unauthorized", status_code: 401, ctx: rl.ctx });
    return tokenError;
  }

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const auth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: userData, error: userErr } = await auth.auth.getUser(token);
    const userId = userData?.user?.id;
    if (userErr || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { reference } = await req.json();
    if (!reference || typeof reference !== "string" || reference.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecret) {
      return new Response(JSON.stringify({ error: "Billing not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verifyResp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${paystackSecret}` },
    });
    const verifyData = await verifyResp.json();
    const tx = verifyData?.data;
    if (!verifyResp.ok || !tx || tx.status !== "success") {
      return new Response(JSON.stringify({ error: "Transaction not successful" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const channel = String(tx?.channel || "").toLowerCase();
    if (channel !== "mobile_money") {
      return new Response(JSON.stringify({ error: "Only M-Pesa mobile money payments are accepted" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plan = String(tx?.metadata?.plan || "").toLowerCase();
    const paidUserId = String(tx?.metadata?.user_id || "");
    if (paidUserId !== userId || !["growth", "premium", "enterprise"].includes(plan)) {
      return new Response(JSON.stringify({ error: "Transaction metadata mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date();
    const billingExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const graceExpiresAt = new Date(billingExpiresAt.getTime() + 3 * 24 * 60 * 60 * 1000);
    const limits = limitsForPlan(plan);

    await supabase
      .from("profiles")
      .update({
        plan,
        chats_limit: limits.chats,
        leads_limit: limits.leads,
        chats_used: 0,
        leads_used: 0,
        subscription_started_at: now.toISOString(),
        chats_period_started_at: now.toISOString(),
        billing_expires_at: billingExpiresAt.toISOString(),
        grace_expires_at: graceExpiresAt.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("user_id", userId);

    await supabase.from("billing_events").insert({
      user_id: userId,
      provider: "paystack",
      event_type: "callback.verified",
      event_id: tx?.id ? String(tx.id) : reference,
      amount_cents: typeof tx?.amount === "number" ? tx.amount : null,
      currency: typeof tx?.currency === "string" ? tx.currency : null,
      payload: verifyData,
    });

    return new Response(JSON.stringify({ ok: true, plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-paystack-callback error:", e);
    return new Response(JSON.stringify({ error: "Verification failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
