import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyTokenInRequest } from "../_shared/jwt-verify.ts";
import { multiRateLimit, rateLimitedResponse, logRequest } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = multiRateLimit(req, "client-telemetry", {
    ip: { limit: 20, windowMs: 60_000 },
    user: { limit: 40, windowMs: 60_000 },
    session: { limit: 40, windowMs: 60_000 },
  });
  if (!rl.allowed) return rateLimitedResponse("client-telemetry", rl.scope!, rl.ctx, corsHeaders);

  const tokenError = await verifyTokenInRequest(req, corsHeaders);
  if (tokenError) {
    logRequest({ function_name: "client-telemetry", event_type: "unauthorized", status_code: 401, ctx: rl.ctx });
    return tokenError;
  }

  try {
    const body = await req.json();
    const level = String(body?.level || "error");
    const message = String(body?.message || "client error").slice(0, 500);
    const metadata = body?.metadata && typeof body.metadata === "object" ? body.metadata : {};

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await supabase.from("request_logs").insert({
      function_name: "client-telemetry",
      event_type: level === "warn" ? "error" : "error",
      status_code: 500,
      scope: "session",
      message,
      metadata: {
        source: "browser",
        ...metadata,
      },
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("client-telemetry error:", e);
    return new Response(JSON.stringify({ error: "telemetry failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
