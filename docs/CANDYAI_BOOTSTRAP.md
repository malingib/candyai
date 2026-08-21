# CandyAI Bootstrap

## Status

This repository is being transitioned to a self-hosted CandyAI platform built from the open-source Chatwoot codebase.

## Upstream

- Upstream repository: `chatwoot/chatwoot`
- Upstream branch: `develop`
- License: MIT
- Strategy: preserve upstream history and synchronize upstream security/maintenance changes where practical.

## Branches

- `main` — existing CandyAI application baseline
- `legacy/candyai-pre-chatwoot` — immutable preservation point for the pre-Chatwoot CandyAI codebase
- `develop` — CandyAI development branch
- Planned: `chatwoot-foundation` — clean Chatwoot source baseline

## Architecture decisions

1. Chatwoot OSS is the service-desk/conversation foundation.
2. CandyAI-specific functionality is added as source-level extensions; no dependency on Chatwoot Cloud or paid Chatwoot APIs.
3. Existing CandyAI functionality is ported selectively rather than preserving duplicate inbox/ticket implementations.
4. Supabase is optional business/integration infrastructure, not a replacement for Chatwoot's core PostgreSQL data model.
5. Paystack/MobiWave billing and messaging integrations will be implemented as CandyAI-owned adapters.
6. Captain Premium is not a dependency. CandyAI will own its AI layer.
7. The advanced AI-agent/tool system is deliberately deferred until the core platform is stable.
8. CandyAI-specific feature configuration must not alter Chatwoot's existing feature-flag bit ordering.

## Bootstrap sequence

1. Preserve the existing CandyAI branch. **Done.**
2. Create CandyAI `develop`. **Done.**
3. Import the Chatwoot `develop` source as the clean foundation.
4. Boot the unmodified foundation locally and in CI.
5. Rebrand to CandyAI.
6. Add MobiWave/Paystack/Supabase integrations.
7. Add CandyAI AI/RAG.
8. Add CandyAI-owned premium replacements (SLA, roles, company CRM, etc.) as required.
9. Add the deferred agent/tool layer later.

## Important

Do not overwrite `main` or `legacy/candyai-pre-chatwoot` until the imported Chatwoot foundation has been verified and the migration path is reproducible.
