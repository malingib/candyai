// Multi-key in-memory rate limiter + structured request logging.
// Each instance has its own memory (best-effort throttle, not distributed).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip")
    || req.headers.get("x-real-ip")
    || "unknown";
}

export function getSessionId(req: Request): string | null {
  return req.headers.get("x-session-id");
}

export function getUserIdFromAuth(req: Request): string | null {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const parts = auth.substring(7).split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch { return null; }
}

function check(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
    }
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

// Legacy single-key API
export function rateLimit(
  key: string, limit: number, windowMs: number, corsHeaders: Record<string, string>
): Response | null {
  if (check(key, limit, windowMs)) return null;
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down." }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } }
  );
}

export type LimitConfig = {
  ip?: { limit: number; windowMs: number };
  user?: { limit: number; windowMs: number };
  session?: { limit: number; windowMs: number };
};

export type LimitContext = {
  ip: string;
  userId: string | null;
  sessionId: string | null;
};

export type LimitResult = {
  allowed: boolean;
  scope?: "ip" | "user" | "session";
  ctx: LimitContext;
};

/** Multi-scope check (IP + user + session). Returns first scope that fails. */
export function multiRateLimit(
  req: Request, fnName: string, cfg: LimitConfig
): LimitResult {
  const ip = getClientIp(req);
  const userId = getUserIdFromAuth(req);
  const sessionId = getSessionId(req);
  const ctx = { ip, userId, sessionId };

  if (cfg.ip && !check(`${fnName}:ip:${ip}`, cfg.ip.limit, cfg.ip.windowMs)) {
    return { allowed: false, scope: "ip", ctx };
  }
  if (cfg.user && userId && !check(`${fnName}:user:${userId}`, cfg.user.limit, cfg.user.windowMs)) {
    return { allowed: false, scope: "user", ctx };
  }
  if (cfg.session && sessionId && !check(`${fnName}:session:${sessionId}`, cfg.session.limit, cfg.session.windowMs)) {
    return { allowed: false, scope: "session", ctx };
  }
  return { allowed: true, ctx };
}

// Lazy admin client for log writes
let _admin: ReturnType<typeof createClient> | null = null;
function admin() {
  if (_admin) return _admin;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  _admin = createClient(url, key, { auth: { persistSession: false } });
  return _admin;
}

export type LogEvent = {
  function_name: string;
  event_type: "rate_limited" | "error" | "success" | "unauthorized";
  status_code?: number;
  ctx?: Partial<LimitContext>;
  scope?: string;
  message?: string;
  metadata?: Record<string, unknown>;
};

/** Fire-and-forget structured log to request_logs. Never throws. */
export function logRequest(ev: LogEvent): void {
  const c = admin();
  if (!c) return;
  // Only persist non-success by default to limit volume; success counted via metadata if needed
  if (ev.event_type === "success") return;
  c.from("request_logs").insert({
    function_name: ev.function_name,
    event_type: ev.event_type,
    status_code: ev.status_code ?? null,
    ip: ev.ctx?.ip ?? null,
    user_id: ev.ctx?.userId ?? null,
    session_id: ev.ctx?.sessionId ?? null,
    scope: ev.scope ?? null,
    message: ev.message ?? null,
    metadata: ev.metadata ?? {},
  }).then(({ error }) => {
    if (error) console.error("logRequest failed:", error.message);
  });
}

/** Build a 429 response and log it. */
export function rateLimitedResponse(
  fnName: string, scope: string, ctx: LimitContext, corsHeaders: Record<string, string>
): Response {
  logRequest({
    function_name: fnName, event_type: "rate_limited", status_code: 429,
    scope, ctx, message: `rate limit exceeded on ${scope}`,
  });
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down.", scope }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } }
  );
}
