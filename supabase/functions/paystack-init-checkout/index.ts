import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyTokenInRequest, verifyJWT } from "../_shared/jwt-verify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_AMOUNT_KOBO: Record<string, number> = {
  growth: Number(Deno.env.get("PAYSTACK_GROWTH_AMOUNT_KOBO") || "350000"),
  premium: Number(Deno.env.get("PAYSTACK_PREMIUM_AMOUNT_KOBO") || "800000"),
  enterprise: Number(Deno.env.get("PAYSTACK_ENTERPRISE_AMOUNT_KOBO") || "0"),
};

const PLAN_CODE_ENV: Record<string, string> = {
  growth: Deno.env.get("PAYSTACK_GROWTH_PLAN_CODE") || "",
  premium: Deno.env.get("PAYSTACK_PREMIUM_PLAN_CODE") || "",
  enterprise: Deno.env.get("PAYSTACK_ENTERPRISE_PLAN_CODE") || "",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const tokenErr = await verifyTokenInRequest(req);
  if (tokenErr) return tokenErr;

  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const payload = await verifyJWT(token);
    const userId = payload?.sub;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { plan } = await req.json();
    if (!plan || !Object.keys(PLAN_AMOUNT_KOBO).includes(plan)) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) throw new Error("PAYSTACK_SECRET_KEY missing");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await supabase
      .from("profiles")
      .select("business_name")
      .eq("user_id", userId)
      .single();

    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const email = userData?.user?.email;
    if (!email) {
      return new Response(JSON.stringify({ error: "No account email found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const callbackUrl = Deno.env.get("PAYSTACK_CALLBACK_URL") || `${Deno.env.get("APP_URL") || "https://ai.mobiwave.co.ke"}/dashboard/billing`;
    const planCode = PLAN_CODE_ENV[plan];
    const amount = PLAN_AMOUNT_KOBO[plan];

    if (plan === "enterprise" && amount <= 0) {
      return new Response(JSON.stringify({ error: "Enterprise plan is sales-assisted. Contact sales to activate." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid plan amount configuration." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Record<string, unknown> = {
      email,
      amount,
      currency: "KES",
      callback_url: callbackUrl,
      metadata: {
        user_id: userId,
        plan,
        business_name: profile?.business_name || "",
      },
    };

    if (planCode) body.plan = planCode;

    const resp = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json();
    if (!resp.ok || !data?.status) {
      return new Response(JSON.stringify({ error: data?.message || "Failed to initialize checkout" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("paystack_checkout_sessions").insert({
      reference: data.data.reference,
      user_id: userId,
      requested_plan: plan,
      requested_plan_code: planCode || null,
      amount_kobo: amount,
      status: "initialized",
    });

    return new Response(JSON.stringify({ authorization_url: data.data.authorization_url, reference: data.data.reference }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
