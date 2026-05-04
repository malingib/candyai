
-- AI Chat conversations
CREATE TABLE public.ai_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New Chat',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai_chats" ON public.ai_chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ai_chats" ON public.ai_chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ai_chats" ON public.ai_chats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ai_chats" ON public.ai_chats FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_ai_chats_updated_at BEFORE UPDATE ON public.ai_chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- AI Chat messages
CREATE TABLE public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.ai_chats(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION public.get_ai_chat_owner(p_chat_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT user_id FROM public.ai_chats WHERE id = p_chat_id;
$$;

CREATE POLICY "Users can view own ai_chat_messages" ON public.ai_chat_messages FOR SELECT USING (auth.uid() = get_ai_chat_owner(chat_id));
CREATE POLICY "Users can insert own ai_chat_messages" ON public.ai_chat_messages FOR INSERT WITH CHECK (auth.uid() = get_ai_chat_owner(chat_id));
CREATE POLICY "Users can delete own ai_chat_messages" ON public.ai_chat_messages FOR DELETE USING (auth.uid() = get_ai_chat_owner(chat_id));

-- GitHub bot tokens table
CREATE TABLE public.github_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  repos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.github_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own github_tokens" ON public.github_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own github_tokens" ON public.github_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own github_tokens" ON public.github_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own github_tokens" ON public.github_tokens FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_github_tokens_updated_at BEFORE UPDATE ON public.github_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
