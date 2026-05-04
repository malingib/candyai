-- Fix ticket_activities RLS policy to check via tickets table ownership
DROP POLICY IF EXISTS "Users can view own ticket activities" ON public.ticket_activities;
DROP POLICY IF EXISTS "Users can insert own ticket activities" ON public.ticket_activities;
DROP POLICY IF EXISTS "Users can delete own ticket activities" ON public.ticket_activities;

-- Helper function to check ticket ownership
CREATE OR REPLACE FUNCTION public.get_ticket_owner_user_id(p_ticket_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.tickets WHERE id = p_ticket_id;
$$;

CREATE POLICY "Users can view own ticket activities"
  ON public.ticket_activities FOR SELECT
  USING (auth.uid() = public.get_ticket_owner_user_id(ticket_id));

CREATE POLICY "Users can insert own ticket activities"
  ON public.ticket_activities FOR INSERT
  WITH CHECK (auth.uid() = public.get_ticket_owner_user_id(ticket_id));

CREATE POLICY "Users can delete own ticket activities"
  ON public.ticket_activities FOR DELETE
  USING (auth.uid() = public.get_ticket_owner_user_id(ticket_id));

-- Trigger for ticket_activities updated_at
CREATE OR REPLACE FUNCTION public.update_ticket_activities_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ticket_activities_updated_at ON public.ticket_activities;
CREATE TRIGGER update_ticket_activities_updated_at
  BEFORE UPDATE ON public.ticket_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_ticket_activities_updated_at();

-- Add updated_at column if missing
ALTER TABLE public.ticket_activities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();