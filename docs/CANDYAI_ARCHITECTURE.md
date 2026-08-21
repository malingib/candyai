# CandyAI Architecture

## Purpose

CandyAI is built on the Chatwoot open-source foundation. CandyAI-specific functionality should be isolated behind the `CandyAI` namespace and configuration boundary wherever practical.

The goal is to retain upstream Chatwoot capabilities while adding MobiWave-native AI, communications, billing, and automation capabilities without turning the application into an unmaintainable fork.

## Layering

```text
+------------------------------------------------------+
|                    CandyAI Product                   |
| AI / RAG / Agents / Billing / MobiWave Integrations |
+------------------------------------------------------+
|              CandyAI application layer               |
|      lib/candy_ai.rb + app-specific services         |
+------------------------------------------------------+
|                  Chatwoot foundation                 |
| inboxes / contacts / conversations / channels / UI   |
+------------------------------------------------------+
|            Rails / PostgreSQL / Redis / jobs         |
+------------------------------------------------------+
```

## Initial implementation sequence

1. Establish CandyAI identity and configuration.
2. Add an AI provider abstraction without coupling the domain to one model vendor.
3. Add knowledge/RAG primitives and conversation context.
4. Add bounded AI tools and human escalation.
5. Add MobiWave communication channels: SMS, WhatsApp, USSD and email.
6. Add Kenyan billing primitives: KES pricing, prepaid credits, M-Pesa and invoices.
7. Add workflow automation and bounded agents.

## Configuration

The first configuration boundary is exposed through `Rails.application.config.x.candy_ai`.

Supported environment variables:

- `CANDYAI_ENABLED`
- `CANDYAI_BRAND_NAME`
- `CANDYAI_COMPANY_NAME`
- `CANDYAI_DEFAULT_AI_PROVIDER`

Secrets and provider credentials must remain in environment/secret management and must never be committed to the repository.

## Design rules

- Prefer additive modules and services over invasive Chatwoot core changes.
- Keep AI provider-specific code behind an adapter interface.
- Keep telecom provider-specific code behind channel/service adapters.
- Keep billing isolated from conversation logic.
- Every autonomous capability must have explicit tool boundaries, authorization, logging and a human fallback.
- Preserve upstream upgradeability as a first-class constraint.
