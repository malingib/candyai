-- Public bucket for widget branding assets (e.g., logo images).
INSERT INTO storage.buckets (id, name, public)
VALUES ('widget-assets', 'widget-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Clean up if policies already exist.
DROP POLICY IF EXISTS "widget-assets public read" ON storage.objects;
DROP POLICY IF EXISTS "widget-assets owner insert" ON storage.objects;
DROP POLICY IF EXISTS "widget-assets owner update" ON storage.objects;
DROP POLICY IF EXISTS "widget-assets owner delete" ON storage.objects;

-- Anyone can read widget assets (needed for public widget/logo rendering).
CREATE POLICY "widget-assets public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'widget-assets');

-- Only signed-in users can manage files inside their own folder.
CREATE POLICY "widget-assets owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'widget-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "widget-assets owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'widget-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "widget-assets owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'widget-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
