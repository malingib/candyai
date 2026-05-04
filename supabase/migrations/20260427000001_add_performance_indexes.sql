-- Add missing indexes for better query performance
-- Index on conversations.user_id for filtering
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);

-- Index on conversations.updated_at for sorting recent conversations
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);

-- Index on messages.conversation_id for faster message loading
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);

-- Index on messages.created_at for ordering
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- Index on leads.user_id for filtering
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);

-- Index on leads.created_at for sorting
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- Index on knowledge_base.user_id for filtering
CREATE INDEX IF NOT EXISTS idx_knowledge_base_user_id ON public.knowledge_base(user_id);

-- Index on ai_chats.user_id for filtering
CREATE INDEX IF NOT EXISTS idx_ai_chats_user_id ON public.ai_chats(user_id);

-- Index on ai_chat_messages.chat_id for faster message loading
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_chat_id ON public.ai_chat_messages(chat_id);

-- Composite index for common conversation queries
CREATE INDEX IF NOT EXISTS idx_conversations_user_status ON public.conversations(user_id, status);

-- Index on smtp_settings for user lookups
CREATE INDEX IF NOT EXISTS idx_smtp_settings_user_id ON public.smtp_settings(user_id);

-- Index on github_tokens for repo matching
CREATE INDEX IF NOT EXISTS idx_github_tokens_user_id ON public.github_tokens(user_id);

-- Index on github_reviews for user lookups
CREATE INDEX IF NOT EXISTS idx_github_reviews_user_id ON public.github_reviews(user_id);

-- Index on ticket_activities for timeline queries
CREATE INDEX IF NOT EXISTS idx_ticket_activities_ticket_created ON public.ticket_activities(ticket_id, created_at DESC);

-- Add updated_at column to ticket_activities if not exists
ALTER TABLE public.ticket_activities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();