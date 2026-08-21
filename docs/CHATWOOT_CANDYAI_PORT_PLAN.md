# CandyAI — Chatwoot Foundation & Port Plan

## Objective

Rebuild CandyAI on the open-source Chatwoot application as the product foundation. The result is one self-hosted application called **CandyAI**, not a React frontend connected to Chatwoot APIs.

**Hard constraints**
- No Chatwoot Cloud.
- No paid Chatwoot subscription.
- No hosted Chatwoot API as the integration layer.
- Self-host the Chatwoot source.
- Preserve CandyAI-specific Supabase, Paystack, AI, knowledge and product functionality.
- Keep upstream Chatwoot changes reasonably mergeable by isolating CandyAI-specific code.

## Source repositories

- Upstream foundation: `chatwoot/chatwoot`, default branch `develop`.
- Current CandyAI application: `malingib/candyai`, currently a Vite/React/TypeScript application.
- Target: a Chatwoot-derived CandyAI repository/branch that becomes the production application.

## Target stack

- Ruby 3.4 / Rails 7.2 foundation from Chatwoot
- Vue frontend from Chatwoot
- PostgreSQL
- Redis
- Sidekiq
- Chatwoot-native omnichannel/service-desk infrastructure
- CandyAI AI/RAG services
- Supabase for CandyAI-specific business data where justified
- Paystack for CandyAI billing
- Native Chatwoot mailer/channel infrastructure for support communication

## Principle: one system of record for conversations

Do not port CandyAI's existing Tickets/Conversations tables as a second ticket system.

Chatwoot owns:
- contacts
- conversations
- messages
- inboxes/channels
- agents
- teams
- assignments
- labels
- automation
- service-desk workflow
- help center

CandyAI owns/extends:
- AI configuration and usage
- AI agent behavior
- CandyAI plans/subscriptions
- Paystack transactions
- CandyAI-specific customer/account metadata
- knowledge/RAG metadata not already covered by Chatwoot
- product analytics/business rules

## Port map

### 1. Existing CandyAI React UI

Do not copy the Vite application wholesale into the new product. Treat it as feature/reference source material.

Port only useful behavior into Chatwoot Vue screens/components or Rails-backed views.

Likely candidates:
- CandyAI branding and navigation concepts
- AI assistant UX
- billing screens
- plan/usage indicators
- knowledge UI
- lead/customer-specific fields
- CandyAI-specific admin controls

### 2. Tickets / Conversations

**Replace, do not port.**

Map existing ticket states, priorities, assignments, timestamps and SLA concepts to Chatwoot conversations, statuses, priorities, teams, assignments and automation. Add only CandyAI-specific fields where Chatwoot lacks an equivalent.

### 3. Knowledge Base

Use Chatwoot Help Center/article infrastructure as the customer-facing knowledge base where possible.

Add CandyAI RAG indexing/retrieval on top of the same content or a clearly separated CandyAI knowledge layer.

### 4. AI

Chatwoot's current source already includes LLM/AI-related dependencies including `ruby-openai`, `ai-agents`, `ruby_llm`, `pgvector` and `neighbor`.

First inspect and reuse Chatwoot's existing AI/response-bot architecture before introducing another framework.

CandyAI layer should add:
- provider/model configuration
- system prompts
- tenant-specific AI instructions
- RAG retrieval
- usage metering
- AI-to-human escalation
- AI conversation summaries
- optional tool/function execution

### 5. Supabase

Do not make Supabase the conversation backend.

Retain it initially for CandyAI business data where moving it would add unnecessary migration risk:
- subscription records
- Paystack transaction records
- CandyAI plan configuration
- AI usage/business metrics if currently dependent on Supabase
- product-specific customer metadata

Create a clear integration boundary so Supabase can later be reduced or consolidated if appropriate.

### 6. Paystack

Port the current CandyAI billing model into a Rails service/namespace, for example:

`Candyai::Billing::Paystack`

Responsibilities:
- initialize checkout
- verify transactions server-side
- process webhook events
- activate/deactivate subscriptions
- update plan limits
- record payment references
- meter usage against plan limits

Never trust browser payment state.

### 7. Email / EmailJS

Audit current CandyAI email behavior first.

Support conversations should use Chatwoot's native mail/channel/mailer system.

CandyAI transactional emails should use a dedicated Rails mailer/service. If EmailJS is currently used for a specific product email, port the behavior rather than retaining EmailJS in the browser.

Never expose provider secrets in the frontend.

### 8. Customer / Leads

Chatwoot contacts and conversations become the primary customer interaction model.

Port only lead functionality that is not already represented by Chatwoot contacts/custom attributes/labels/segments.

Add CandyAI-specific contact attributes rather than duplicating contact records.

### 9. Branding

Rebrand the application to CandyAI at source level:
- application name
- logos/icons
- favicons
- browser titles
- email branding
- public widget branding
- help center branding
- onboarding copy
- footer/about references where legally/technically appropriate

Retain required open-source/license notices.

## Implementation phases

### Phase 0 — Foundation
- Create/obtain a GitHub fork of `chatwoot/chatwoot` under the owner's account.
- Preserve upstream remote/reference.
- Create CandyAI development branch.
- Confirm local Docker development and test suite.
- Record upstream Chatwoot commit/version.

### Phase 1 — Product rebrand
- Rename visible Chatwoot branding to CandyAI.
- Replace assets.
- Establish CandyAI theme tokens.
- Add a CandyAI source namespace/module structure.

### Phase 2 — CandyAI data integration
- Inventory current Supabase schema and Edge Functions.
- Define Rails-side CandyAI domain services.
- Add secure Supabase client integration only where required.
- Add migrations for CandyAI-specific fields/tables.

### Phase 3 — Billing
- Port Paystack integration.
- Add subscription lifecycle.
- Add plan limits and usage metering.
- Add admin billing view.
- Add webhook verification and idempotency.

### Phase 4 — AI
- Reuse Chatwoot AI infrastructure where possible.
- Integrate CandyAI model/provider configuration.
- Add RAG/pgvector where appropriate.
- Add tenant-aware prompts and retrieval.
- Add AI escalation and summaries.

### Phase 5 — Knowledge
- Map CandyAI knowledge base to Chatwoot Help Center.
- Add indexing pipeline.
- Add retrieval permissions/tenant isolation.
- Add AI citation/source display if required.

### Phase 6 — Customer/lead migration
- Map CandyAI lead fields to Chatwoot contacts/custom attributes.
- Write one-time migration/import tooling if existing production data must be preserved.
- Do not create a parallel conversation model.

### Phase 7 — Email/channels
- Configure native Chatwoot email channel.
- Port CandyAI transactional mailers.
- Configure WhatsApp/SMS/web chat channels as required.
- Validate inbound/outbound message lifecycle.

### Phase 8 — QA and migration
- Unit tests for CandyAI modules.
- Rails request/service tests.
- Vue component tests.
- End-to-end tests for signup → billing → conversation → AI → human escalation → resolution.
- Security review of auth, RLS/Supabase access, webhooks and secrets.
- Load test conversation/Sidekiq/Redis paths.
- Only then switch production deployment.

## Immediate next actions

1. Fork `chatwoot/chatwoot` into the owner's GitHub account.
2. Clone the fork locally and preserve `upstream = chatwoot/chatwoot`.
3. Create `candyai` development branch from Chatwoot `develop`.
4. Inventory current CandyAI source and Supabase schema.
5. Inventory Chatwoot's AI, billing, mailer, contact, conversation and help-center extension points.
6. Produce the first feature-by-feature migration matrix.
7. Implement branding first, then billing and AI, while leaving Chatwoot's core inbox/service desk intact.

## Definition of done

CandyAI is one deployable self-hosted application based on Chatwoot source, with:

- CandyAI branding
- native omnichannel inbox
- native service desk
- CandyAI AI agent
- CandyAI knowledge/RAG
- CandyAI customer/lead extensions
- Paystack billing
- CandyAI plan/usage enforcement
- CandyAI transactional email
- no Chatwoot Cloud dependency
- no paid Chatwoot software subscription
- reproducible Docker deployment
- automated tests for CandyAI-specific behavior
