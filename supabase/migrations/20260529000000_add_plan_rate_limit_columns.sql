ALTER TABLE public.billing_plans
  ADD COLUMN IF NOT EXISTS rate_limit_ip integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS rate_limit_user integer NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS rate_limit_session integer NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS rate_limit_window_ms integer NOT NULL DEFAULT 60000;

UPDATE public.billing_plans SET
  rate_limit_ip = CASE
    WHEN plan = 'free' THEN 20
    WHEN plan = 'growth' THEN 60
    WHEN plan = 'premium' THEN 120
    WHEN plan = 'enterprise' THEN 300
    ELSE 60
  END,
  rate_limit_user = CASE
    WHEN plan = 'free' THEN 40
    WHEN plan = 'growth' THEN 120
    WHEN plan = 'premium' THEN 240
    WHEN plan = 'enterprise' THEN 600
    ELSE 120
  END,
  rate_limit_session = CASE
    WHEN plan = 'free' THEN 30
    WHEN plan = 'growth' THEN 90
    WHEN plan = 'premium' THEN 180
    WHEN plan = 'enterprise' THEN 400
    ELSE 90
  END;
