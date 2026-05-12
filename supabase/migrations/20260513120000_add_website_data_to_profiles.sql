ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS website_data text NOT NULL DEFAULT '';
