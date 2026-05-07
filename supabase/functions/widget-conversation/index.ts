import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getClientIp, rateLimit } from "../_shared/rate-limit.ts";
import { extractOrigin, isAllowedOrigin, isUuid, sanitizeUserMessage, clamp } from "../_shared/request-security.ts";
import { distributedRateLimit, encryptPII, logAudit, maskEmail, maskPhone, signWidgetToken, verifyWidgetToken } from "../_shared/enterprise-security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Rate limit: 60 requests per minute per IP
  const ip = getClientIp(req);
  const limited = rateLimit(`widget-conversation:${ip}`, 60, 60_000, corsHeaders);
  if (limited) return limited;
  const dlimited = await distributedRateLimit({
    key: `widget-conversation:${ip}`,
    limit: 120,
    windowMs: 60_000,
    corsHeaders,
  });
  if (dlimited) return dlimited;

  try {
    const body = await req.json();
    const { action, business_id } = body;

    if (!isUuid(business_id)) {
      return new Response(JSON.stringify({ error: "invalid business_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify business exists
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, allowed_origins")
      .eq("user_id", business_id)
      .maybeSingle();
    if (!profile) {
      return new Response(JSON.stringify({ error: "business not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const origin = extractOrigin(req);
    const allowedOrigins = Array.isArray((profile as { allowed_origins?: string[] }).allowed_origins)
      ? ((profile as { allowed_origins?: string[] }).allowed_origins as string[])
      : [];
    if (allowedOrigins.length > 0 && !isAllowedOrigin(origin, allowedOrigins)) {
      await logAudit({
        userId: business_id,
        type: "origin_denied",
        severity: "warn",
        source: "widget-conversation",
        ip,
        origin,
        metadata: { business_id },
      });
      return new Response(JSON.stringify({ error: "origin not allowed" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Create or reuse conversation ----
    if (action === "start") {
      const meta = {
        user_agent: clamp(req.headers.get("user-agent"), 500),
        referer: clamp(req.headers.get("referer"), 500),
        started_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: business_id, status: "active", visitor_metadata: meta })
        .select("id").single();
      if (error) throw error;
      const session_token = await signWidgetToken({
        business_id,
        conversation_id: data.id,
        exp: Date.now() + (1000 * 60 * 60 * 12),
      });
      return new Response(JSON.stringify({ conversation_id: data.id, session_token }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Persist a message ----
    if (action === "message") {
      const { conversation_id, role, content } = body;
      const sessionToken = String(body.session_token || "");
      if (!isUuid(conversation_id) || !["user", "assistant"].includes(role)) {
        return new Response(JSON.stringify({ error: "invalid input" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = sanitizeUserMessage(content, 4000);
      if (!text) return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      // Ensure the conversation belongs to this business.
      const { data: conv } = await supabase
        .from("conversations")
        .select("id, user_id")
        .eq("id", conversation_id)
        .eq("user_id", business_id)
        .maybeSingle();
      if (!conv) {
        await logAudit({
          userId: business_id,
          type: "conversation_scope_denied",
          severity: "warn",
          source: "widget-conversation",
          ip,
          origin,
          metadata: { conversation_id },
        });
        return new Response(JSON.stringify({ error: "invalid conversation scope" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!(await verifyWidgetToken(sessionToken, { business_id, conversation_id }))) {
        await logAudit({
          userId: business_id,
          type: "widget_token_invalid",
          severity: "warn",
          source: "widget-conversation",
          ip,
          origin,
          metadata: { conversation_id },
        });
        return new Response(JSON.stringify({ error: "invalid session token" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase.from("messages").insert({
        conversation_id, role, content: text,
      }).select("id").single();
      if (error) throw error;
      // Touch conversation updated_at
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversation_id);
      return new Response(JSON.stringify({ ok: true, message_id: data?.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Capture a lead ----
    if (action === "lead") {
      const { conversation_id, name, email, phone } = body;
      const sessionToken = String(body.session_token || "");
      const cleanName = clamp(name, 100).trim();
      const cleanEmail = clamp(email, 255).trim();
      const cleanPhone = clamp(phone, 30).trim();
      const cleanConversationId = isUuid(conversation_id) ? conversation_id : null;
      const emailEnc = cleanEmail ? await encryptPII(cleanEmail) : null;
      const phoneEnc = cleanPhone ? await encryptPII(cleanPhone) : null;

      if (!cleanName && !cleanEmail && !cleanPhone) {
        return new Response(JSON.stringify({ error: "at least one field required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return new Response(JSON.stringify({ error: "invalid email" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!cleanConversationId) {
        return new Response(JSON.stringify({ error: "conversation_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: conv } = await supabase
        .from("conversations")
        .select("id, user_id")
        .eq("id", cleanConversationId)
        .eq("user_id", business_id)
        .maybeSingle();
      if (!conv) {
        await logAudit({
          userId: business_id,
          type: "conversation_scope_denied",
          severity: "warn",
          source: "widget-conversation",
          ip,
          origin,
          metadata: { conversation_id: cleanConversationId, action: "lead" },
        });
        return new Response(JSON.stringify({ error: "invalid conversation scope" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!(await verifyWidgetToken(sessionToken, { business_id, conversation_id: cleanConversationId }))) {
        await logAudit({
          userId: business_id,
          type: "widget_token_invalid",
          severity: "warn",
          source: "widget-conversation",
          ip,
          origin,
          metadata: { conversation_id: cleanConversationId, action: "lead" },
        });
        return new Response(JSON.stringify({ error: "invalid session token" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase.from("leads").insert({
        user_id: business_id,
        conversation_id: cleanConversationId,
        name: cleanName || null,
        email: cleanEmail ? maskEmail(cleanEmail) : null,
        phone: cleanPhone ? maskPhone(cleanPhone) : null,
        email_enc: emailEnc,
        phone_enc: phoneEnc,
        notes: "Captured from embedded widget",
      });
      if (error) throw error;

      // Also save visitor info on conversation
      await supabase.from("conversations")
        .update({ visitor_name: cleanName || null, visitor_email: cleanEmail ? maskEmail(cleanEmail) : null })
        .eq("id", cleanConversationId);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("widget-conversation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
