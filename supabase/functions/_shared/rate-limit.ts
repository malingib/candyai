// Simple in-memory IP rate limiter for edge functions.
// Note: each edge-function instance has its own memory, so this is best-effort
// (not a hard distributed limit). Good enough to throttle abuse from a single IP.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip")
    || req.headers.get("x-real-ip")
    || "unknown";
}

/**
 * Returns null if allowed, or a Response (HTTP 429) if rate-limited.
 * @param key       Unique key (e.g. `${functionName}:${ip}`)
 * @param limit     Max requests per window
 * @param windowMs  Window length in milliseconds
 * @param corsHeaders CORS headers to include in 429 response
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  corsHeaders: Record<string, string>
): Response | null {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // opportunistic cleanup
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
    }
    return null;
  }

  if (bucket.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return new Response(
      JSON.stringify({ error: "Too many requests. Please slow down." }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  bucket.count += 1;
  return null;
}
