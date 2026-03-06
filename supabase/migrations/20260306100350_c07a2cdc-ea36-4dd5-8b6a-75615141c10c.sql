
-- Storage bucket for AI chat file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-uploads', 'chat-uploads', true);

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload chat files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-uploads');

-- Allow anyone to read (for rendering in chat)
CREATE POLICY "Public read chat files"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'chat-uploads');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own chat files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
