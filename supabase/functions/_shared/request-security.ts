export function clamp(s: unknown, max: number): string {
  return String(s ?? "").slice(0, max);
}

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export function extractOrigin(req: Request): string {
  const origin = req.headers.get("origin")?.trim();
  if (origin) return origin;
  const referer = req.headers.get("referer")?.trim();
  if (!referer) return "";
  try {
    return new URL(referer).origin;
  } catch {
    return "";
  }
}

export function normalizeOrigin(value: string): string {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return "";
  }
}

export function isAllowedOrigin(origin: string, allowlist: string[]): boolean {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;
  const normalizedAllow = allowlist.map(normalizeOrigin).filter(Boolean);
  return normalizedAllow.includes(normalizedOrigin);
}

export function sanitizeUserMessage(input: unknown, maxLen = 4000): string {
  const v = clamp(input, maxLen).replace(/\u0000/g, "").trim();
  return v;
}
