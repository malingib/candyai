import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyTokenInRequest } from "../_shared/jwt-verify.ts";
import { multiRateLimit, rateLimitedResponse, logRequest } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const empty = {
  whatsapp_number: "",
  call_number: "",
  business_name: "",
  logo_url: "",
  primary_color: "#2563eb",
  welcome_message: "Hi! 👋 How can I help you today?",
};

function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = multiRateLimit(req, "get-contact-info", {
    ip: { limit: 30, windowMs: 60_000 },
    session: { limit: 60, windowMs: 60_000 },
  });
  if (!rl.allowed) return rateLimitedResponse("get-contact-info", rl.scope!, rl.ctx, corsHeaders);
  const tokenError = await verifyTokenInRequest(req);
  if (tokenError) {
    logRequest({ function_name: "get-contact-info", event_type: "unauthorized", status_code: 401, ctx: rl.ctx });
    return tokenError;
  }

  try {
    const { user_id } = await req.json();
    if (!isUuid(user_id)) {
      return new Response(JSON.stringify(empty), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data } = await supabase
      .from("profiles")
      .select("whatsapp_number, call_number, business_name, logo_url, primary_color, welcome_message")
      .eq("user_id", user_id)
      .single();

    return new Response(
      JSON.stringify({
        whatsapp_number: data?.whatsapp_number || "",
        call_number: data?.call_number || "",
        business_name: data?.business_name || "",
        logo_url: data?.logo_url || "",
        primary_color: data?.primary_color || empty.primary_color,
        welcome_message: data?.welcome_message || empty.welcome_message,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify(empty), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
