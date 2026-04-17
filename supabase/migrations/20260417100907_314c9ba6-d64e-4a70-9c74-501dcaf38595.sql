-- SLA tracking: add first_response_at to tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz;

-- Canned response templates table
CREATE TABLE IF NOT EXISTS public.canned_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  shortcut text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own canned_responses"
  ON public.canned_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own canned_responses"
  ON public.canned_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own canned_responses"
  ON public.canned_responses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own canned_responses"
  ON public.canned_responses FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_canned_responses_updated_at
  BEFORE UPDATE ON public.canned_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to set first_response_at when an agent posts the first comment on a ticket
CREATE OR REPLACE FUNCTION public.set_ticket_first_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.activity_type = 'comment' THEN
    UPDATE public.tickets
    SET first_response_at = COALESCE(first_response_at, now())
    WHERE id = NEW.ticket_id AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_ticket_first_response ON public.ticket_activities;
CREATE TRIGGER trg_set_ticket_first_response
  AFTER INSERT ON public.ticket_activities
  FOR EACH ROW EXECUTE FUNCTION public.set_ticket_first_response();