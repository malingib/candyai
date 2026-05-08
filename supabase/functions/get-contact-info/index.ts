import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyTokenInRequest } from "../_shared/jwt-verify.ts";
import { getClientIp, rateLimit } from "../_shared/rate-limit.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // IP rate limit: 30 req/min
  const ip = getClientIp(req);
  const limited = rateLimit(`get-contact-info:${ip}`, 30, 60_000, corsHeaders);
  if (limited) return limited;

  // Verify JWT token
  const tokenError = verifyTokenInRequest(req);
  if (tokenError) return tokenError;

  try {
    const { user_id } = await req.json();
    if (!user_id) {
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
