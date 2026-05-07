-- Reconcile Paystack entitlements from trusted checkout references

ALTER TABLE public.subscriptions
  ALTER COLUMN stripe_customer_id DROP NOT NULL,
  ALTER COLUMN stripe_subscription_id DROP NOT NULL;

-- Keep legacy unique index if present, but add provider-native uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_provider_ref_unique
  ON public.subscriptions(provider, provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.paystack_checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_plan text NOT NULL,
  requested_plan_code text,
  amount_kobo integer NOT NULL,
  status text NOT NULL DEFAULT 'initialized',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

ALTER TABLE public.paystack_checkout_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.paystack_checkout_sessions FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE public.paystack_checkout_sessions TO service_role;

CREATE INDEX IF NOT EXISTS idx_paystack_checkout_sessions_user_created
  ON public.paystack_checkout_sessions(user_id, created_at DESC);
