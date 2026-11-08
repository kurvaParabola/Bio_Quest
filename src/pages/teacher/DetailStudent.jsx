import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import PopUp from '../../components/PopUp';
import qikoSmile from '../../assets/qiko_smile.svg';
import qikoHype from '../../assets/qiko_hype.svg';
import qikoSad from '../../assets/qiko_sad.svg';
import qikoConfused from '../../assets/qiko_confused.svg';

const DetailStudent = () => {
    const { studentId, classId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Determine back destination based on navigation origin
    const fromPath = location.state?.from;
    const handleBack = () => {
        if (fromPath) {
            navigate(fromPath);
        } else if (classId) {
            navigate(`/teacher/classes/${classId}`);
        } else {
            navigate('/teacher/classes');
        }
    };

    // Data States
    const [loading, setLoading] = useState(true);
    const [studentProfile, setStudentProfile] = useState(null);
    const [classInfo, setClassInfo] = useState(null);
    const [assignedQuizzes, setAssignedQuizzes] = useState([]);
    const [submissions, setSubmissions] = useState([]);

    // UI States
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pretest' | 'quiz' | 'posttest'
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubmissionForReview, setSelectedSubmissionForReview] = useState(null);

    // PopUp State
    const [popup, setPopup] = useState({ isOpen: false, type: 'error', title: '', message: '' });

    // Fetch Student Details & All Learning Progress
    const fetchStudentData = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/login');
                return;
            }

            // 1. Fetch Student Profile
            const { data: userData, error: userErr } = await supabase
                .from('users')
                .select('id, nama_lengkap, email, nisn, avatar_url, created_at')
                .eq('id', studentId)
                .limit(1);

            if (userErr || !userData || userData.length === 0) {
                setPopup({
                    isOpen: true,
                    type: 'error',
                    title: 'Siswa Tidak Ditemukan',
                    message: 'Data siswa ini tidak ditemukan di sistem.'
                });
                setLoading(false);
                return;
            }

            const currentStudent = userData[0];
            setStudentProfile(currentStudent);

            // 2. Fetch Class Membership (to know which class(es) student is enrolled in)
            const { data: memberData } = await supabase
                .from('class_members')
                .select(`
                    id,
                    joined_at,
                    class_id,
                    classes (id, name, code, teacher_id)
                `)
                .eq('student_id', studentId);

            let studentClasses = [];
            if (memberData && memberData.length > 0) {
                studentClasses = memberData.map(m => ({
                    membershipId: m.id,
                    joinedAt: m.joined_at,
                    ...m.classes
                }));
            }

            // Determine relevant class context
            let currentClass = null;
            if (classId) {
                currentClass = studentClasses.find(c => c.id === classId) || null;
            }
            if (!currentClass && studentClasses.length > 0) {
                currentClass = studentClasses[0];
            }
            setClassInfo(currentClass);

            // 3. Fetch All Quizzes assigned to student's class
            const targetClassId = currentClass?.id || classId;
            let classQuizzes = [];
            let quizIdSet = new Set();

            if (targetClassId) {
                try {
                    // Check quiz_classes junction
                    const { data: qcData } = await supabase
                        .from('quiz_classes')
                        .select('quiz_id, quizzes(*)')
                        .eq('class_id', targetClassId);

                    if (qcData) {
                        qcData.forEach(qc => {
                            if (qc.quizzes) {
                                classQuizzes.push(qc.quizzes);
                                quizIdSet.add(qc.quiz_id);
                            }
                        });
                    }

                    // Also check target_class_ids array
                    const { data: directData } = await supabase
                        .from('quizzes')
                        .select('*')
                        .contains('target_class_ids', [targetClassId]);

                    if (directData) {
                        directData.forEach(dq => {
                            if (!quizIdSet.has(dq.id)) {
                                classQuizzes.push(dq);
                                quizIdSet.add(dq.id);
                            }
                        });
                    }
                } catch (qErr) {
                    console.warn('Error fetching assigned quizzes:', qErr);
                }
            }

            // Fallback: If no class quizzes, fetch published quizzes created by this teacher
            if (classQuizzes.length === 0) {
                try {
                    const { data: teacherQuizzes } = await supabase
                        .from('quizzes')
                        .select('*')
                        .eq('teacher_id', session.user.id)
                        .eq('status', 'published');

                    if (teacherQuizzes) {
                        classQuizzes = teacherQuizzes;
                    }
                } catch (tqErr) {
                    console.warn('Error fetching teacher quizzes fallback:', tqErr);
                }
            }

            setAssignedQuizzes(classQuizzes);

            // 4. Fetch All Submissions for this student
            const { data: subData, error: subErr } = await supabase
                .from('quiz_submissions')
                .select(`
                    id,
                    quiz_id,
                    student_id,
                    class_id,
                    score,
                    max_score,
                    percentage,
                    answers,
                    results,
                    completed_at,
                    quizzes (
                        id,
                        title,
                        description,
                        quiz_type,
                        settings
                    )
                `)
                .eq('student_id', studentId)
                .order('completed_at', { ascending: false });

            if (!subErr && subData) {
                setSubmissions(subData);
            }
        } catch (err) {
            console.error('Error fetching student detail data:', err);
            setPopup({
                isOpen: true,
                type: 'error',
                title: 'Gagal Memuat Data',
                message: err.message || 'Terjadi kesalahan saat memuat rincian siswa.'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (studentId) {
            fetchStudentData();
        }
    }, [studentId, classId]);

    // Computed Summary Metrics
    const metrics = useMemo(() => {
        // Map submissions by quiz_id
        const subMap = new Map();
        submissions.forEach(s => {
            subMap.set(s.quiz_id, s);
        });

        // Group by Quiz Type
        const getQuizType = (q) => {
            return q.quiz_type || q.settings?.quiz_type || 'quiz';
        };

        const pretestQuizzes = assignedQuizzes.filter(q => getQuizType(q) === 'pretest');
        const mainQuizzes = assignedQuizzes.filter(q => {
            const t = getQuizType(q);
            return t === 'quiz' || t === 'main' || (t !== 'pretest' && t !== 'posttest');
        });
        const posttestQuizzes = assignedQuizzes.filter(q => getQuizType(q) === 'posttest');

        // Pre-test sub
        const pretestSubs = submissions.filter(s => {
            const t = s.quizzes?.quiz_type || s.quizzes?.settings?.quiz_type;
            return t === 'pretest';
        });
        const pretestScore = pretestSubs.length > 0
            ? Math.round(pretestSubs.reduce((acc, s) => acc + (Number(s.percentage) || 0), 0) / pretestSubs.length)
            : null;

        // Main Quizzes sub
        const mainSubs = submissions.filter(s => {
            const t = s.quizzes?.quiz_type || s.quizzes?.settings?.quiz_type;
            return t === 'quiz' || t === 'main' || (t !== 'pretest' && t !== 'posttest');
        });
        const mainScore = mainSubs.length > 0
            ? Math.round(mainSubs.reduce((acc, s) => acc + (Number(s.percentage) || 0), 0) / mainSubs.length)
            : null;

        // Post-test sub
        const posttestSubs = submissions.filter(s => {
            const t = s.quizzes?.quiz_type || s.quizzes?.settings?.quiz_type;
            return t === 'posttest';
        });
        const posttestScore = posttestSubs.length > 0
            ? Math.round(posttestSubs.reduce((acc, s) => acc + (Number(s.percentage) || 0), 0) / posttestSubs.length)
            : null;

        // Delta / Gain (Post-test minus Pre-test)
        let delta = null;
        if (pretestScore !== null && posttestScore !== null) {
            delta = posttestScore - pretestScore;
        }

        // Overall Average
        const overallScore = submissions.length > 0
            ? Math.round(submissions.reduce((acc, s) => acc + (Number(s.percentage) || 0), 0) / submissions.length)
            : null;

        // Total Completed Count & Progress %
        const completedCount = assignedQuizzes.filter(q => subMap.has(q.id)).length;
        const totalAssigned = assignedQuizzes.length;
        const progressPercent = totalAssigned > 0
            ? Math.min(100, Math.round((completedCount / totalAssigned) * 100))
            : submissions.length > 0 ? 100 : 0;

        return {
            pretestScore,
            pretestCompleted: pretestSubs.length,
            pretestTotal: pretestQuizzes.length,
            mainScore,
            mainCompleted: mainSubs.length,
            mainTotal: mainQuizzes.length,
            posttestScore,
            posttestCompleted: posttestSubs.length,
            posttestTotal: posttestQuizzes.length,
            delta,
            overallScore,
            completedCount,
            totalAssigned,
            progressPercent
        };
    }, [assignedQuizzes, submissions]);

    // Format Quiz List Items (Combining Assigned Quizzes + Submissions)
    const combinedQuizList = useMemo(() => {
        const subMap = new Map();
        submissions.forEach(s => {
            subMap.set(s.quiz_id, s);
        });

        // 1. Quizzes that are assigned
        const list = assignedQuizzes.map(quiz => {
            const qType = quiz.quiz_type || quiz.settings?.quiz_type || 'quiz';
            const sub = subMap.get(quiz.id);

            return {
                id: quiz.id,
                title: quiz.title,
                description: quiz.description,
                quizType: qType,
                isCompleted: !!sub,
                submission: sub || null,
                score: sub ? Number(sub.percentage) || 0 : null,
                rawScore: sub ? sub.score : null,
                maxScore: sub ? sub.max_score : null,
                completedAt: sub ? sub.completed_at : null
            };
        });

        // 2. Also append any submissions for quizzes not currently in assignedQuizzes list
        submissions.forEach(sub => {
            const existing = list.find(item => item.id === sub.quiz_id);
            if (!existing && sub.quizzes) {
                const qType = sub.quizzes.quiz_type || sub.quizzes.settings?.quiz_type || 'quiz';
                list.push({
                    id: sub.quiz_id,
                    title: sub.quizzes.title || 'Kuis BioQuest',
                    description: sub.quizzes.description || '',
                    quizType: qType,
                    isCompleted: true,
                    submission: sub,
                    score: Number(sub.percentage) || 0,
                    rawScore: sub.score,
                    maxScore: sub.max_score,
                    completedAt: sub.completed_at
                });
            }
        });

        return list;
    }, [assignedQuizzes, submissions]);

    // Filter Combined Quizzes
    const filteredQuizzes = useMemo(() => {
        return combinedQuizList.filter(item => {
            // Tab filter
            if (activeTab === 'pretest' && item.quizType !== 'pretest') return false;
            if (activeTab === 'posttest' && item.quizType !== 'posttest') return false;
            if (activeTab === 'quiz' && (item.quizType === 'pretest' || item.quizType === 'posttest')) return false;

            // Search query filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const matchesTitle = item.title.toLowerCase().includes(query);
                const matchesDesc = item.description && item.description.toLowerCase().includes(query);
                return matchesTitle || matchesDesc;
            }

            return true;
        });
    }, [combinedQuizList, activeTab, searchQuery]);

    // Date Formatter
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    if (loading) {
        return (
            <div className="w-full min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
                <i className="fa-solid fa-spinner fa-spin text-5xl text-[#479F88] mb-4"></i>
                <h3 className="text-xl font-bold text-gray-700 font-display-lg">Memuat Rapor Siswa...</h3>
                <p className="text-sm text-gray-400 font-body-md mt-1">Mengambil riwayat pengerjaan pre-test, modul, dan post-test</p>
            </div>
        );
    }

    if (!studentProfile) {
        return (
            <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
                <img src={qikoConfused} alt="Tidak Ditemukan" className="w-32 h-32 mb-4" />
                <h3 className="text-2xl font-bold text-gray-800 font-display-lg">Siswa Tidak Ditemukan</h3>
                <p className="text-sm text-gray-500 font-body-md mt-1 mb-6">Data siswa yang Anda cari tidak tersedia.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="px-6 py-3 rounded-full bg-[#479F88] text-white font-bold text-sm shadow-md hover:bg-[#387d6b] transition-all"
                >
                    Kembali
                </button>
            </div>
        );
    }

    // Performance Badge & Insight evaluation
    const getPerformanceStatus = () => {
        const score = metrics.overallScore;
        if (score === null) return { text: 'Belum Ada Data', bg: 'bg-gray-100 text-gray-600', icon: 'fa-clock' };
        if (score >= 85) return { text: 'Sangat Memuaskan (A)', bg: 'bg-[#e0f2ec] text-[#479F88] border-[#479F88]/30', icon: 'fa-trophy' };
        if (score >= 70) return { text: 'Kompeten (B)', bg: 'bg-emerald-50 text-emerald-700 border-emerald-300', icon: 'fa-circle-check' };
        if (score >= 55) return { text: 'Cukup (C)', bg: 'bg-amber-50 text-[#716500] border-amber-300', icon: 'fa-triangle-exclamation' };
        return { text: 'Perlu Pendampingan', bg: 'bg-red-50 text-error border-red-200', icon: 'fa-circle-exclamation' };
    };

    const performanceStatus = getPerformanceStatus();

    return (
        <div className="w-full pb-16 animate-in fade-in duration-300">
            {/* PopUp Notification */}
            <PopUp
                isOpen={popup.isOpen}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                onClose={() => setPopup(p => ({ ...p, isOpen: false }))}
            />

            {/* Header Section dengan Lengkung Khas BioQuest */}
            <header
                className="w-full bg-surface-container pt-8 md:pt-10 pb-14 px-6 md:px-8 relative z-0 print:hidden"
                style={{ borderBottomLeftRadius: '5% 15%', borderBottomRightRadius: '5% 15%' }}
            >
                <div className="max-w-6xl mx-auto">
                    {/* Back Button (Clean, no breadcrumbs) */}
                    <button
                        type="button"
                        onClick={handleBack}
                        className="text-xs md:text-sm font-bold text-[#479F88] hover:text-[#387d6b] flex items-center gap-2 mb-4 transition-colors group"
                    >
                        <i className="fa-solid fa-arrow-left text-xs group-hover:-translate-x-0.5 transition-transform"></i>
                        <span>Kembali</span>
                    </button>

                    {/* Student Identity Card in Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#e0f2ec] border-2 border-[#479F88]/30 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-sm">
                                <img
                                    src={studentProfile.avatar_url || qikoSmile}
                                    alt={studentProfile.nama_lengkap}
                                    className="w-full h-full object-cover rounded-full"
                                    onError={(e) => { e.currentTarget.src = qikoSmile; }}
                                />
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <h1 className="text-2xl md:text-3xl font-extrabold text-[#479F88] tracking-tight font-display-lg leading-tight">
                                        {studentProfile.nama_lengkap}
                                    </h1>
                                    {classInfo && (
                                        <span className="bg-[#e0f2ec] text-[#479F88] text-xs font-bold py-1 px-3.5 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
                                            <i className="fa-solid fa-school text-[11px]"></i>
                                            <span>{classInfo.name}</span>
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 font-medium mt-1.5">
                                    <span>
                                        <strong className="text-gray-600 font-semibold">NISN:</strong> {studentProfile.nisn && studentProfile.nisn !== '-' ? studentProfile.nisn : 'Belum diisi'}
                                    </span>
                                    {studentProfile.email && (
                                        <>
                                            <span className="text-gray-300">•</span>
                                            <span className="text-gray-400">
                                                {studentProfile.email}
                                            </span>
                                        </>
                                    )}
                                    <span className="text-gray-300">•</span>
                                    <span className="text-gray-400">
                                        Bergabung {formatDate(studentProfile.created_at)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Top Action Button: Print / Cetak Rapor */}
                        <div className="flex items-center gap-2.5 self-end md:self-auto">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-5 py-2.5 bg-white hover:bg-[#e0f2ec]/40 text-[#479F88] border-2 border-[#479F88] rounded-full font-bold text-xs md:text-sm shadow-sm active:scale-95 transition-all flex items-center gap-2"
                                title="Cetak Rapor Siswa"
                            >
                                <i className="fa-solid fa-print"></i>
                                <span>Cetak Rapor</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="w-full px-4 sm:px-6 -mt-6 relative z-10 max-w-6xl mx-auto space-y-6">

                {/* 5-GRID SUMMARY STATS CARDS */}
                <section className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 md:gap-4">
                    {/* Card 1: Pre-Test */}
                    <div className="bg-white rounded-[24px] p-4 md:p-5 shadow-sm border border-[#479F88]/20 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Pre-Test</span>
                            <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#716500] flex items-center justify-center text-sm shrink-0">
                                <i className="fa-solid fa-hourglass-start"></i>
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-black font-display text-gray-800">
                                {metrics.pretestScore !== null ? `${metrics.pretestScore}%` : '-'}
                            </div>
                            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                                {metrics.pretestScore !== null ? 'Kemampuan Awal' : 'Belum Dikerjakan'}
                            </p>
                        </div>
                    </div>

                    {/* Card 2: Kuis Utama / Modul */}
                    <div className="bg-white rounded-[24px] p-4 md:p-5 shadow-sm border border-[#479F88]/20 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Kuis Utama</span>
                            <div className="w-8 h-8 rounded-xl bg-[#e0f2ec] text-[#479F88] flex items-center justify-center text-sm shrink-0">
                                <i className="fa-solid fa-book-open"></i>
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-black font-display text-[#479F88]">
                                {metrics.mainScore !== null ? `${metrics.mainScore}%` : '-'}
                            </div>
                            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                                {metrics.mainCompleted} dari {metrics.mainTotal || metrics.mainCompleted} Modul
                            </p>
                        </div>
                    </div>

                    {/* Card 3: Post-Test */}
                    <div className="bg-white rounded-[24px] p-4 md:p-5 shadow-sm border border-[#479F88]/20 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Post-Test</span>
                            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-sm shrink-0">
                                <i className="fa-solid fa-flag-checkered"></i>
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-black font-display text-gray-800">
                                {metrics.posttestScore !== null ? `${metrics.posttestScore}%` : '-'}
                            </div>
                            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                                {metrics.posttestScore !== null ? 'Evaluasi Akhir' : 'Belum Dikerjakan'}
                            </p>
                        </div>
                    </div>

                    {/* Card 4: Peningkatan (Delta) */}
                    <div className="bg-white rounded-[24px] p-4 md:p-5 shadow-sm border border-[#479F88]/20 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Peningkatan</span>
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm shrink-0">
                                <i className="fa-solid fa-arrow-trend-up"></i>
                            </div>
                        </div>
                        <div>
                            <div className={`text-2xl font-black font-display ${
                                metrics.delta === null
                                    ? 'text-gray-400'
                                    : metrics.delta > 0
                                    ? 'text-emerald-600'
                                    : metrics.delta === 0
                                    ? 'text-gray-700'
                                    : 'text-error'
                            }`}>
                                {metrics.delta === null
                                    ? '-'
                                    : metrics.delta > 0
                                    ? `+${metrics.delta}`
                                    : `${metrics.delta}`}
                            </div>
                            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                                {metrics.delta === null
                                    ? 'Pre vs Post-Test'
                                    : metrics.delta > 0
                                    ? 'Gain Positif'
                                    : metrics.delta === 0
                                    ? 'Skor Stabil'
                                    : 'Perlu Penguatan'}
                            </p>
                        </div>
                    </div>

                    {/* Card 5: Rata-Rata Nilai */}
                    <div className="bg-white rounded-[24px] p-4 md:p-5 shadow-sm border border-[#479F88]/20 flex flex-col justify-between col-span-2 lg:col-span-1">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Rata-Rata</span>
                            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm shrink-0">
                                <i className="fa-solid fa-award"></i>
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-black font-display text-gray-800">
                                {metrics.overallScore !== null ? `${metrics.overallScore}` : '-'}{' '}
                                <span className="text-xs font-normal text-gray-400">/ 100</span>
                            </div>
                            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                                Akurasi Keseluruhan
                            </p>
                        </div>
                    </div>
                </section>

                {/* ANALISIS PERFORMA & PROGRES BELAJAR BANNER */}
                <section className="bg-white rounded-[28px] p-5 md:p-6 shadow-sm border border-[#479F88]/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                        <img
                            src={metrics.overallScore !== null && metrics.overallScore >= 75 ? qikoHype : qikoSmile}
                            alt="Qiko BioQuest"
                            className="w-14 h-14 md:w-16 md:h-16 object-contain shrink-0"
                        />
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base md:text-lg font-bold text-gray-800 font-display">
                                    Status Pembelajaran Siswa
                                </h3>
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border flex items-center gap-1 ${performanceStatus.bg}`}>
                                    <i className={`fa-solid ${performanceStatus.icon} text-[10px]`}></i>
                                    <span>{performanceStatus.text}</span>
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 font-body-md mt-1 max-w-2xl leading-relaxed">
                                {metrics.completedCount === 0
                                    ? 'Siswa belum menyelesaikan tugas kuis apa pun. Dorong siswa untuk memulai pengerjaan Pre-Test.'
                                    : metrics.delta !== null && metrics.delta > 0
                                    ? `Siswa menunjukkan progres pembelajaran yang sangat positif dengan peningkatan sebesar ${metrics.delta} poin antara Pre-Test dan Post-Test.`
                                    : `Siswa telah menyelesaikan ${metrics.completedCount} kuis dengan rata-rata akurasi sebesar ${metrics.overallScore || 0}%.`}
                            </p>
                        </div>
                    </div>

                    {/* Progres Belajar Bar */}
                    <div className="w-full md:w-56 shrink-0 bg-[#e0f2ec]/40 p-3.5 rounded-2xl border border-[#479F88]/20">
                        <div className="flex justify-between items-center text-xs font-bold mb-1">
                            <span className="text-gray-500 text-[11px]">Progres Materi:</span>
                            <span className="text-[#479F88]">{metrics.progressPercent}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden relative">
                            <div
                                className="bg-[#479F88] h-full rounded-full transition-all duration-500 relative"
                                style={{ width: `${metrics.progressPercent}%` }}
                            >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-sm" />
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400 font-semibold mt-1.5 text-right">
                            {metrics.completedCount} / {metrics.totalAssigned} Kuis Selesai
                        </p>
                    </div>
                </section>

                {/* TAB TOGGLE: Semua Kuis, Pre-Test, Kuis Utama, Post-Test */}
                <div className="flex bg-white p-1.5 rounded-full border border-gray-200 shadow-xs max-w-md mx-auto">
                    <button
                        type="button"
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 py-2 px-3 rounded-full text-xs sm:text-sm font-bold transition-all ${
                            activeTab === 'all'
                                ? 'bg-[#479F88] text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        Semua Kuis
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('pretest')}
                        className={`flex-1 py-2 px-3 rounded-full text-xs sm:text-sm font-bold transition-all ${
                            activeTab === 'pretest'
                                ? 'bg-[#479F88] text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        Pre-Test
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('quiz')}
                        className={`flex-1 py-2 px-3 rounded-full text-xs sm:text-sm font-bold transition-all ${
                            activeTab === 'quiz'
                                ? 'bg-[#479F88] text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        Kuis Utama
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('posttest')}
                        className={`flex-1 py-2 px-3 rounded-full text-xs sm:text-sm font-bold transition-all ${
                            activeTab === 'posttest'
                                ? 'bg-[#479F88] text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        Post-Test
                    </button>
                </div>

                {/* SEARCH BAR (Matching BioQuest signature style) */}
                <div className="relative w-full">
                    <input
                        type="text"
                        placeholder="Cari kuis berdasarkan judul atau materi..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border-[3px] border-[#479F88] rounded-full py-3.5 px-6 pr-12 text-[#479F88] font-medium focus:outline-none focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/30 placeholder:text-[#479F88]/50 shadow-sm text-sm md:text-base transition-all duration-300"
                    />
                    <i className="fa-solid fa-magnifying-glass absolute right-4 top-1/2 -translate-y-1/2 text-[#479F88] text-2xl pointer-events-none"></i>
                </div>

                {/* LIST KUIS & HASIL PENGERJAAN */}
                <section className="space-y-4">
                    {filteredQuizzes.length === 0 ? (
                        <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100">
                            <i className="fa-solid fa-search text-5xl text-gray-300 mb-3"></i>
                            <h4 className="text-lg font-bold text-gray-600 font-display">Tidak Ada Kuis</h4>
                            <p className="text-xs text-gray-400 mt-1">Tidak ada kuis yang sesuai dengan kategori atau kata kunci pencarian.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredQuizzes.map((item) => (
                                <div
                                    key={item.id}
                                    className={`bg-white rounded-[24px] p-5 shadow-sm border transition-all duration-300 flex flex-col justify-between ${
                                        item.isCompleted
                                            ? 'border-[#479F88]/30 hover:border-[#479F88]'
                                            : 'border-gray-200 opacity-80'
                                    }`}
                                >
                                    <div>
                                        {/* Top Badges */}
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                item.quizType === 'pretest'
                                                    ? 'bg-amber-100 text-[#716500]'
                                                    : item.quizType === 'posttest'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-[#e0f2ec] text-[#479F88]'
                                            }`}>
                                                {item.quizType === 'pretest' ? 'Pre-Test' : item.quizType === 'posttest' ? 'Post-Test' : 'Kuis Utama'}
                                            </span>

                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                item.isCompleted
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    : 'bg-gray-100 text-gray-400'
                                            }`}>
                                                {item.isCompleted ? 'Selesai Dikerjakan' : 'Belum Dikerjakan'}
                                            </span>
                                        </div>

                                        <h4 className="text-base font-bold text-gray-800 font-display line-clamp-1">
                                            {item.title}
                                        </h4>
                                        <p className="text-xs text-gray-500 font-body-md mt-1 line-clamp-2">
                                            {item.description || 'Tidak ada deskripsi materi kuis.'}
                                        </p>
                                    </div>

                                    {/* Bottom Score & Action */}
                                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] text-gray-400 font-semibold block">
                                                {item.isCompleted ? `Diselesaikan pada ${formatDateTime(item.completedAt)}` : 'Status Nilai:'}
                                            </span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-xl font-black font-display ${
                                                    item.isCompleted
                                                        ? item.score >= 70
                                                            ? 'text-[#479F88]'
                                                            : 'text-error'
                                                        : 'text-gray-400'
                                                }`}>
                                                    {item.isCompleted ? `${item.score}%` : 'Belum Ada Nilai'}
                                                </span>
                                                {item.isCompleted && item.rawScore !== null && (
                                                    <span className="text-xs text-gray-400 font-medium">
                                                        ({item.rawScore} / {item.maxScore} Poin)
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {item.isCompleted && item.submission && (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedSubmissionForReview(item.submission)}
                                                className="px-3.5 py-2 rounded-full bg-[#e0f2ec] hover:bg-[#cceede] text-[#479F88] font-bold text-xs shadow-2xs transition-all active:scale-95 flex items-center gap-1.5"
                                            >
                                                <i className="fa-solid fa-list-check text-xs"></i>
                                                <span>Rincian Soal</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            {/* MODAL RINCIAN HASIL & JAWABAN SISWA */}
            {selectedSubmissionForReview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-[28px] p-6 md:p-7 w-full max-w-2xl shadow-2xl border border-gray-100 relative animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        {/* Header Modal */}
                        <div className="flex items-start justify-between pb-4 border-b border-gray-100">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-[#479F88] bg-[#e0f2ec] px-2.5 py-0.5 rounded-full inline-block mb-1">
                                    Rincian Hasil Pengerjaan
                                </span>
                                <h3 className="text-lg font-bold text-gray-800 leading-snug">
                                    {selectedSubmissionForReview.quizzes?.title || 'Kuis BioQuest'}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Diselesaikan pada {formatDateTime(selectedSubmissionForReview.completed_at)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedSubmissionForReview(null)}
                                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors flex items-center justify-center shrink-0 ml-3"
                            >
                                <i className="fa-solid fa-xmark text-sm"></i>
                            </button>
                        </div>

                        {/* Summary Badges in Modal */}
                        <div className="grid grid-cols-3 gap-3 my-4">
                            <div className="bg-[#e0f2ec] p-3 rounded-2xl text-center">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Nilai Akhir</span>
                                <span className="text-xl font-extrabold text-[#479F88]">{selectedSubmissionForReview.percentage}%</span>
                            </div>
                            <div className="bg-amber-50 p-3 rounded-2xl text-center">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Poin Diperoleh</span>
                                <span className="text-xl font-extrabold text-[#716500]">
                                    {selectedSubmissionForReview.score} / {selectedSubmissionForReview.max_score}
                                </span>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-2xl text-center">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Status</span>
                                <span className={`text-base font-extrabold block mt-0.5 ${
                                    selectedSubmissionForReview.percentage >= 70 ? 'text-[#479F88]' : 'text-error'
                                }`}>
                                    {selectedSubmissionForReview.percentage >= 70 ? 'TUNTAS' : 'REMEDIAL'}
                                </span>
                            </div>
                        </div>

                        {/* Question Breakdown List */}
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Rincian Jawaban per Nomor:
                            </h4>

                            {(!selectedSubmissionForReview.results || selectedSubmissionForReview.results.length === 0) ? (
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center text-xs text-gray-400 italic">
                                    Rincian jawaban per butir soal belum terekam untuk kuis ini.
                                </div>
                            ) : (
                                selectedSubmissionForReview.results.map((res, idx) => {
                                    const isCorrect = res.isCorrect ?? (res.earned >= res.max && res.max > 0);
                                    return (
                                        <div
                                            key={res.questionId || idx}
                                            className={`p-4 rounded-2xl border transition-all ${
                                                isCorrect
                                                    ? 'bg-[#e0f2ec]/30 border-[#479F88]/30'
                                                    : 'bg-red-50/40 border-red-200'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                                        isCorrect ? 'bg-[#479F88] text-white' : 'bg-error text-white'
                                                    }`}>
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-xs font-bold text-gray-700">
                                                        Nomor {idx + 1}
                                                    </span>
                                                </div>

                                                <div className="text-right shrink-0">
                                                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                                                        isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        {isCorrect ? 'Benar' : 'Salah'}
                                                    </span>
                                                    <span className="text-[11px] text-gray-400 font-semibold block mt-0.5">
                                                        {res.earned ?? 0} / {res.max ?? 10} Poin
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Details if available */}
                                            {res.questionText && (
                                                <p className="text-xs text-gray-800 font-medium mt-2">
                                                    {res.questionText}
                                                </p>
                                            )}

                                            {res.userAnswer !== undefined && (
                                                <div className="mt-2 text-xs">
                                                    <span className="text-gray-400 font-medium">Jawaban Siswa: </span>
                                                    <span className={`font-bold ${isCorrect ? 'text-[#479F88]' : 'text-error'}`}>
                                                        {typeof res.userAnswer === 'object' ? JSON.stringify(res.userAnswer) : String(res.userAnswer || '-')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer Modal */}
                        <div className="pt-4 border-t border-gray-100 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedSubmissionForReview(null)}
                                className="px-6 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DetailStudent;

