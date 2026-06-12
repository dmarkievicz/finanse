-- Zdjęcie karty / konta w Storage + metadata na accounts

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'account-photos',
  'account-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "account_photos_select_own" ON storage.objects;
DROP POLICY IF EXISTS "account_photos_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "account_photos_update_own" ON storage.objects;
DROP POLICY IF EXISTS "account_photos_delete_own" ON storage.objects;

CREATE POLICY "account_photos_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'account-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "account_photos_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'account-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "account_photos_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'account-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "account_photos_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'account-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
