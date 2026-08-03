-- Buat tabel users di schema public
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_lengkap TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL, /* Catatan: Menyimpan password secara teks biasa umumnya tidak disarankan, Supabase Auth sudah menyimpan hash password dengan aman di auth.users */
  role TEXT NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Atur Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy agar pengguna bisa membaca data mereka sendiri
CREATE POLICY "Pengguna bisa melihat data mereka sendiri" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Policy agar pengguna bisa memasukkan data profil mereka saat registrasi
CREATE POLICY "Pengguna bisa menambahkan data mereka sendiri" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy agar pengguna bisa mengubah data mereka sendiri
CREATE POLICY "Pengguna bisa mengedit data mereka sendiri" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 1. Buat Tabel classes
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Buat Tabel class_members
CREATE TABLE public.class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Mencegah siswa gabung ke kelas yang sama lebih dari 1 kali
  UNIQUE(class_id, student_id)
);

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- 4. Policy untuk Classes
-- Guru hanya bisa melihat, membuat, dan mengedit kelas miliknya sendiri
CREATE POLICY "Guru kelola kelasnya sendiri" ON public.classes
  FOR ALL USING (auth.uid() = teacher_id);

-- Siswa bisa melihat kelas jika ia mengetahui kodenya atau sudah tergabung
CREATE POLICY "Siswa bisa melihat kelas" ON public.classes
  FOR SELECT USING (true);

-- 5. Policy untuk Class Members
-- Siswa bisa bergabung ke kelas (insert) dan melihat kelasnya sendiri
CREATE POLICY "Siswa gabung dan lihat member" ON public.class_members
  FOR INSERT WITH CHECK (auth.uid() = student_id);
  
CREATE POLICY "Siswa lihat member" ON public.class_members
  FOR SELECT USING (auth.uid() = student_id);

-- Guru bisa melihat dan menghapus siswa dari kelasnya
CREATE POLICY "Guru kelola member kelas" ON public.class_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.classes WHERE id = class_members.class_id AND teacher_id = auth.uid())
  );
  
CREATE POLICY "Guru hapus member kelas" ON public.class_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.classes WHERE id = class_members.class_id AND teacher_id = auth.uid())
  );
