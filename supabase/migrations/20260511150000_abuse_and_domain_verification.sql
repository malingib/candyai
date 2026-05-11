-- Anti-abuse telemetry for signup and domain verification controls.
CREATE TABLE IF NOT EXISTS public.signup_risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  domain text NOT NULL,
  ip text,
  user_agent text,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signup_risk_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='signup_risk_events' AND policyname='No direct client read signup risk'
  ) THEN
    CREATE POLICY "No direct client read signup risk"
      ON public.signup_risk_events
      FOR SELECT
      TO authenticated
      USING (false);
  END IF;
END $$;

GRANT SELECT, INSERT ON public.signup_risk_events TO service_role;

ALTER TABLE public.widget_domains
  ADD COLUMN IF NOT EXISTS verification_token text,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

UPDATE public.widget_domains
SET verification_token = COALESCE(verification_token, md5(random()::text || clock_timestamp()::text || user_id::text || origin))
WHERE verification_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS widget_domains_user_origin_unique
ON public.widget_domains(user_id, origin);

CREATE INDEX IF NOT EXISTS widget_domains_user_verified_idx
ON public.widget_domains(user_id, is_active, is_verified);
