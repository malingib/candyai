import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { multiRateLimit, rateLimitedResponse } from "../_shared/rate-limit.ts";
import { verifyTurnstileToken } from "../_shared/turnstile.ts";
import { checkBodyLimit } from "../_shared/body-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BLOCKED_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "yopmail.com", "getnada.com",
  "sharklasers.com", "dispostable.com", "trashmail.com", "moakt.com", "maildrop.cc", "temp-mail.org",
]);

function parseEmail(email: unknown): { ok: boolean; value: string; domain: string } {
  const value = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { ok: false, value: "", domain: "" };
  const domain = value.split("@")[1] || "";
  return { ok: !!domain, value, domain };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = multiRateLimit(req, "pre-signup-check", {
    ip: { limit: 8, windowMs: 60_000 },
    session: { limit: 12, windowMs: 60_000 },
  });
  if (!rl.allowed) return rateLimitedResponse("pre-signup-check", rl.scope!, rl.ctx, corsHeaders);

  const bodyLimitError = checkBodyLimit(req);
  if (bodyLimitError) return bodyLimitError;

  try {
    const { email, turnstile_token } = await req.json();
    const parsed = parseEmail(email);
    if (!parsed.ok) {
      return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const captcha = await verifyTurnstileToken({
      token: String(turnstile_token || ""),
      remoteip: req.headers.get("cf-connecting-ip") ?? undefined,
    });
    if (!captcha.ok) {
      return new Response(JSON.stringify({ error: captcha.error || "Security check failed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (BLOCKED_DOMAINS.has(parsed.domain)) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await supabase.from("signup_risk_events").insert({
        email: parsed.value,
        domain: parsed.domain,
        reason: "blocked_disposable_domain",
        ip: req.headers.get("cf-connecting-ip") || null,
        user_agent: req.headers.get("user-agent") || null,
      });
      return new Response(JSON.stringify({ error: "Please use a business or personal email address." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("pre-signup-check error:", e);
    return new Response(JSON.stringify({ error: "Unable to validate signup request" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
