-- =========================================================================
-- BioQuest Database Performance Optimization Migration
-- Jalankan script SQL ini di Supabase SQL Editor untuk mempercepat query:
-- 1. Dashboard Siswa (pembacaan kelas, submisi, dan kuis)
-- 2. Dashboard Guru (pembacaan anggota kelas dan daftar kuis)
-- =========================================================================

-- 1. Index pada class_members(student_id)
-- Mempercepat pencarian kelas aktif siswa (sebelumnya full table scan)
CREATE INDEX IF NOT EXISTS idx_class_members_student_id 
ON public.class_members(student_id);

-- 2. Index pada class_members(class_id)
-- Mempercepat listing siswa di dalam kelas untuk guru
CREATE INDEX IF NOT EXISTS idx_class_members_class_id 
ON public.class_members(class_id);

-- 3. Index pada quiz_submissions(student_id)
-- Mempercepat pengambilan status pengerjaan kuis siswa
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student_id 
ON public.quiz_submissions(student_id);

-- 4. Index komposit pada quiz_submissions(quiz_id, student_id)
-- Mempercepat verifikasi status kuis tertentu (Pre-Test / Post-Test)
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz_student 
ON public.quiz_submissions(quiz_id, student_id);

-- 5. Index komposit pada quizzes(teacher_id, status)
-- Mempercepat filter kuis berstatus 'published' milik guru pengajar
CREATE INDEX IF NOT EXISTS idx_quizzes_teacher_status 
ON public.quizzes(teacher_id, status);

-- 6. Index pada quiz_classes(class_id)
-- Mempercepat pemetaan kuis yang ditugaskan ke kelas siswa
CREATE INDEX IF NOT EXISTS idx_quiz_classes_class_id 
ON public.quiz_classes(class_id);

-- 7. Index pada questions(quiz_id)
-- Mempercepat load soal kuis saat siswa atau guru memulai pengerjaan/simulasi
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id 
ON public.questions(quiz_id);

