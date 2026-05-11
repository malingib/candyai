import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyTokenInRequest } from "../_shared/jwt-verify.ts";
import { multiRateLimit, rateLimitedResponse, logRequest } from "../_shared/rate-limit.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };
type ModelAttempt = { model: string; status: number; body: string };

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

  const rl = multiRateLimit(req, "ai-chat", {
    ip: { limit: 30, windowMs: 60_000 },
    user: { limit: 60, windowMs: 60_000 },
    session: { limit: 40, windowMs: 60_000 },
  });
  if (!rl.allowed) return rateLimitedResponse("ai-chat", rl.scope!, rl.ctx, corsHeaders);

  const tokenError = await verifyTokenInRequest(req, corsHeaders);
  if (tokenError) {
    logRequest({ function_name: "ai-chat", event_type: "unauthorized", status_code: 401, ctx: rl.ctx });
    return tokenError;
  }

  try {
    const { messages } = await req.json();
    const safeMessages = sanitizeMessages(messages);
    if (!safeMessages) {
      return new Response(
        JSON.stringify({ error: "Invalid messages payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const auth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: userData, error: userErr } = await auth.auth.getUser(token);
    const userId = userData?.user?.id;
    if (userErr || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await supabase.from("profiles").select("plan").eq("user_id", userId).single();
    const plan = String(profile?.plan || "free");
    const { data: planCfg } = await supabase.from("billing_plans").select("allow_api_access").eq("plan", plan).maybeSingle();
    if (!planCfg?.allow_api_access) {
      return new Response(JSON.stringify({ error: "API access is available on Premium and Enterprise plans only." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { response, model, attempts } = await callGatewayWithFallback(LOVABLE_API_KEY, [
      {
        role: "system",
        content: `You are Mobiwave AI, a powerful and helpful AI assistant. You can help with coding, writing, analysis, math, brainstorming, and more.
Format your responses using markdown for readability. Use code blocks with language tags for code. Be concise but thorough.`,
      },
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
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI gateway fallback failed:", attempts);
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("ai-chat model selected:", model);
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("AI chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
