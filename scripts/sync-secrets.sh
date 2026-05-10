#!/usr/bin/env bash
set -euo pipefail

# Syncs selected .env vars to Supabase Edge Function secrets.
# Requires supabase CLI logged in and project linked.

ENV_FILE="${1:-.env}"
if [ ! -f "$ENV_FILE" ]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

required=(SUPABASE_URL SUPABASE_ANON_KEY)
for key in "${required[@]}"; do
  if [ -z "${!key:-}" ]; then
    echo "Missing required var: $key" >&2
    exit 1
  fi
done

secrets=(
  "APP_SITE_URL=${APP_SITE_URL:-https://ai.mobiwave.co.ke}"
  "PAYSTACK_SECRET_KEY=${PAYSTACK_SECRET_KEY:-}"
  "PAYSTACK_FALLBACK_TOKEN=${PAYSTACK_FALLBACK_TOKEN:-}"
  "TURNSTILE_SECRET_KEY=${TURNSTILE_SECRET_KEY:-}"
  "CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN:-}"
  "CLOUDFLARE_ZONE_ID=${CLOUDFLARE_ZONE_ID:-}"
  "CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID:-}"
)

args=()
for s in "${secrets[@]}"; do
  k="${s%%=*}"
  v="${s#*=}"
  if [ -n "$v" ]; then
    args+=("${k}=${v}")
  fi
done

if [ ${#args[@]} -eq 0 ]; then
  echo "No non-empty secrets found to sync."
  exit 0
fi

supabase secrets set "${args[@]}"
echo "Supabase secrets synced (${#args[@]} values)."
