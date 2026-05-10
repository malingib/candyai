import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { multiRateLimit, rateLimitedResponse } from "../_shared/rate-limit.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = multiRateLimit(req, "paystack-webhook", {
    ip: { limit: 200, windowMs: 60_000 },
    session: { limit: 400, windowMs: 60_000 },
  });
  if (!rl.allowed) return rateLimitedResponse("paystack-webhook", rl.scope!, rl.ctx, corsHeaders);

  try {
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) return new Response("Webhook secret not configured", { status: 500, headers: corsHeaders });

    const signature = req.headers.get("x-paystack-signature");
    if (!signature) return new Response("Missing x-paystack-signature", { status: 400, headers: corsHeaders });

    const raw = await req.text();
    const expected = await hmacSha512Hex(secret, raw);
    if (expected !== signature) return new Response("Invalid signature", { status: 400, headers: corsHeaders });

    const event = JSON.parse(raw);
    const eventType = String(event?.event || "");
    const data = event?.data ?? {};
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const metadata = data?.metadata ?? {};
    const userId = typeof metadata?.user_id === "string" ? metadata.user_id : null;

    await supabase.from("billing_events").insert({
      user_id: userId,
      provider: "paystack",
      event_type: eventType || "unknown",
      event_id: typeof data?.id === "number" ? String(data.id) : null,
      amount_cents: typeof data?.amount === "number" ? data.amount : null,
      currency: typeof data?.currency === "string" ? data.currency : null,
      payload: event,
    });

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("paystack-webhook error:", e);
    return new Response("Webhook processing failed", { status: 500, headers: corsHeaders });
  }
});
