# CandyAI implementation

CandyAI is being implemented as a thin product layer over the Chatwoot OSS foundation.

## Current runtime path

1. Chatwoot emits `message.created`.
2. `AsyncDispatcher` invokes `CandyAIListener`.
3. The listener filters to public incoming customer messages.
4. `CandyAI::RespondToMessageJob` is queued through ActiveJob/Sidekiq.
5. The job loads the latest 20 public chat messages.
6. `CandyAI::AI::Orchestrator` adds the support-system prompt.
7. `CandyAI::AI::Router` selects the configured provider.
8. `OpenAICompatibleProvider` calls `/chat/completions`.
9. The normalized response is written back through Chatwoot's native `Messages::MessageBuilder` as an `AgentBot` message.

## Environment

Set these values in the local `.env`:

```text
CANDYAI_ENABLED=true
CANDYAI_BRAND_NAME=CandyAI
CANDYAI_COMPANY_NAME=MobiWave Innovations
CANDYAI_DEFAULT_AI_PROVIDER=openai
CANDYAI_AI_BASE_URL=https://api.openai.com/v1
CANDYAI_AI_API_KEY=your-key
CANDYAI_AI_MODEL=your-model
CANDYAI_AGENT_BOT_ID=123
```

`CANDYAI_AI_BASE_URL` accepts any OpenAI-compatible chat-completions endpoint, including self-hosted inference.

## Safety boundaries

- Private notes are never sent to the model.
- Outgoing assistant messages do not recursively trigger CandyAI.
- Empty messages are ignored.
- AI work is asynchronous and retried by ActiveJob.
- Conversation context is capped at 20 messages for the first implementation.
- Provider-specific code stays behind the CandyAI AI provider contract.

## Next implementation layers

### Phase 1 — Customer-support MVP

- Per-account CandyAI enablement.
- Per-inbox agent configuration.
- Persistent AI settings instead of environment-only configuration.
- Conversation-level AI toggle.
- Prompt/persona configuration.
- Streaming responses where supported.
- Token/cost telemetry.
- Human handoff and confidence thresholds.

### Phase 2 — MobiWave platform

- M-Pesa billing and prepaid AI credits.
- Tenant usage ledger.
- Model/provider routing by cost and capability.
- WhatsApp/USSD/SMS channel-aware responses.
- Kenya-specific business knowledge packs.

### Phase 3 — RAG and tools

- Knowledge sources and ingestion.
- Retrieval pipeline.
- Citations and source visibility.
- Safe tool execution.
- CRM/customer context.
- Bounded actions with explicit permissions.

### Phase 4 — Agent platform

- Durable tasks.
- Tool registry.
- Approval gates.
- Background workflows.
- Multi-agent orchestration only after the bounded single-agent loop is stable.
