-- ==============================================================================
-- FIX: Pembersihan Avatar Base64 Raksasa Penyebab Error 431 / Header Too Large
-- Jalankan skrip ini langsung di Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Hapus avatar_url base64 raksasa dari auth.users (user_metadata)
--    String base64 ini sebelumnya ikut terenkripsi ke dalam JWT Access Token,
--    membuat header Authorization membengkak hingga 300 Kilobyte!
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data - 'avatar_url'
WHERE raw_user_meta_data->>'avatar_url' LIKE 'data:image%';

-- 2. Bersihkan juga foto base64 raksasa lama dari tabel public.users
UPDATE public.users 
SET avatar_url = NULL 
WHERE avatar_url LIKE 'data:image%';

-- 3. Verifikasi hasil pembersihan (token length akan kembali normal < 1KB)
SELECT 
  id, 
  email, 
  LENGTH(COALESCE(raw_user_meta_data::text, '')) as metadata_length,
  raw_user_meta_data 
FROM auth.users;

