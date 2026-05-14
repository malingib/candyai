import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyTokenInRequest } from "../_shared/jwt-verify.ts";
import { multiRateLimit, rateLimitedResponse } from "../_shared/rate-limit.ts";
import { checkBodyLimit } from "../_shared/body-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function canonicalOrigin(input: string): string | null {
  try {
    const u = new URL(input);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return `${u.protocol}//${u.host}`.toLowerCase();
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = multiRateLimit(req, "verify-widget-domain", {
    ip: { limit: 20, windowMs: 60_000 },
    user: { limit: 40, windowMs: 60_000 },
    session: { limit: 40, windowMs: 60_000 },
  });
  if (!rl.allowed) return rateLimitedResponse("verify-widget-domain", rl.scope!, rl.ctx, corsHeaders);

  const bodyLimitError = checkBodyLimit(req);
  if (bodyLimitError) return bodyLimitError;

  const tokenError = await verifyTokenInRequest(req, corsHeaders);
  if (tokenError) return tokenError;

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const auth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: userData, error: userErr } = await auth.auth.getUser(token);
    const userId = userData?.user?.id;
    if (userErr || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const action = String(body?.action || "");

    if (action === "list") {
      const { data } = await supabase
        .from("widget_domains")
        .select("origin,is_active,is_verified,verification_token,verified_at,created_at,last_seen_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      return new Response(JSON.stringify({ domains: data ?? [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const origin = canonicalOrigin(String(body?.origin || ""));
    if (!origin) return new Response(JSON.stringify({ error: "Invalid origin URL" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (action === "register") {
      const tokenValue = crypto.randomUUID().replace(/-/g, "");
      const { error } = await supabase
        .from("widget_domains")
        .upsert({ user_id: userId, origin, is_active: true, is_verified: false, verification_token: tokenValue, verified_at: null }, { onConflict: "user_id,origin" });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, origin, verification_token: tokenValue, meta_tag: `<meta name="mobiwave-domain-verification" content="${tokenValue}" />` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "verify") {
      const { data: row } = await supabase
        .from("widget_domains")
        .select("verification_token")
        .eq("user_id", userId)
        .eq("origin", origin)
        .maybeSingle();
      const tokenValue = String(row?.verification_token || "");
      if (!tokenValue) {
        return new Response(JSON.stringify({ error: "Domain not registered" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const urls = [`${origin}/`, `${origin}/index.html`];
      let html = "";
      for (const u of urls) {
        try {
          const resp = await fetch(u, { method: "GET" });
          if (resp.ok) {
            html = await resp.text();
            if (html) break;
          }
        } catch {
          continue;
        }
      }

const expectedMeta = `name="mobiwave-domain-verification" content="${tokenValue}"`;
       const expectedMeta2 = `name='mobiwave-domain-verification' content='${tokenValue}'`;
      const matched = html.includes(expectedMeta) || html.includes(expectedMeta2) || html.includes(tokenValue);
      if (!matched) {
        return new Response(JSON.stringify({ error: "Verification token not found on website. Add the meta tag and retry." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await supabase
        .from("widget_domains")
        .update({ is_verified: true, verified_at: new Date().toISOString(), is_active: true })
        .eq("user_id", userId)
        .eq("origin", origin);

      return new Response(JSON.stringify({ ok: true, origin, verified: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("verify-widget-domain error:", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
