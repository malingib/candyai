// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};
import { multiRateLimit, rateLimitedResponse, logRequest } from "../_shared/rate-limit.ts";
import { verifyTokenInRequest } from "../_shared/jwt-verify.ts";
import { verifyTurnstileToken } from "../_shared/turnstile.ts";
import { checkBodyLimit } from "../_shared/body-limit.ts";
import { isUuid, sanitize, errorResponse } from "../_shared/utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const CHAT_UNAVAILABLE_MESSAGE = "Demo AI is temporarily unavailable. Please contact support or try again later.";

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };
type ModelAttempt = { provider: string; model: string; status: number; body: string };
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

const INJECTION_PATTERNS = [
  /ignore all previous instructions/i,
  /system prompt/i,
  /reveal your instructions/i,
  /you are now a/i,
  /bypass/i,
  /sql injection/i,
  /drop table/i,
  /<script>/i,
];

function detectInjection(content: string): boolean {
  return INJECTION_PATTERNS.some(pattern => pattern.test(content));
}

function sanitizeMessages(input: unknown, maxMessages = 30, maxChars = 4000): ChatMessage[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > maxMessages) return null;
  const out: ChatMessage[] = [];
  for (const m of input) {
    if (!m || typeof m !== "object") return null;
    const role = (m as Record<string, unknown>).role;
    const content = (m as Record<string, unknown>).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const cleaned = sanitize(content, maxChars);
    if (!cleaned) continue;
    out.push({ role, content: cleaned });
  }
  return out.length ? out : null;
}

function isPricingIntent(text: string): boolean {
  const t = text.toLowerCase();
  return /\b(price|pricing|quote|cost|rate|rates|package|packages|sms)\b/.test(t);
}

function extractSmsPricingFacts(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const facts: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/(ksh\.?|kes)\s*\d+(\.\d+)?\s*per\s*sms/i.test(line)) continue;

    // try to include nearest package/range context
    let packageName = "";
    let range = "";
    for (let j = Math.max(0, i - 5); j < i; j++) {
      if (!packageName && /(small|medium|large|enterprise)\s+business/i.test(lines[j])) {
        packageName = lines[j];
      }
      if (!range && /\d[\d,]*\s*-\s*\d[\d,]*\s*sms/i.test(lines[j])) {
        range = lines[j];
      }
      if (!range && /above\s+\d[\d,]*\s*sms/i.test(lines[j])) {
        range = lines[j];
      }
    }

    const composed = [packageName, line, range].filter(Boolean).join(" | ");
    facts.push(composed || line);
    if (facts.length >= 6) break;
  }
  return Array.from(new Set(facts));
}

function getPreferredModels(): string[] {
  const raw = Deno.env.get("FREE_AI_MODELS");
  if (!raw) return ["google/gemini-2.0-flash", "groq/llama-3.1-8b-instant"];
  return raw.split(",").map((m: string) => m.trim()).filter(Boolean);
}

function getProviderConfigs(): Array<{ name: string; url: string; token: string | null }> {
  const providers: Array<{ name: string; url: string; token: string | null }> = [];
  const proxyUrl = String(Deno.env.get("LOVABLE_PROXY_URL") ?? "").trim();
  if (proxyUrl) {
    providers.push({
      name: "lovable_proxy",
      url: proxyUrl,
      token: String(Deno.env.get("LOVABLE_PROXY_TOKEN") ?? "").trim() || null,
    });
  }

  const apiKey = String(Deno.env.get("LOVABLE_API_KEY") ?? "").trim();
  if (apiKey) {
    providers.push({
      name: "lovable_gateway",
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      token: apiKey,
    });
  }
  return providers;
}

function toSseResponse(content: string): Response {
  const payload =
    `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n` +
    "data: [DONE]\n\n";
  return new Response(payload, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function callGeminiFallback(messages: Array<{ role: string; content: string }>): Promise<{ ok: boolean; text?: string; status: number; body?: string }> {
  const geminiKey = String(Deno.env.get("GEMINI_API_KEY") ?? "").trim();
  if (!geminiKey) return { ok: false, status: 503, body: "GEMINI_API_KEY missing" };

  const prompt = messages
    .map((m) => `${m.role === "assistant" ? "Assistant" : m.role === "system" ? "System" : "User"}: ${m.content}`)
    .join("\n\n");

  const model = "gemini-2.0-flash";
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    return { ok: false, status: resp.status, body: body.slice(0, 600) };
  }
  const data = await resp.json().catch(() => null);
  const text = String(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
  if (!text) return { ok: false, status: 502, body: "empty Gemini response" };
  return { ok: true, text, status: 200 };
}

async function callGroqFallback(messages: Array<{ role: string; content: string }>): Promise<{ ok: boolean; text?: string; status: number; body?: string }> {
  const groqKey = String(Deno.env.get("GROQ_API_KEY") ?? "").trim();
  if (!groqKey) return { ok: false, status: 503, body: "GROQ_API_KEY missing" };

  const compactMessages = messages
    .filter((m) => m.role === "system" || m.role === "user" || m.role === "assistant")
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 500) }));

  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: compactMessages,
      temperature: 0.7,
      stream: false,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    return { ok: false, status: resp.status, body: body.slice(0, 600) };
  }
  const data = await resp.json().catch(() => null);
  const text = String(data?.choices?.[0]?.message?.content ?? "").trim();
  if (!text) return { ok: false, status: 502, body: "empty Groq response" };
  return { ok: true, text, status: 200 };
}

async function callGatewayStream(
  providerName: string,
  providerUrl: string,
  providerToken: string | null,
  model: string,
  messages: Array<{ role: string; content: string }>,
): Promise<{ ok: boolean; response?: Response; status: number; body?: string; provider: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (providerToken) headers.Authorization = `Bearer ${providerToken}`;

  const resp = await fetch(providerUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages, temperature: 0.7, stream: true }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    return { ok: false, status: resp.status, body: body.slice(0, 600), provider: providerName };
  }
  return { ok: true, response: resp, status: 200, provider: providerName };
}

async function callProviderWithFallbackStream(
  providers: Array<{ name: string; url: string; token: string | null }>,
  messages: Array<{ role: string; content: string }>,
): Promise<StreamResult> {
  const models = getPreferredModels();
  const attempts: ModelAttempt[] = [];

  for (const provider of providers) {
    for (const model of models) {
      const out = await callGatewayStream(provider.name, provider.url, provider.token, model, messages);
      if (out.ok && out.response) return { response: out.response, model, attempts };
      attempts.push({ provider: out.provider, model, status: out.status, body: out.body ?? "" });
    }
  }
  console.error("AI provider fallback failed:", attempts);
  return { response: null, model: null, attempts };
}

serve(async (req: Request) => {
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

  const url = new URL(req.url);
  const isDemoRoute = url.pathname.endsWith('/chat/demo') || url.pathname.endsWith('/chat/demo/');

  if (!isDemoRoute) {
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
      return errorResponse("Invalid messages payload", 400, undefined, corsHeaders);
    }

    // Detect potential prompt injection
    const lastMsg = safeMessages[safeMessages.length - 1];
    if (lastMsg.role === "user" && detectInjection(lastMsg.content)) {
      logRequest({
        function_name: "chat",
        event_type: "error",
        status_code: 400,
        ctx: rl.ctx,
        message: "Potential prompt injection detected",
        metadata: { content: lastMsg.content.slice(0, 100) }
      });
      return toSseResponse("I'm sorry, I cannot process that request for security reasons.");
    }

    // Limit message length to avoid context window explosion
    const truncatedMessages = safeMessages.map(m => ({
      ...m,
      content: m.content.slice(0, 4000)
    }));
    const safeDemo = !!demo;
    const safeUserId = isUuid(user_id) ? user_id : null;
    const safeConversationId = isUuid(conversation_id) ? conversation_id : null;

    if (safeDemo) {
      const captcha = await verifyTurnstileToken({
        token: String(turnstile_token || ""),
        remoteip: req.headers.get("cf-connecting-ip") ?? undefined,
      });
      if (!captcha.ok) {
        return errorResponse(captcha.error || "Captcha validation failed", 400, undefined, corsHeaders);
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    let effectiveUserId: string | null = safeUserId;

    if (!safeDemo) {
      if (!safeUserId && !safeConversationId) {
        return errorResponse("user_id or conversation_id is required", 400, undefined, corsHeaders);
      }

      if (safeConversationId) {
        const { data: convOwner, error: convErr } = await supabase
          .from("conversations")
          .select("user_id")
          .eq("id", safeConversationId)
          .maybeSingle();
        if (convErr || !convOwner?.user_id) {
          return errorResponse("invalid conversation_id", 403, undefined, corsHeaders);
        }
        if (safeUserId && safeUserId !== convOwner.user_id) {
          return errorResponse("conversation_id and user_id mismatch", 403, undefined, corsHeaders);
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
        return errorResponse("Unable to validate usage limits. Try again shortly.", 500, undefined, corsHeaders);
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
    if (!safeDemo && safeConversationId && truncatedMessages.length) {
      const lastUserMsg = [...truncatedMessages].reverse().find((m) => m.role === "user");
      if (lastUserMsg?.content) {
        const adminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const internalUrl = Deno.env.get("SUPABASE_URL");
        if (adminKey && internalUrl) {
          fetch(`${internalUrl}/functions/v1/auto-create-ticket`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${adminKey}`,
              apikey: adminKey,
            },
            body: JSON.stringify({ conversation_id: safeConversationId, message: lastUserMsg.content }),
          }).catch((e) => console.error("auto-create-ticket failed:", e));
        }
      }
    }
    const providers = getProviderConfigs();

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
        const websiteData = sanitize(profile?.website_data ?? "", 8000);
        if (websiteData) {
          websiteDataContext = `\n\nWebsite data (fallback when knowledge base is empty):\n${websiteData}`;
        }
      } catch (e) {
        console.error("Failed to fetch profile context:", e);
      }
    }

    // If a user_id is provided, perform vector search for relevant context
    if (effectiveUserId && !safeDemo && truncatedMessages.length) {
      try {
        const lastUserMsg = [...truncatedMessages].reverse().find((m) => m.role === "user");
        if (lastUserMsg?.content) {
          // Get embedding for the query
          const apiKey = Deno.env.get("LOVABLE_API_KEY");
          const embeddingResp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "text-embedding-3-small",
              input: lastUserMsg.content,
            }),
          });

          if (embeddingResp.ok) {
            const { data: [{ embedding }] } = await embeddingResp.json();

            // Search for matches
            const { data: matches, error: matchErr } = await supabase.rpc("match_kb_embeddings", {
              query_embedding: embedding,
              match_threshold: 0.7,
              match_count: 5,
              p_user_id: effectiveUserId,
            });

            if (!matchErr && matches && matches.length > 0) {
              knowledgeContext = "\n\nRelevant business information:\n\n" +
                matches.map((m: { content: string }) => `- ${sanitize(m.content, 2000)}`).join("\n\n");
            }
          }
        }

        // Fallback to basic KB if no vector matches or embedding failed
        if (!knowledgeContext) {
          const { data: kbEntries } = await supabase
            .from("knowledge_base")
            .select("title, content")
            .eq("user_id", effectiveUserId)
            .limit(10);

          if (kbEntries && kbEntries.length > 0) {
            knowledgeContext = "\n\nBusiness knowledge base:\n\n" +
              kbEntries.map((e: { title?: string; content?: string }) => `### ${sanitize(e.title, 200)}\n${sanitize(e.content, 2000)}`).join("\n\n");
          }
        }
      } catch (e) {
        console.error("RAG search failed:", e);
      }
    }

    const lastUserMessage = [...truncatedMessages].reverse().find((m) => m.role === "user")?.content ?? "";
    const pricingFacts = websiteDataContext ? extractSmsPricingFacts(websiteDataContext) : [];
    const pricingGuardInstruction = isPricingIntent(lastUserMessage) && pricingFacts.length
      ? `\n\nPricing facts from this business context (use exactly these values, no conversions):\n${pricingFacts.map((f) => `- ${f}`).join("\n")}\nDo not output cents-based pricing unless cents are explicitly present in these facts.`
      : "";

    const fallbackWebsiteInstruction = websiteDataContext
      ? "If the knowledge base context is empty, use the Website data fallback context."
      : "If the knowledge base context is empty, state that business details are currently limited. Do NOT ask clarifying questions unless absolutely necessary for the core query.";

    const systemPrompt = safeDemo
      ? `You are a friendly demo AI agent for Mobiwave AI, a platform that lets Kenyan businesses add AI chat agents to their websites.
         Answer questions about the product's features: lead capture, email integration, 24/7 AI support, analytics, easy embed.
         Be helpful, concise, and enthusiastic. Use simple language and short natural sentences. Keep responses under 100 words.
         If asked about pricing, mention: Free (50 chats/mo), Starter (KES 1,500/mo), Growth (KES 3,500/mo), Enterprise (KES 8,000+/mo).
         Encourage visitors to sign up for free.`
      : `You are a proactive Business Operations Assistant for a business website. Your goal is to be helpful, drive sales, and resolve support issues.
         Sound natural, warm, and human (not robotic). Use English, Swahili, or Sheng based on the visitor's language.

         OBJECTIVES:
         1. Support: Answer questions accurately and concisely based ONLY on the context provided.
         2. Conversion: If a visitor shows purchase intent or asks for a quote, capture their name and contact info naturally.
         3. Automation: If a visitor reports an issue or problem, reassure them that you are creating a support ticket for the team.
         4. Handoff: If the visitor wants a human or has a complex request, encourage them to use the WhatsApp button or leave their number.

         Source of Truth: Treat the provided business context, knowledge base, and website data as absolute facts.
         Never invent prices, currencies, phone numbers, emails, or policy details.
         If exact pricing isn't in context, don't guess. Say pricing depends on requirements and offer to have an agent follow up.

         Tone & Style:
         - Warm, conversational, professional.
         - Short paragraphs, max 150 words.
         - Structure: Direct answer first, then 1-2 supporting details.
         - Use formatting (max 4 bullets) only if helpful.
         - Avoid stiff "AI assistant" phrases or placeholders.

         ${fallbackWebsiteInstruction}${pricingGuardInstruction}${businessContext}${knowledgeContext}${websiteDataContext}`;

    const requestMessages = [
      { role: "system", content: systemPrompt },
      ...truncatedMessages,
    ];


    const result = await callProviderWithFallbackStream(providers, requestMessages);

    // Perform critical async tasks (Sentiment, Lead extraction, Ticket creation)
    if (!safeDemo && safeConversationId) {
      const lastMsg = truncatedMessages[truncatedMessages.length - 1];
      if (lastMsg && lastMsg.role === "user") {
        const apiKey = Deno.env.get("LOVABLE_API_KEY");
        if (apiKey) {
          (async () => {
            try {
              // Analyze message for Sentiment, Leads, and Issues in one pass
              const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  model: "google/gemini-2.0-flash",
                  messages: [
                    {
                      role: "system",
                      content: `Extract information from the user message.
                      Reply with a JSON object containing:
                      - sentiment: "positive" | "neutral" | "negative"
                      - leads: object with optional name, email, phone
                      - is_issue: boolean (true if user reports a problem/bug/complaint)
                      Only include fields that are found. No explanation.`
                    },
                    { role: "user", content: lastMsg.content }
                  ],
                  temperature: 0,
                  response_format: { type: "json_object" }
                }),
              });

              if (r.ok) {
                const data = await r.json();
                const analysis = JSON.parse(data.choices[0].message.content);

                // 1. Update Sentiment
                if (analysis.sentiment) {
                  await supabase.from("conversations").update({ sentiment: analysis.sentiment }).eq("id", safeConversationId);
                }

                // 2. Fluid Lead Capture
                if (analysis.leads && (analysis.leads.name || analysis.leads.email || analysis.leads.phone)) {
                  const { data: profile } = await supabase.from("profiles").select("user_id").eq("user_id", effectiveUserId).single();
                  if (profile) {
                    await supabase.from("leads").upsert({
                      user_id: profile.user_id,
                      conversation_id: safeConversationId,
                      name: analysis.leads.name,
                      email: analysis.leads.email,
                      phone: analysis.leads.phone,
                      notes: "Extracted from chat context."
                    }, { onConflict: 'conversation_id' });
                  }
                }

                // 3. Action AI: Auto-create Ticket
                if (analysis.is_issue) {
                  const adminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
                  const internalUrl = Deno.env.get("SUPABASE_URL");
                  if (adminKey && internalUrl) {
                    await fetch(`${internalUrl}/functions/v1/auto-create-ticket`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${adminKey}`,
                        apikey: adminKey,
                      },
                      body: JSON.stringify({
                        conversation_id: safeConversationId,
                        message: lastMsg.content
                      }),
                    });
                  }
                }
              }
            } catch (e) {
              console.error("Async background tasks failed:", e);
            }
          })();
        }
      }
    }

    if (!result.response) {
      const last = result.attempts[result.attempts.length - 1];
      if (last?.status === 429) {
        return errorResponse("Rate limit exceeded. Please try again later.", 429, undefined, corsHeaders);
      }
      const gemini = await callGeminiFallback(requestMessages);
      if (gemini.ok && gemini.text) {
        console.log("chat model selected: gemini-fallback");
        return toSseResponse(gemini.text);
      }
      const groq = await callGroqFallback(requestMessages);
      if (groq.ok && groq.text) {
        console.log("chat model selected: groq-fallback");
        return toSseResponse(groq.text);
      }
      return errorResponse("AI service unavailable", 500, undefined, corsHeaders);
    }

    console.log("chat model selected:", result.model);
    return new Response(result.response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    const message = e instanceof Error && /(LOVABLE_API_KEY|LOVABLE_PROXY_URL)/.test(e.message)
      ? CHAT_UNAVAILABLE_MESSAGE
      : e instanceof Error
      ? e.message
      : "Unknown error";
    return errorResponse(message, 500, undefined, corsHeaders);
  }
});
