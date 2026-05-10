-- Extended billing/trial fields.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS leads_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leads_limit integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS subscription_started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS grace_expires_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trial_expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days');

-- Make existing rows consistent.
UPDATE public.profiles
SET trial_started_at = COALESCE(trial_started_at, created_at, now()),
    trial_expires_at = COALESCE(trial_expires_at, COALESCE(created_at, now()) + interval '7 days'),
    subscription_started_at = COALESCE(subscription_started_at, created_at, now()),
    leads_limit = CASE
      WHEN plan = 'free' THEN 30
      WHEN plan = 'growth' THEN 1000
      WHEN plan = 'premium' THEN 5000
      WHEN plan = 'enterprise' THEN GREATEST(COALESCE(leads_limit, 20000), 20000)
      ELSE COALESCE(leads_limit, 30)
    END;

-- Helper for rolling 30-day windows.
CREATE OR REPLACE FUNCTION public.roll_period_start(
  p_start timestamptz,
  p_now timestamptz
)
RETURNS timestamptz
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s timestamptz := p_start;
BEGIN
  IF s IS NULL THEN
    RETURN p_now;
  END IF;
  WHILE (s + interval '30 days') <= p_now LOOP
    s := s + interval '30 days';
  END LOOP;
  RETURN s;
END;
$$;

-- Plan limits normalized to agreed commercial policy.
CREATE OR REPLACE FUNCTION public.normalize_profile_plan_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.plan = 'free' THEN
    NEW.chats_limit := 20;
    NEW.leads_limit := 30;
  ELSIF NEW.plan = 'growth' THEN
    NEW.chats_limit := GREATEST(COALESCE(NEW.chats_limit, 2000), 2000);
    NEW.leads_limit := GREATEST(COALESCE(NEW.leads_limit, 1000), 1000);
  ELSIF NEW.plan = 'premium' THEN
    NEW.chats_limit := GREATEST(COALESCE(NEW.chats_limit, 10000), 10000);
    NEW.leads_limit := GREATEST(COALESCE(NEW.leads_limit, 5000), 5000);
  ELSIF NEW.plan = 'enterprise' THEN
    NEW.chats_limit := GREATEST(COALESCE(NEW.chats_limit, 99999), 99999);
    NEW.leads_limit := GREATEST(COALESCE(NEW.leads_limit, 20000), 20000);
  END IF;
  RETURN NEW;
END;
$$;

-- Chat quota consumer with trial, expiry, grace, and 30-day rolling windows.
CREATE OR REPLACE FUNCTION public.consume_chat_quota(p_user_id uuid)
RETURNS TABLE (
  allowed boolean,
  reason text,
  chats_used integer,
  chats_limit integer,
  remaining integer,
  resets_at timestamptz,
  plan text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.profiles%ROWTYPE;
  now_ts timestamptz := now();
  period_start timestamptz;
  period_end timestamptz;
  effective_plan text;
  effective_limit integer;
BEGIN
  SELECT * INTO p
  FROM public.profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'profile_not_found', 0, 0, 0, now_ts, 'free';
    RETURN;
  END IF;

  -- Free trial expires after 7 days and then requires paid subscription.
  IF p.plan = 'free' AND p.trial_expires_at < now_ts THEN
    period_start := public.roll_period_start(COALESCE(p.chats_period_started_at, p.trial_started_at, now_ts), now_ts);
    period_end := period_start + interval '30 days';
    RETURN QUERY SELECT false, 'trial_expired_payment_required', p.chats_used, p.chats_limit, GREATEST(p.chats_limit - p.chats_used, 0), period_end, p.plan;
    RETURN;
  END IF;

  period_start := public.roll_period_start(COALESCE(p.chats_period_started_at, p.subscription_started_at, now_ts), now_ts);
  period_end := period_start + interval '30 days';
  IF period_start <> p.chats_period_started_at THEN
    p.chats_used := 0;
    p.leads_used := 0;
    p.chats_period_started_at := period_start;
  END IF;

  effective_plan := p.plan;
  effective_limit := p.chats_limit;

  -- Expired paid plan: 3-day grace at free-tier chat limits.
  IF p.plan <> 'free' AND p.billing_expires_at IS NOT NULL AND p.billing_expires_at < now_ts THEN
    IF p.grace_expires_at IS NULL THEN
      p.grace_expires_at := p.billing_expires_at + interval '3 days';
    END IF;
    IF now_ts <= p.grace_expires_at THEN
      effective_plan := p.plan || '_grace';
      effective_limit := 20;
    ELSE
      RETURN QUERY SELECT false, 'subscription_expired_payment_required', p.chats_used, 20, GREATEST(20 - p.chats_used, 0), period_end, p.plan;
      RETURN;
    END IF;
  END IF;

  IF p.chats_used >= effective_limit THEN
    UPDATE public.profiles
    SET chats_used = p.chats_used,
        leads_used = p.leads_used,
        chats_period_started_at = p.chats_period_started_at,
        grace_expires_at = p.grace_expires_at,
        updated_at = now_ts
    WHERE user_id = p_user_id;

    RETURN QUERY SELECT false, 'limit_reached', p.chats_used, effective_limit, GREATEST(effective_limit - p.chats_used, 0), period_end, effective_plan;
    RETURN;
  END IF;

  p.chats_used := p.chats_used + 1;

  UPDATE public.profiles
  SET chats_used = p.chats_used,
      leads_used = p.leads_used,
      chats_period_started_at = p.chats_period_started_at,
      grace_expires_at = p.grace_expires_at,
      updated_at = now_ts
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT true, 'ok', p.chats_used, effective_limit, GREATEST(effective_limit - p.chats_used, 0), period_end, effective_plan;
END;
$$;

-- Lead quota consumer (same policy model as chats).
CREATE OR REPLACE FUNCTION public.consume_lead_quota(p_user_id uuid)
RETURNS TABLE (
  allowed boolean,
  reason text,
  leads_used integer,
  leads_limit integer,
  remaining integer,
  resets_at timestamptz,
  plan text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.profiles%ROWTYPE;
  now_ts timestamptz := now();
  period_start timestamptz;
  period_end timestamptz;
  effective_plan text;
  effective_limit integer;
BEGIN
  SELECT * INTO p
  FROM public.profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'profile_not_found', 0, 0, 0, now_ts, 'free';
    RETURN;
  END IF;

  IF p.plan = 'free' AND p.trial_expires_at < now_ts THEN
    period_start := public.roll_period_start(COALESCE(p.chats_period_started_at, p.trial_started_at, now_ts), now_ts);
    period_end := period_start + interval '30 days';
    RETURN QUERY SELECT false, 'trial_expired_payment_required', p.leads_used, p.leads_limit, GREATEST(p.leads_limit - p.leads_used, 0), period_end, p.plan;
    RETURN;
  END IF;

  period_start := public.roll_period_start(COALESCE(p.chats_period_started_at, p.subscription_started_at, now_ts), now_ts);
  period_end := period_start + interval '30 days';
  IF period_start <> p.chats_period_started_at THEN
    p.chats_used := 0;
    p.leads_used := 0;
    p.chats_period_started_at := period_start;
  END IF;

  effective_plan := p.plan;
  effective_limit := p.leads_limit;

  IF p.plan <> 'free' AND p.billing_expires_at IS NOT NULL AND p.billing_expires_at < now_ts THEN
    IF p.grace_expires_at IS NULL THEN
      p.grace_expires_at := p.billing_expires_at + interval '3 days';
    END IF;
    IF now_ts <= p.grace_expires_at THEN
      effective_plan := p.plan || '_grace';
      effective_limit := 30;
    ELSE
      RETURN QUERY SELECT false, 'subscription_expired_payment_required', p.leads_used, 30, GREATEST(30 - p.leads_used, 0), period_end, p.plan;
      RETURN;
    END IF;
  END IF;

  IF p.leads_used >= effective_limit THEN
    UPDATE public.profiles
    SET chats_used = p.chats_used,
        leads_used = p.leads_used,
        chats_period_started_at = p.chats_period_started_at,
        grace_expires_at = p.grace_expires_at,
        updated_at = now_ts
    WHERE user_id = p_user_id;

    RETURN QUERY SELECT false, 'limit_reached', p.leads_used, effective_limit, GREATEST(effective_limit - p.leads_used, 0), period_end, effective_plan;
    RETURN;
  END IF;

  p.leads_used := p.leads_used + 1;

  UPDATE public.profiles
  SET chats_used = p.chats_used,
      leads_used = p.leads_used,
      chats_period_started_at = p.chats_period_started_at,
      grace_expires_at = p.grace_expires_at,
      updated_at = now_ts
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT true, 'ok', p.leads_used, effective_limit, GREATEST(effective_limit - p.leads_used, 0), period_end, effective_plan;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_chat_quota(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_lead_quota(uuid) TO authenticated, service_role;

-- Payments/audit table.
CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'stripe',
  event_type text NOT NULL,
  event_id text,
  amount_cents integer,
  currency text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own billing events" ON public.billing_events;
CREATE POLICY "Users can view own billing events"
  ON public.billing_events FOR SELECT
  USING (auth.uid() = user_id);
