ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS logo_url text NOT NULL DEFAULT '';
