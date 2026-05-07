import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { maskEmail, maskPhone, resolveRateLimitFailModeFromEnv, type RateLimitFailureMode } from "./security-utils.ts";
export { maskEmail, maskPhone };

export type ModerationResult = { ok: boolean; reason?: string; severity?: "low" | "medium" | "high" };

export function estimateTokens(messages: { content: string }[]): number {
  const chars = messages.reduce((n, m) => n + (m.content?.length || 0), 0);
  return Math.ceil(chars / 4);
}

export function resolveRateLimitFailMode(key: string, explicitMode?: RateLimitFailureMode): RateLimitFailureMode {
  return resolveRateLimitFailModeFromEnv(
    key,
    {
      defaultMode: Deno.env.get("RATE_LIMIT_FAILURE_MODE"),
      sensitiveMode: Deno.env.get("SENSITIVE_RATE_LIMIT_FAILURE_MODE"),
    },
    explicitMode,
  );
}

export async function distributedRateLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
  corsHeaders: Record<string, string>;
  failMode?: RateLimitFailureMode;
}): Promise<Response | null> {
  const mode = resolveRateLimitFailMode(opts.key, opts.failMode);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await supabase.rpc("rl_consume", {
    p_key: opts.key,
    p_limit: opts.limit,
    p_window_ms: opts.windowMs,
  });
  if (error) {
    console.error("distributedRateLimit error", error, { key: opts.key, failMode: mode });
    if (mode === "closed") {
      return new Response(JSON.stringify({ error: "Rate-limit service unavailable. Please retry shortly." }), {
        status: 503,
        headers: {
          ...opts.corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": "5",
        },
      });
    }
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
      status: 429,
      headers: {
        ...opts.corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(row?.retry_after_seconds || 30),
      },
    });
  }
  return null;
}

export async function checkBudget(userId: string, estimatedTokens: number): Promise<boolean> {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await supabase.rpc("consume_inference_budget", {
    p_user_id: userId,
    p_tokens: estimatedTokens,
  });
  if (error) {
    console.error("checkBudget error", error);
    return false;
  }
  return !!data;
}

export async function logAudit(input: {
  userId?: string | null;
  type: string;
  severity?: "info" | "warn" | "high";
  source: string;
  ip?: string;
  origin?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  await supabase.rpc("log_audit_event", {
    p_user_id: input.userId || null,
    p_event_type: input.type,
    p_severity: input.severity || "info",
    p_source: input.source,
    p_ip: input.ip || null,
    p_origin: input.origin || null,
    p_metadata: input.metadata || {},
  });

  const webhook = Deno.env.get("SIEM_WEBHOOK_URL");
  if (webhook) {
    fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ts: new Date().toISOString(),
        ...input,
      }),
    }).catch(() => undefined);
  }
}

const STATIC_DENY_PATTERNS = [
  /ignore\s+all\s+previous\s+instructions/i,
  /reveal\s+(the\s+)?system\s+prompt/i,
  /show\s+api\s+key/i,
  /export\s+all\s+customer\s+data/i,
  /drop\s+table/i,
];

export async function moderateInput(text: string): Promise<ModerationResult> {
  for (const p of STATIC_DENY_PATTERNS) {
    if (p.test(text)) return { ok: false, reason: "policy_denied_pattern", severity: "high" };
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await supabase.from("security_denylists").select("pattern, kind, severity").eq("enabled", true).limit(200);
  for (const row of data || []) {
    if (row.kind === "regex") {
      try {
        const rx = new RegExp(row.pattern, "i");
        if (rx.test(text)) return { ok: false, reason: "tenant_denied_pattern", severity: (row.severity as any) || "high" };
      } catch {
        // ignore invalid regex
      }
    }
  }

  return { ok: true };
}

export function guardrailOutput(text: string): string {
  let out = text;
  // Redact obvious secret-like material
  out = out.replace(/(sk-[a-zA-Z0-9_-]{16,})/g, "[REDACTED_KEY]");
  out = out.replace(/(AIza[0-9A-Za-z\-_]{20,})/g, "[REDACTED_KEY]");
  // Trim bloat
  if (out.length > 6000) out = out.slice(0, 6000) + "\n\n[Response trimmed for safety]";
  return out;
}

export async function cacheGet(userId: string, key: string): Promise<string | null> {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await supabase
    .from("inference_cache")
    .select("response_text, expires_at")
    .eq("user_id", userId)
    .eq("key", key)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return data?.response_text || null;
}

export async function cachePut(userId: string, key: string, model: string, responseText: string, tokenCost: number, ttlSec = 120) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const expires = new Date(Date.now() + ttlSec * 1000).toISOString();
  await supabase.from("inference_cache").upsert({
    key,
    user_id: userId,
    model,
    response_text: responseText,
    token_cost: tokenCost,
    expires_at: expires,
  });
}

export async function modelReport(provider: string, success: boolean) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  if (success) {
    await supabase.rpc("model_success", { p_provider: provider });
  } else {
    await supabase.rpc("model_failure", {
      p_provider: provider,
      p_threshold: Number(Deno.env.get("MODEL_FAILURE_THRESHOLD") || "5"),
      p_block_seconds: Number(Deno.env.get("MODEL_BLOCK_SECONDS") || "120"),
    });
  }
}

export async function providerBlocked(provider: string): Promise<boolean> {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await supabase.from("model_health").select("blocked_until").eq("provider", provider).maybeSingle();
  if (!data?.blocked_until) return false;
  return new Date(data.blocked_until).getTime() > Date.now();
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToHex(data: Uint8Array): string {
  return Array.from(data).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function encryptPII(value: string): Promise<string | null> {
  const keyB64 = Deno.env.get("PII_ENCRYPTION_KEY_B64") || "";
  if (!keyB64 || !value) return null;
  try {
    const raw = b64ToBytes(keyB64);
    const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder().encode(value);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc));
    const merged = new Uint8Array(iv.length + ct.length);
    merged.set(iv, 0);
    merged.set(ct, iv.length);
    return `\\\\x${bytesToHex(merged)}`; // postgres bytea hex input
  } catch {
    return null;
  }
}

export function hmacHex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  return crypto.subtle
    .importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    .then((k) => crypto.subtle.sign("HMAC", k, enc.encode(payload)))
    .then((sig) => Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join(""));
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function signWidgetToken(payload: Record<string, unknown>): Promise<string> {
  const secret = Deno.env.get("WIDGET_SIGNING_SECRET") || "";
  if (!secret) return "";
  const body = JSON.stringify(payload);
  const sig = await hmacHex(secret, body);
  return btoa(body) + "." + sig;
}

export async function verifyWidgetToken(token: string, expected: { business_id: string; conversation_id?: string | null }): Promise<boolean> {
  const secret = Deno.env.get("WIDGET_SIGNING_SECRET") || "";
  if (!secret) return false;
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return false;
  const body = atob(b64);
  const expectedSig = await hmacHex(secret, body);
  if (!timingSafeEqual(expectedSig, sig)) return false;
  const parsed = JSON.parse(body);
  if (parsed.business_id !== expected.business_id) return false;
  if (expected.conversation_id && parsed.conversation_id !== expected.conversation_id) return false;
  if (parsed.exp && Number(parsed.exp) < Date.now()) return false;
  return true;
}

export async function parseVerifiedWidgetToken(token: string): Promise<{ business_id: string; conversation_id?: string; exp?: number } | null> {
  const secret = Deno.env.get("WIDGET_SIGNING_SECRET") || "";
  if (!secret) return null;
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  const body = atob(b64);
  const expectedSig = await hmacHex(secret, body);
  if (!timingSafeEqual(expectedSig, sig)) return null;
  const parsed = JSON.parse(body);
  if (!parsed?.business_id || typeof parsed.business_id !== "string") return null;
  if (parsed.exp && Number(parsed.exp) < Date.now()) return null;
  return {
    business_id: parsed.business_id,
    conversation_id: typeof parsed.conversation_id === "string" ? parsed.conversation_id : undefined,
    exp: typeof parsed.exp === "number" ? parsed.exp : undefined,
  };
}
