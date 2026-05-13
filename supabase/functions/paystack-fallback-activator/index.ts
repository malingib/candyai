import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { multiRateLimit, rateLimitedResponse } from "../_shared/rate-limit.ts";
import { checkBodyLimit } from "../_shared/body-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-fallback-token",
};

type BillingPlan = {
  plan: string;
  amount_kes: number;
  currency: string;
  chats_limit: number;
  leads_limit: number;
  widget_sites_limit: number;
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

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

  const rl = multiRateLimit(req, "paystack-fallback-activator", {
    ip: { limit: 50, windowMs: 60_000 },
    session: { limit: 100, windowMs: 60_000 },
  });
  if (!rl.allowed) return rateLimitedResponse("paystack-fallback-activator", rl.scope!, rl.ctx, corsHeaders);

  const bodyLimitError = checkBodyLimit(req);
  if (bodyLimitError) return bodyLimitError;

  const token = req.headers.get("x-fallback-token") || req.headers.get("authorization")?.replace("Bearer ", "");
  const expected = Deno.env.get("PAYSTACK_FALLBACK_TOKEN");
  if (!expected || !token || !timingSafeEqual(token, expected)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const minutes = Number(body?.minutes ?? 10);
    const minAgeMinutes = Number.isFinite(minutes) && minutes >= 1 && minutes <= 120 ? minutes : 10;
    const cutoffIso = new Date(Date.now() - minAgeMinutes * 60 * 1000).toISOString();

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecret) {
      return new Response(JSON.stringify({ error: "PAYSTACK_SECRET_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: charges, error: chargesErr } = await supabase
      .from("billing_events")
      .select("id, event_id, payload, user_id, created_at")
      .eq("provider", "paystack")
      .eq("event_type", "charge.success")
      .lte("created_at", cutoffIso)
      .order("created_at", { ascending: true })
      .limit(200);

    if (chargesErr) throw chargesErr;

    const { data: verified, error: verifiedErr } = await supabase
      .from("billing_events")
      .select("event_id")
      .eq("provider", "paystack")
      .in("event_type", ["callback.verified", "fallback.verified"]);
    if (verifiedErr) throw verifiedErr;
    const verifiedIds = new Set((verified ?? []).map((v) => String(v.event_id || "")));

    // Batch fetch all billing plans once to avoid N+1 queries
    const { data: allPlans } = await supabase
      .from("billing_plans")
      .select("plan, amount_kes, currency, chats_limit, leads_limit, widget_sites_limit")
      .in("plan", ["growth", "premium", "enterprise"]);
    const plansMap = new Map<string, BillingPlan>();
    (allPlans ?? []).forEach((p) => plansMap.set(p.plan, p as BillingPlan));

    let activated = 0;
    let skipped = 0;
    let failed = 0;

    for (const ev of charges ?? []) {
      const evId = String(ev.event_id || "");
      if (evId && verifiedIds.has(evId)) {
        skipped += 1;
        continue;
      }

      const payload = ev.payload as Record<string, unknown>;
      const data = (payload?.data ?? {}) as Record<string, unknown>;
      const reference = String(data?.reference || "");
      if (!reference) {
        failed += 1;
        continue;
      }

      const verifyResp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${paystackSecret}` },
      });
      const verifyData = await verifyResp.json();
      const tx = verifyData?.data;
      if (!verifyResp.ok || !tx || tx.status !== "success") {
        failed += 1;
        await supabase.from("billing_events").insert({
          user_id: ev.user_id,
          provider: "paystack",
          event_type: "fallback.verify_failed",
          event_id: evId || null,
          amount_cents: typeof tx?.amount === "number" ? tx.amount : null,
          currency: typeof tx?.currency === "string" ? tx.currency : null,
          payload: verifyData,
        });
        continue;
      }

      const meta = tx?.metadata ?? {};
      const userId = String(meta?.user_id || "");
      const plan = String(meta?.plan || "").toLowerCase();
      if (!userId || !["growth", "premium", "enterprise"].includes(plan)) {
        failed += 1;
        continue;
      }

      const now = new Date();
      const billingExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const graceExpiresAt = new Date(billingExpiresAt.getTime() + 3 * 24 * 60 * 60 * 1000);
      const limits = plansMap.get(plan);
      if (!limits) {
        failed += 1;
        continue;
      }
      const expectedAmount = Number(limits.amount_kes) * 100;
      const paidAmount = Number(tx?.amount || 0);
      const paidCurrency = String(tx?.currency || "").toUpperCase();
      const expectedCurrency = String(limits.currency || "KES").toUpperCase();
      if (paidAmount !== expectedAmount || paidCurrency !== expectedCurrency) {
        failed += 1;
        continue;
      }

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

      await supabase.from("billing_events").insert({
        user_id: userId,
        provider: "paystack",
        event_type: "fallback.verified",
        event_id: evId || null,
        amount_cents: typeof tx?.amount === "number" ? tx.amount : null,
        currency: typeof tx?.currency === "string" ? tx.currency : null,
        payload: verifyData,
      });

      activated += 1;
      if (evId) verifiedIds.add(evId);
    }

    return new Response(JSON.stringify({
      ok: true,
      min_age_minutes: minAgeMinutes,
      processed: (charges ?? []).length,
      activated,
      skipped,
      failed,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("paystack-fallback-activator error:", e);
    return new Response(JSON.stringify({ error: "Fallback activator failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
