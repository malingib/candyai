-- Create ticket activities table for timeline
CREATE TABLE public.ticket_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('created','status_change','priority_change','assignment','comment','resolution')),
  from_value TEXT,
  to_value TEXT,
  comment TEXT,
  actor_name TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_activities_ticket ON public.ticket_activities(ticket_id, created_at DESC);

ALTER TABLE public.ticket_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ticket activities" ON public.ticket_activities
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ticket activities" ON public.ticket_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own ticket activities" ON public.ticket_activities
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger: log ticket creation + changes
CREATE OR REPLACE FUNCTION public.log_ticket_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ticket_activities (ticket_id, user_id, activity_type, to_value)
    VALUES (NEW.id, NEW.user_id, 'created', NEW.subject);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.ticket_activities (ticket_id, user_id, activity_type, from_value, to_value)
      VALUES (NEW.id, NEW.user_id, 'status_change', OLD.status::text, NEW.status::text);
    END IF;
    IF NEW.priority IS DISTINCT FROM OLD.priority THEN
      INSERT INTO public.ticket_activities (ticket_id, user_id, activity_type, from_value, to_value)
      VALUES (NEW.id, NEW.user_id, 'priority_change', OLD.priority::text, NEW.priority::text);
    END IF;
    IF COALESCE(NEW.assigned_to,'') IS DISTINCT FROM COALESCE(OLD.assigned_to,'') THEN
      INSERT INTO public.ticket_activities (ticket_id, user_id, activity_type, from_value, to_value)
      VALUES (NEW.id, NEW.user_id, 'assignment', OLD.assigned_to, NEW.assigned_to);
    END IF;
    IF COALESCE(NEW.resolution,'') IS DISTINCT FROM COALESCE(OLD.resolution,'') AND NEW.resolution IS NOT NULL AND NEW.resolution <> '' THEN
      INSERT INTO public.ticket_activities (ticket_id, user_id, activity_type, comment)
      VALUES (NEW.id, NEW.user_id, 'resolution', NEW.resolution);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_ticket_activity
AFTER INSERT OR UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.log_ticket_activity();

-- updated_at trigger for tickets if missing
DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tickets;
CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();