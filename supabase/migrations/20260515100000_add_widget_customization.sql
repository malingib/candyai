
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS quick_replies TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS widget_position TEXT NOT NULL DEFAULT 'right';
