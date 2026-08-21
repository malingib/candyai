#!/usr/bin/env bash
set -euo pipefail

# Safe local bootstrap: preserve the existing CandyAI main branch, then replace
# the working branch with the current Chatwoot develop tree while retaining
# CandyAI's migration notes.

UPSTREAM_URL="https://github.com/chatwoot/chatwoot.git"
UPSTREAM_REF="develop"
TARGET_BRANCH="develop"
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

if [[ "$(git branch --show-current)" != "$TARGET_BRANCH" ]]; then
  echo "ERROR: checkout '$TARGET_BRANCH' before running this script."
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ERROR: working tree is not clean. Commit or stash changes first."
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "ERROR: origin remote is missing."
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Cloning Chatwoot $UPSTREAM_REF..."
git clone --depth 1 --branch "$UPSTREAM_REF" "$UPSTREAM_URL" "$TMP/chatwoot"

# Keep this script and migration documentation available after the import.
mkdir -p "$TMP/candyai-preserve/scripts"
cp scripts/import-chatwoot.sh "$TMP/candyai-preserve/scripts/import-chatwoot.sh"
if [[ -f CANDYAI_FOUNDATION.md ]]; then
  cp CANDYAI_FOUNDATION.md "$TMP/candyai-preserve/CANDYAI_FOUNDATION.md"
fi

# Replace the application tree, preserving the Git repository metadata.
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -a "$TMP/chatwoot"/. .

mkdir -p scripts
cp "$TMP/candyai-preserve/scripts/import-chatwoot.sh" scripts/import-chatwoot.sh
if [[ -f "$TMP/candyai-preserve/CANDYAI_FOUNDATION.md" ]]; then
  cp "$TMP/candyai-preserve/CANDYAI_FOUNDATION.md" CANDYAI_FOUNDATION.md
fi

# Remove upstream's nested Git metadata if present.
rm -rf .git/modules 2>/dev/null || true

cat > CANDYAI_IMPORT_STATUS.md <<'EOF'
# CandyAI Chatwoot Foundation Import

The `develop` branch is now based on the Chatwoot open-source `develop` branch.

The pre-Chatwoot CandyAI implementation remains preserved in:

`legacy/candyai-pre-chatwoot`

Next steps:

1. Verify the unmodified Chatwoot foundation builds and boots.
2. Establish CandyAI branding.
3. Add MobiWave integrations.
4. Add billing.
5. Add CandyAI AI/RAG.
6. Add premium replacements only where commercially useful.
7. Implement the deferred bounded agent/tool layer later.
EOF

git add -A
git commit -m "Import Chatwoot OSS develop as CandyAI foundation"
git push origin "$TARGET_BRANCH"

echo
echo "CandyAI Chatwoot foundation imported successfully."
