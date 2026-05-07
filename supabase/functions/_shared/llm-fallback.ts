type ChatMessage = { role: string; content: string };
import { modelReport, providerBlocked } from "./enterprise-security.ts";

type ProviderConfig = {
  name: "lovable" | "groq" | "openrouter";
  endpoint: string;
  apiKey: string;
  model: string;
  extraHeaders?: Record<string, string>;
};

type ChatOpts = {
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
};

type ChatResult =
  | { ok: true; response: Response; provider: ProviderConfig["name"] }
  | { ok: false; status: number; error: string; provider: ProviderConfig["name"] };

function isRetryable(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function getProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    providers.push({
      name: "lovable",
      endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
      apiKey: lovableKey,
      model: Deno.env.get("LOVABLE_MODEL") || "google/gemini-3-flash-preview",
    });
  }

  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (groqKey) {
    providers.push({
      name: "groq",
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: groqKey,
      model: Deno.env.get("GROQ_MODEL") || "llama-3.1-8b-instant",
    });
  }

  const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
  if (openRouterKey) {
    providers.push({
      name: "openrouter",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: openRouterKey,
      model: Deno.env.get("OPENROUTER_GEMINI_MODEL") || "google/gemini-2.5-flash",
      extraHeaders: {
        "HTTP-Referer": Deno.env.get("OPENROUTER_SITE_URL") || "https://ai.mobiwave.co.ke",
        "X-Title": Deno.env.get("OPENROUTER_APP_NAME") || "Mobiwave AI",
      },
    });
  }

  return providers;
}

async function runWithProvider(p: ProviderConfig, opts: ChatOpts): Promise<ChatResult> {
  if (await providerBlocked(p.name)) {
    return { ok: false, status: 503, error: "provider circuit open", provider: p.name };
  }
  try {
    const resp = await fetch(p.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${p.apiKey}`,
        "Content-Type": "application/json",
        ...(p.extraHeaders || {}),
      },
      body: JSON.stringify({
        model: p.model,
        messages: opts.messages,
        stream: !!opts.stream,
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      await modelReport(p.name, false);
      return { ok: false, status: resp.status, error: txt, provider: p.name };
    }
    await modelReport(p.name, true);
    return { ok: true, response: resp, provider: p.name };
  } catch (e) {
    await modelReport(p.name, false);
    return {
      ok: false,
      status: 599,
      error: e instanceof Error ? e.message : "Network error",
      provider: p.name,
    };
  }
}

export async function chatWithFallback(opts: ChatOpts): Promise<{ response: Response; provider: ProviderConfig["name"] }> {
  const providers = getProviders();
  if (!providers.length) {
    throw new Error("No LLM providers configured. Set LOVABLE_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY.");
  }

  let lastFailure: ChatResult | null = null;

  for (const p of providers) {
    const result = await runWithProvider(p, opts);
    if (result.ok) {
      return { response: result.response, provider: result.provider };
    }
    lastFailure = result;
    console.error(`LLM provider failed [${result.provider}] status=${result.status}:`, result.error);
    if (!isRetryable(result.status)) break;
  }

  throw new Error(lastFailure ? `All providers failed. Last: ${lastFailure.provider} (${lastFailure.status})` : "All providers failed.");
}
