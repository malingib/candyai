-- Align free plan defaults and add usage/billing period tracking.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS chats_period_started_at timestamptz NOT NULL DEFAULT date_trunc('month', now()),
  ADD COLUMN IF NOT EXISTS billing_expires_at timestamptz NULL;

-- Ensure free plan aligns with product messaging unless already customized.
UPDATE public.profiles
SET chats_limit = 20
WHERE plan = 'free' AND chats_limit = 50;

-- Lightweight plan normalization.
CREATE OR REPLACE FUNCTION public.normalize_profile_plan_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.plan = 'free' THEN
    NEW.chats_limit := LEAST(COALESCE(NEW.chats_limit, 20), 20);
  ELSIF NEW.plan = 'growth' THEN
    NEW.chats_limit := GREATEST(COALESCE(NEW.chats_limit, 2000), 2000);
  ELSIF NEW.plan = 'premium' THEN
    NEW.chats_limit := GREATEST(COALESCE(NEW.chats_limit, 10000), 10000);
  ELSIF NEW.plan = 'enterprise' THEN
    NEW.chats_limit := GREATEST(COALESCE(NEW.chats_limit, 99999), 99999);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_profile_plan_limits ON public.profiles;
CREATE TRIGGER trg_normalize_profile_plan_limits
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.normalize_profile_plan_limits();

-- Atomic quota consumer (monthly window + optional billing expiry).
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
  is_expired boolean := false;
BEGIN
  SELECT * INTO p
  FROM public.profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'profile_not_found', 0, 0, 0, now_ts, 'free';
    RETURN;
  END IF;

  period_start := date_trunc('month', COALESCE(p.chats_period_started_at, now_ts));
  period_end := period_start + interval '1 month';

  IF now_ts >= period_end THEN
    p.chats_used := 0;
    p.chats_period_started_at := date_trunc('month', now_ts);
    period_start := p.chats_period_started_at;
    period_end := period_start + interval '1 month';
  END IF;

  IF p.plan <> 'free' AND p.billing_expires_at IS NOT NULL AND p.billing_expires_at < now_ts THEN
    is_expired := true;
    p.plan := 'free';
    p.chats_limit := 20;
  END IF;

  IF p.chats_used >= p.chats_limit THEN
    UPDATE public.profiles
    SET plan = p.plan,
        chats_limit = p.chats_limit,
        chats_used = p.chats_used,
        chats_period_started_at = p.chats_period_started_at,
        updated_at = now_ts
    WHERE user_id = p_user_id;

    RETURN QUERY
      SELECT false,
             CASE WHEN is_expired THEN 'plan_expired' ELSE 'limit_reached' END,
             p.chats_used,
             p.chats_limit,
             GREATEST(p.chats_limit - p.chats_used, 0),
             period_end,
             p.plan;
    RETURN;
  END IF;

  p.chats_used := p.chats_used + 1;

  UPDATE public.profiles
  SET plan = p.plan,
      chats_limit = p.chats_limit,
      chats_used = p.chats_used,
      chats_period_started_at = p.chats_period_started_at,
      updated_at = now_ts
  WHERE user_id = p_user_id;

  RETURN QUERY
    SELECT true,
           CASE WHEN is_expired THEN 'plan_expired_auto_downgraded' ELSE 'ok' END,
           p.chats_used,
           p.chats_limit,
           GREATEST(p.chats_limit - p.chats_used, 0),
           period_end,
           p.plan;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_chat_quota(uuid) TO authenticated, service_role;

-- Lead dedup helpers.
CREATE INDEX IF NOT EXISTS idx_leads_user_conversation ON public.leads(user_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_leads_user_email ON public.leads(user_id, email);
CREATE INDEX IF NOT EXISTS idx_leads_user_phone ON public.leads(user_id, phone);

-- Prevent duplicate lead records per conversation.
CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_user_conversation
ON public.leads(user_id, conversation_id)
WHERE conversation_id IS NOT NULL;
