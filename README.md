# CandyAI

**CandyAI by MobiWave Innovations** is a self-hosted, AI-powered customer conversations and automation platform.

CandyAI combines a production-grade omnichannel support desk with native AI assistance, autonomous workflows, knowledge grounding, lead capture, human handoff, analytics and billing.

## Product direction

CandyAI is being developed as a unified application. The customer-support platform is the core runtime; CandyAI capabilities are implemented natively inside the same Rails/PostgreSQL/Redis/Sidekiq application rather than as a separate frontend that depends on another hosted SaaS product.

## Current architecture

- **Backend:** Ruby on Rails
- **Frontend:** Vue
- **Database:** PostgreSQL
- **Jobs/cache:** Redis + Sidekiq
- **AI layer:** native CandyAI services with configurable providers/models
- **Deployment:** self-hosted

## CandyAI capabilities

- Omnichannel conversations and inbox management
- AI-assisted replies
- Autonomous AI mode
- Account and inbox AI configuration
- Human handoff
- Knowledge and grounding
- Website knowledge ingestion
- Lead capture and extraction
- Analytics and operational reporting
- Account billing and entitlements

## Development

The active unified integration branch is `candyai/unified-v2`.

See [`docs/CANDYAI_UNIFIED_ARCHITECTURE.md`](docs/CANDYAI_UNIFIED_ARCHITECTURE.md) for the architecture and migration map.

## Branding

The internal `Chatwoot` Rails namespace is intentionally retained during the migration to reduce regression risk. User-facing branding is being progressively changed to **CandyAI / MobiWave**.

## License

CandyAI's current core is derived from the Chatwoot open-source application and retains the applicable upstream licensing requirements. See `LICENSE` and the upstream notices in this repository before distributing builds.
