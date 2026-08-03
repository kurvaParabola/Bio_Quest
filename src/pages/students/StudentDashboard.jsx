import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PopUp from '../../components/PopUp';
import { supabase } from '../../services/supabase';
import qikoSad from '../../assets/qiko_sad.svg';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [isJoined, setIsJoined] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [popup, setPopup] = useState({ isOpen: false, type: 'success', title: '', message: '' });
  const [className, setClassName] = useState('');
  const [studentId, setStudentId] = useState(null);
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    const fetchUserDataAndClass = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStudentId(session.user.id);
        const { data: user } = await supabase.from('users').select('nama_lengkap').eq('id', session.user.id).single();
        if (user && user.nama_lengkap) {
          const first = user.nama_lengkap.split(' ')[0];
          setFirstName(first);
        }

        // Cek apakah siswa sudah bergabung dengan kelas
        const { data: memberData } = await supabase
          .from('class_members')
          .select('classes!inner(name)')
          .eq('student_id', session.user.id)
          .single();
        
        if (memberData && memberData.classes) {
          setIsJoined(true);
          setClassName(memberData.classes.name);
        }
      }
    };
    fetchUserDataAndClass();
  }, []);

  const [stages, setStages] = useState([
    { id: 1, name: 'PreTest', progress: 100, isLocked: false },
    { id: 2, name: 'Main Stage', progress: 80, isLocked: false },
    { id: 3, name: 'PostTest', progress: 0, isLocked: true },
  ]);

  // Hitung rata-rata total progress untuk Tampilan Banner Aktif
  const totalProgress = Math.round(
    stages.reduce((acc, stage) => acc + stage.progress, 0) / stages.length
  );

  // Fungsi ketika siswa submit kode kelas
  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (!classCode.trim() || !studentId) return;

    // Cari kelas berdasarkan kode
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name')
      .eq('code', classCode.trim())
      .single();

    if (classError || !classData) {
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'Kode Kelas Salah',
        message: 'Kode kelas tidak ditemukan. Silakan periksa kembali atau tanyakan kepada gurumu.',
      });
      return;
    }

    // Join kelas
    const { error: joinError } = await supabase
      .from('class_members')
      .insert([{ class_id: classData.id, student_id: studentId }]);

    if (joinError) {
      if (joinError.code === '23505') { // Unique constraint violation
        setPopup({
          isOpen: true,
          type: 'error',
          title: 'Gagal Bergabung',
          message: 'Kamu sudah terdaftar di kelas ini.',
        });
      } else {
        setPopup({
          isOpen: true,
          type: 'error',
          title: 'Terjadi Kesalahan',
          message: joinError.message,
        });
      }
      return;
    }

    setClassName(classData.name);
    setPopup({
      isOpen: true,
      type: 'success',
      title: 'Berhasil Masuk Kelas',
      message: `Hore! Kamu berhasil bergabung dengan kelas ${classData.name}. Selamat belajar!`,
    });
  };

  const handleClosePopup = () => {
    setPopup({ ...popup, isOpen: false });
    // Jika pop up bertipe sukses, langsung ubah state menjadi "Sudah Bergabung"
    if (popup.type === 'success') {
      setIsJoined(true);
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
      <header 
        className="w-full bg-surface-container pt-12 pb-24 px-8 relative z-0"
        style={{ borderBottomLeftRadius: '50% 15%', borderBottomRightRadius: '50% 15%' }}
      >
        <div className="flex justify-between items-center mb-8 max-w-md mx-auto w-full">
          <span className="text-[#479F88] font-bold tracking-wider text-sm font-display">
            {isJoined ? className : "Belum Ada Kelas"}
          </span>
          <button 
            onClick={handleLogoutClick}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-error/10 hover:text-error transition-colors text-error/80 group"
            title="Keluar"
          >
            <i className="fa-solid fa-arrow-right-from-bracket text-2xl group-hover:scale-110 transition-transform"></i>
          </button>
        </div>

        {/* Dinamis Teks Header berdasarkan status kelas */}
        <h1 className="text-3xl font-bold text-[#479F88] tracking-tight font-display-lg text-center">
          Selamat Datang, {firstName || "Siswa"}!
        </h1>
        <p className="text-center text-sm text-on-background/60 mt-1 font-body-md">
          Ayo mulai petualangan belajarmu hari ini!
        </p>
      </header>
      
      {/* Main Content Area */}
      <main className="w-full px-6 -mt-16 z-10 max-w-md flex-1 flex flex-col justify-start mb-6 animate-in fade-in duration-300">
        
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
                    onChange={(e) => setClassCode(e.target.value)}
                    placeholder="Contoh: AB12CD" required maxLength={6}
                    className="w-full bg-surface-container border-2 border-transparent rounded-full py-4 px-6 text-center text-xl font-bold tracking-widest text-on-background uppercase focus:outline-none focus:bg-white focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/20 transition-all duration-300 font-body-md" 
                    style={{ WebkitBoxShadow: '0 0 0 1000px #e0f2ec inset' }}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={classCode.length !== 6}
                  className="w-full bg-primary-container text-white font-bold text-lg py-4 rounded-full shadow-md active:scale-95 transition-transform font-label-md disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  Bergabung Kelas
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
                    stage.isLocked ? 'bg-gray-200 border-gray-300/50 opacity-60' : 'bg-[#387d6b] border-[#387d6b]/10'
                  }`}
                >
                  {/* Efek Warna Isi Progress Bar di Background Kolom */}
                  {!stage.isLocked && stage.progress > 0 && (
                    <div className="absolute top-0 left-0 bottom-0 bg-[#479F88] rounded-[22px] transition-all duration-500 z-0" style={{ width: `${stage.progress}%` }} />
                  )}

                  {/* Konten Teks Stage */}
                  <div className="z-10 flex items-center gap-3 pr-2 flex-1">
                    <i className={`text-2xl ${stage.isLocked ? 'fa-solid fa-lock text-gray-500' : stage.progress === 100 ? 'fa-regular fa-circle-check text-white' : 'fa-regular fa-compass text-white'}`}></i>
                    <span className={`text-sm font-bold font-body-md leading-snug ${stage.isLocked ? 'text-gray-600' : 'text-white'}`}>
                      {stage.name}
                    </span>
                  </div>

                  {/* Tombol Aksi Dinamis */}
                  <div className="z-10 flex-shrink-0">
                    {stage.isLocked ? (
                      <button disabled className="bg-gray-300 text-gray-500 text-xs font-bold py-2.5 px-4 rounded-full font-label-md cursor-not-allowed">
                        Terkunci
                      </button>
                    ) : (
                      <button 
                        onClick={() => alert(`Memulai ${stage.name}`)}
                        className="bg-white text-[#479F88] text-xs font-bold py-2.5 px-4 rounded-full shadow-sm hover:bg-[#e0f2ec] active:scale-95 transition-all font-label-md"
                      >
                        {stage.progress === 100 ? 'Ulangi' : stage.progress > 0 ? 'Lanjut' : 'Mulai'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}
        
      </main>

      
    </div>
  );
};

export default StudentDashboard;