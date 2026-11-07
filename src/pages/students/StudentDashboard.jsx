import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PopUp from '../../components/PopUp';
import { supabase } from '../../services/supabase';
import qikoSad from '../../assets/qiko_sad.svg';
import StudentQuizTaker from '../../components/StudentQuizTaker';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [isJoined, setIsJoined] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [popup, setPopup] = useState({ isOpen: false, type: 'success', title: '', message: '' });
  const [className, setClassName] = useState('');
  const [classId, setClassId] = useState(null);
  const [teacherId, setTeacherId] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const profileDropdownRef = useRef(null);

  // Active quiz runner state
  const [activeQuizData, setActiveQuizData] = useState(null);
  const [activeSubmission, setActiveSubmission] = useState(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);

  const [stages, setStages] = useState([
    {
      id: 'pretest',
      type: 'pretest',
      name: 'Pre-Test: Evaluasi Awal',
      description: 'Uji pemahaman dasar biologi sebelum memulai materi.',
      progress: 0,
      isLocked: false,
      isCompleted: false,
      quiz: null,
      submission: null,
      actionLabel: 'Mulai'
    },
    {
      id: 'main',
      type: 'main',
      name: 'Main Stage: Petualangan Sel',
      description: 'Eksplorasi materi utama sistem dan biologi sel dengan seru.',
      progress: 0,
      isLocked: true,
      isCompleted: false,
      actionLabel: 'Terkunci'
    },
    {
      id: 'posttest',
      type: 'posttest',
      name: 'Post-Test: Evaluasi Akhir',
      description: 'Evaluasi pemahaman akhirmu setelah menyelesaikan petualangan.',
      progress: 0,
      isLocked: true,
      isCompleted: false,
      quiz: null,
      submission: null,
      actionLabel: 'Terkunci'
    },
  ]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const CACHE_KEY_PREFIX = 'bioquest_student_v2_';

  const fetchUserDataAndClass = async (forceFresh = false) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const currentStudentId = session.user.id;
      setStudentId(currentStudentId);

      // Instant optimistic values from session metadata
      const metaName = session.user.user_metadata?.full_name || 
        session.user.user_metadata?.nama_lengkap || 
        session.user.email?.split('@')[0] || '';
      const metaAvatar = session.user.user_metadata?.avatar_url || null;

      if (metaName) {
        setFullName(metaName);
        setFirstName(metaName.split(' ')[0]);
      }
      if (metaAvatar) {
        setAvatarUrl(metaAvatar);
      }

      // Check cache for instant rendering (Stale-While-Revalidate)
      if (!forceFresh) {
        try {
          const cachedRaw = sessionStorage.getItem(CACHE_KEY_PREFIX + currentStudentId);
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            if (cached.fullName) {
              setFullName(cached.fullName);
              setFirstName(cached.fullName.split(' ')[0]);
            }
            if (cached.avatarUrl) setAvatarUrl(cached.avatarUrl);
            setIsJoined(!!cached.isJoined);
            if (cached.className) setClassName(cached.className);
            if (cached.classId) setClassId(cached.classId);
            if (cached.teacherId) setTeacherId(cached.teacherId);
            if (Array.isArray(cached.stages)) setStages(cached.stages);
            
            // Render immediately with cached data without waiting!
            setLoading(false);
          }
        } catch (cErr) {
          console.warn("Error reading student cache:", cErr);
        }
      }

      // Phase 1: Fetch user profile, class membership, and quiz submissions in PARALLEL (using limit(1) to avoid 406 PGRST116 HTTP2 resets)
      const [userRes, memberRes, subRes] = await Promise.all([
        supabase
          .from('users')
          .select('nama_lengkap, avatar_url')
          .eq('id', currentStudentId)
          .limit(1),
        supabase
          .from('class_members')
          .select('class_id, classes(id, name, teacher_id)')
          .eq('student_id', currentStudentId)
          .limit(1),
        supabase
          .from('quiz_submissions')
          .select('id, quiz_id, score, max_score, percentage')
          .eq('student_id', currentStudentId)
      ]);

      // Update name & avatar if table has custom updates
      let finalName = metaName;
      let finalAvatar = metaAvatar;
      const userData = userRes.data?.[0];
      if (userData) {
        if (userData.nama_lengkap) finalName = userData.nama_lengkap;
        if (userData.avatar_url) finalAvatar = userData.avatar_url;
      }
      if (finalName) {
        setFullName(finalName);
        setFirstName(finalName.split(' ')[0]);
      }
      if (finalAvatar) setAvatarUrl(finalAvatar);

      const memberData = memberRes.data?.[0];
      const classInfo = Array.isArray(memberData?.classes) ? memberData.classes[0] : memberData?.classes;

      if (memberData && classInfo) {
        const currentClassId = memberData.class_id || classInfo.id;
        const currentTeacherId = classInfo.teacher_id;
        const currentClassName = classInfo.name;

        setIsJoined(true);
        setClassName(currentClassName);
        setClassId(currentClassId);
        setTeacherId(currentTeacherId);

        // Phase 2: Fetch quizzes and quiz_classes in PARALLEL
        const [quizRes, qcRes] = await Promise.all([
          supabase
            .from('quizzes')
            .select('id, title, description, quiz_type, settings, target_class_ids')
            .eq('status', 'published')
            .eq('teacher_id', currentTeacherId),
          supabase
            .from('quiz_classes')
            .select('quiz_id')
            .eq('class_id', currentClassId)
        ]);

        const quizzes = quizRes.data || [];
        const targetQuizIds = new Set((qcRes.data || []).map(qc => qc.quiz_id));

        // Filter quizzes targeted to this student's class
        const classQuizzes = quizzes.filter(q => {
          if (targetQuizIds.has(q.id)) return true;
          if (Array.isArray(q.target_class_ids) && q.target_class_ids.includes(currentClassId)) return true;
          if (Array.isArray(q.settings?.target_class_ids) && q.settings.target_class_ids.includes(currentClassId)) return true;
          if (!q.target_class_ids && !q.settings?.target_class_ids) return true;
          if (Array.isArray(q.target_class_ids) && q.target_class_ids.length === 0) return true;
          return false;
        });

        const pretestQuiz = classQuizzes.find(q => (q.quiz_type || q.settings?.quiz_type) === 'pretest') || null;
        const posttestQuiz = classQuizzes.find(q => (q.quiz_type || q.settings?.quiz_type) === 'posttest') || null;

        const submissions = subRes.data || [];
        const getSubmission = (quiz) => {
          if (!quiz) return null;
          const dbSub = submissions.find(s => s.quiz_id === quiz.id);
          if (dbSub) return dbSub;
          try {
            const cached = localStorage.getItem(`bioquest_quiz_${quiz.id}_${currentStudentId}`);
            if (cached) return JSON.parse(cached);
          } catch (e) {
            console.warn(e);
          }
          return null;
        };

        const pretestSubmission = getSubmission(pretestQuiz);
        const posttestSubmission = getSubmission(posttestQuiz);

        const isPreCompleted = !!pretestSubmission;
        const isPostCompleted = !!posttestSubmission;

        const preScoreLabel = pretestSubmission ? ` (${pretestSubmission.score}/${pretestSubmission.max_score})` : '';
        const postScoreLabel = posttestSubmission ? ` (${posttestSubmission.score}/${posttestSubmission.max_score})` : '';

        const updatedStages = [
          {
            id: 'pretest',
            type: 'pretest',
            name: `Pre-Test: Evaluasi Awal${preScoreLabel}`,
            description: pretestQuiz?.description || 'Ukur pemahaman awal biologi sebelum memulai materi.',
            progress: isPreCompleted ? 100 : 0,
            isLocked: !pretestQuiz,
            isCompleted: isPreCompleted,
            quiz: pretestQuiz,
            submission: pretestSubmission,
            actionLabel: isPreCompleted ? 'Lihat Hasil' : pretestQuiz ? 'Mulai' : 'Belum Ada'
          },
          {
            id: 'main',
            type: 'main',
            name: 'Main Stage: Petualangan Sel',
            description: 'Eksplorasi materi utama sistem dan biologi sel dengan seru.',
            progress: isPreCompleted ? (isPostCompleted ? 100 : 80) : 0,
            isLocked: !isPreCompleted,
            isCompleted: isPreCompleted && isPostCompleted,
            actionLabel: !isPreCompleted ? 'Terkunci' : 'Lanjut'
          },
          {
            id: 'posttest',
            type: 'posttest',
            name: `Post-Test: Evaluasi Akhir${postScoreLabel}`,
            description: posttestQuiz?.description || 'Evaluasi pemahaman akhirmu setelah menyelesaikan petualangan.',
            progress: isPostCompleted ? 100 : 0,
            isLocked: !isPreCompleted || !posttestQuiz,
            isCompleted: isPostCompleted,
            quiz: posttestQuiz,
            submission: posttestSubmission,
            actionLabel: isPostCompleted ? 'Lihat Hasil' : (!isPreCompleted ? 'Terkunci' : posttestQuiz ? 'Mulai' : 'Belum Ada')
          }
        ];

        setStages(updatedStages);

        // Save fresh cache
        try {
          sessionStorage.setItem(CACHE_KEY_PREFIX + currentStudentId, JSON.stringify({
            studentId: currentStudentId,
            fullName: finalName,
            avatarUrl: finalAvatar,
            isJoined: true,
            className: currentClassName,
            classId: currentClassId,
            teacherId: currentTeacherId,
            stages: updatedStages
          }));
        } catch (cErr) {
          console.warn("Could not cache student data:", cErr);
        }
      } else {
        setIsJoined(false);
      }
    } catch (e) {
      console.error("Error in fetchUserDataAndClass:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDataAndClass();
  }, []);

  // Hitung rata-rata total progress untuk Tampilan Banner Aktif
  const totalProgress = Math.round(
    stages.reduce((acc, stage) => acc + stage.progress, 0) / stages.length
  );

  const handleStageAction = async (stage) => {
    if (stage.type === 'main') {
      if (stage.isLocked) {
        setPopup({
          isOpen: true,
          type: 'error',
          title: 'Stage Terkunci',
          message: 'Selesaikan Pre-Test terlebih dahulu untuk membuka petualangan Main Stage!'
        });
        return;
      }
      setPopup({
        isOpen: true,
        type: 'success',
        title: 'Petualangan Biologi',
        message: 'Kamu sedang berada di Main Stage! Pelajari materi dan siapkan dirimu untuk Post-Test.'
      });
      return;
    }

    if (stage.type === 'pretest' || stage.type === 'posttest') {
      if (!stage.quiz) {
        setPopup({
          isOpen: true,
          type: 'error',
          title: 'Kuis Belum Tersedia',
          message: `Gurumu belum menerbitkan soal untuk ${stage.type === 'pretest' ? 'Pre-Test' : 'Post-Test'}. Silakan tanyakan ke gurumu ya!`
        });
        return;
      }

      if (stage.isLocked) {
        setPopup({
          isOpen: true,
          type: 'error',
          title: 'Stage Terkunci',
          message: 'Kamu harus menyelesaikan tahapan sebelumnya terlebih dahulu!'
        });
        return;
      }

      setIsLoadingQuiz(true);
      try {
        const [questionsRes, fullSubRes] = await Promise.all([
          supabase
            .from('questions')
            .select('*')
            .eq('quiz_id', stage.quiz.id)
            .order('created_at', { ascending: true }),
          stage.isCompleted
            ? supabase
                .from('quiz_submissions')
                .select('*')
                .eq('quiz_id', stage.quiz.id)
                .eq('student_id', studentId)
                .limit(1)
            : Promise.resolve({ data: [] })
        ]);

        if (questionsRes.error || !questionsRes.data || questionsRes.data.length === 0) {
          setPopup({
            isOpen: true,
            type: 'error',
            title: 'Soal Belum Siap',
            message: 'Soal kuis belum diisi oleh guru. Silakan hubungi gurumu.'
          });
          setIsLoadingQuiz(false);
          return;
        }

        const fullQuiz = {
          ...stage.quiz,
          questions: questionsRes.data
        };

        const activeSub = (stage.isCompleted ? fullSubRes?.data?.[0] : null) || stage.submission || null;
        setActiveQuizData(fullQuiz);
        setActiveSubmission(activeSub);
      } catch (err) {
        console.error("Error loading quiz questions:", err);
        setPopup({
          isOpen: true,
          type: 'error',
          title: 'Gagal Memuat Kuis',
          message: 'Terjadi kesalahan jaringan saat memuat soal kuis.'
        });
      }
      setIsLoadingQuiz(false);
    }
  };

  const handleQuizCompleted = async () => {
    setActiveQuizData(null);
    setActiveSubmission(null);
    if (studentId) {
      try {
        sessionStorage.removeItem(CACHE_KEY_PREFIX + studentId);
      } catch (e) {
        console.warn(e);
      }
    }
    await fetchUserDataAndClass(true);
  };

  // Fungsi ketika siswa submit kode kelas
  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (isJoining) return;

    const trimmedCode = classCode.trim();
    if (!trimmedCode) {
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'Kode Kosong',
        message: 'Silakan masukkan kode kelas yang diberikan oleh gurumu.',
      });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const currentStudentId = session?.user?.id || studentId;

    if (!currentStudentId) {
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'Sesi Berakhir',
        message: 'Sesi belajarmu telah berakhir. Silakan login kembali.',
      });
      return;
    }

    setIsJoining(true);

    try {
      // 1. Cari kelas (case-insensitive via ilike dan limit 1 agar tidak return 406 PGRST116)
      const { data: classRows, error: classError } = await supabase
        .from('classes')
        .select('id, name, code, teacher_id')
        .ilike('code', trimmedCode)
        .limit(1);

      if (classError) {
        console.error("Gagal memeriksa kode kelas:", classError);
        setPopup({
          isOpen: true,
          type: 'error',
          title: 'Gangguan Jaringan',
          message: 'Gagal terhubung ke database. Silakan periksa koneksi internet Anda dan coba lagi.',
        });
        setIsJoining(false);
        return;
      }

      if (!classRows || classRows.length === 0) {
        setPopup({
          isOpen: true,
          type: 'error',
          title: 'Kode Kelas Salah',
          message: `Kode kelas "${trimmedCode.toUpperCase()}" tidak ditemukan. Silakan periksa kembali atau tanyakan kepada gurumu.`,
        });
        setIsJoining(false);
        return;
      }

      const targetClass = classRows[0];

      // 2. Cek apakah siswa sudah terdaftar di kelas (mencegah error constraint / duplicate)
      const { data: existingMembers } = await supabase
        .from('class_members')
        .select('id, class_id')
        .eq('student_id', currentStudentId)
        .limit(1);

      if (existingMembers && existingMembers.length > 0) {
        if (existingMembers[0].class_id === targetClass.id) {
          setPopup({
            isOpen: true,
            type: 'success',
            title: 'Sudah Bergabung',
            message: `Kamu sudah terdaftar di kelas ${targetClass.name}. Memuat materi belajarmu...`,
          });
          setIsJoined(true);
          setClassName(targetClass.name);
          setClassId(targetClass.id);
          setTeacherId(targetClass.teacher_id);
          await fetchUserDataAndClass(true);
          setIsJoining(false);
          return;
        } else {
          setPopup({
            isOpen: true,
            type: 'error',
            title: 'Sudah Punya Kelas',
            message: 'Kamu sudah terdaftar di kelas lain. Hubungi gurumu jika ingin berpindah kelas.',
          });
          setIsJoining(false);
          return;
        }
      }

      // 3. Bergabung ke kelas (insert ke class_members)
      const { error: joinError } = await supabase
        .from('class_members')
        .insert([{ class_id: targetClass.id, student_id: currentStudentId }]);

      if (joinError) {
        console.error("Gagal join kelas:", joinError);
        if (joinError.code === '23505') {
          setPopup({
            isOpen: true,
            type: 'success',
            title: 'Sudah Terdaftar',
            message: `Kamu sudah terdaftar di kelas ${targetClass.name}.`,
          });
          setIsJoined(true);
          setClassName(targetClass.name);
          setClassId(targetClass.id);
          setTeacherId(targetClass.teacher_id);
          await fetchUserDataAndClass(true);
        } else {
          setPopup({
            isOpen: true,
            type: 'error',
            title: 'Gagal Bergabung',
            message: joinError.message || 'Terjadi kesalahan saat bergabung ke kelas. Silakan coba lagi.',
          });
        }
        setIsJoining(false);
        return;
      }

      // 4. Sukses bergabung
      setClassName(targetClass.name);
      setClassId(targetClass.id);
      setTeacherId(targetClass.teacher_id);
      setIsJoined(true);

      setPopup({
        isOpen: true,
        type: 'success',
        title: 'Berhasil Masuk Kelas',
        message: `Hore! Kamu berhasil bergabung dengan kelas ${targetClass.name}. Selamat belajar!`,
      });

      if (currentStudentId) {
        try {
          sessionStorage.removeItem(CACHE_KEY_PREFIX + currentStudentId);
        } catch (e) {
          console.warn(e);
        }
      }
      await fetchUserDataAndClass(true);
    } catch (err) {
      console.error("Error join class:", err);
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'Terjadi Kesalahan',
        message: 'Gagal memproses permintaan bergabung. Silakan periksa jaringan internet Anda dan coba lagi.',
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleClosePopup = () => {
    const isSuccess = popup.type === 'success';
    setPopup({ ...popup, isOpen: false });
    if (isSuccess && !isJoined) {
      setIsJoined(true);
      fetchUserDataAndClass(true);
    }
  };

  const handleLogoutClick = () => {
    setPopup({
      isOpen: true,
      type: 'confirm',
      title: 'Keluar?',
      message: 'Apakah kamu yakin ingin keluar dari kelas?',
    });
  };

  const performLogout = async () => {
    try {
      if (studentId) sessionStorage.removeItem(CACHE_KEY_PREFIX + studentId);
      sessionStorage.removeItem(`bioquest_role_${studentId}`);
    } catch (e) {
      console.warn(e);
    }
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="bg-surface font-sans text-on-background min-h-screen flex flex-col items-center overflow-x-hidden">
      
      {/* PopUp Log Status */}
      <PopUp 
        isOpen={popup.isOpen}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={handleClosePopup}
        onConfirm={popup.type === 'confirm' ? performLogout : undefined}
        confirmText="Ya, Keluar"
      />

      {/* Header Section (Global/Sama untuk kedua kondisi) */}
      <header className="w-full relative pt-8 md:pt-12 pb-16 md:pb-24 px-6 md:px-8">
        {/* Background Melengkung (z-0 agar berada di bawah kartu main -mt-16) */}
        <div 
          className="absolute inset-0 bg-surface-container z-0 pointer-events-none"
          style={{ borderBottomLeftRadius: '50% 15%', borderBottomRightRadius: '50% 15%' }}
        />

        <div className="flex justify-between items-center mb-6 md:mb-8 max-w-md mx-auto w-full relative z-30">
          <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm px-3.5 py-1.5 rounded-full shadow-sm border border-[#479F88]/20">
            <i className="fa-solid fa-chalkboard-user text-[#479F88] text-xs"></i>
            <span className="text-[#479F88] font-bold tracking-wide text-xs md:text-sm font-display truncate max-w-[180px]">
              {isJoined ? className : "Belum Ada Kelas"}
            </span>
          </div>

          {/* Profile Dropdown Container (Posisi tepat di bagian button keluar) */}
          <div className="relative" ref={profileDropdownRef}>
            <button 
              type="button"
              onClick={() => setIsProfileDropdownOpen(prev => !prev)}
              className="relative w-11 h-11 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg hover:ring-2 hover:ring-[#479F88]/30 transition-all text-[#479F88] group focus:outline-none"
              title="Menu Profil"
              aria-label="Menu Profil"
              aria-expanded={isProfileDropdownOpen}
            >
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Profil" 
                  className="w-full h-full rounded-full object-cover p-0.5" 
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#e0f2ec] flex items-center justify-center text-[#479F88] group-hover:scale-105 transition-transform">
                  <i className="fa-solid fa-user text-lg md:text-xl"></i>
                </div>
              )}
              {/* Chevron indicator badge */}
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#479F88] text-white rounded-full flex items-center justify-center text-[9px] shadow-sm transition-transform duration-200 group-hover:scale-110">
                <i className={`fa-solid ${isProfileDropdownOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
              </span>
            </button>

            {/* Dropdown Menu yang Mengembang */}
            {isProfileDropdownOpen && (
              <div 
                className="absolute right-0 top-14 w-56 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-[#479F88]/15 z-50 overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-200"
                style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.08))' }}
              >
                {/* Header Info Singkat Siswa */}
                <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#e0f2ec] flex items-center justify-center overflow-hidden flex-shrink-0 text-[#479F88]">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <i className="fa-solid fa-user text-sm"></i>
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-on-background truncate font-display">
                      {fullName || firstName || "Siswa BioQuest"}
                    </p>
                    <p className="text-[11px] text-[#479F88] font-semibold font-body-md flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#479F88]"></span>
                      {isJoined ? className : "Siswa"}
                    </p>
                  </div>
                </div>

                {/* Opsi Profile dan Keluar */}
                <div className="p-1.5 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      navigate('/student/profil');
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-on-background hover:bg-[#e0f2ec] hover:text-[#479F88] transition-colors text-left group/item"
                  >
                    <span className="w-8 h-8 rounded-lg bg-[#e0f2ec]/80 group-hover/item:bg-[#479F88] text-[#479F88] group-hover/item:text-white flex items-center justify-center transition-colors">
                      <i className="fa-regular fa-id-badge text-sm"></i>
                    </span>
                    <span className="font-semibold flex-1">Profile</span>
                    <i className="fa-solid fa-chevron-right text-xs opacity-40 group-hover/item:opacity-100 group-hover/item:translate-x-0.5 transition-all text-[#479F88]"></i>
                  </button>

                  <div className="my-1 border-t border-gray-100"></div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      handleLogoutClick();
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-error hover:bg-error/10 transition-colors text-left group/logout"
                  >
                    <span className="w-8 h-8 rounded-lg bg-error/10 text-error flex items-center justify-center group-hover/logout:bg-error group-hover/logout:text-white transition-colors">
                      <i className="fa-solid fa-arrow-right-from-bracket text-sm"></i>
                    </span>
                    <span className="font-semibold flex-1">Keluar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dinamis Teks Header berdasarkan status kelas */}
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold text-[#479F88] tracking-tight font-display-lg text-center">
            Selamat Datang, {firstName || "Siswa"}!
          </h1>
          <p className="text-center text-sm text-on-background/60 mt-1 font-body-md">
            Ayo mulai petualangan belajarmu hari ini!
          </p>
        </div>
      </header>
      
      {/* Main Content Area */}
      <main className="w-full px-6 -mt-16 relative z-20 max-w-md flex-1 flex flex-col justify-start mb-6 animate-in fade-in duration-300">
        {loading ? (
          <div className="text-center py-20">
            <i className="fa-solid fa-spinner fa-spin text-4xl text-[#479F88]"></i>
          </div>
        ) : (
          <>
            {!isJoined && (
              <div className="space-y-6 w-full">
            {/* Banner Informasi */}
            <section className="bg-primary-container rounded-[40px] p-6 shadow-lg min-h-[160px] flex flex-row items-center justify-start gap-4">
              <div className="flex-shrink-0">
                <img 
                  src={qikoSad} 
                  alt="Belum ada kelas" 
                  className="w-[84px] h-[84px] object-contain"
                />
              </div>
              <div className="text-left">
                <h2 className="text-white text-xl font-bold leading-tight font-display-lg">Belum Ada Kelas Aktif</h2>
                <p className="text-white/90 text-xs mt-1 leading-relaxed font-body-md">
                  Kamu belum terdaftar di kelas manapun. Masukkan kode kelas dari gurumu untuk memulai petualanganmu!
                </p>
              </div>
            </section>
            
            {/* Form Input Kode Kelas */}
            <section className="bg-[#e0f2ec]/50 backdrop-blur-sm rounded-[32px] p-6 shadow-md border border-white/40">
              <form onSubmit={handleJoinClass} className="space-y-5 group">
                <div className="space-y-2">
                  <label className="block text-base font-bold text-on-background text-center font-label-md transition-colors duration-300 group-focus-within:text-[#479F88]" htmlFor="classCode">
                    Kode Kelas <span className="text-error">*</span>
                  </label>
                  <input 
                    type="text" id="classCode" name="classCode" value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: AB12CD" required maxLength={6}
                    className="w-full bg-surface-container border-2 border-transparent rounded-full py-4 px-6 text-center text-xl font-bold tracking-widest text-on-background uppercase focus:outline-none focus:bg-white focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/20 transition-all duration-300 font-body-md" 
                    style={{ WebkitBoxShadow: '0 0 0 1000px #e0f2ec inset' }}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={classCode.trim().length === 0 || isJoining}
                  className="w-full bg-primary-container text-white font-bold text-lg py-4 rounded-full shadow-md active:scale-95 transition-transform font-label-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isJoining ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>Memeriksa Kode...</span>
                    </>
                  ) : (
                    <span>Bergabung Kelas</span>
                  )}
                </button>
              </form>
            </section>
          </div>
        )}

        {isJoined && (
          <div className="space-y-6 w-full">
            {/* Banner Grafik Progress Belajar */}
            <section className="bg-primary-container rounded-[40px] p-6 shadow-lg text-white relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold font-display-lg">Progress Kamu</h2>
                  <p className="text-xs text-white/80 mt-1 mr-8 font-body-md italic">
                    "Luar biasa! Selangkah lagi menuju puncak petualangan!"
                  </p>
                </div>
                <div className="text-4xl font-extrabold font-display-lg bg-white/20 px-4 py-2 rounded-2xl backdrop-blur-sm">
                  {totalProgress}%
                </div>
              </div>

              {/* Grafik Indikator Progress */}
              <div className="space-y-2 mt-4 bg-black/10 p-4 rounded-2xl">
                {stages.map((stage) => (
                  <div key={stage.id} className="text-xs font-body-md">
                    <div className="flex justify-between text-white/90 mb-1">
                      <span className="flex items-center gap-1">
                        {stage.name.split(':')[0]}
                        {stage.isLocked && <i className="fa-solid fa-lock text-xs"></i>}
                      </span>
                      <span className="font-bold">{stage.progress}%</span>
                    </div>
                    <div className="w-full bg-[#387d6b] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#5af2ca]/60 h-full rounded-full transition-all duration-500" style={{ width: `${stage.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
                
            <section className="space-y-4">
              <h3 className="text-base font-bold text-on-background/80 ml-2 font-label-md">
                Stage Petualangan Kelas
              </h3>

              {stages.map((stage) => (
                <div 
                  key={stage.id}
                  className={`relative overflow-hidden rounded-[24px] p-5 flex justify-between items-center shadow-md transition-all duration-300 border-2 ${
                    stage.isLocked ? 'bg-gray-200 border-gray-300/50 opacity-70' : 'bg-[#387d6b] border-[#387d6b]/10'
                  }`}
                >
                  {/* Efek Warna Isi Progress Bar di Background Kolom */}
                  {!stage.isLocked && stage.progress > 0 && (
                    <div className="absolute top-0 left-0 bottom-0 bg-[#479F88] rounded-[22px] transition-all duration-500 z-0" style={{ width: `${stage.progress}%` }} />
                  )}

                  {/* Konten Teks Stage */}
                  <div className="z-10 flex items-center gap-3.5 pr-2 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
                      stage.isLocked
                        ? 'bg-gray-300 text-gray-500'
                        : stage.isCompleted
                        ? 'bg-white text-[#479F88] shadow-sm'
                        : 'bg-white/20 text-white'
                    }`}>
                      {stage.isLocked ? (
                        <i className="fa-solid fa-lock"></i>
                      ) : stage.isCompleted ? (
                        <i className="fa-solid fa-circle-check"></i>
                      ) : (
                        <i className="fa-regular fa-compass"></i>
                      )}
                    </div>
                    <div>
                      <span className={`text-sm md:text-base font-bold font-body-md leading-snug block ${stage.isLocked ? 'text-gray-600' : 'text-white'}`}>
                        {stage.name}
                      </span>
                      {stage.description && (
                        <span className={`text-[11px] font-body-md block mt-0.5 line-clamp-1 ${stage.isLocked ? 'text-gray-400' : 'text-white/80'}`}>
                          {stage.description}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tombol Aksi Dinamis */}
                  <div className="z-10 flex-shrink-0 ml-2">
                    {stage.isLocked ? (
                      <button 
                        type="button"
                        onClick={() => handleStageAction(stage)}
                        className="bg-gray-300 text-gray-500 text-xs font-bold py-2.5 px-4 rounded-full font-label-md cursor-pointer hover:bg-gray-400/80 transition-all flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-lock text-[10px]"></i>
                        <span>{stage.actionLabel || 'Terkunci'}</span>
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => handleStageAction(stage)}
                        disabled={isLoadingQuiz}
                        className="bg-white text-[#479F88] text-xs font-bold py-2.5 px-4 rounded-full shadow-sm hover:bg-[#e0f2ec] active:scale-95 transition-all font-label-md flex items-center gap-1.5"
                      >
                        {isLoadingQuiz ? (
                          <i className="fa-solid fa-spinner fa-spin"></i>
                        ) : stage.isCompleted ? (
                          <i className="fa-solid fa-eye text-[11px]"></i>
                        ) : (
                          <i className="fa-solid fa-play text-[10px]"></i>
                        )}
                        <span>{stage.actionLabel}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}
          </>
        )}
        
      </main>

      {/* Interactive Student Quiz Taker */}
      {activeQuizData && (
        <StudentQuizTaker
          quiz={activeQuizData}
          studentId={studentId}
          classId={classId}
          existingSubmission={activeSubmission}
          onClose={() => setActiveQuizData(null)}
          onComplete={handleQuizCompleted}
        />
      )}
      
    </div>
  );
};

export default StudentDashboard;