import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import PopUp from '../../components/PopUp';
import qikoSmile from '../../assets/qiko_smile.svg';
import qikoConfused from '../../assets/qiko_confused.svg';

// Custom Dropdown matching QuizManagement and ClassManagement style
const CustomSelect = ({ value, onChange, options, containerClassName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOpt = options.find(o => o.value === value) || options[0];

    return (
        <div className={`relative ${containerClassName || 'w-full'}`}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white border-[3px] border-[#479F88] rounded-full py-3.5 px-5 flex items-center justify-between text-[#479F88] font-bold text-sm md:text-base cursor-pointer shadow-sm hover:bg-[#e0f2ec]/20 active:scale-95 transition-all select-none"
            >
                <span className="truncate pr-2">{selectedOpt?.label}</span>
                <i className={`fa-solid fa-chevron-down text-xs text-[#479F88] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}></i>
            </div>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute top-full right-0 mt-2 w-full min-w-[200px] bg-white border-2 border-[#479F88]/30 rounded-2xl shadow-xl z-50 p-2 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                        {options.map(opt => (
                            <div
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                className={`px-3.5 py-2.5 cursor-pointer text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                                    value === opt.value
                                        ? 'bg-[#e0f2ec] text-[#479F88]'
                                        : 'text-gray-600 hover:bg-[#e0f2ec]/30 hover:text-[#479F88]'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    {value === opt.value && <i className="fa-solid fa-circle text-[6px] text-[#479F88]"></i>}
                                    <span>{opt.label}</span>
                                </div>
                                {value === opt.value && <i className="fa-solid fa-check text-xs text-[#479F88]"></i>}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const DetailClass = () => {
    const { classId } = useParams();
    const navigate = useNavigate();

    // Data States
    const [loading, setLoading] = useState(true);
    const [classData, setClassData] = useState(null);
    const [students, setStudents] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [submissions, setSubmissions] = useState([]);

    // UI States
    const [activeTab, setActiveTab] = useState('students'); // 'students' | 'quizzes'
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('name_asc'); // 'name_asc' | 'name_desc' | 'score_high' | 'progress_high'
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Modal / PopUp States
    const [popup, setPopup] = useState({ isOpen: false, type: 'success', title: '', message: '', onConfirm: null, confirmText: 'Ya' });
    const [selectedStudentForDetail, setSelectedStudentForDetail] = useState(null);

    // Fetch All Data for This Class
    const fetchClassDetails = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/login');
                return;
            }

            // 1. Fetch Class Information
            const { data: classRows, error: classErr } = await supabase
                .from('classes')
                .select('*')
                .eq('id', classId)
                .limit(1);

            if (classErr || !classRows || classRows.length === 0) {
                setPopup({
                    isOpen: true,
                    type: 'error',
                    title: 'Kelas Tidak Ditemukan',
                    message: 'Kelas ini tidak ditemukan atau Anda tidak memiliki akses ke kelas ini.',
                    onConfirm: () => navigate('/teacher/classes'),
                    confirmText: 'Kembali'
                });
                setLoading(false);
                return;
            }

            const currentClass = classRows[0];
            setClassData(currentClass);

            // 2. Fetch Members (Students) of This Class
            const { data: memberRows, error: memberErr } = await supabase
                .from('class_members')
                .select(`
                    id,
                    student_id,
                    joined_at,
                    users (
                        id,
                        nama_lengkap,
                        email,
                        nisn,
                        avatar_url
                    )
                `)
                .eq('class_id', classId)
                .order('joined_at', { ascending: false });

            if (memberErr) {
                console.warn('Error fetching class members:', memberErr);
            }

            const rawMembers = memberRows || [];

            // 3. Fetch Quizzes Assigned to This Class
            let assignedQuizIds = [];
            let classQuizzes = [];
            try {
                const { data: qcRows } = await supabase
                    .from('quiz_classes')
                    .select('quiz_id, quizzes(*)')
                    .eq('class_id', classId);

                if (qcRows && qcRows.length > 0) {
                    qcRows.forEach(qc => {
                        if (qc.quizzes) {
                            classQuizzes.push(qc.quizzes);
                            assignedQuizIds.push(qc.quiz_id);
                        }
                    });
                }
            } catch (qcErr) {
                console.warn('quiz_classes query skipped:', qcErr);
            }

            try {
                const { data: directQuizzes } = await supabase
                    .from('quizzes')
                    .select('*')
                    .contains('target_class_ids', [classId]);

                if (directQuizzes && directQuizzes.length > 0) {
                    directQuizzes.forEach(dq => {
                        if (!assignedQuizIds.includes(dq.id)) {
                            assignedQuizIds.push(dq.id);
                            classQuizzes.push(dq);
                        }
                    });
                }
            } catch (dqErr) {
                console.warn('direct quizzes query skipped:', dqErr);
            }

            setQuizzes(classQuizzes);

            // 4. Fetch Submissions for this Class / assigned quizzes
            let classSubmissions = [];
            try {
                let subQuery = supabase.from('quiz_submissions').select(`
                    id,
                    quiz_id,
                    student_id,
                    class_id,
                    score,
                    max_score,
                    percentage,
                    completed_at,
                    quizzes (id, title, quiz_type)
                `);

                if (assignedQuizIds.length > 0) {
                    subQuery = subQuery.or(`class_id.eq.${classId},quiz_id.in.(${assignedQuizIds.join(',')})`);
                } else {
                    subQuery = subQuery.eq('class_id', classId);
                }

                const { data: subData, error: subErr } = await subQuery;
                if (!subErr && subData) {
                    classSubmissions = subData;
                }
            } catch (subErr) {
                console.warn('quiz_submissions query warning:', subErr);
            }

            setSubmissions(classSubmissions);

            // 5. Compute Detailed Student Progress
            const totalAssignedQuizzes = classQuizzes.length;
            const formattedStudents = rawMembers.map(m => {
                const userObj = m.users || {};
                const studentId = m.student_id;

                const studentSubs = classSubmissions.filter(s => s.student_id === studentId);
                const completedQuizIds = new Set(studentSubs.map(s => s.quiz_id));
                const completedCount = totalAssignedQuizzes > 0
                    ? classQuizzes.filter(q => completedQuizIds.has(q.id)).length
                    : studentSubs.length;

                const progressPercent = totalAssignedQuizzes > 0
                    ? Math.min(100, Math.round((completedCount / totalAssignedQuizzes) * 100))
                    : studentSubs.length > 0 ? 100 : 0;

                let avgScore = 0;
                if (studentSubs.length > 0) {
                    const totalPerc = studentSubs.reduce((acc, s) => acc + (Number(s.percentage) || 0), 0);
                    avgScore = Math.round(totalPerc / studentSubs.length);
                }

                return {
                    memberId: m.id,
                    studentId: studentId,
                    name: userObj.nama_lengkap || 'Siswa Tanpa Nama',
                    email: userObj.email || '',
                    nisn: userObj.nisn || '-',
                    avatarUrl: userObj.avatar_url || null,
                    joinedAt: m.joined_at,
                    completedQuizzesCount: completedCount,
                    totalQuizzesCount: totalAssignedQuizzes,
                    progressPercent,
                    avgScore,
                    hasSubmissions: studentSubs.length > 0,
                    submissions: studentSubs
                };
            });

            setStudents(formattedStudents);
        } catch (err) {
            console.error('Error fetching class details:', err);
            setPopup({
                isOpen: true,
                type: 'error',
                title: 'Gagal Memuat Data',
                message: err.message || 'Terjadi kesalahan saat memuat detail kelas.'
            });
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (classId) {
            fetchClassDetails();
        }
    }, [classId]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchClassDetails(false);
    };

    // Copy Class Code Action
    const handleCopyCode = (e) => {
        e.stopPropagation();
        if (!classData?.code) return;
        navigator.clipboard.writeText(classData.code);
        setPopup({
            isOpen: true,
            type: 'success',
            title: 'Kode Disalin!',
            message: `Kode kelas "${classData.code}" berhasil disalin ke clipboard.`
        });
    };

    // Kick Student Action
    const handleConfirmKickStudent = (student) => {
        setPopup({
            isOpen: true,
            type: 'confirm',
            title: 'Keluarkan Siswa?',
            message: `Apakah Anda yakin ingin mengeluarkan ${student.name} dari kelas ${classData?.name}? Siswa ini tidak dapat lagi mengakses kuis kelas ini.`,
            confirmText: 'Ya, Keluarkan',
            onConfirm: () => executeKickStudent(student)
        });
    };

    const executeKickStudent = async (student) => {
        try {
            const { error } = await supabase
                .from('class_members')
                .delete()
                .eq('id', student.memberId);

            if (error) throw error;

            setPopup({
                isOpen: true,
                type: 'success',
                title: 'Berhasil',
                message: `${student.name} telah dikeluarkan dari kelas.`
            });

            setStudents(prev => prev.filter(s => s.memberId !== student.memberId));
        } catch (err) {
            console.error('Error removing student:', err);
            setPopup({
                isOpen: true,
                type: 'error',
                title: 'Gagal Mengeluarkan Siswa',
                message: err.message || 'Terjadi kesalahan jaringan.'
            });
        }
    };

    // Calculate Class-level Summary Metrics
    const classMetrics = useMemo(() => {
        const totalStudents = students.length;
        const totalQuizzes = quizzes.length;

        const avgProgress = totalStudents > 0
            ? Math.round(students.reduce((acc, s) => acc + s.progressPercent, 0) / totalStudents)
            : 0;

        const studentsWithScore = students.filter(s => s.hasSubmissions);
        const avgScore = studentsWithScore.length > 0
            ? Math.round(studentsWithScore.reduce((acc, s) => acc + s.avgScore, 0) / studentsWithScore.length)
            : 0;

        return {
            totalStudents,
            totalQuizzes,
            avgProgress,
            avgScore
        };
    }, [students, quizzes]);

    // Filter and Sort Students
    const filteredStudents = useMemo(() => {
        return students
            .filter(s => {
                const query = searchQuery.toLowerCase().trim();
                return s.name.toLowerCase().includes(query) || (s.nisn && s.nisn.toLowerCase().includes(query));
            })
            .sort((a, b) => {
                if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
                if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
                if (sortBy === 'score_high') return b.avgScore - a.avgScore;
                if (sortBy === 'progress_high') return b.progressPercent - a.progressPercent;
                return 0;
            });
    }, [students, searchQuery, sortBy]);

    // Filter Quizzes
    const filteredQuizzes = useMemo(() => {
        return quizzes.filter(q => {
            const query = searchQuery.toLowerCase().trim();
            return q.title.toLowerCase().includes(query) || (q.description && q.description.toLowerCase().includes(query));
        });
    }, [quizzes, searchQuery]);

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

    if (loading) {
        return (
            <div className="w-full min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
                <i className="fa-solid fa-spinner fa-spin text-5xl text-[#479F88] mb-4"></i>
                <h3 className="text-xl font-bold text-gray-700 font-display-lg">Memuat Detail Kelas...</h3>
                <p className="text-sm text-gray-400 font-body-md mt-1">Mengambil ringkasan progres dan data siswa</p>
            </div>
        );
    }

    if (!classData) {
        return (
            <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
                <img src={qikoConfused} alt="Tidak Ditemukan" className="w-32 h-32 mb-4" />
                <h3 className="text-2xl font-bold text-gray-800 font-display-lg">Kelas Tidak Ditemukan</h3>
                <p className="text-sm text-gray-500 font-body-md mt-1 mb-6">Kelas yang Anda cari tidak ada atau sudah dihapus.</p>
                <Link
                    to="/teacher/classes"
                    className="px-6 py-3 rounded-full bg-[#479F88] text-white font-bold text-sm shadow-md hover:bg-[#387d6b] transition-all"
                >
                    Kembali ke Kelola Kelas
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full pb-16 animate-in fade-in duration-300">
            {/* PopUp Konfirmasi / Alert */}
            <PopUp
                isOpen={popup.isOpen}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                onClose={() => setPopup(p => ({ ...p, isOpen: false }))}
                onConfirm={popup.onConfirm}
                confirmText={popup.confirmText}
            />

            {/* Header Section dengan Lengkung Khas BioQuest */}
            <header
                className="w-full bg-surface-container pt-8 md:pt-10 pb-12 px-6 md:px-8 relative z-0"
                style={{ borderBottomLeftRadius: '5% 15%', borderBottomRightRadius: '5% 15%' }}
            >
                <div className="max-w-6xl mx-auto">
                    {/* Breadcrumbs Nav */}
                    <button
                        onClick={() => navigate('/teacher/classes')}
                        className="text-xs md:text-sm font-bold text-[#479F88] hover:text-[#387d6b] flex items-center gap-2 mb-3 transition-colors group"
                    >
                        <i className="fa-solid fa-arrow-left text-xs group-hover:-translate-x-0.5 transition-transform"></i>
                        <span>Kembali ke Kelola Kelas</span>
                    </button>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-3xl md:text-4xl font-extrabold text-[#479F88] tracking-tight font-display-lg">
                                    {classData.name}
                                </h1>
                                <div
                                    onClick={handleCopyCode}
                                    className="bg-[#e0f2ec] text-[#479F88] text-xs font-bold py-1.5 px-3.5 rounded-full inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#cbe6dc] active:scale-95 transition-all shadow-2xs group"
                                    title="Salin Kode Kelas"
                                >
                                    <span>Kode : {classData.code}</span>
                                    <i className="fa-regular fa-copy text-[13px] opacity-70 group-hover:opacity-100"></i>
                                </div>
                            </div>
                            <p className="text-xs md:text-sm text-[#479F88]/80 mt-1 font-body-md">
                                Ringkasan pembelajaran dan pemantauan aktivitas siswa kelas ini.
                            </p>
                        </div>

                        {/* Top Actions */}
                        <div className="flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="px-4 py-2 bg-white/90 hover:bg-white text-[#479F88] border border-[#479F88]/30 rounded-full font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
                                title="Segarkan Data"
                            >
                                <i className={`fa-solid fa-rotate-right ${isRefreshing ? 'fa-spin' : ''}`}></i>
                                <span>{isRefreshing ? 'Memuat...' : 'Segarkan'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate('/teacher/quizzes')}
                                className="px-5 py-2 bg-[#479F88] hover:bg-[#387d6b] text-white rounded-full font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                            >
                                <i className="fa-solid fa-clipboard-question text-xs"></i>
                                <span>Kelola Kuis</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Container */}
            <main className="w-full px-4 sm:px-6 -mt-6 relative z-10 max-w-6xl mx-auto space-y-6">

                {/* 3-CARD SUMMARY STATS (Aligned with TeacherDashboard style) */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                    {/* Card 1: Total Siswa */}
                    <div className="bg-white rounded-[24px] p-5 shadow-sm border border-[#479F88]/20 flex justify-between items-center relative overflow-hidden">
                        <div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Total Siswa</span>
                            <div className="text-3xl font-extrabold text-gray-800 font-display mt-1">
                                {classMetrics.totalStudents} <span className="text-xs font-normal text-gray-400">Siswa</span>
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-[#e0f2ec] text-[#479F88] flex items-center justify-center text-xl shrink-0">
                            <i className="fa-solid fa-users"></i>
                        </div>
                    </div>

                    {/* Card 2: Rata-Rata Progres */}
                    <div className="bg-white rounded-[24px] p-5 shadow-sm border border-[#479F88]/20 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Rata-Rata Progres</span>
                            <span className={`text-2xl font-black font-display ${classMetrics.avgProgress < 50 ? 'text-error' : 'text-[#479F88]'}`}>
                                {classMetrics.avgProgress}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-1 relative mt-2">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 relative ${classMetrics.avgProgress < 50 ? 'bg-error' : 'bg-[#479F88]'}`} 
                                style={{ width: `${classMetrics.avgProgress}%` }} 
                            >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-sm" />
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Rata-Rata Nilai */}
                    <div className="bg-white rounded-[24px] p-5 shadow-sm border border-[#479F88]/20 flex justify-between items-center relative overflow-hidden">
                        <div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Rata-Rata Nilai</span>
                            <div className="text-3xl font-extrabold text-gray-800 font-display mt-1">
                                {classMetrics.avgScore} <span className="text-xs font-normal text-gray-400">/ 100</span>
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#716500] flex items-center justify-center text-xl shrink-0">
                            <i className="fa-solid fa-award"></i>
                        </div>
                    </div>
                </section>

                {/* TAB TOGGLE: Clean pill style without count numbers */}
                <div className="flex bg-white p-1.5 rounded-full border border-gray-200 shadow-xs max-w-xs mx-auto">
                    <button
                        type="button"
                        onClick={() => { setActiveTab('students'); setSearchQuery(''); }}
                        className={`flex-1 py-2 px-4 rounded-full text-sm font-bold transition-all ${
                            activeTab === 'students' 
                                ? 'bg-[#479F88] text-white shadow-sm' 
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        Daftar Siswa
                    </button>
                    <button
                        type="button"
                        onClick={() => { setActiveTab('quizzes'); setSearchQuery(''); }}
                        className={`flex-1 py-2 px-4 rounded-full text-sm font-bold transition-all ${
                            activeTab === 'quizzes' 
                                ? 'bg-[#479F88] text-white shadow-sm' 
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        Kuis Kelas
                    </button>
                </div>

                {/* TAB CONTENT 1: DAFTAR SISWA */}
                {activeTab === 'students' && (
                    <section className="space-y-4">
                        {/* Search & Custom Filter Bar (Aligned with other pages & QuizManagement style) */}
                        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                            {/* Search Input */}
                            <div className="relative flex-1">
                                <input 
                                    type="text" 
                                    placeholder="Cari nama atau NISN siswa..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white border-[3px] border-[#479F88] rounded-full py-3.5 px-6 pr-12 text-[#479F88] font-medium focus:outline-none focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/30 placeholder:text-[#479F88]/50 shadow-sm text-sm md:text-base transition-all duration-300"
                                />
                                <i className="fa-solid fa-magnifying-glass absolute right-4 top-1/2 -translate-y-1/2 text-[#479F88] text-2xl pointer-events-none"></i>
                            </div>

                            {/* Dropdown Sort matching QuizManagement CustomSelect style */}
                            <CustomSelect
                                value={sortBy}
                                onChange={setSortBy}
                                options={[
                                    { value: 'name_asc', label: 'Nama (A - Z)' },
                                    { value: 'name_desc', label: 'Nama (Z - A)' },
                                    { value: 'score_high', label: 'Nilai Tertinggi' },
                                    { value: 'progress_high', label: 'Progres Tertinggi' },
                                ]}
                                containerClassName="w-full sm:w-56 flex-shrink-0"
                            />
                        </div>

                        {/* Student Cards Grid */}
                        {students.length === 0 ? (
                            <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100 flex flex-col items-center">
                                <img src={qikoSmile} alt="Belum Ada Siswa" className="w-24 h-24 mb-3" />
                                <h3 className="text-xl font-bold text-gray-700 font-display-lg">Belum Ada Siswa</h3>
                                <p className="text-sm text-gray-400 font-body-md max-w-md mt-1 mb-6">
                                    Siswa belum bergabung ke kelas ini. Bagikan kode kelas di bawah ini agar siswa dapat masuk.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleCopyCode}
                                    className="px-6 py-2.5 rounded-full bg-[#479F88] hover:bg-[#387d6b] text-white font-bold text-sm shadow-sm active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <i className="fa-regular fa-copy"></i>
                                    <span>Salin Kode Kelas: {classData.code}</span>
                                </button>
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100">
                                <i className="fa-solid fa-search text-5xl text-gray-300 mb-3"></i>
                                <h4 className="text-lg font-bold text-gray-600 font-display">Siswa Tidak Ditemukan</h4>
                                <p className="text-xs text-gray-400 mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
                                {filteredStudents.map((student) => (
                                    <div
                                        key={student.memberId}
                                        className="bg-white rounded-[24px] p-5 shadow-sm border border-[#479F88]/20 hover:border-[#479F88]/50 transition-all duration-300"
                                    >
                                        <div className="flex justify-between items-start gap-3">
                                            {/* Left: Avatar + Identity */}
                                            <div 
                                                onClick={() => navigate(`/teacher/classes/${classId}/students/${student.studentId}`, { state: { from: `/teacher/classes/${classId}` } })}
                                                className="flex items-center gap-3 min-w-0 cursor-pointer group"
                                                title="Lihat Rapor Detail Siswa"
                                            >
                                                <div className="w-11 h-11 rounded-full bg-[#e0f2ec] border border-[#479F88]/20 flex items-center justify-center p-1 shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                                                    <img
                                                        src={student.avatarUrl || qikoSmile}
                                                        alt={student.name}
                                                        className="w-full h-full object-contain rounded-full"
                                                        onError={(e) => { e.currentTarget.src = qikoSmile; }}
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-[#479F88] font-bold text-base font-display truncate group-hover:underline">
                                                        {student.name}
                                                    </h4>
                                                    <span className="text-[11px] text-gray-400 font-medium block">
                                                        NISN: {student.nisn !== '-' ? student.nisn : '-'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Right: Progress & Score */}
                                            <div className="w-[42%] text-right shrink-0">
                                                <div className="flex justify-between text-xs mb-1 font-bold">
                                                    <span className="text-[#479F88]/70 italic">Progres :</span>
                                                    <span className={student.progressPercent < 50 ? "text-error" : "text-[#479F88]"}>
                                                        {student.progressPercent}%
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-1 relative">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-500 relative ${student.progressPercent < 50 ? 'bg-error' : 'bg-[#479F88]'}`} 
                                                        style={{ width: `${student.progressPercent}%` }} 
                                                    >
                                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-sm" />
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold mt-1">
                                                    <span>Nilai: <strong className={student.hasSubmissions ? "text-[#479F88]" : "text-gray-400"}>{student.hasSubmissions ? student.avgScore : '-'}</strong></span>
                                                    <span>{student.completedQuizzesCount}/{student.totalQuizzesCount} kuis</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions Footer */}
                                        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                                            <button
                                                type="button"
                                                onClick={() => handleConfirmKickStudent(student)}
                                                className="flex-1 bg-red-50 hover:bg-red-100 text-red-500 font-bold py-2 rounded-full text-xs transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                <i className="fa-solid fa-user-minus text-[11px]"></i>
                                                <span>Keluarkan</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/teacher/classes/${classId}/students/${student.studentId}`, { state: { from: `/teacher/classes/${classId}` } })}
                                                className="flex-1 bg-[#479F88] hover:bg-[#387d6b] text-white font-bold py-2 rounded-full text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                <i className="fa-solid fa-graduation-cap text-xs"></i>
                                                <span>Detail Siswa</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* TAB CONTENT 2: KUIS KELAS */}
                {activeTab === 'quizzes' && (
                    <section className="space-y-4">
                        {/* Search Bar for Quizzes */}
                        {quizzes.length > 0 && (
                            <div className="relative w-full">
                                <input 
                                    type="text" 
                                    placeholder="Cari judul atau deskripsi kuis..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white border-[3px] border-[#479F88] rounded-full py-3.5 px-6 pr-12 text-[#479F88] font-medium focus:outline-none focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/30 placeholder:text-[#479F88]/50 shadow-sm text-sm md:text-base transition-all duration-300"
                                />
                                <i className="fa-solid fa-magnifying-glass absolute right-4 top-1/2 -translate-y-1/2 text-[#479F88] text-2xl pointer-events-none"></i>
                            </div>
                        )}

                        {quizzes.length === 0 ? (
                            <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100 flex flex-col items-center">
                                <img src={qikoConfused} alt="Belum Ada Kuis" className="w-24 h-24 mb-3" />
                                <h3 className="text-xl font-bold text-gray-700 font-display-lg">Belum Ada Kuis Ditugaskan</h3>
                                <p className="text-sm text-gray-400 font-body-md max-w-md mt-1 mb-6">
                                    Belum ada kuis yang diterbitkan ke kelas ini. Buka Manajemen Kuis untuk menugaskan kuis pre-test atau post-test.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => navigate('/teacher/quizzes')}
                                    className="px-6 py-2.5 rounded-full bg-[#479F88] hover:bg-[#387d6b] text-white font-bold text-sm shadow-sm active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <i className="fa-solid fa-plus"></i>
                                    <span>Tugaskan Kuis ke Kelas Ini</span>
                                </button>
                            </div>
                        ) : filteredQuizzes.length === 0 ? (
                            <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100">
                                <i className="fa-solid fa-search text-5xl text-gray-300 mb-3"></i>
                                <h4 className="text-lg font-bold text-gray-600 font-display">Kuis Tidak Ditemukan</h4>
                                <p className="text-xs text-gray-400 mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
                                {filteredQuizzes.map((quiz) => {
                                    const quizSubs = submissions.filter(s => s.quiz_id === quiz.id);
                                    const participantCount = quizSubs.length;
                                    const participationPercent = students.length > 0
                                        ? Math.round((participantCount / students.length) * 100)
                                        : 0;

                                    const avgQuizScore = participantCount > 0
                                        ? Math.round(quizSubs.reduce((acc, s) => acc + (Number(s.percentage) || 0), 0) / participantCount)
                                        : 0;

                                    const qType = quiz.quiz_type || quiz.settings?.quiz_type || 'pretest';

                                    return (
                                        <div
                                            key={quiz.id}
                                            className="bg-white rounded-[24px] p-5 shadow-sm border border-[#479F88]/20 hover:border-[#479F88]/50 transition-all duration-300 flex flex-col justify-between"
                                        >
                                            <div>
                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                        qType === 'pretest'
                                                            ? 'bg-[#e0f2ec] text-[#479F88]'
                                                            : 'bg-amber-100 text-amber-800'
                                                    }`}>
                                                        {qType === 'pretest' ? 'Pre-Test' : 'Post-Test'}
                                                    </span>

                                                    <span className="text-[11px] text-gray-400 font-medium">
                                                        {formatDate(quiz.created_at)}
                                                    </span>
                                                </div>

                                                <h4 className="text-base font-bold text-gray-800 font-display line-clamp-1">
                                                    {quiz.title}
                                                </h4>
                                                <p className="text-xs text-gray-500 font-body-md mt-1 line-clamp-2 min-h-[32px]">
                                                    {quiz.description || 'Tidak ada deskripsi kuis.'}
                                                </p>
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-gray-100">
                                                <div className="flex justify-between items-center text-xs mb-1 font-bold">
                                                    <span className="text-[#479F88]/70 italic">Partisipasi Siswa:</span>
                                                    <span className="text-[#479F88]">{participantCount} / {students.length}</span>
                                                </div>

                                                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-1 relative">
                                                    <div
                                                        className="bg-[#479F88] h-full rounded-full transition-all duration-500 relative"
                                                        style={{ width: `${participationPercent}%` }}
                                                    >
                                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-sm" />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between text-xs pt-1 text-gray-400 font-bold">
                                                    <span>Rata-rata Nilai:</span>
                                                    <span className="text-[#479F88] font-black text-sm">
                                                        {participantCount > 0 ? `${avgQuizScore}%` : '-'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}
            </main>

            {/* MODAL DETAIL RIWAYAT KUIS SISWA */}
            {selectedStudentForDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-[28px] p-6 md:p-7 w-full max-w-lg shadow-2xl border border-gray-100 relative animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
                        {/* Header Modal */}
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-11 h-11 rounded-full bg-[#e0f2ec] flex items-center justify-center overflow-hidden shrink-0">
                                    <img
                                        src={selectedStudentForDetail.avatarUrl || qikoSmile}
                                        alt={selectedStudentForDetail.name}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base font-bold text-gray-800 leading-tight truncate">
                                        {selectedStudentForDetail.name}
                                    </h3>
                                    <p className="text-xs text-gray-400 font-medium">
                                        NISN: {selectedStudentForDetail.nisn}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedStudentForDetail(null)}
                                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors flex items-center justify-center shrink-0"
                            >
                                <i className="fa-solid fa-xmark text-sm"></i>
                            </button>
                        </div>

                        {/* Summary Badges in Modal */}
                        <div className="grid grid-cols-2 gap-3 my-4">
                            <div className="bg-[#e0f2ec] p-3 rounded-2xl text-center">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Kuis Selesai</span>
                                <span className="text-xl font-extrabold text-[#479F88]">{selectedStudentForDetail.completedQuizzesCount} / {selectedStudentForDetail.totalQuizzesCount}</span>
                            </div>
                            <div className="bg-amber-50 p-3 rounded-2xl text-center">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Rata-rata Skor</span>
                                <span className="text-xl font-extrabold text-[#716500]">{selectedStudentForDetail.avgScore}%</span>
                            </div>
                        </div>

                        {/* Submissions List */}
                        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Riwayat Pengerjaan Kuis
                            </h4>

                            {selectedStudentForDetail.submissions.length === 0 ? (
                                <p className="text-xs text-gray-400 italic text-center py-4">Belum ada kuis yang dikerjakan.</p>
                            ) : (
                                selectedStudentForDetail.submissions.map((sub, idx) => (
                                    <div
                                        key={sub.id || idx}
                                        className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-3 text-xs"
                                    >
                                        <div>
                                            <span className="font-bold text-gray-800 block text-sm">
                                                {sub.quizzes?.title || 'Kuis BioQuest'}
                                            </span>
                                            <span className="text-[11px] text-gray-400">
                                                Selesai: {formatDate(sub.completed_at)}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-base font-black text-[#479F88] block">
                                                {sub.percentage}%
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-semibold">
                                                {sub.score} / {sub.max_score} Poin
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer Modal */}
                        <div className="pt-4 border-t border-gray-100 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedStudentForDetail(null)}
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

export default DetailClass;
