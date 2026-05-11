-- Adjust widget domain limits policy:
-- free: 1, growth: 1, premium: 2, enterprise: 4

UPDATE public.profiles
SET widget_sites_limit = CASE
  WHEN plan = 'free' THEN 1
  WHEN plan = 'growth' THEN 1
  WHEN plan = 'premium' THEN 2
  WHEN plan = 'enterprise' THEN 4
  ELSE 1
END;

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
    NEW.widget_sites_limit := 1;
  ELSIF NEW.plan = 'premium' THEN
    NEW.chats_limit := GREATEST(COALESCE(NEW.chats_limit, 10000), 10000);
    NEW.leads_limit := GREATEST(COALESCE(NEW.leads_limit, 5000), 5000);
    NEW.widget_sites_limit := 2;
  ELSIF NEW.plan = 'enterprise' THEN
    NEW.chats_limit := GREATEST(COALESCE(NEW.chats_limit, 99999), 99999);
    NEW.leads_limit := GREATEST(COALESCE(NEW.leads_limit, 20000), 20000);
    NEW.widget_sites_limit := 4;
  ELSE
    NEW.widget_sites_limit := COALESCE(NEW.widget_sites_limit, 1);
  END IF;

  IF NEW.updated_at IS NULL THEN
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;
