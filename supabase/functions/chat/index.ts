import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { multiRateLimit, rateLimitedResponse, logRequest } from "../_shared/rate-limit.ts";
import { verifyTokenInRequest } from "../_shared/jwt-verify.ts";
import { verifyTurnstileToken } from "../_shared/turnstile.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };
type ModelAttempt = { model: string; status: number; body: string };
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
  if (!raw) return ["google/gemini-3-flash-preview", "groq/llama-3.1-8b-instant"];
  return raw.split(",").map((m) => m.trim()).filter(Boolean);
}

async function callGatewayWithFallback(apiKey: string, messages: Array<{ role: string; content: string }>) {
  const models = getPreferredModels();
  const attempts: ModelAttempt[] = [];
  for (const model of models) {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, stream: true }),
    });
    if (resp.ok) return { response: resp, model, attempts };
    const body = await resp.text().catch(() => "");
    attempts.push({ model, status: resp.status, body: body.slice(0, 600) });
  }
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

  if (!req.url.includes('/chat/demo')) {
    const tokenError = await verifyTokenInRequest(req);
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

    // Enforce billing/chat quotas for non-demo business chats.
    if (!safeDemo && safeUserId) {
      const { data: quotaData, error: quotaErr } = await supabase.rpc("consume_chat_quota", { p_user_id: safeUserId });
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
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let knowledgeContext = "";

    // If a user_id is provided, fetch their knowledge base entries for context
    if (safeUserId && !safeDemo) {
      try {
        const { data: kbEntries } = await supabase
          .from("knowledge_base")
          .select("title, content")
          .eq("user_id", safeUserId)
          .limit(50);

        if (kbEntries && kbEntries.length > 0) {
          knowledgeContext = "\n\nHere is the business's knowledge base. Use this to answer visitor questions accurately:\n\n" +
            kbEntries.map((e: { title?: string; content?: string }) => `### ${e.title}\n${e.content}`).join("\n\n");
        }
      } catch (e) {
        console.error("Failed to fetch knowledge base:", e);
      }
    }

    const systemPrompt = safeDemo
      ? `You are a friendly demo AI agent for Mobiwave AI, a platform that lets Kenyan businesses add AI chat agents to their websites.
         Answer questions about the product's features: lead capture, email integration, 24/7 AI support, analytics, easy embed.
         Be helpful, concise, and enthusiastic. Use simple language. Keep responses under 100 words.
         If asked about pricing, mention: Free (50 chats/mo), Starter (KES 1,500/mo), Growth (KES 3,500/mo), Enterprise (KES 8,000+/mo).
         Encourage visitors to sign up for free.`
      : `You are a helpful AI assistant for a business website. Answer questions accurately and concisely based on the context provided.
         If a visitor asks for quotes, pricing, contact, or shows purchase intent, politely collect their name and email.
         Keep responses professional and under 150 words.
         If a visitor wants to speak to a human, let them know they can use the "Talk to Human" button below the chat.${knowledgeContext}`;

    const { response, model, attempts } = await callGatewayWithFallback(LOVABLE_API_KEY, [
      { role: "system", content: systemPrompt },
      ...safeMessages,
    ]);

    if (!response || !response.ok) {
      const last = attempts[attempts.length - 1];
      if (last?.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (last?.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI gateway fallback failed:", attempts);
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("chat model selected:", model);
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
