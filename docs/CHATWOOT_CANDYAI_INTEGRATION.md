# CandyAI + Chatwoot integration

CandyAI keeps Supabase as the application/auth/billing source of truth while Chatwoot becomes the customer-support and omnichannel service-desk engine.

## Target architecture

- **Supabase**: authentication, customer profile, plans, usage limits, Paystack billing events and AI/knowledge data.
- **Chatwoot**: conversations, agents, inboxes, email/WhatsApp/live-chat channels, assignments, labels and service-desk workflow.
- **CandyAI UI**: product/billing/AI experience and a thin integration layer around Chatwoot.
- **Paystack**: payment processor; successful paid plans update Supabase and then sync the customer's billing attributes into Chatwoot.

## Required server secrets

Set these in Supabase Edge Function secrets. Never expose the API access token as `VITE_*`.

```text
CHATWOOT_BASE_URL=https://support.mobiwaveai.co.ke
CHATWOOT_ACCOUNT_ID=<account id>
CHATWOOT_API_ACCESS_TOKEN=<agent/account API token>
CHATWOOT_INBOX_ID=<website/API inbox id>
CHATWOOT_INTERNAL_SECRET=<long random secret>
```

The integration uses Chatwoot's account API for contacts, conversations and messages. The official API supports creating/updating contacts, creating conversations and sending messages through the account endpoints.

## What is already wired

1. `supabase/functions/_shared/chatwoot.ts` — server-side Chatwoot API client.
2. `supabase/functions/chatwoot-sync` — authenticated CandyAI bridge for syncing profiles, creating conversations and sending messages.
3. `src/lib/chatwoot.ts` — browser-safe wrapper that calls the Edge Function; the Chatwoot API token never reaches the browser.
4. `paystack-webhook` — after a validated paid plan is written to `profiles`, the customer's Chatwoot contact is updated with plan/billing attributes.

## Billing data synced to Chatwoot

Contacts receive custom attributes such as:

- `candyai_user_id`
- `candyai_plan`
- `billing_status`
- `billing_expires_at`
- `subscription_started_at`
- `chats_limit`
- `leads_limit`
- `widget_sites_limit`

This allows agents to see a customer's subscription state while handling support.

## Email

Do **not** put a private Chatwoot API token or SMTP credentials into EmailJS/browser code. Chatwoot should own support email delivery once its Email Channel/SMTP is configured. If EmailJS is retained for product-side transactional messages, keep it separate from the Chatwoot API bridge and use it only for non-sensitive browser-triggered mail.

## White-label / CandyAI branding

The intended public product name is **CandyAI**. Self-hosted Chatwoot can be deployed under a CandyAI-controlled domain and its source is available for customization. However, current Chatwoot Community Edition does not include the vendor's Custom Branding feature; custom branding is listed for Premium Support/Enterprise. Do not assume Community Edition includes official white-label controls.

Recommended deployment:

```text
support.mobiwaveai.co.ke  -> self-hosted Chatwoot
mobiwaveai.co.ke          -> CandyAI product portal
```

Once the integration is stable, the Chatwoot UI can be branded through an appropriate Chatwoot plan or a separately maintained source customization.

## Next implementation step

Replace the existing CandyAI `Conversations` and `Tickets` pages with a Chatwoot-backed service-desk surface, while retaining CandyAI's Supabase billing, AI and knowledge-base modules. Existing tables should remain read-only during migration until Chatwoot is proven stable.
