# CandyAI implementation status

## Current architecture

CandyAI is an isolated namespace layered onto Chatwoot. Global configuration is
loaded by `config/initializers/candy_ai.rb` into `CandyAI::Configuration` and is
also exposed at `Rails.application.config.x[:candy_ai]`, which is the Rails 7.2
compatible extended-configuration interface.

Account settings are stored under the account JSON `settings['candy_ai']`.
Inbox settings are stored in the `inboxes.candy_ai_settings` JSONB column. The
authoritative merge and normalization logic lives in
`CandyAI::AccountConfiguration`; account enablement is an explicit higher-level
kill switch and cannot be bypassed by an inbox.

For autonomous mode, `CandyAIListener` gates incoming public messages and queues
`CandyAI::RespondToMessageJob`. The job rebuilds recent conversation context,
calls `CandyAI::AI::Orchestrator`, selects a provider through `Router` and
`ProviderRegistry`, and currently delivers a response through Chatwoot's
`Messages::MessageBuilder` as an `AgentBot` message.

The provider boundary is already OpenAI-compatible rather than OpenAI-specific:
providers receive normalized chat messages and return `CandyAI::AI::Response`
objects containing text, model, provider, usage, and raw provider metadata.

## Implemented

- Rails 7.2-compatible global CandyAI configuration.
- Global and account/inbox enablement gates for autonomous delivery.
- Account and inbox settings APIs with account-scoped inbox lookup.
- Settings normalization for booleans, temperature, token limits, and mode.
- Provider registry, routing, OpenAI-compatible HTTP adapter, and response type.
- Recent conversation context for autonomous responses.
- Loop prevention based on existing outgoing bot responses.
- Basic settings UI and Pinia/API integration.
- Assist-mode suggestion generation, persisted separately from outgoing messages,
  with an account-scoped read API.
- Initial unit coverage for configuration, provider selection, orchestration,
  provider response normalization, and autonomous listener gating.

## Partial or missing

- Assist suggestions are persisted and exposed through an account-scoped API,
  but the agent composer has not yet been wired to display/edit them.
- Global provider/safety limits are not represented as a complete policy object.
- Provider failures now use a CandyAI-specific error path and are contained by
  the autonomous job, but structured operation logging is not implemented.
- Usage metadata is returned by providers but is not persisted or metered.
- Autonomous safety policy lacks confidence checks, rate limiting, explicit
  approval, and a durable handoff state.
- Inbox settings are API-backed but are not yet integrated into the standard
  inbox settings UI.
- Controller request coverage, account isolation coverage, job coverage, and
  production-mode boot coverage need to be established.
- No arbitrary tool execution exists; RAG is only an extension point in the
  current conversation-context flow.

## Recommended implementation sequence

1. Restore/verify the database-backed test environment and complete gating/API
   regression coverage.
2. Extract provider error normalization, logging, and safe job failure handling.
3. Integrate the existing assist suggestion API into the agent composer and
   inbox settings surfaces; keep suggestions separate from outgoing messages.
4. Add explicit autonomous decision/safety gates, loop prevention, rate limits,
   and handoff tracking.
5. Persist normalized usage events behind a billing-neutral metering interface.
6. Add retrieval adapters only after the conversation-context contract is stable.

## Security notes

Provider credentials remain server-side and are loaded from environment-backed
configuration. Account-scoped controllers do not look up inboxes globally.
Provider base URLs are server-side configuration only, require HTTPS unless an
explicit local-development override is supplied, and are not accepted through
account settings. Arbitrary tool execution should remain disabled.
