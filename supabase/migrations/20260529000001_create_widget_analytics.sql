CREATE TABLE IF NOT EXISTS public.widget_analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL,
  event text NOT NULL,
  conversation_id uuid,
  page_url text,
  page_title text,
  widget_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_business FOREIGN KEY (business_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_widget_analytics_business_id ON public.widget_analytics(business_id);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_event ON public.widget_analytics(event);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_created_at ON public.widget_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_business_event ON public.widget_analytics(business_id, event, created_at DESC);

ALTER TABLE public.widget_analytics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'widget_analytics' AND policyname = 'Business can view own analytics'
  ) THEN
    CREATE POLICY "Business can view own analytics"
      ON public.widget_analytics
      FOR SELECT
      USING (business_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'widget_analytics' AND policyname = 'Admins can view all analytics'
  ) THEN
    CREATE POLICY "Admins can view all analytics"
      ON public.widget_analytics
      FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'widget_analytics' AND policyname = 'Service role can insert analytics'
  ) THEN
    CREATE POLICY "Service role can insert analytics"
      ON public.widget_analytics
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT ON public.widget_analytics TO authenticated;
GRANT INSERT ON public.widget_analytics TO anon, authenticated, service_role;
