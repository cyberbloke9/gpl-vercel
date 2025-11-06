-- =============================================
-- STORAGE BUCKETS
-- Create buckets for checklist photos, videos, and media
-- =============================================

-- Create storage bucket for checklist media
INSERT INTO storage.buckets (id, name, public)
VALUES ('checklist-media', 'checklist-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for checklist-media bucket
DROP POLICY IF EXISTS "Authenticated users can upload checklist media" ON storage.objects;
CREATE POLICY "Authenticated users can upload checklist media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'checklist-media');

DROP POLICY IF EXISTS "Users can view checklist media" ON storage.objects;
CREATE POLICY "Users can view checklist media"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'checklist-media');

DROP POLICY IF EXISTS "Users can update their own checklist media" ON storage.objects;
CREATE POLICY "Users can update their own checklist media"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'checklist-media' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own checklist media" ON storage.objects;
CREATE POLICY "Users can delete their own checklist media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'checklist-media' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Admins can delete any checklist media" ON storage.objects;
CREATE POLICY "Admins can delete any checklist media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'checklist-media' AND public.has_role(auth.uid(), 'admin'));
