#!/usr/bin/env bash
set -euo pipefail

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${CLOUDFLARE_ACCOUNT_ID:?Missing CLOUDFLARE_ACCOUNT_ID (set it in .env or export it before deploy)}"

npm run build
unset CLOUDFLARE_API_TOKEN WRANGLER_API_TOKEN
npx wrangler pages deploy "$PWD/dist" --project-name candyai --cwd /tmp
