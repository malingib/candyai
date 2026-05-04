-- Create enums for ticket status and priority
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'waiting', 'resolved', 'closed');
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status public.ticket_status NOT NULL DEFAULT 'open',
  priority public.ticket_priority NOT NULL DEFAULT 'medium',
  assigned_to TEXT DEFAULT '',
  customer_name TEXT DEFAULT '',
  customer_email TEXT DEFAULT '',
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  resolution TEXT DEFAULT '',
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own tickets"
  ON public.tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tickets"
  ON public.tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets"
  ON public.tickets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tickets"
  ON public.tickets FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_priority ON public.tickets(priority);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at DESC);