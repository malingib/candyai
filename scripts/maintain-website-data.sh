#!/usr/bin/env bash
set -euo pipefail

# Bulk website_data maintenance:
# - Premium/Enterprise: keep website_data synced from most recent verified active widget domain.
# - Others: if trial expired, clear website_data to save space.

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${SUPABASE_URL:?SUPABASE_URL is required}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

curl -sS "$SUPABASE_URL/rest/v1/profiles?select=user_id,plan,trial_expires_at,website_data" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" > "$TMP_DIR/profiles.json"

curl -sS "$SUPABASE_URL/rest/v1/widget_domains?select=user_id,origin,is_active,is_verified,last_seen_at&is_active=eq.true&is_verified=eq.true&order=last_seen_at.desc.nullslast" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" > "$TMP_DIR/domains.json"

now_epoch=$(date -u +%s)
updated_sync=0
cleared_expired=0
skipped=0

while IFS='|' read -r user_id plan trial_expires_at website_len; do
  plan_lc="$(printf '%s' "$plan" | tr '[:upper:]' '[:lower:]')"
  if [[ "$plan_lc" == "premium" || "$plan_lc" == "enterprise" ]]; then
    origin="$(jq -r --arg uid "$user_id" '[.[] | select(.user_id == $uid)][0].origin // empty' "$TMP_DIR/domains.json")"
    if [[ -n "$origin" ]]; then
      ./scripts/sync-website-data.sh "$user_id" "$origin" >/dev/null
      updated_sync=$((updated_sync + 1))
    else
      skipped=$((skipped + 1))
    fi
    continue
  fi

  # For non premium/enterprise: clear stored website_data only after trial expires.
  if [[ -n "$trial_expires_at" && "$trial_expires_at" != "null" ]]; then
    trial_epoch=$(date -u -d "$trial_expires_at" +%s 2>/dev/null || echo 0)
    if [[ "$trial_epoch" -gt 0 && "$trial_epoch" -lt "$now_epoch" && "$website_len" -gt 0 ]]; then
      curl -sS "$SUPABASE_URL/rest/v1/profiles?user_id=eq.$user_id" \
        -X PATCH \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        --data '{"website_data":""}' >/dev/null
      cleared_expired=$((cleared_expired + 1))
    else
      skipped=$((skipped + 1))
    fi
  else
    skipped=$((skipped + 1))
  fi
done < <(jq -r '.[] | [.user_id, .plan, .trial_expires_at, ((.website_data // "") | length)] | @tsv' "$TMP_DIR/profiles.json" | sed 's/\t/|/g')

echo "Website data maintenance complete."
echo "Synced premium/enterprise: $updated_sync"
echo "Cleared expired trial data: $cleared_expired"
echo "Skipped: $skipped"

