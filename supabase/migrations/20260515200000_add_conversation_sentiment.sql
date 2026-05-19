
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS sentiment TEXT;
