-- Forward hardening for storage ownership and high-volume dashboard queries.

UPDATE storage.buckets
SET file_size_limit = 20971520,
    allowed_mime_types = ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'text/plain',
      'text/csv'
    ]
WHERE id = 'chat-uploads';

DROP POLICY IF EXISTS "Users can upload chat files" ON storage.objects;
CREATE POLICY "Users can upload own chat files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update chat files" ON storage.objects;
CREATE POLICY "Users can update own chat files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'chat-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'chat-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
  ON public.conversations(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_tickets_user_status_updated
  ON public.tickets(user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_tickets_tags_gin
  ON public.tickets USING gin(tags);

CREATE INDEX IF NOT EXISTS idx_conversations_visitor_metadata_gin
  ON public.conversations USING gin(visitor_metadata);

CREATE INDEX IF NOT EXISTS idx_github_tokens_repos_gin
  ON public.github_tokens USING gin(repos);
