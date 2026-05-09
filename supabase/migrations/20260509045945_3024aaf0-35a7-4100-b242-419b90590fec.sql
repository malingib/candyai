
-- 1) Lock down SECURITY DEFINER trigger functions: revoke from public/authenticated/anon
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_ticket_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_ticket_first_response() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
-- has_role must remain callable by authenticated for RLS evaluation; keep default

-- 2) Make chat-uploads bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-uploads';

-- Replace permissive chat-uploads policies with per-user folder policies
DROP POLICY IF EXISTS "Users can upload chat files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update chat files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete chat files" ON storage.objects;
DROP POLICY IF EXISTS "Public chat files read" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat files" ON storage.objects;

CREATE POLICY "chat-uploads owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "chat-uploads owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "chat-uploads owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "chat-uploads owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3) Realtime authorization: restrict subscription to topics owned by the user
-- Topic conventions used by the app: "conversations:<user_id>" and "messages:<user_id>"
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can receive own realtime" ON realtime.messages;
CREATE POLICY "Authenticated can receive own realtime"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    realtime.topic() = 'conversations:' || auth.uid()::text
    OR realtime.topic() = 'messages:' || auth.uid()::text
  );

-- 4) profiles INSERT policy (handle_new_user trigger runs as definer; this allows manual insert by owner too)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 5) smtp_settings DELETE policy
CREATE POLICY "Users can delete own smtp"
  ON public.smtp_settings FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
