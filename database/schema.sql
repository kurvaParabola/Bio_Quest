-- Buat tabel users di schema public
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_lengkap TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL, /* Catatan: Menyimpan password secara teks biasa umumnya tidak disarankan, Supabase Auth sudah menyimpan hash password dengan aman di auth.users */
  role TEXT NOT NULL DEFAULT 'student',
  nisn VARCHAR(20),
  avatar_url TEXT,
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

-- 6. Buat Tabel quizzes
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  quiz_type TEXT NOT NULL DEFAULT 'quiz', -- 'pretest', 'posttest', 'quiz'
  settings JSONB DEFAULT '{}'::jsonb,
  target_class_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Buat Tabel questions
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT,
  question_media TEXT,
  question_type TEXT NOT NULL,
  options JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Buat Tabel quiz_classes (Assign kuis ke banyak kelas)
CREATE TABLE public.quiz_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(quiz_id, class_id)
);

-- 9. Buat Tabel quiz_submissions (Pengerjaan Kuis Siswa)
CREATE TABLE public.quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  max_score NUMERIC NOT NULL DEFAULT 0,
  percentage NUMERIC NOT NULL DEFAULT 0,
  answers JSONB DEFAULT '{}'::jsonb,
  results JSONB DEFAULT '[]'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(quiz_id, student_id)
);

-- 10. Row Level Security untuk Kuis, Pertanyaan, dan Submisi
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guru kelola kuis sendiri" ON public.quizzes
  FOR ALL USING (auth.uid() = teacher_id);

CREATE POLICY "Semua user bisa melihat kuis published" ON public.quizzes
  FOR SELECT USING (status = 'published');

CREATE POLICY "Guru kelola questions" ON public.questions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.quizzes WHERE id = questions.quiz_id AND teacher_id = auth.uid())
  );

CREATE POLICY "User bisa membaca pertanyaan kuis" ON public.questions
  FOR SELECT USING (true);

CREATE POLICY "Guru kelola kelas kuis" ON public.quiz_classes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.quizzes WHERE id = quiz_classes.quiz_id AND teacher_id = auth.uid())
  );

CREATE POLICY "User bisa membaca quiz_classes" ON public.quiz_classes
  FOR SELECT USING (true);

CREATE POLICY "Siswa simpan pengerjaan kuis sendiri" ON public.quiz_submissions
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Siswa update pengerjaan kuis sendiri" ON public.quiz_submissions
  FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Siswa lihat hasil kuis sendiri" ON public.quiz_submissions
  FOR SELECT USING (
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM public.quizzes WHERE id = quiz_submissions.quiz_id AND teacher_id = auth.uid())
  );
