import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import PopUp from '../../components/PopUp';

// Assets avatar mascot BioQuest
import qikoSmile from '../../assets/qiko_smile.svg';
import qikoHype from '../../assets/qiko_hype.svg';
import qikoConfused from '../../assets/qiko_confused.svg';
import qikoSad from '../../assets/qiko_sad.svg';

const PRESET_AVATARS = [
  { id: 'qiko_smile', name: 'Qiko Ceria', src: qikoSmile },
  { id: 'qiko_hype', name: 'Qiko Semangat', src: qikoHype },
  { id: 'qiko_confused', name: 'Qiko Penasaran', src: qikoConfused },
  { id: 'qiko_sad', name: 'Qiko Kalem', src: qikoSad },
];

const ProfilStudents = () => {
  const navigate = useNavigate();

  // State Profil Data
  const [studentId, setStudentId] = useState(null);
  const [email, setEmail] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [nisn, setNisn] = useState('');
  const [className, setClassName] = useState('');
  const [isJoinedClass, setIsJoinedClass] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(qikoSmile);

  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  const [popup, setPopup] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  // Fetch Data Pengguna dan Kelas
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          navigate('/login');
          return;
        }

        const user = session.user;
        setStudentId(user.id);
        setEmail(user.email || '');

        // 1. Ambil data dari public.users jika ada
        const { data: userData, error: userFetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        // Cek nama lengkap (prioritas DB -> metadata auth)
        const currentName = userData?.nama_lengkap || user.user_metadata?.full_name || user.user_metadata?.nama_lengkap || '';
        setNamaLengkap(currentName);

        // Cek NISN (prioritas DB -> metadata auth)
        const currentNisn = userData?.nisn || user.user_metadata?.nisn || '';
        setNisn(currentNisn);

        // Cek Avatar (prioritas DB -> metadata auth -> default Qiko)
        const currentAvatar = userData?.avatar_url || user.user_metadata?.avatar_url || qikoSmile;
        setAvatarUrl(currentAvatar);

        // 2. Ambil data kelas dari class_members (Read-Only)
        const { data: memberData } = await supabase
          .from('class_members')
          .select('classes!inner(id, name, code)')
          .eq('student_id', user.id)
          .maybeSingle();

        if (memberData && memberData.classes) {
          setIsJoinedClass(true);
          setClassName(memberData.classes.name);
        } else {
          setIsJoinedClass(false);
          setClassName('Belum Terdaftar di Kelas');
        }
      } catch (err) {
        console.error('Gagal memuat profil:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  // Simpan Perubahan Profil
  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (!namaLengkap.trim()) {
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'Nama Kosong',
        message: 'Nama lengkap wajib diisi.'
      });
      return;
    }

    if (nisn && !/^\d{8,12}$/.test(nisn.trim())) {
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'Format NISN Salah',
        message: 'NISN harus berupa 8-12 digit angka (standar nasional 10 digit).'
      });
      return;
    }

    setSaving(true);

    try {
      // 1. Update Auth User Metadata (agar selalu tersimpan di session auth)
      await supabase.auth.updateUser({
        data: {
          full_name: namaLengkap.trim(),
          nama_lengkap: namaLengkap.trim(),
          nisn: nisn.trim(),
          avatar_url: avatarUrl
        }
      });

      // 2. Coba update public.users secara lengkap (nama_lengkap, nisn, avatar_url)
      const { error: fullUpdateError } = await supabase
        .from('users')
        .update({
          nama_lengkap: namaLengkap.trim(),
          nisn: nisn.trim(),
          avatar_url: avatarUrl
        })
        .eq('id', studentId);

      // Jika gagal karena kolom nisn atau avatar_url belum ditambahkan di DB, fallback simpan nama_lengkap saja
      if (fullUpdateError) {
        console.warn('Full update users table warning:', fullUpdateError.message);
        await supabase
          .from('users')
          .update({
            nama_lengkap: namaLengkap.trim()
          })
          .eq('id', studentId);
      }

      setPopup({
        isOpen: true,
        type: 'success',
        title: 'Profil Diperbarui!',
        message: 'Data profil petualang kamu berhasil disimpan.'
      });
    } catch (err) {
      console.error('Error saat menyimpan profil:', err);
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'Gagal Menyimpan',
        message: err.message || 'Terjadi kesalahan saat menyimpan profil.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Fungsi simpan avatar secara langsung (auto-save)
  const saveAvatarDirectly = async (newAvatar) => {
    setAvatarUrl(newAvatar);
    setIsAvatarModalOpen(false);

    try {
      // 1. Simpan ke Auth metadata
      await supabase.auth.updateUser({
        data: {
          avatar_url: newAvatar
        }
      });

      // 2. Coba update ke tabel public.users jika kolom avatar_url ada
      if (studentId) {
        await supabase
          .from('users')
          .update({ avatar_url: newAvatar })
          .eq('id', studentId);
      }

      setPopup({
        isOpen: true,
        type: 'success',
        title: 'Foto Profil Diperbarui!',
      });
    } catch (err) {
      console.warn('Auto-save avatar warning:', err);
    }
  };

  const handleSelectPresetAvatar = (src) => {
    saveAvatarDirectly(src);
  };

  const handleCustomAvatarSubmit = (e) => {
    e.preventDefault();
    if (customAvatarInput.trim()) {
      const url = customAvatarInput.trim();
      setCustomAvatarInput('');
      saveAvatarDirectly(url);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setPopup({
          isOpen: true,
          type: 'error',
          title: 'Ukuran Terlalu Besar',
          message: 'Ukuran file foto maksimal adalah 2MB.'
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        saveAvatarDirectly(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-surface font-sans text-on-background min-h-screen flex flex-col items-center overflow-x-hidden pb-12">
      
      {/* PopUp Notifikasi */}
      <PopUp
        isOpen={popup.isOpen}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={() => setPopup({ ...popup, isOpen: false })}
      />

      {/* Header Section dengan Curve Khas BioQuest */}
      <header
        className="w-full bg-surface-container pt-8 md:pt-10 pb-20 md:pb-24 px-6 md:px-8 relative z-0"
        style={{ borderBottomLeftRadius: '50% 15%', borderBottomRightRadius: '50% 15%' }}
      >
        <div className="flex justify-between items-center mb-4 max-w-md mx-auto w-full">
          {/* Tombol Kembali ke Dashboard */}
          <button
            type="button"
            onClick={() => navigate('/student')}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md text-[#479F88] hover:bg-[#e0f2ec] active:scale-95 transition-all group"
            title="Kembali ke Dashboard"
          >
            <i className="fa-solid fa-arrow-left text-base group-hover:-translate-x-0.5 transition-transform"></i>
          </button>

          <span className="text-[#479F88] font-bold tracking-wider text-xs md:text-sm font-display uppercase bg-white/70 backdrop-blur-sm px-3.5 py-1.5 rounded-full shadow-sm">
            Profil Petualang
          </span>

          <div className="w-10 h-10 opacity-0 pointer-events-none"></div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-[#479F88] tracking-tight font-display-lg text-center">
          Profil Saya
        </h1>
        <p className="text-center text-xs md:text-sm text-on-background/60 mt-1 font-body-md">
          Kelola identitas dan informasi akun belajarmu
        </p>
      </header>

      {/* Main Content Area */}
      <main className="w-full px-6 -mt-16 z-10 max-w-md flex-1 flex flex-col gap-6">
        {loading ? (
          <div className="text-center py-20">
            <i className="fa-solid fa-spinner fa-spin text-4xl text-[#479F88]"></i>
          </div>
        ) : (
          <>
            {/* Card Foto Profil & Hero */}
            <section className="bg-primary-container rounded-[36px] p-6 shadow-xl text-white flex flex-col items-center relative overflow-hidden">
          {/* Ornamen Background */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#5af2ca]/20 rounded-full blur-xl pointer-events-none"></div>

          {/* Avatar Container */}
          <div className="relative group mb-3">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-white p-1.5 shadow-2xl ring-4 ring-white/40 overflow-hidden flex items-center justify-center">
              <img
                src={avatarUrl}
                alt="Foto Profil"
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = qikoSmile;
                }}
              />
            </div>

            {/* Tombol Ubah Avatar */}
            <button
              type="button"
              onClick={() => setIsAvatarModalOpen(true)}
              className="absolute bottom-0 right-0 w-9 h-9 bg-secondary-fixed text-on-secondary-fixed rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all border-2 border-white"
              title="Ganti Foto Profil"
            >
              <i className="fa-solid fa-camera text-sm"></i>
            </button>
          </div>

          <h2 className="text-xl md:text-2xl font-bold font-display-lg text-center tracking-tight text-white mt-1">
            {namaLengkap || 'Petualang BioQuest'}
          </h2>

          <div className="inline-flex items-center gap-1.5 bg-black/15 backdrop-blur-sm px-3.5 py-1 rounded-full text-xs font-semibold mt-1.5">
            <i className="fa-solid fa-graduation-cap text-secondary-fixed"></i>
            <span>Siswa</span>
            <span className="opacity-40">•</span>
            <span className="text-[#9bf4d8]">{className}</span>
          </div>
        </section>

        {/* Form Biodata Siswa */}
        <section className="bg-white rounded-[32px] p-6 shadow-md border border-[#479F88]/15 transition-all duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-user-pen text-[#479F88] text-lg"></i>
              <h3 className="text-base font-bold text-on-background font-display">
                Informasi Pribadi
              </h3>
            </div>
            {isDetailsOpen && (
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors font-label-md"
              >
                <span>Tutup</span>
                <i className="fa-solid fa-chevron-up text-[10px]"></i>
              </button>
            )}
          </div>

          {!isDetailsOpen ? (
            <div className="pt-4 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => setIsDetailsOpen(true)}
                className="w-full bg-primary-container text-white font-bold text-base py-3.5 rounded-full shadow-md hover:bg-[#349e83] active:scale-95 transition-all font-label-md flex items-center justify-center gap-2"
              >
                <i className="fa-regular fa-eye"></i>
                <span>Lihat Detail</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-4 pt-4 animate-in fade-in duration-300">
              
              {/* Input Nama Lengkap */}
              <div className="space-y-1.5">
                <label htmlFor="namaLengkap" className="block text-xs font-bold text-on-background/80 font-label-md">
                  Nama Lengkap <span className="text-error">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-[#479F88]">
                    <i className="fa-regular fa-user"></i>
                  </span>
                  <input
                    type="text"
                    id="namaLengkap"
                    value={namaLengkap}
                    onChange={(e) => setNamaLengkap(e.target.value)}
                    placeholder="Masukkan nama lengkap kamu"
                    required
                    className="w-full bg-[#f4faf7] border border-[#479F88]/20 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-on-background focus:outline-none focus:bg-white focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/15 transition-all font-body-md"
                  />
                </div>
              </div>

              {/* Input NISN */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="nisn" className="block text-xs font-bold text-on-background/80 font-label-md">
                    NISN (Nomor Induk Siswa Nasional)
                  </label>
                  <span className="text-[10px] text-on-background/50 font-body-md">
                    10 Digit Angka
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-[#479F88]">
                    <i className="fa-solid fa-id-card"></i>
                  </span>
                  <input
                    type="text"
                    id="nisn"
                    value={nisn}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 12) setNisn(val);
                    }}
                    placeholder="Contoh: 0081234567"
                    maxLength={12}
                    className="w-full bg-[#f4faf7] border border-[#479F88]/20 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-on-background focus:outline-none focus:bg-white focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/15 transition-all font-body-md tracking-wider"
                  />
                </div>
              </div>

              {/* Kolom Kelas (READ ONLY - Tidak bisa diubah) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-on-background/80 font-label-md">
                    Kelas Saat Ini
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#479F88] bg-[#e0f2ec] px-2.5 py-0.5 rounded-full">
                    <i className="fa-solid fa-lock text-[10px]"></i>
                    Terkunci Otomatis
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-gray-400">
                    <i className="fa-solid fa-chalkboard-user"></i>
                  </span>
                  <input
                    type="text"
                    value={className}
                    readOnly
                    disabled
                    className="w-full bg-gray-100/90 border border-gray-200 text-gray-600 rounded-2xl py-3.5 pl-11 pr-10 text-sm font-bold cursor-not-allowed select-none font-body-md"
                  />
                  <span className="absolute right-4 text-gray-400" title="Kelas tidak dapat diubah sendiri">
                    <i className="fa-solid fa-circle-info text-sm"></i>
                  </span>
                </div>
                <p className="text-[11px] text-on-background/60 italic font-body-md pl-1">
                  * Kelas tidak dapat diubah di sini. Kelas menyesuaikan saat kamu bergabung menggunakan kode kelas dari gurumu.
                </p>
              </div>

              {/* Kolom Email Terdaftar (Read-Only) */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-on-background/80 font-label-md">
                  Email Terdaftar
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-gray-400">
                    <i className="fa-regular fa-envelope"></i>
                  </span>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    disabled
                    className="w-full bg-gray-100/90 border border-gray-200 text-gray-600 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium cursor-not-allowed select-none font-body-md"
                  />
                </div>
              </div>

              {/* Tombol Simpan */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-primary-container text-white font-bold text-base py-3.5 rounded-full shadow-md hover:bg-[#349e83] active:scale-95 transition-all font-label-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin text-lg"></i>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-floppy-disk"></i>
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* REKOMENDASI FITUR PROFIL: Statistik & Pencapaian Gamifikasi */}
        <section className="bg-[#e0f2ec]/60 backdrop-blur-sm rounded-[32px] p-6 shadow-sm border border-white/60 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-on-background font-display flex items-center gap-2">
              <i className="fa-solid fa-trophy text-secondary-fixed-dim"></i>
              Statistik & Prestasi Belajar
            </h3>
            <span className="text-[10px] bg-[#479F88] text-white px-2 py-0.5 rounded-full font-bold">
              Level 2
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="bg-white/80 p-3 rounded-2xl shadow-xs border border-[#479F88]/10">
              <p className="text-[11px] text-on-background/60 font-body-md">Bio-XP</p>
              <p className="text-base font-extrabold text-[#479F88] font-display mt-0.5">350</p>
            </div>
            <div className="bg-white/80 p-3 rounded-2xl shadow-xs border border-[#479F88]/10">
              <p className="text-[11px] text-on-background/60 font-body-md">Kuis Tuntas</p>
              <p className="text-base font-extrabold text-[#479F88] font-display mt-0.5">2 Stage</p>
            </div>
            <div className="bg-white/80 p-3 rounded-2xl shadow-xs border border-[#479F88]/10">
              <p className="text-[11px] text-on-background/60 font-body-md">Rata-rata</p>
              <p className="text-base font-extrabold text-[#479F88] font-display mt-0.5">85%</p>
            </div>
          </div>

          {/* Lencana Terkumpul */}
          <div>
            <p className="text-xs font-bold text-on-background/70 mb-2 font-label-md">
              Lencana Petualang
            </p>
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              <div className="bg-white/90 border border-[#479F88]/20 rounded-2xl px-3 py-2 flex items-center gap-2 flex-shrink-0 shadow-xs">
                <span className="text-lg">🧬</span>
                <div className="text-left">
                  <p className="text-[11px] font-bold text-on-background leading-tight">Penjelajah DNA</p>
                  <p className="text-[9px] text-[#479F88] font-semibold">PreTest Lulus</p>
                </div>
              </div>
              <div className="bg-white/90 border border-[#479F88]/20 rounded-2xl px-3 py-2 flex items-center gap-2 flex-shrink-0 shadow-xs">
                <span className="text-lg">🌿</span>
                <div className="text-left">
                  <p className="text-[11px] font-bold text-on-background leading-tight">Master Sel</p>
                  <p className="text-[9px] text-[#479F88] font-semibold">Skor &gt; 80</p>
                </div>
              </div>
              <div className="bg-white/60 border border-gray-200 rounded-2xl px-3 py-2 flex items-center gap-2 flex-shrink-0 opacity-60">
                <span className="text-lg grayscale">🏆</span>
                <div className="text-left">
                  <p className="text-[11px] font-bold text-gray-500 leading-tight">Bio Champion</p>
                  <p className="text-[9px] text-gray-400 font-semibold">PostTest Sempurna</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tombol Navigasi Bawah */}
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => navigate('/student')}
            className="text-[#479F88] hover:text-[#349e83] font-bold text-sm flex items-center gap-1.5 transition-colors font-label-md py-2 px-4 rounded-full hover:bg-white/50"
          >
            <i className="fa-solid fa-arrow-left text-xs"></i>
            Kembali ke Beranda Belajar
          </button>
        </div>
          </>
        )}
      </main>

      {/* Modal Pilihan Ganti Avatar */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#e0f2ec] rounded-[32px] p-6 w-full max-w-sm shadow-2xl border-2 border-white/40 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-on-background font-display flex items-center gap-2">
                Pilih Maskot Avatar
              </h3>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white text-gray-500 flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Pilihan Maskot Qiko */}
            <div>
              <p className="text-xs font-semibold text-on-background/70 mb-2.5 font-label-md">
                Koleksi Karakter Qiko:
              </p>
              <div className="grid grid-cols-4 gap-2.5">
                {PRESET_AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => handleSelectPresetAvatar(avatar.src)}
                    className={`bg-white rounded-2xl p-2 flex flex-col items-center gap-1 hover:scale-105 active:scale-95 transition-all shadow-sm border-2 ${
                      avatarUrl === avatar.src ? 'border-[#479F88] ring-2 ring-[#479F88]/30' : 'border-transparent'
                    }`}
                  >
                    <img src={avatar.src} alt={avatar.name} className="w-11 h-11 object-contain" />
                    <span className="text-[10px] font-bold text-on-background/80 truncate w-full text-center">
                      {avatar.name.split(' ')[1]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Opsi Upload dari Galeri */}
            <div className="border-t border-white/60 pt-3">
              <label className="block text-xs font-semibold text-on-background/70 mb-2 font-label-md">
                Unggah Foto Sendiri:
              </label>
              <label className="w-full bg-white border border-[#479F88]/30 border-dashed rounded-2xl p-3 flex items-center justify-center gap-2 text-xs font-bold text-[#479F88] hover:bg-[#e0f2ec] cursor-pointer transition-colors">
                <i className="fa-solid fa-cloud-arrow-up text-base"></i>
                <span>Pilih File dari Galeri (Maks 2MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Opsi URL Gambar */}
            <form onSubmit={handleCustomAvatarSubmit} className="space-y-2">
              <label className="block text-xs font-semibold text-on-background/70 font-label-md">
                Atau Tautan URL Gambar:
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://contoh.com/foto.jpg"
                  value={customAvatarInput}
                  onChange={(e) => setCustomAvatarInput(e.target.value)}
                  className="flex-1 bg-white border border-[#479F88]/20 rounded-xl px-3 py-2 text-xs text-on-background focus:outline-none focus:border-[#479F88]"
                />
                <button
                  type="submit"
                  disabled={!customAvatarInput.trim()}
                  className="bg-[#479F88] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs hover:bg-[#349e83] disabled:opacity-50"
                >
                  Terapkan
                </button>
              </div>
            </form>

            <button
              type="button"
              onClick={() => setIsAvatarModalOpen(false)}
              className="w-full py-2.5 rounded-full text-xs font-bold text-gray-600 bg-white shadow-xs hover:bg-gray-50 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfilStudents;
