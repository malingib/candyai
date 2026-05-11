ALTER TABLE public.billing_plans
  ADD COLUMN IF NOT EXISTS allow_api_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_lead_capture boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_branding_removal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_advanced_analytics boolean NOT NULL DEFAULT false;

UPDATE public.billing_plans
SET
  allow_api_access = CASE WHEN plan IN ('premium', 'enterprise') THEN true ELSE false END,
  allow_lead_capture = CASE WHEN plan IN ('growth', 'premium', 'enterprise') THEN true ELSE false END,
  allow_branding_removal = CASE WHEN plan IN ('growth', 'premium', 'enterprise') THEN true ELSE false END,
  allow_advanced_analytics = CASE WHEN plan IN ('growth', 'premium', 'enterprise') THEN true ELSE false END;
