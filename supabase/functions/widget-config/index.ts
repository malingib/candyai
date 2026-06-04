import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { multiRateLimit, rateLimitedResponse } from "../_shared/rate-limit.ts";
import { isUuid, jsonResponse, errorResponse } from "../_shared/utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

function base64url(input: string): string {
  return btoa(input).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function signGuestToken(businessId: string, visitorId: string): Promise<string> {
  const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: "supabase",
    role: "anon",
    business_id: businessId,
    sub: visitorId || crypto.randomUUID(),
    iat: now,
    exp: now + 86400,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(jwtSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const sigB64 = base64url(String.fromCharCode(...new Uint8Array(signature)));

  return `${data}.${sigB64}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") {
    return errorResponse("Method not allowed", 405, undefined, corsHeaders);
  }

  const rl = multiRateLimit(req, "widget-config", {
    ip: { limit: 20, windowMs: 60_000 },
  });
  if (!rl.allowed) return rateLimitedResponse("widget-config", rl.scope!, rl.ctx, corsHeaders);

  try {
    const url = new URL(req.url);
    const businessId = url.searchParams.get("business_id") || "";
    if (!isUuid(businessId)) {
      return errorResponse("Invalid business_id", 400, undefined, corsHeaders);
    }

    const visitorId = url.searchParams.get("visitor_id") || "";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const originHeader = req.headers.get("Origin") || "";
    const refererHeader = req.headers.get("Referer") || "";
    const inputOrigin = originHeader || refererHeader;
    const canonical = inputOrigin ? canonicalOrigin(inputOrigin) : null;

    if (canonical) {
      const { data: domain } = await supabase
        .from("widget_domains")
        .select("is_active, is_verified")
        .eq("user_id", businessId)
        .eq("origin", canonical)
        .maybeSingle();

      if (!domain || !domain.is_active || !domain.is_verified) {
        return errorResponse("Domain not verified for this business", 403, undefined, corsHeaders);
      }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_name, logo_url, primary_color, welcome_message, whatsapp_number, call_number, plan, widget_config")
      .eq("user_id", businessId)
      .maybeSingle();

    if (!profile) {
      return errorResponse("Business not found", 404, undefined, corsHeaders);
    }

    const plan = String(profile.plan || "free");
    const { data: planCfg } = await supabase
      .from("billing_plans")
      .select("allow_branding_removal")
      .eq("plan", plan)
      .maybeSingle();
    const allowBrandingRemoval = !!planCfg?.allow_branding_removal;

    const guestToken = await signGuestToken(businessId, visitorId);

    return jsonResponse({
      business_name: profile.business_name || "",
      logo_url: profile.logo_url || "",
      primary_color: profile.primary_color || "#2563eb",
      welcome_message: profile.welcome_message || "Hi! 👋 How can I help you today?",
      whatsapp_number: profile.whatsapp_number || "",
      call_number: profile.call_number || "",
      allow_branding_removal: allowBrandingRemoval,
      widget_config: profile.widget_config || "",
      website: Deno.env.get("APP_URL") || "",
      guest_token: guestToken,
      supabase_url: Deno.env.get("SUPABASE_URL") || "",
    }, 200, corsHeaders);
  } catch (e) {
    console.error("widget-config error:", e);
    return errorResponse("Unexpected error", 500, undefined, corsHeaders);
  }
});
