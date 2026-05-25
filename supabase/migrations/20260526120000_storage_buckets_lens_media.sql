-- Ensure Storage buckets referenced by RLS policies exist (local + hosted).
-- Without these rows, createSignedUploadUrl fails with "The related resource does not exist".

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('lens-resources', 'lens-resources', false, 52428800),
  ('user-media', 'user-media', false, 20971520),
  ('artifacts', 'artifacts', false, 104857600),
  ('public-assets', 'public-assets', true, 10485760),
  ('generated-media', 'generated-media', false, 104857600),
  ('battles-media', 'battles-media', false, 52428800)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;
