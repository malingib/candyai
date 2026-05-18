#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/sync-website-data.sh <user_uuid> <base_url>
# Example:
#   scripts/sync-website-data.sh db8e269c-e502-49d0-9aad-564dc92b52e1 https://mobiwave.co.ke

USER_ID="${1:-}"
BASE_URL="${2:-}"

if [[ -z "$USER_ID" || -z "$BASE_URL" ]]; then
  echo "Usage: $0 <user_uuid> <base_url>" >&2
  exit 1
fi

if [[ ! "$USER_ID" =~ ^[0-9a-fA-F-]{36}$ ]]; then
  echo "Invalid user UUID: $USER_ID" >&2
  exit 1
fi

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

PAGES=(
  "$BASE_URL/"
  "$BASE_URL/about"
  "$BASE_URL/services"
  "$BASE_URL/products"
  "$BASE_URL/pricing"
  "$BASE_URL/contact"
)

extract_text() {
  local input_file="$1"
  local html
  html="$(cat "$input_file")"

  local title desc og_desc tw_desc
  title="$(printf '%s' "$html" | perl -0777 -ne 'if (/<title[^>]*>(.*?)<\/title>/is){$t=$1;$t=~s/<[^>]+>//g;$t=~s/\s+/ /g;$t=~s/^\s+|\s+$//g;print $t;}')"
  desc="$(printf '%s' "$html" | perl -0777 -ne 'if (/<meta[^>]+name=["'"'"']description["'"'"'][^>]*content=["'"'"']([^"'"'"']+)["'"'"']/is){print $1;}')"
  og_desc="$(printf '%s' "$html" | perl -0777 -ne 'if (/<meta[^>]+property=["'"'"']og:description["'"'"'][^>]*content=["'"'"']([^"'"'"']+)["'"'"']/is){print $1;}')"
  tw_desc="$(printf '%s' "$html" | perl -0777 -ne 'if (/<meta[^>]+name=["'"'"']twitter:description["'"'"'][^>]*content=["'"'"']([^"'"'"']+)["'"'"']/is){print $1;}')"

  [[ -n "$title" ]] && echo "Title: $title"
  [[ -n "$desc" ]] && echo "Description: $desc"
  [[ -n "$og_desc" ]] && echo "OG Description: $og_desc"
  [[ -n "$tw_desc" ]] && echo "Twitter Description: $tw_desc"

  echo "Visible Content Preview:"
  printf '%s' "$html" | perl -0777 -ne '
    s/<script[^>]*>.*?<\/script>//gs;
    s/<style[^>]*>.*?<\/style>//gs;
    s/<[^>]+>/ /g;
    s/&nbsp;/ /g;
    s/&[a-z]+;/ /g;
    s/\s+/ /g;
    s/^\s+|\s+$//g;
    print $_;
  ' | cut -c1-5000
}

OUT_FILE="$TMP_DIR/website_data.txt"
{
  echo "Website source: $BASE_URL"
  echo "Captured at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo
  for page in "${PAGES[@]}"; do
    echo "=== PAGE: $page ==="
    if curl -sSL --max-time 30 "$page" -o "$TMP_DIR/page.html"; then
      extract_text "$TMP_DIR/page.html" | cut -c1-9000
    else
      echo "Unable to fetch page."
    fi
    echo
  done
} > "$OUT_FILE"

# Keep payload bounded for profile storage and chat prompt usage.
WEBSITE_DATA="$(cat "$OUT_FILE" | cut -c1-12000)"

HTTP_CODE=$(curl -sS -o "$TMP_DIR/update.json" -w "%{http_code}" "$SUPABASE_URL/rest/v1/profiles?user_id=eq.$USER_ID" \
  -X PATCH \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  --data "$(printf '{"website_data":%s}' "$(printf '%s' "$WEBSITE_DATA" | jq -Rs .)")")

if [[ "$HTTP_CODE" -lt 200 || "$HTTP_CODE" -ge 300 ]]; then
  echo "Failed to update website_data (HTTP $HTTP_CODE)" >&2
  cat "$TMP_DIR/update.json" >&2
  exit 1
fi

echo "Updated website_data for user_id=$USER_ID"
echo "Stored characters: $(printf '%s' "$WEBSITE_DATA" | wc -c | tr -d ' ')"
echo "Preview:"
head -c 500 "$OUT_FILE"
echo
