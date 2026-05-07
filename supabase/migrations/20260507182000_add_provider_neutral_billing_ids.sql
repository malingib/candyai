ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS billing_customer_id text,
ADD COLUMN IF NOT EXISTS billing_subscription_id text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS billing_customer_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_billing_subscription_unique
  ON public.subscriptions(provider, billing_subscription_id)
  WHERE billing_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_billing_customer_id
  ON public.profiles(billing_customer_id);
