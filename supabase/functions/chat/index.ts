import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { multiRateLimit, rateLimitedResponse, logRequest } from "../_shared/rate-limit.ts";
import { verifyTokenInRequest } from "../_shared/jwt-verify.ts";
import { verifyTurnstileToken } from "../_shared/turnstile.ts";
import { checkBodyLimit } from "../_shared/body-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const CHAT_UNAVAILABLE_MESSAGE = "Demo AI is temporarily unavailable. Please contact support or try again later.";

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };
type ModelAttempt = { model: string; status: number; body: string };
type StreamResult = { response: Response; model: string; attempts: ModelAttempt[] } | { response: null; model: null; attempts: ModelAttempt[] };
type QuotaRow = {
  allowed: boolean;
  reason: string;
  chats_used: number;
  chats_limit: number;
  remaining: number;
  resets_at: string;
  plan: string;
};

function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function sanitizeMessages(input: unknown, maxMessages = 30, maxChars = 4000): ChatMessage[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > maxMessages) return null;
  const out: ChatMessage[] = [];
  for (const m of input) {
    if (!m || typeof m !== "object") return null;
    const role = (m as Record<string, unknown>).role;
    const content = (m as Record<string, unknown>).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const cleaned = content.trim().slice(0, maxChars);
    if (!cleaned) continue;
    out.push({ role, content: cleaned });
  }
  return out.length ? out : null;
}

function getPreferredModels(): string[] {
  const raw = Deno.env.get("FREE_AI_MODELS");
  if (!raw) return ["google/gemini-2.0-flash", "groq/llama-3.1-8b-instant"];
  return raw.split(",").map((m) => m.trim()).filter(Boolean);
}

async function callGatewayStream(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
): Promise<{ ok: boolean; response?: Response; status: number; body?: string }> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature: 0.7, stream: true }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    return { ok: false, status: resp.status, body: body.slice(0, 600) };
  }
  return { ok: true, response: resp, status: 200 };
}

async function callProviderWithFallbackStream(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
): Promise<StreamResult> {
  const models = getPreferredModels();
  const attempts: ModelAttempt[] = [];

  for (const model of models) {
    const out = await callGatewayStream(apiKey, model, messages);
    if (out.ok && out.response) return { response: out.response, model, attempts };
    attempts.push({ model, status: out.status, body: out.body ?? "" });
  }
  console.error("AI provider fallback failed:", attempts);
  return { response: null, model: null, attempts };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = multiRateLimit(req, "chat", {
    ip: { limit: 20, windowMs: 60_000 },
    user: { limit: 40, windowMs: 60_000 },
    session: { limit: 30, windowMs: 60_000 },
  });
  if (!rl.allowed) return rateLimitedResponse("chat", rl.scope!, rl.ctx, corsHeaders);

  const bodyLimitError = checkBodyLimit(req);
  if (bodyLimitError) return bodyLimitError;

  if (!req.url.includes('/chat/demo')) {
    const tokenError = await verifyTokenInRequest(req, corsHeaders);
    if (tokenError) {
      logRequest({ function_name: "chat", event_type: "unauthorized", status_code: 401, ctx: rl.ctx });
      return tokenError;
    }
  }

  try {
    const { messages, demo, user_id, conversation_id, turnstile_token } = await req.json();
    const safeMessages = sanitizeMessages(messages);
    if (!safeMessages) {
      return new Response(
        JSON.stringify({ error: "Invalid messages payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const safeDemo = !!demo;
    const safeUserId = isUuid(user_id) ? user_id : null;
    const safeConversationId = isUuid(conversation_id) ? conversation_id : null;

    if (safeDemo) {
      const captcha = await verifyTurnstileToken({
        token: String(turnstile_token || ""),
        remoteip: req.headers.get("cf-connecting-ip") ?? undefined,
      });
      if (!captcha.ok) {
        return new Response(
          JSON.stringify({ error: captcha.error || "Captcha validation failed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    let effectiveUserId: string | null = safeUserId;

    if (!safeDemo) {
      if (!safeUserId && !safeConversationId) {
        return new Response(
          JSON.stringify({ error: "user_id or conversation_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (safeConversationId) {
        const { data: convOwner, error: convErr } = await supabase
          .from("conversations")
          .select("user_id")
          .eq("id", safeConversationId)
          .maybeSingle();
        if (convErr || !convOwner?.user_id) {
          return new Response(
            JSON.stringify({ error: "invalid conversation_id" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (safeUserId && safeUserId !== convOwner.user_id) {
          return new Response(
            JSON.stringify({ error: "conversation_id and user_id mismatch" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        effectiveUserId = convOwner.user_id;
      }
    }

    // Enforce billing/chat quotas for non-demo business chats.
    if (!safeDemo && effectiveUserId) {
      const { data: quotaData, error: quotaErr } = await supabase.rpc("consume_chat_quota", { p_user_id: effectiveUserId });
      const quota = (quotaData?.[0] ?? null) as QuotaRow | null;
      if (quotaErr || !quota) {
        console.error("quota check failed:", quotaErr);
        return new Response(
          JSON.stringify({ error: "Unable to validate usage limits. Try again shortly." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!quota.allowed) {
        const reason = quota.reason;
        const errorMessage =
          reason === "trial_expired_payment_required"
            ? "Your 7-day free trial has ended. Upgrade to continue chatting."
            : reason === "subscription_expired_payment_required"
            ? "Your subscription expired. Renew to continue chatting."
            : reason === "plan_expired"
            ? "Your plan expired and free quota is exhausted. Upgrade to continue."
            : "Monthly chat limit reached. Upgrade or wait for reset.";
        return new Response(
          JSON.stringify({
            error: errorMessage,
            limit: {
              plan: quota.plan,
              chats_used: quota.chats_used,
              chats_limit: quota.chats_limit,
              remaining: quota.remaining,
              resets_at: quota.resets_at,
              reason: quota.reason,
            },
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fire-and-forget: detect issue in latest user message and auto-create ticket
    if (!safeDemo && safeConversationId && safeMessages.length) {
      const lastUserMsg = [...safeMessages].reverse().find((m) => m.role === "user");
      if (lastUserMsg?.content) {
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/auto-create-ticket`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ conversation_id: safeConversationId, message: lastUserMsg.content }),
        }).catch((e) => console.error("auto-create-ticket failed:", e));
      }
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("chat misconfiguration: LOVABLE_API_KEY is not set");
      return new Response(
        JSON.stringify({ error: CHAT_UNAVAILABLE_MESSAGE, code: "chat_not_configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let knowledgeContext = "";
    let businessContext = "";
    let websiteDataContext = "";

    if (effectiveUserId && !safeDemo) {
      try {
        const [{ data: profile }, { data: domain }] = await Promise.all([
          supabase
            .from("profiles")
            .select("business_name, welcome_message, website_data")
            .eq("user_id", effectiveUserId)
            .maybeSingle(),
          supabase
            .from("widget_domains")
            .select("origin")
            .eq("user_id", effectiveUserId)
            .eq("is_active", true)
            .eq("is_verified", true)
            .order("last_seen_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const lines: string[] = [];
        if (profile?.business_name) lines.push(`Business name: ${profile.business_name}`);
        if (domain?.origin) lines.push(`Website: ${domain.origin}`);
        if (profile?.welcome_message) lines.push(`Welcome message: ${profile.welcome_message}`);
        if (lines.length) {
          businessContext = `\n\nBusiness profile:\n${lines.map((l) => `- ${l}`).join("\n")}`;
        }
        const websiteData = String(profile?.website_data ?? "").trim();
        if (websiteData) {
          websiteDataContext = `\n\nWebsite data (fallback when knowledge base is empty):\n${websiteData.slice(0, 8000)}`;
        }
      } catch (e) {
        console.error("Failed to fetch profile context:", e);
      }
    }

    // If a user_id is provided, fetch their knowledge base entries for context
    if (effectiveUserId && !safeDemo) {
      try {
        const { data: kbEntries } = await supabase
          .from("knowledge_base")
          .select("title, content")
          .eq("user_id", effectiveUserId)
          .limit(50);

        if (kbEntries && kbEntries.length > 0) {
          knowledgeContext = "\n\nHere is the business's knowledge base. Use this to answer visitor questions accurately:\n\n" +
            kbEntries.map((e: { title?: string; content?: string }) => `### ${e.title}\n${e.content}`).join("\n\n");
        }
      } catch (e) {
        console.error("Failed to fetch knowledge base:", e);
      }
    }

    const fallbackWebsiteInstruction = websiteDataContext
      ? "If the knowledge base context is empty, use the Website data fallback context."
      : "If the knowledge base context is empty, state that business details are currently limited and ask one short clarifying question.";

    const systemPrompt = safeDemo
      ? `You are a friendly demo AI agent for Mobiwave AI, a platform that lets Kenyan businesses add AI chat agents to their websites.
         Answer questions about the product's features: lead capture, email integration, 24/7 AI support, analytics, easy embed.
         Be helpful, concise, and enthusiastic. Use simple language. Keep responses under 100 words.
         If asked about pricing, mention: Free (50 chats/mo), Starter (KES 1,500/mo), Growth (KES 3,500/mo), Enterprise (KES 8,000+/mo).
         Encourage visitors to sign up for free.`
      : `You are a helpful AI assistant for a business website. Answer questions accurately and concisely based on the context provided.
         If a visitor asks for quotes, pricing, contact, or shows purchase intent, politely collect their name and email.
         Keep responses professional and under 150 words.
         If a visitor wants to speak to a human, let them know they can use the "Talk to Human" button below the chat.
         Never use placeholders or template text like "[insert business name]" or "[briefly describe...]".
         ${fallbackWebsiteInstruction}${businessContext}${knowledgeContext}${websiteDataContext}`;

    const result = await callProviderWithFallbackStream(LOVABLE_API_KEY, [
      { role: "system", content: systemPrompt },
      ...safeMessages,
    ]);

    if (!result.response) {
      const last = result.attempts[result.attempts.length - 1];
      if (last?.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("chat model selected:", result.model);
    return new Response(result.response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    const message = e instanceof Error && /(LOVABLE_API_KEY)/.test(e.message)
      ? CHAT_UNAVAILABLE_MESSAGE
      : e instanceof Error
      ? e.message
      : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
