-- 1. Refine Messages RLS to ensure role consistency for public insertions (via Edge Functions)
-- Note: Service role inserts messages, but we want to ensure RLS is tight for any direct client access if enabled.
-- Currently, we use Edge Functions with service role for the widget.

-- 2. Add validation for content length and characters at database level for extra safety
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS content_length_check;
ALTER TABLE public.messages
  ADD CONSTRAINT content_length_check CHECK (length(content) <= 5000);

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS name_length_check,
  DROP CONSTRAINT IF EXISTS email_length_check,
  DROP CONSTRAINT IF EXISTS phone_length_check;
ALTER TABLE public.leads
  ADD CONSTRAINT name_length_check CHECK (length(name) <= 100),
  ADD CONSTRAINT email_length_check CHECK (length(email) <= 255),
  ADD CONSTRAINT phone_length_check CHECK (length(phone) <= 30);

-- 3. Ensure profiles business_name is sanitized/length-checked
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS business_name_length_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT business_name_length_check CHECK (length(business_name) <= 100);

-- 4. Harden knowledge_base RLS
DROP POLICY IF EXISTS "Public can view kb entries for a business" ON public.knowledge_base;
-- We don't want public to view the whole KB, only the AI should access it via Service Role in Edge Functions.
-- If we ever need public access, it should be limited. For now, let's ensure it's strictly owner-only.

-- 5. Add a check for sentiment values
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS sentiment_check;
ALTER TABLE public.conversations
  ADD CONSTRAINT sentiment_check CHECK (sentiment IN ('positive', 'neutral', 'negative') OR sentiment IS NULL);

-- 6. Audit logging table for sensitive actions
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  actor_id uuid REFERENCES auth.users(id),
  target_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON public.security_audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT, INSERT ON public.security_audit_logs TO service_role;

-- 7. Ensure anonymous access is strictly controlled
-- Note: widget-conversation function uses service_role to insert data because visitors are not authenticated.
-- We must make sure 'anon' cannot directly insert into tables that don't need it.

REVOKE ALL ON public.messages FROM anon;
REVOKE ALL ON public.conversations FROM anon;
REVOKE ALL ON public.leads FROM anon;
REVOKE ALL ON public.profiles FROM anon;

GRANT SELECT ON public.billing_plans TO anon;
-- This allows the widget to see plan limits via public function if needed,
-- but usually it goes through Edge Functions.

-- 8. Secure the request_logs and client_telemetry
ALTER TABLE public.request_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No public access to request logs" ON public.request_logs;
CREATE POLICY "No public access to request logs" ON public.request_logs FOR ALL TO authenticated USING (false);

ALTER TABLE public.client_telemetry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No public access to telemetry" ON public.client_telemetry;
CREATE POLICY "No public access to telemetry" ON public.client_telemetry FOR ALL TO authenticated USING (false);

GRANT INSERT ON public.client_telemetry TO service_role;
GRANT INSERT ON public.request_logs TO service_role;
