#!/usr/bin/env bash
set -euo pipefail

# Cloudflare Free hardening (idempotent) for Mobiwave.
# Usage:
#   source .env && ./scripts/cloudflare-free-hardening.sh
#
# Required env:
#   CLOUDFLARE_API_TOKEN
#   CLOUDFLARE_ZONE_ID

: "${CLOUDFLARE_API_TOKEN:?Missing CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ZONE_ID:?Missing CLOUDFLARE_ZONE_ID}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required. Install jq and re-run." >&2
  exit 1
fi

CF_API="https://api.cloudflare.com/client/v4"
AUTH=(-H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json")

cf_call() {
  local method="$1"; shift
  local url="$1"; shift
  local data="${1:-}"

  local resp
  if [ -n "$data" ]; then
    resp=$(curl -sS -X "$method" "$url" "${AUTH[@]}" --data "$data")
  else
    resp=$(curl -sS -X "$method" "$url" "${AUTH[@]}")
  fi

  local ok
  ok=$(echo "$resp" | jq -r '.success // false')
  if [ "$ok" != "true" ]; then
    echo "Cloudflare API error on $method $url" >&2
    echo "$resp" | jq -c '.' >&2
    return 1
  fi
  echo "$resp"
}

cf_try() {
  local method="$1"; shift
  local url="$1"; shift
  local data="${1:-}"
  set +e
  local out
  out=$(cf_call "$method" "$url" "$data" 2>/dev/null)
  local rc=$?
  set -e
  if [ $rc -ne 0 ]; then
    echo "WARN: best-effort step failed: $method $url"
    return 1
  fi
  echo "$out"
  return 0
}

patch_setting() {
  local key="$1"
  local value="$2"
  echo "Setting ${key}=${value}"
  cf_try PATCH "${CF_API}/zones/${CLOUDFLARE_ZONE_ID}/settings/${key}" "{\"value\":\"${value}\"}" >/dev/null || true
}

upsert_phase_rules() {
  local phase="$1"
  local rules_json="$2"

  local entry
  entry=$(cf_call GET "${CF_API}/zones/${CLOUDFLARE_ZONE_ID}/rulesets/phases/${phase}/entrypoint")
  local ruleset_id
  ruleset_id=$(echo "$entry" | jq -r '.result.id')

  local payload
  payload=$(jq -nc \
    --arg phase "$phase" \
    --argjson rules "$rules_json" \
    '{description:"Mobiwave managed ruleset", kind:"zone", name:"default", phase:$phase, rules:$rules}')

  cf_call PUT "${CF_API}/zones/${CLOUDFLARE_ZONE_ID}/rulesets/${ruleset_id}" "$payload" >/dev/null
  echo "Applied ruleset for phase: ${phase}"
}

get_managed_ruleset_id() {
  local search_name="$1"
  local rs
  rs=$(cf_try GET "${CF_API}/zones/${CLOUDFLARE_ZONE_ID}/rulesets") || return 1
  echo "$rs" | jq -r --arg name "$search_name" '.result[] | select(.kind=="managed" and (.name|contains($name))) | .id' | head -n1
}

echo "Applying SSL/TLS + transport hardening..."
patch_setting ssl strict
patch_setting always_use_https on
patch_setting automatic_https_rewrites on
patch_setting min_tls_version 1.2
patch_setting tls_1_3 on
patch_setting http3 on
patch_setting brotli on
patch_setting opportunistic_encryption on
patch_setting security_level medium
patch_setting browser_check on
patch_setting challenge_ttl 1800
patch_setting privacy_pass on
patch_setting zero_rtt off

# Optional bot mode toggle (works where setting is exposed)
patch_setting bot_fight_mode on || true

echo "Applying custom WAF rules (free-tier safe)..."
CUSTOM_WAF_RULES=$(jq -nc '[
  {
    action:"managed_challenge",
    expression:"(http.request.uri.path contains \"/auth\") and (not cf.client.bot)",
    description:"Mobiwave auth managed challenge",
    enabled:true
  },
  {
    action:"managed_challenge",
    expression:"(http.request.uri.path contains \"/dashboard/admin\") and (not cf.client.bot)",
    description:"Mobiwave admin managed challenge",
    enabled:true
  },
  {
    action:"block",
    expression:"(http.request.method in {\"TRACE\" \"CONNECT\"})",
    description:"Mobiwave block unsupported verbs",
    enabled:true
  }
]')
upsert_phase_rules "http_request_firewall_custom" "$CUSTOM_WAF_RULES"

echo "Applying rate limiting rules..."
RATE_RULES=$(jq -nc '[
  {
    action:"block",
    expression:"(http.request.uri.path contains \"/auth\")",
    description:"Mobiwave rate limit auth",
    enabled:true,
    ratelimit:{
      characteristics:["ip.src"],
      period:60,
      requests_per_period:20,
      mitigation_timeout:600
    }
  }
]')
upsert_phase_rules "http_ratelimit" "$RATE_RULES"

echo "Best-effort: attach Cloudflare Free Managed Ruleset if discoverable..."
FREE_MANAGED_ID=$(get_managed_ruleset_id "Cloudflare Free Managed Ruleset" || true)
if [ -n "${FREE_MANAGED_ID:-}" ]; then
  MANAGED_RULES=$(jq -nc --arg rsid "$FREE_MANAGED_ID" '[
    {
      action:"execute",
      expression:"true",
      description:"Execute Cloudflare Free Managed Ruleset",
      enabled:true,
      action_parameters:{id:$rsid}
    }
  ]')
  upsert_phase_rules "http_request_firewall_managed" "$MANAGED_RULES"
else
  echo "WARN: Could not auto-discover free managed ruleset ID. Enable it in dashboard (Security > WAF)."
fi

echo "Cloudflare hardening completed for zone ${CLOUDFLARE_ZONE_ID}."
