-- Paystack support for Kenyan market billing

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS provider_customer_id text,
ADD COLUMN IF NOT EXISTS provider_subscription_id text,
ADD COLUMN IF NOT EXISTS provider_plan_code text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS paystack_customer_code text;

CREATE TABLE IF NOT EXISTS public.paystack_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paystack_event_id text UNIQUE,
  event_type text NOT NULL,
  processed_at timestamptz,
  processing_error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.paystack_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.paystack_webhook_events FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE public.paystack_webhook_events TO service_role;

CREATE INDEX IF NOT EXISTS idx_paystack_webhook_events_created_at ON public.paystack_webhook_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON public.subscriptions(provider);
CREATE INDEX IF NOT EXISTS idx_profiles_paystack_customer_code ON public.profiles(paystack_customer_code);
