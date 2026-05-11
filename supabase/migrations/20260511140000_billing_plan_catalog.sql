-- Canonical billing plan catalog for enforcement and pricing consistency.
CREATE TABLE IF NOT EXISTS public.billing_plans (
  plan text PRIMARY KEY,
  display_name text NOT NULL,
  amount_kes integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'KES',
  chats_limit integer NOT NULL,
  leads_limit integer NOT NULL,
  widget_sites_limit integer NOT NULL,
  trial_days integer NOT NULL DEFAULT 0,
  is_public boolean NOT NULL DEFAULT true,
  is_checkout_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_plans_plan_check CHECK (plan IN ('free', 'growth', 'premium', 'enterprise')),
  CONSTRAINT billing_plans_non_negative_check CHECK (
    amount_kes >= 0 AND chats_limit >= 0 AND leads_limit >= 0 AND widget_sites_limit >= 0 AND trial_days >= 0
  )
);

INSERT INTO public.billing_plans (plan, display_name, amount_kes, currency, chats_limit, leads_limit, widget_sites_limit, trial_days, is_public, is_checkout_enabled)
VALUES
  ('free', 'Starter', 0, 'KES', 20, 30, 1, 7, true, false),
  ('growth', 'Growth', 5000, 'KES', 2000, 1000, 1, 0, true, true),
  ('premium', 'Premium', 10000, 'KES', 10000, 5000, 2, 0, true, true),
  ('enterprise', 'Enterprise', 0, 'KES', 99999, 20000, 4, 0, true, false)
ON CONFLICT (plan) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  amount_kes = EXCLUDED.amount_kes,
  currency = EXCLUDED.currency,
  chats_limit = EXCLUDED.chats_limit,
  leads_limit = EXCLUDED.leads_limit,
  widget_sites_limit = EXCLUDED.widget_sites_limit,
  trial_days = EXCLUDED.trial_days,
  is_public = EXCLUDED.is_public,
  is_checkout_enabled = EXCLUDED.is_checkout_enabled,
  updated_at = now();

ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'billing_plans' AND policyname = 'Billing plans readable by everyone'
  ) THEN
    CREATE POLICY "Billing plans readable by everyone"
      ON public.billing_plans
      FOR SELECT
      USING (true);
  END IF;
END $$;

GRANT SELECT ON public.billing_plans TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.normalize_profile_plan_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg public.billing_plans%ROWTYPE;
BEGIN
  SELECT * INTO cfg
  FROM public.billing_plans
  WHERE plan = NEW.plan;

  IF NOT FOUND THEN
    SELECT * INTO cfg
    FROM public.billing_plans
    WHERE plan = 'free';
  END IF;

  NEW.chats_limit := cfg.chats_limit;
  NEW.leads_limit := cfg.leads_limit;
  NEW.widget_sites_limit := cfg.widget_sites_limit;

  RETURN NEW;
END;
$$;

UPDATE public.profiles p
SET
  chats_limit = bp.chats_limit,
  leads_limit = bp.leads_limit,
  widget_sites_limit = bp.widget_sites_limit,
  updated_at = now()
FROM public.billing_plans bp
WHERE p.plan = bp.plan;
