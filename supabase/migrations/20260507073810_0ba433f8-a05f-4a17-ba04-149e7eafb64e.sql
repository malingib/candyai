
-- 1) Restrict storage listing on public chat-uploads bucket: scope SELECT to file owners
DROP POLICY IF EXISTS "Public read chat files" ON storage.objects;

CREATE POLICY "Users can read own chat files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 2) Lock down SECURITY DEFINER functions
-- Trigger-only functions: revoke EXECUTE from all client roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_ticket_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_ticket_first_response() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- RLS-helper functions: only authenticated needs them; revoke from public/anon
REVOKE EXECUTE ON FUNCTION public.get_ai_chat_owner(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_conversation_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ai_chat_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversation_owner(uuid) TO authenticated;
