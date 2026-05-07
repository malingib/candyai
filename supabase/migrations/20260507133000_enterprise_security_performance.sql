-- 1) Distributed rate limiting + 9) cache + 6) audit + 8) circuit breaker + 4/5) db security primitives

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS monthly_inference_budget_tokens bigint NOT NULL DEFAULT 200000,
ADD COLUMN IF NOT EXISTS monthly_inference_used_tokens bigint NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS blocked_until timestamptz,
ADD COLUMN IF NOT EXISTS pii_encryption_key_id text NOT NULL DEFAULT 'v1';

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  reset_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  source text NOT NULL,
  ip text,
  origin text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.inference_cache (
  key text PRIMARY KEY,
  user_id uuid NOT NULL,
  model text NOT NULL,
  response_text text NOT NULL,
  token_cost integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inference_cache ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.model_health (
  provider text PRIMARY KEY,
  failure_count integer NOT NULL DEFAULT 0,
  last_failure_at timestamptz,
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.model_health ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.security_denylists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern text NOT NULL,
  kind text NOT NULL DEFAULT 'regex',
  scope text NOT NULL DEFAULT 'prompt',
  severity text NOT NULL DEFAULT 'high',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.security_denylists ENABLE ROW LEVEL SECURITY;

-- encrypted lead fields (deterministic enough for retrieval by id only)
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS email_enc bytea,
ADD COLUMN IF NOT EXISTS phone_enc bytea,
ADD COLUMN IF NOT EXISTS pii_key_id text NOT NULL DEFAULT 'v1';

CREATE OR REPLACE FUNCTION public.rl_consume(p_key text, p_limit integer, p_window_ms integer)
RETURNS TABLE(allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  now_ts timestamptz := now();
  reset_ts timestamptz := now_ts + make_interval(secs => GREATEST(1, p_window_ms / 1000));
  v_count integer;
  v_reset timestamptz;
BEGIN
  INSERT INTO public.rate_limit_buckets(key, count, reset_at, updated_at)
  VALUES (p_key, 1, reset_ts, now_ts)
  ON CONFLICT (key)
  DO UPDATE SET
    count = CASE WHEN public.rate_limit_buckets.reset_at <= now_ts THEN 1 ELSE public.rate_limit_buckets.count + 1 END,
    reset_at = CASE WHEN public.rate_limit_buckets.reset_at <= now_ts THEN reset_ts ELSE public.rate_limit_buckets.reset_at END,
    updated_at = now_ts
  RETURNING count, reset_at INTO v_count, v_reset;

  IF v_count > p_limit THEN
    RETURN QUERY SELECT false, GREATEST(1, ceil(extract(epoch from (v_reset - now_ts)))::int);
  ELSE
    RETURN QUERY SELECT true, 0;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_inference_budget(p_user_id uuid, p_tokens integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_rows integer;
BEGIN
  UPDATE public.profiles
  SET monthly_inference_used_tokens = monthly_inference_used_tokens + GREATEST(0, p_tokens)
  WHERE user_id = p_user_id
    AND (blocked_until IS NULL OR blocked_until < now())
    AND monthly_inference_used_tokens + GREATEST(0, p_tokens) <= monthly_inference_budget_tokens;
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id uuid,
  p_event_type text,
  p_severity text,
  p_source text,
  p_ip text,
  p_origin text,
  p_metadata jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.audit_events(user_id, event_type, severity, source, ip, origin, metadata)
  VALUES (p_user_id, p_event_type, coalesce(p_severity,'info'), p_source, p_ip, p_origin, coalesce(p_metadata, '{}'::jsonb));
$$;

CREATE OR REPLACE FUNCTION public.model_failure(p_provider text, p_threshold integer, p_block_seconds integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_count integer;
BEGIN
  INSERT INTO public.model_health(provider, failure_count, last_failure_at, updated_at)
  VALUES (p_provider, 1, now(), now())
  ON CONFLICT (provider)
  DO UPDATE SET
    failure_count = public.model_health.failure_count + 1,
    last_failure_at = now(),
    updated_at = now()
  RETURNING failure_count INTO next_count;

  IF next_count >= GREATEST(1, p_threshold) THEN
    UPDATE public.model_health
    SET blocked_until = now() + make_interval(secs => GREATEST(30, p_block_seconds)),
        failure_count = 0,
        updated_at = now()
    WHERE provider = p_provider;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.model_success(p_provider text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.model_health(provider, failure_count, updated_at)
  VALUES (p_provider, 0, now())
  ON CONFLICT (provider)
  DO UPDATE SET failure_count = 0, blocked_until = NULL, updated_at = now();
$$;

-- Restrict access; service role only for security tables/rpcs
REVOKE ALL ON TABLE public.rate_limit_buckets, public.audit_events, public.inference_cache, public.model_health, public.security_denylists FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rl_consume(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_inference_budget(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_audit_event(uuid, text, text, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.model_failure(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.model_success(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rl_consume(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_inference_budget(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_audit_event(uuid, text, text, text, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.model_failure(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.model_success(text) TO service_role;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_audit_events_user_created ON public.audit_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_type_created ON public.audit_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inference_cache_user_expires ON public.inference_cache(user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_updated ON public.rate_limit_buckets(updated_at);
CREATE INDEX IF NOT EXISTS idx_model_health_blocked ON public.model_health(blocked_until);

-- Cleanup function to avoid bloat
CREATE OR REPLACE FUNCTION public.security_housekeeping()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limit_buckets WHERE reset_at < now() - interval '1 hour';
  DELETE FROM public.inference_cache WHERE expires_at < now();
  DELETE FROM public.audit_events WHERE created_at < now() - interval '90 days';
END;
$$;

REVOKE ALL ON FUNCTION public.security_housekeeping() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.security_housekeeping() TO service_role;
