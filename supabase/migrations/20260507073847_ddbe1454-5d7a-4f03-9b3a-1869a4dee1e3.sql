
-- Replace messages policies (drop helper get_conversation_owner usage)
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;

CREATE POLICY "Users can view own messages"
ON public.messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.conversations c
  WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
));

CREATE POLICY "Users can insert own messages"
ON public.messages FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.conversations c
  WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
));

-- Replace ai_chat_messages policies (drop helper get_ai_chat_owner usage)
DROP POLICY IF EXISTS "Users can view own ai_chat_messages" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Users can insert own ai_chat_messages" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Users can delete own ai_chat_messages" ON public.ai_chat_messages;

CREATE POLICY "Users can view own ai_chat_messages"
ON public.ai_chat_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.ai_chats c
  WHERE c.id = ai_chat_messages.chat_id AND c.user_id = auth.uid()
));

CREATE POLICY "Users can insert own ai_chat_messages"
ON public.ai_chat_messages FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.ai_chats c
  WHERE c.id = ai_chat_messages.chat_id AND c.user_id = auth.uid()
));

CREATE POLICY "Users can delete own ai_chat_messages"
ON public.ai_chat_messages FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.ai_chats c
  WHERE c.id = ai_chat_messages.chat_id AND c.user_id = auth.uid()
));

-- Now safely drop the helper functions
DROP FUNCTION IF EXISTS public.get_conversation_owner(uuid);
DROP FUNCTION IF EXISTS public.get_ai_chat_owner(uuid);
