export type RateLimitFailureMode = "open" | "closed";

function normalizeFailMode(value: string | null | undefined): RateLimitFailureMode {
  return String(value || "").toLowerCase() === "closed" ? "closed" : "open";
}

export function isSensitiveRateLimitKey(key: string): boolean {
  return key.startsWith("chat:") || key.startsWith("widget-conversation:") || key.startsWith("ai-chat:");
}

export function resolveRateLimitFailModeFromEnv(
  key: string,
  env: { defaultMode?: string | null; sensitiveMode?: string | null },
  explicitMode?: RateLimitFailureMode,
): RateLimitFailureMode {
  if (explicitMode) return explicitMode;
  const mode = normalizeFailMode(env.defaultMode);
  const sensitiveMode = normalizeFailMode(env.sensitiveMode || "closed");
  if (isSensitiveRateLimitKey(key)) return sensitiveMode;
  return mode;
}

export function maskEmail(value: string): string {
  const email = value.trim();
  const at = email.indexOf("@");
  if (at <= 0 || at === email.length - 1) return "[redacted-email]";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const localMasked = local.length <= 2 ? `${local[0] || "*"}*` : `${local.slice(0, 2)}***`;
  const domainParts = domain.split(".");
  const domainLabel = domainParts[0] || "***";
  const tld = domainParts.length > 1 ? `.${domainParts.slice(1).join(".")}` : "";
  const domainMasked = domainLabel.length <= 2 ? `${domainLabel[0] || "*"}*` : `${domainLabel.slice(0, 2)}***`;
  return `${localMasked}@${domainMasked}${tld}`;
}

export function maskPhone(value: string): string {
  const raw = value.trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "[redacted-phone]";
  if (digits.length <= 4) return `${"*".repeat(Math.max(0, digits.length - 1))}${digits.slice(-1)}`;
  return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}
