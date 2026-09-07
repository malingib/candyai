# CandyAI Unified Architecture

## Objective

CandyAI is being rebuilt as one self-hosted application rather than a separate SaaS frontend sitting beside Chatwoot.

The current integration branch is `candyai/unified-v2`, based on the existing Chatwoot/CandyAI foundation. The upstream Chatwoot Rails application remains the operational core while CandyAI capabilities are implemented natively inside it.

## Architecture

```text
CandyAI / MobiWave
        |
        +-- Rails application (current Chatwoot core)
        |     +-- Accounts / Users / Teams
        |     +-- Inboxes / Contacts / Conversations
        |     +-- Omnichannel integrations
        |     +-- Background jobs / Redis / Sidekiq
        |
        +-- CandyAI native layer
        |     +-- Account + inbox AI configuration
        |     +-- AI provider abstraction
        |     +-- Assist / Autonomous modes
        |     +-- Human handoff
        |     +-- Grounding / Knowledge
        |     +-- Lead extraction
        |     +-- Analytics
        |     +-- Billing
        |
        +-- PostgreSQL
              +-- Chatwoot operational data
              +-- CandyAI-owned data and configuration
```

## What is already native

The foundation branch already contains the CandyAI account/inbox configuration layer. It supports account-level enablement, inbox overrides, assist/autonomous modes, provider/model configuration, response limits, and human handoff settings. Account enablement acts as the global kill switch.

## Legacy CandyAI capabilities to port

The former React/Supabase application is treated as a capability source, not as the runtime architecture. Its major product surfaces are mapped as follows:

| Legacy capability | Unified destination | Status |
| --- | --- | --- |
| AI chat | CandyAI conversation AI service | Foundation present |
| Knowledge Base | Native Rails knowledge/grounding layer | Next |
| Website crawling | Native ingestion jobs | Next |
| Lead extraction | Conversation/Contact automation | Next |
| Human handoff | Conversation assignment/handoff | Foundation present |
| Billing / Paystack | Native account billing | Planned |
| Analytics | Native reports/events | Planned |
| Admin controls | Account/platform administration | Existing core + CandyAI extension |
| Website/widget | Chatwoot widget, rebranded | Planned |

## Data ownership rule

New CandyAI functionality should use the existing PostgreSQL database and Rails models/services wherever practical. We should not introduce Supabase as a required runtime dependency for the unified application.

Legacy Supabase schemas should be migrated capability-by-capability into Rails migrations and models only after their behavior is understood.

## Branding rule

`Chatwoot` remains an internal code namespace during the migration. User-facing names, navigation, metadata, emails, documentation, and deployment defaults should progressively become CandyAI / MobiWave.

This avoids a risky global namespace rename while allowing the product to become independently branded.

## Delivery sequence

1. Stabilize the unified Chatwoot/CandyAI foundation.
2. Establish CandyAI product identity and configuration.
3. Port knowledge/grounding and website ingestion.
4. Port lead extraction and conversation automation.
5. Port billing and account entitlements.
6. Port analytics and operational dashboards.
7. Rebrand the Vue interface and widget.
8. Add production deployment, migration and upgrade documentation.
9. Validate end-to-end flows before changing the production/default branch.
