import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { multiRateLimit, rateLimitedResponse } from "../_shared/rate-limit.ts";
import { checkBodyLimit } from "../_shared/body-limit.ts";
import { isUuid, clamp, jsonResponse, errorResponse } from "../_shared/utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractOriginFromHeaders(req: Request): string | null {
  const ref = req.headers.get("referer");
  const origin = req.headers.get("origin");
  const candidate = ref || origin;
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return null;
  }
}

async function conversationBelongsToBusiness(
  supabase: ReturnType<typeof createClient>,
  conversationId: string,
  businessId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", businessId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = multiRateLimit(req, "widget-conversation", {
    ip: { limit: 60, windowMs: 60_000 },
    session: { limit: 90, windowMs: 60_000 },
  });
  if (!rl.allowed) return rateLimitedResponse("widget-conversation", rl.scope!, rl.ctx, corsHeaders);

  const bodyLimitError = checkBodyLimit(req);
  if (bodyLimitError) return bodyLimitError;

  try {
    const body = await req.json();
    const { action, business_id } = body;

    if (!isUuid(business_id)) {
      return errorResponse("invalid business_id", 400, undefined, corsHeaders);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify business exists
    const { data: profile } = await supabase
      .from("profiles").select("user_id").eq("user_id", business_id).maybeSingle();
    if (!profile) {
      return errorResponse("business not found", 404, undefined, corsHeaders);
    }

    // ---- Create or reuse conversation ----
    if (action === "start") {
      const embedOrigin = extractOriginFromHeaders(req);
      if (!embedOrigin) {
        return errorResponse("Unable to identify website origin for widget session.", 400, undefined, corsHeaders);
      }

      const { data: profileLimits, error: profileErr } = await supabase
        .from("profiles")
        .select("plan, widget_sites_limit")
        .eq("user_id", business_id)
        .single();
      if (profileErr || !profileLimits) {
        return errorResponse("Unable to validate embed limits.", 500, undefined, corsHeaders);
      }

      const { data: existingDomain } = await supabase
        .from("widget_domains")
        .select("id, is_verified")
        .eq("user_id", business_id)
        .eq("origin", embedOrigin)
        .eq("is_active", true)
        .maybeSingle();

      if (existingDomain?.id) {
        if (!existingDomain.is_verified) {
          return errorResponse("Domain is registered but not verified. Complete domain verification in Embed settings.", 403, "domain_unverified", corsHeaders);
        }
        await supabase
          .from("widget_domains")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", existingDomain.id);
      } else {
        const { count: activeCount } = await supabase
          .from("widget_domains")
          .select("*", { count: "exact", head: true })
          .eq("user_id", business_id)
          .eq("is_active", true);

        const current = activeCount ?? 0;
        const maxSites = Number(profileLimits.widget_sites_limit ?? 1);
        if (current >= maxSites) {
          return errorResponse("Embed limit reached for this plan. Upgrade to allow more websites.", 402, "embed_limit_reached", corsHeaders);
        }

        const { error: insertDomainErr } = await supabase
          .from("widget_domains")
          .insert({
            user_id: business_id,
            origin: embedOrigin,
            is_active: true,
            is_verified: false,
            verification_token: crypto.randomUUID().replace(/-/g, ""),
          });
        if (insertDomainErr) {
          return errorResponse("Unable to register widget origin.", 500, undefined, corsHeaders);
        }
        return errorResponse("Domain registered but not verified. Verify this website in dashboard before chat can run.", 403, "domain_unverified", corsHeaders);
      }

      const meta = {
        user_agent: clamp(req.headers.get("user-agent"), 500),
        referer: clamp(req.headers.get("referer"), 500),
        started_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: business_id, status: "active", visitor_metadata: meta })
        .select("id").single();
      if (error) {
        const errMsg = String((error as { message?: string })?.message || "");
        if (!errMsg.includes("duplicate key value violates unique constraint")) {
          throw error;
        }
      }
      return jsonResponse({ conversation_id: data.id }, 200, corsHeaders);
    }

    // ---- Persist a message ----
    if (action === "message") {
      const { conversation_id, role, content } = body;
      if (!isUuid(conversation_id) || !["user", "assistant"].includes(role)) {
        return errorResponse("invalid input", 400, undefined, corsHeaders);
      }
      const ownsConversation = await conversationBelongsToBusiness(supabase, conversation_id, business_id);
      if (!ownsConversation) {
        return errorResponse("invalid conversation", 403, undefined, corsHeaders);
      }
      const text = clamp(content, 4000);
      if (!text) return jsonResponse({ ok: true }, 200, corsHeaders);
      const { data, error } = await supabase.from("messages").insert({
        conversation_id, role, content: text,
      }).select("id").single();
      if (error) throw error;
      // Touch conversation updated_at
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversation_id);
      return jsonResponse({ ok: true, message_id: data?.id }, 200, corsHeaders);
    }

    // ---- Capture a lead ----
    if (action === "lead") {
      const { conversation_id, name, email, phone } = body;
      const cleanName = clamp(name, 100).trim();
      const cleanEmail = clamp(email, 255).trim();
      const cleanPhone = clamp(phone, 30).trim();

      if (!cleanName && !cleanEmail && !cleanPhone) {
        return errorResponse("at least one field required", 400, undefined, corsHeaders);
      }
      if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return errorResponse("invalid email", 400, undefined, corsHeaders);
      }

      if (isUuid(conversation_id)) {
        const ownsConversation = await conversationBelongsToBusiness(supabase, conversation_id, business_id);
        if (!ownsConversation) {
          return errorResponse("invalid conversation", 403, undefined, corsHeaders);
        }
      }

      const { data: profilePlan } = await supabase
        .from("profiles")
        .select("plan")
        .eq("user_id", business_id)
        .single();
      const plan = String(profilePlan?.plan || "free");
      const { data: planCfg } = await supabase
        .from("billing_plans")
        .select("allow_lead_capture")
        .eq("plan", plan)
        .maybeSingle();
      if (!planCfg?.allow_lead_capture) {
        return errorResponse("Lead capture is not available on this plan. Upgrade to Growth or higher.", 403, undefined, corsHeaders);
      }

      const leadPayload = {
        user_id: business_id,
        conversation_id: isUuid(conversation_id) ? conversation_id : null,
        name: cleanName || null,
        email: cleanEmail || null,
        phone: cleanPhone || null,
        notes: "Captured from embedded widget",
      };

      let error: unknown = null;
      let shouldInsert = true;
      if (isUuid(conversation_id)) {
        const { data: existingForConversation } = await supabase
          .from("leads")
          .select("id")
          .eq("user_id", business_id)
          .eq("conversation_id", conversation_id)
          .limit(1)
          .maybeSingle();
        shouldInsert = !existingForConversation;
      } else {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        let hasRecentDuplicate = false;

        if (cleanEmail) {
          const { data: byEmail } = await supabase
            .from("leads")
            .select("id")
            .eq("user_id", business_id)
            .eq("email", cleanEmail)
            .gte("created_at", cutoff)
            .limit(1)
            .maybeSingle();
          hasRecentDuplicate = !!byEmail;
        }

        if (!hasRecentDuplicate && cleanPhone) {
          const { data: byPhone } = await supabase
            .from("leads")
            .select("id")
            .eq("user_id", business_id)
            .eq("phone", cleanPhone)
            .gte("created_at", cutoff)
            .limit(1)
            .maybeSingle();
          hasRecentDuplicate = !!byPhone;
        }

        shouldInsert = !hasRecentDuplicate;
      }

      if (shouldInsert) {
        const { data: quotaData, error: quotaErr } = await supabase.rpc("consume_lead_quota", { p_user_id: business_id });
        const quota = quotaData?.[0] as { allowed?: boolean; reason?: string; remaining?: number; resets_at?: string } | undefined;
        if (quotaErr || !quota?.allowed) {
          return jsonResponse({
            error: "Lead capture limit reached. Upgrade plan to capture more leads.",
            reason: quota?.reason ?? "limit_reached",
            remaining: quota?.remaining ?? 0,
            resets_at: quota?.resets_at ?? null,
          }, 402, corsHeaders);
        }

        ({ error } = await supabase.from("leads").insert(leadPayload));
      }
      if (error) throw error;

      // Also save visitor info on conversation
      if (isUuid(conversation_id)) {
        await supabase.from("conversations")
          .update({ visitor_name: cleanName || null, visitor_email: cleanEmail || null })
          .eq("id", conversation_id);
      }
      return jsonResponse({ ok: true }, 200, corsHeaders);
    }

    return errorResponse("unknown action", 400, undefined, corsHeaders);
  } catch (e) {
    console.error("widget-conversation error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500, undefined, corsHeaders);
  }
});
