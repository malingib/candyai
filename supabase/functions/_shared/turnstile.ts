export async function verifyTurnstileToken(opts: {
  token: string;
  remoteip?: string;
  idempotencyKey?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  const bypass = String(Deno.env.get("ALLOW_TURNSTILE_BYPASS") || "").toLowerCase() === "true";
  if (!secret) {
    if (bypass) return { ok: true };
    return { ok: false, error: "Turnstile is not configured on server" };
  }

  const token = String(opts.token || "").trim();
  if (!token) return { ok: false, error: "Missing captcha token" };

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (opts.remoteip) form.set("remoteip", opts.remoteip);
  if (opts.idempotencyKey) form.set("idempotency_key", opts.idempotencyKey);

  const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });

  if (!resp.ok) return { ok: false, error: `captcha_verify_http_${resp.status}` };
  const data = await resp.json().catch(() => null) as { success?: boolean; [k: string]: unknown } | null;
  if (!data?.success) return { ok: false, error: "Captcha verification failed" };
  return { ok: true };
}
