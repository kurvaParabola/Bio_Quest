-- ==============================================================================
-- MIGRATION: Quiz Types, Class Assignment, and Student Submissions
-- BioQuest Platform
-- ==============================================================================

-- 1. Buat / Perbarui Tabel quizzes
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'published'
  quiz_type TEXT NOT NULL DEFAULT 'quiz', -- 'pretest', 'posttest', 'quiz'
  settings JSONB DEFAULT '{}'::jsonb,
  target_class_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tambahkan kolom jika tabel quizzes sudah ada sebelumnya
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quizzes' AND column_name = 'quiz_type') THEN
    ALTER TABLE public.quizzes ADD COLUMN quiz_type TEXT NOT NULL DEFAULT 'quiz';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quizzes' AND column_name = 'target_class_ids') THEN
    ALTER TABLE public.quizzes ADD COLUMN target_class_ids UUID[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quizzes' AND column_name = 'settings') THEN
    ALTER TABLE public.quizzes ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 2. Buat / Perbarui Tabel questions
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT,
  question_media TEXT,
  question_type TEXT NOT NULL,
  options JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Pastikan kolom settings ada di tabel questions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'settings') THEN
    ALTER TABLE public.questions ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 3. Tabel Relasi Kuis ke Kelas (quiz_classes)
CREATE TABLE IF NOT EXISTS public.quiz_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(quiz_id, class_id)
);

-- 4. Tabel Hasil Pengerjaan Siswa (quiz_submissions)
CREATE TABLE IF NOT EXISTS public.quiz_submissions (
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

-- 5. Aktifkan Row Level Security (RLS)
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

-- 6. Kebijakan RLS (Policies)

-- POLICIES: quizzes
DROP POLICY IF EXISTS "Guru kelola kuis sendiri" ON public.quizzes;
CREATE POLICY "Guru kelola kuis sendiri" ON public.quizzes
  FOR ALL USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Semua user bisa melihat kuis published" ON public.quizzes;
CREATE POLICY "Semua user bisa melihat kuis published" ON public.quizzes
  FOR SELECT USING (status = 'published');

-- POLICIES: questions
DROP POLICY IF EXISTS "Guru kelola questions" ON public.questions;
CREATE POLICY "Guru kelola questions" ON public.questions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.quizzes WHERE id = questions.quiz_id AND teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS "User bisa membaca pertanyaan kuis" ON public.questions;
CREATE POLICY "User bisa membaca pertanyaan kuis" ON public.questions
  FOR SELECT USING (true);

-- POLICIES: quiz_classes
DROP POLICY IF EXISTS "Guru kelola kelas kuis" ON public.quiz_classes;
CREATE POLICY "Guru kelola kelas kuis" ON public.quiz_classes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.quizzes WHERE id = quiz_classes.quiz_id AND teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS "User bisa membaca quiz_classes" ON public.quiz_classes;
CREATE POLICY "User bisa membaca quiz_classes" ON public.quiz_classes
  FOR SELECT USING (true);

-- POLICIES: quiz_submissions
DROP POLICY IF EXISTS "Siswa simpan pengerjaan kuis sendiri" ON public.quiz_submissions;
CREATE POLICY "Siswa simpan pengerjaan kuis sendiri" ON public.quiz_submissions
  FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Siswa update pengerjaan kuis sendiri" ON public.quiz_submissions;
CREATE POLICY "Siswa update pengerjaan kuis sendiri" ON public.quiz_submissions
  FOR UPDATE USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Siswa lihat hasil kuis sendiri" ON public.quiz_submissions;
CREATE POLICY "Siswa lihat hasil kuis sendiri" ON public.quiz_submissions
  FOR SELECT USING (
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM public.quizzes WHERE id = quiz_submissions.quiz_id AND teacher_id = auth.uid())
  );
