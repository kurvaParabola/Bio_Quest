-- ============================================================
-- BioQuest Database Migration: Menambahkan Kolom Profil Siswa
-- Jalankan query ini di SQL Editor dashboard Supabase Anda.
-- ============================================================

-- 1. Tambahkan kolom nisn dan avatar_url ke tabel public.users jika belum ada
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS nisn VARCHAR(20),
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Pastikan izin / RLS:
-- Policy "Pengguna bisa mengedit data mereka sendiri" yang sudah ada 
-- (FOR UPDATE USING (auth.uid() = id)) secara otomatis mencakup kolom baru ini.
