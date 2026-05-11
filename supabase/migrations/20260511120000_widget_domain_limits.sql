-- Persistent website embed limits by billing plan.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS widget_sites_limit integer NOT NULL DEFAULT 1;

UPDATE public.profiles
SET widget_sites_limit = CASE
  WHEN plan = 'free' THEN 1
  WHEN plan = 'growth' THEN 3
  WHEN plan = 'premium' THEN 10
  WHEN plan = 'enterprise' THEN 50
  ELSE COALESCE(widget_sites_limit, 1)
END;

CREATE TABLE IF NOT EXISTS public.widget_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  origin text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_widget_domains_user_origin ON public.widget_domains (user_id, origin);
CREATE INDEX IF NOT EXISTS idx_widget_domains_user_active ON public.widget_domains (user_id, is_active);

ALTER TABLE public.widget_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own widget domains" ON public.widget_domains;
CREATE POLICY "Users can view own widget domains"
  ON public.widget_domains FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all widget domains" ON public.widget_domains;
CREATE POLICY "Admins can view all widget domains"
  ON public.widget_domains FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Extend plan normalization to include widget site limits.
CREATE OR REPLACE FUNCTION public.normalize_profile_plan_limits()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.plan = 'free' THEN
    NEW.chats_limit := 20;
    NEW.leads_limit := 30;
    NEW.widget_sites_limit := 1;
  ELSIF NEW.plan = 'growth' THEN
    NEW.chats_limit := GREATEST(COALESCE(NEW.chats_limit, 2000), 2000);
    NEW.leads_limit := GREATEST(COALESCE(NEW.leads_limit, 1000), 1000);
    NEW.widget_sites_limit := GREATEST(COALESCE(NEW.widget_sites_limit, 3), 3);
  ELSIF NEW.plan = 'premium' THEN
    NEW.chats_limit := GREATEST(COALESCE(NEW.chats_limit, 10000), 10000);
    NEW.leads_limit := GREATEST(COALESCE(NEW.leads_limit, 5000), 5000);
    NEW.widget_sites_limit := GREATEST(COALESCE(NEW.widget_sites_limit, 10), 10);
  ELSIF NEW.plan = 'enterprise' THEN
    NEW.chats_limit := GREATEST(COALESCE(NEW.chats_limit, 99999), 99999);
    NEW.leads_limit := GREATEST(COALESCE(NEW.leads_limit, 20000), 20000);
    NEW.widget_sites_limit := GREATEST(COALESCE(NEW.widget_sites_limit, 50), 50);
  ELSE
    NEW.widget_sites_limit := COALESCE(NEW.widget_sites_limit, 1);
  END IF;

  IF NEW.updated_at IS NULL THEN
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;
