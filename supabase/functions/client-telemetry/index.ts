import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { multiRateLimit, rateLimitedResponse } from "../_shared/rate-limit.ts";
import { checkBodyLimit } from "../_shared/body-limit.ts";
import { isUuid, sanitize, jsonResponse, errorResponse } from "../_shared/utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = multiRateLimit(req, "client-telemetry", {
    ip: { limit: 100, windowMs: 60_000 },
  });
  if (!rl.allowed) return rateLimitedResponse("client-telemetry", rl.scope!, rl.ctx, corsHeaders);

  const bodyLimitError = checkBodyLimit(req);
  if (bodyLimitError) return bodyLimitError;

  try {
    const { event_name, payload, business_id } = await req.json();

    if (!event_name || !business_id) {
      return errorResponse("Missing required fields", 400, undefined, corsHeaders);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const safePayload = typeof payload === "object" ? payload : {};
    const meta = {
      user_agent: sanitize(req.headers.get("user-agent"), 500),
      ip: rl.ctx.ip,
      referer: sanitize(req.headers.get("referer"), 500),
    };

    const { error } = await supabase.from("client_telemetry").insert({
      event_name: sanitize(event_name, 100),
      business_id: isUuid(business_id) ? business_id : null,
      payload: safePayload,
      metadata: meta,
    });

    if (error) throw error;
    return jsonResponse({ ok: true }, 200, corsHeaders);
  } catch (e) {
    console.error("Telemetry error:", e);
    return errorResponse("Telemetry failed", 500, undefined, corsHeaders);
  }
});
