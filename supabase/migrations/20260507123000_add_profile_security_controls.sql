ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS allowed_origins text[] NOT NULL DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS strict_website_context boolean NOT NULL DEFAULT true;

-- Keep origin values bounded and predictable.
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_allowed_origins_count_chk
CHECK (coalesce(array_length(allowed_origins, 1), 0) <= 20);
