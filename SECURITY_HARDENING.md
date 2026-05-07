# Enterprise Security & Performance Hardening

Implemented controls mapped to requested items:

1. Distributed rate limiting: `rl_consume` RPC + `distributedRateLimit` in chat/widget/ai-chat with configurable fail mode (`RATE_LIMIT_FAILURE_MODE`) and sensitive-endpoint override (`SENSITIVE_RATE_LIMIT_FAILURE_MODE`, defaults to `closed`).
2. Moderation/classifier: static + DB deny patterns (`security_denylists`) in `moderateInput`.
3. Signed widget sessions: HMAC token from `widget-conversation:start`, verified on message/chat/lead actions.
4. DB constraints/RLS hardening: restricted security tables/functions to `service_role`, bounded allowlist count.
5. Encryption support for PII: lead encrypted columns (`email_enc`, `phone_enc`) + key id metadata; plaintext lead `email`/`phone` writes replaced with masked values.
6. Audit + SIEM: `audit_events` + `logAudit` + optional `SIEM_WEBHOOK_URL` forwarding.
7. Output guardrails: secret redaction and trim in `guardrailOutput`.
8. Budget controls + circuit breakers: `consume_inference_budget`, `model_health`, provider block windows.
9. Tenant-safe inference cache: `inference_cache` keyed by user/model/prompt hash.
10. Red-team tests: `src/test/redteam-security.test.ts` for allowlist and sanitization baseline.

## Required environment variables

- `WIDGET_SIGNING_SECRET`
- `SIEM_WEBHOOK_URL` (optional)
- `MODEL_FAILURE_THRESHOLD` (optional, default 5)
- `MODEL_BLOCK_SECONDS` (optional, default 120)
- `RATE_LIMIT_FAILURE_MODE` (optional, default `open`)
- `SENSITIVE_RATE_LIMIT_FAILURE_MODE` (optional, default `closed`)

Existing LLM vars retained:
- `LOVABLE_API_KEY`
- `GROQ_API_KEY`
- `OPENROUTER_API_KEY`

## Recommended ops

- Run periodic housekeeping/reset schedules:
  - Preferred: migration installs `pg_cron` jobs when available.
  - Fallback SQL for external scheduler:
    - `SELECT public.security_housekeeping();` hourly
    - `SELECT public.reset_monthly_quotas();` monthly on day 1
- Configure profile-level `allowed_origins` for every tenant.
- Keep `strict_website_context = true` for customer-facing bots.
