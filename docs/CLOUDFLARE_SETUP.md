# Cloudflare Free Setup (Mobiwave)

Scope: performance + security + reliability on Cloudflare free features.

## 1) One-time dashboard tasks (manual)

1. Create/sign in to Cloudflare account.
2. Add `mobiwave.co.ke` zone and switch nameservers at registrar.
3. Ensure `ai.mobiwave.co.ke` DNS record is `Proxied` (orange cloud).
4. In SSL/TLS:
   - Set encryption mode to `Full (strict)`.
   - Enable `Always Use HTTPS`.
   - Minimum TLS version `1.2` (or higher if your clients allow).
5. In Security:
   - Enable WAF managed rules available to your plan.
   - Keep DDoS protection enabled (default at edge).
6. In Web Analytics:
   - Add site and copy the analytics token into `.env` as `VITE_CLOUDFLARE_ANALYTICS_TOKEN`.

## 2) API token creation (manual)

Create API Token with minimum scopes:
- `Zone.Zone:Read`
- `Zone.Settings:Edit`
- `Zone.WAF:Edit`
- `Zone.Cache Purge:Edit` (optional)

Restrict token to this single zone (`mobiwave.co.ke`).

## 3) Fill local env

Set in `.env`:

```env
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ZONE_ID=...
CLOUDFLARE_ACCOUNT_ID=...
VITE_CLOUDFLARE_ANALYTICS_TOKEN=...
TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...
```

## 4) Apply automated free-tier hardening

```bash
source .env
./scripts/cloudflare-free-hardening.sh
```

## 5) Sync secrets to Supabase Edge Functions

```bash
./scripts/sync-secrets.sh .env
```

## 6) Redeploy frontend

```bash
npm run build
```

Then deploy your build output as usual.

## Notes

- Some rules/rate-limit endpoints vary by plan; the script is best-effort for those APIs.
- Keep Cloudflare token out of client-side env (`VITE_*` is public). Use server env and Supabase secrets only.
- Script requires `jq`.
