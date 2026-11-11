# CandyAI / Chatwoot Foundation Audit

Audit date: 2026-10-20

## Decision

Use `candyai/unified-v2` as the working foundation for the next integration pass. It contains the Chatwoot Rails/Vue application plus CandyAI-specific account/inbox settings, conversation orchestration, knowledge-document storage/retrieval, ingestion, and an OpenAI-compatible provider adapter.

All work in this pass is isolated on `candyai/implementation-hardening`. Do not merge it into `main` or the production deployment branch until CI and a real local boot pass.

## Branch findings

| Ref | Finding | Decision |
| --- | --- | --- |
| `main` | Legacy React/Vite CandyAI application; preserve as the fallback/source of legacy behavior | Do not replace |
| `legacy/candyai-pre-chatwoot` | Same starting point as `main` | Preserve |
| `chatwoot-foundation-plan` | Documents the source-fork direction | Keep as design history |
| `candyai/chatwoot-foundation` | Chatwoot source tree with initial CandyAI configuration and UI extensions | Useful baseline |
| `candyai/unified-v2` | Chatwoot source tree plus additional CandyAI orchestration and knowledge services | Working base |
| `develop` | Small legacy tree with an import script and a workflow that replaces most of the working tree with Chatwoot source | Do not trigger or use as the deployment branch |

The old PR #11 was explicitly marked superseded. Its API-bridge direction should not be resumed.

## Upstream comparison

The upstream repository is [chatwoot/chatwoot](https://github.com/chatwoot/chatwoot), whose default development branch is `develop`. At audit time its head was `e952d7555836ec72af5f7c4b2d5dce082cae9141` (2026-10-19).

The `candyai/unified-v2` source tree has 10,780 entries compared with 11,478 upstream entries. A path/blob comparison found 750 upstream blob paths not present in the CandyAI tree, and many shared paths have different blob hashes. These figures are a drift indicator, not a semantic diff: they include legitimate CandyAI changes, upstream evolution, and generated/vendor files.

**Do not copy the current upstream tree over CandyAI.** That would overwrite product changes and may invalidate database migrations. Update from upstream through a reviewed merge/rebase or a tested patch series, then resolve and test each conflict.

## Import-workflow safety

The legacy `develop` workflow and `scripts/import-chatwoot.sh` perform a destructive source replacement. They delete most tracked files before copying Chatwoot. Keep that path disabled from routine development; do not add the bootstrap trigger file or manually dispatch the workflow. Any future upstream sync must preserve the legacy application and be reviewed as a pull request.

## Product ownership boundaries

Chatwoot should own users, accounts, teams, inboxes, contacts, conversations, messages, assignment, and channel state. CandyAI should extend that application with AI configuration, grounded knowledge, usage metering, plans/subscriptions, Paystack transaction records, and product analytics.

Do not make Supabase a required runtime dependency for conversation processing. Migrate legacy data only after the source schema and data ownership are understood.

## Changes in this hardening branch

- Replace direct `Net::HTTP` knowledge crawling with Chatwoot's `SafeFetch` SSRF-aware downloader.
- Reject non-HTTP(S), credential-bearing, fragment-bearing, and non-standard-port URLs before fetching.
- Enforce a two-megabyte response cap and short timeouts, and restrict returned content types.
- Route AI completions through the existing CandyAI provider registry so provider/model/temperature/token settings are honored.
- Avoid logging prompts or provider response bodies on AI failures.
- Add focused RSpec coverage for the new behavior.

## Validation status

Repository writes are committed on the isolated branch. Automated tests and an application boot have **not** been run in a checked-out runtime during this pass. Do not treat this branch as production-ready until the validation checklist in `docs/CANDYAI_SELF_HOST_BOOTSTRAP.md` passes.
