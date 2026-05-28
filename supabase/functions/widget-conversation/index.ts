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
const WEBSITE_DATA_MAX_CHARS = 12000;
const AUTO_CRAWL_MAX_PAGES = 8;

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

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gim, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gim, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMeta(html: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
  ];
  for (const pattern of patterns) {
    const hit = html.match(pattern)?.[1];
    if (hit) return stripHtml(hit);
  }
  return "";
}

function extractTitle(html: string): string {
  const hit = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return hit ? stripHtml(hit) : "";
}

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "MobiwaveAI-WidgetCrawler/1.0" },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!/text\/html|application\/xml|text\/xml|text\/plain|javascript/i.test(contentType)) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function pageLabel(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/^\/|\/$/g, "") || "home";
    return path.replace(/[-_/]+/g, " ");
  } catch {
    return url;
  }
}

async function discoverPages(origin: string): Promise<string[]> {
  const urls = new Set<string>([`${origin}/`]);
  const sitemap = await fetchText(`${origin}/sitemap.xml`, 6000);
  if (sitemap) {
    const locs = Array.from(sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi))
      .map((m) => m[1]?.trim())
      .filter(Boolean) as string[];
    for (const loc of locs) {
      try {
        const parsed = new URL(loc);
        if (`${parsed.protocol}//${parsed.host}`.toLowerCase() === origin) {
          urls.add(parsed.toString());
        }
      } catch {
        // Ignore invalid sitemap entries.
      }
      if (urls.size >= AUTO_CRAWL_MAX_PAGES) break;
    }
  }

  for (const path of ["/about", "/services", "/departments", "/projects", "/resource-centre", "/contact"]) {
    if (urls.size >= AUTO_CRAWL_MAX_PAGES) break;
    urls.add(`${origin}${path}`);
  }
  return [...urls].slice(0, AUTO_CRAWL_MAX_PAGES);
}

async function buildWebsiteData(origin: string): Promise<string> {
  const pages = await discoverPages(origin);
  const capturedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const sections: string[] = [
    `Website source: ${origin}`,
    `Captured at: ${capturedAt}`,
  ];

  for (const page of pages) {
    const html = await fetchText(page);
    if (!html) continue;

    const title = extractTitle(html);
    const description = extractMeta(html, "description");
    const ogDescription = extractMeta(html, "og:description");
    const visible = stripHtml(html).slice(0, 1800);
    const facts = [
      `=== PAGE: ${page} ===`,
      `Section: ${pageLabel(page)}`,
      title ? `Title: ${title}` : "",
      description ? `Description: ${description}` : "",
      ogDescription && ogDescription !== description ? `OG Description: ${ogDescription}` : "",
      visible ? `Visible content: ${visible}` : "",
    ].filter(Boolean);
    sections.push(facts.join("\n"));
    if (sections.join("\n\n").length >= WEBSITE_DATA_MAX_CHARS) break;
  }

  return sections.join("\n\n").slice(0, WEBSITE_DATA_MAX_CHARS);
}

async function ensureWebsiteData(
  supabase: ReturnType<typeof createClient>,
  businessId: string,
  origin: string,
): Promise<void> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("website_data")
    .eq("user_id", businessId)
    .maybeSingle();
  if (error || String(profile?.website_data || "").trim().length > 200) return;

  const websiteData = await buildWebsiteData(origin);
  if (websiteData.length <= 200) return;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ website_data: websiteData, updated_at: new Date().toISOString() })
    .eq("user_id", businessId);
  if (updateError) console.error("auto website_data update failed:", updateError);
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
        await ensureWebsiteData(supabase, business_id, embedOrigin);
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
        user_agent: sanitize(req.headers.get("user-agent"), 500),
        referer: sanitize(req.headers.get("referer"), 500),
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
      const text = sanitize(content, 4000);
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
      const cleanName = sanitize(name, 100);
      const cleanEmail = sanitize(email, 255).toLowerCase();
      const cleanPhone = sanitize(phone, 30).replace(/[^\d+\-\s()]/g, "");

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

    // ---- Record analytics event ----
    if (action === "analytics") {
      const { event, conversation_id, page_url, page_title, widget_version } = body;
      if (!event || typeof event !== "string") {
        return jsonResponse({ ok: true }, 200, corsHeaders);
      }
      const ALLOWED_EVENTS = ["page_viewed", "conversation_started", "widget_opened", "widget_closed", "message_sent"];
      if (!ALLOWED_EVENTS.includes(event)) {
        return jsonResponse({ ok: true }, 200, corsHeaders);
      }
      supabase.from("widget_analytics").insert({
        business_id,
        event,
        conversation_id: isUuid(conversation_id) ? conversation_id : null,
        page_url: sanitize(String(page_url || ""), 1000),
        page_title: sanitize(String(page_title || ""), 500),
        widget_version: sanitize(String(widget_version || ""), 20),
      }).then(({ error }) => {
        if (error) console.error("analytics insert error:", error);
      }).catch(() => {});
      return jsonResponse({ ok: true }, 200, corsHeaders);
    }

    return errorResponse("unknown action", 400, undefined, corsHeaders);
  } catch (e) {
    console.error("widget-conversation error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500, undefined, corsHeaders);
  }
});
