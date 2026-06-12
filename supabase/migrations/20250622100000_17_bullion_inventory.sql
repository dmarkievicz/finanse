-- Bulion Inventory: zdjęcia monet w Supabase Storage

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bullion-photos',
  'bullion-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "bullion_photos_select_own" ON storage.objects;
DROP POLICY IF EXISTS "bullion_photos_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "bullion_photos_update_own" ON storage.objects;
DROP POLICY IF EXISTS "bullion_photos_delete_own" ON storage.objects;

CREATE POLICY "bullion_photos_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bullion-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "bullion_photos_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bullion-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "bullion_photos_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'bullion-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "bullion_photos_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bullion-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
