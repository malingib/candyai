# CandyAI Implementation Status

Last updated: 2026-10-20

## Completed in this pass

- [x] Audited existing branches and confirmed the Chatwoot source exists on `candyai/chatwoot-foundation` and `candyai/unified-v2`.
- [x] Compared source-tree shape with current upstream and documented drift and destructive import risks.
- [x] Created isolated working branch `candyai/implementation-hardening` from `candyai/unified-v2`; legacy `main` remains untouched.
- [x] Replaced CandyAI URL ingestion's direct HTTP client with Chatwoot `SafeFetch` and strict URL/content/size limits.
- [x] Fixed the AI gateway to use the registered CandyAI provider adapter and pass through model controls.
- [x] Added focused RSpec examples for URL ingestion and AI gateway behavior.
- [x] Added self-hosted boot and validation instructions.

## Remaining release gates

- [ ] Run focused RSpec and the repository's full CI suite in a checked-out environment.
- [ ] Perform a real Rails + PostgreSQL + Redis + Sidekiq boot and smoke test.
- [ ] Review upstream drift and produce a narrow, conflict-reviewed update strategy.
- [ ] Finish product-facing branding across title/meta, emails, widget, auth pages, and admin surfaces.
- [ ] Add billing data model, Paystack checkout verification, idempotent webhook handling, entitlement checks, and reconciliation tests.
- [ ] Complete knowledge ingestion/retrieval lifecycle: source CRUD, refresh jobs, chunking, tenant-safe retrieval, citations, and deletion.
- [ ] Add usage ledger and analytics, including token counts/cost attribution and per-account quotas.
- [ ] Test account/inbox isolation, permissions, abuse controls, handoff, retries, and secret redaction end to end.
- [ ] Decide production hosting after sizing; Vercel alone is not the runtime for this Rails/Sidekiq/PostgreSQL/Redis stack.

## Architecture rules

- Chatwoot remains the single source of truth for support conversations and channel state.
- CandyAI-owned settings, knowledge, billing, usage, and analytics belong in Rails/PostgreSQL unless a reviewed requirement justifies another service.
- No Chatwoot Cloud dependency and no paid Chatwoot API bridge.
- No destructive upstream import workflow on the production/default branch.
- Do not merge into `main` or deploy until all release gates are met.
