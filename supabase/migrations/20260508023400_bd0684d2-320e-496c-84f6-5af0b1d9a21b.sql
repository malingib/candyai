-- App roles + has_role function
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Structured request logs
CREATE TABLE public.request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  function_name text NOT NULL,
  event_type text NOT NULL, -- 'rate_limited' | 'error' | 'success' | 'unauthorized'
  status_code int,
  ip text,
  user_id uuid,
  session_id text,
  scope text, -- 'ip' | 'user' | 'session'
  message text,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX idx_request_logs_created_at ON public.request_logs (created_at DESC);
CREATE INDEX idx_request_logs_event_type ON public.request_logs (event_type);
CREATE INDEX idx_request_logs_function ON public.request_logs (function_name);
CREATE INDEX idx_request_logs_ip ON public.request_logs (ip);
CREATE INDEX idx_request_logs_user_id ON public.request_logs (user_id);

ALTER TABLE public.request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view request_logs" ON public.request_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Hot-path indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_activities_ticket ON public.ticket_activities (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_kb_user ON public.knowledge_base (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chats_user ON public.ai_chats (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_chat ON public.ai_chat_messages (chat_id, created_at);