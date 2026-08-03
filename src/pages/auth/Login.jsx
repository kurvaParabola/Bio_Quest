/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import PopUp from '../../components/PopUp';
import qikoSmile from '../../assets/qiko_smile.svg';
import qikoHype from '../../assets/qiko_hype.svg';
import qikoSad from '../../assets/qiko_sad.svg';

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [popupState, setPopupState] = useState({
    isOpen: false,
    type: 'error',
    title: '',
    message: '',
    imageSrc: null,
    role: null
  });

  const closePopup = () => {
    setPopupState(prev => ({ ...prev, isOpen: false }));
    if (popupState.type === 'success' && popupState.role) {
      if (popupState.role === 'teacher') {
        navigate('/teacher');
      } else {
        navigate('/student');
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const email = e.target.email.value;
    const password = e.target.password.value;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      let friendlyMessage = error.message;
      if (friendlyMessage === 'Invalid login credentials') {
        friendlyMessage = 'Email tidak terdaftar atau kata sandi yang Anda masukkan salah.';
      } else if (friendlyMessage === 'Email not confirmed') {
        friendlyMessage = 'Email belum diverifikasi. Silakan cek kotak masuk email Anda.';
      } else if (friendlyMessage.includes('rate limit')) {
        friendlyMessage = 'Terlalu banyak percobaan. Silakan coba lagi dalam beberapa saat.';
      }

      setPopupState({ isOpen: true, type: 'error', title: 'Login Gagal', message: friendlyMessage, imageSrc: qikoSad });
      setLoading(false);
    } else if (data.user) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (userError || !userData) {
        setPopupState({ isOpen: true, type: 'error', title: 'Login Gagal', message: 'Gagal mengambil data pengguna.', imageSrc: qikoSad });
        setLoading(false);
      } else {
        setPopupState({
          isOpen: true,
          type: 'success',
          title: 'Login Berhasil!',
          message: 'Selamat datang kembali di BioQuest.',
          imageSrc: qikoHype,
          role: userData.role
        });
      }
    }
  };

  return (
    <div className="bg-surface font-sans text-on-background min-h-screen flex flex-col items-center overflow-x-hidden">

      {/* Header Section */}
      <header
        className="w-full bg-surface-container pt-12 pb-24 px-8 relative z-0"
        style={{ borderBottomLeftRadius: '50% 15%', borderBottomRightRadius: '50% 15%' }}
      >
        <div className="flex justify-between items-center mb-10">
        </div>
        <h1 className="text-3xl font-bold text-[#479F88] tracking-tight font-display-lg text-center">
          Selamat Datang
        </h1>
      </header>

      {/* Main Content */}
      <main className="w-full px-6 -mt-16 z-10 max-w-md">

        {/* Hero Banner */}
        <section className="bg-primary-container rounded-[40px] p-6 flex items-center shadow-lg mb-10 overflow-hidden min-h-[180px]">
          <div className="flex-shrink-0 w-2/5 flex justify-center">
            <img src={qikoSmile} alt="Qiko" className="w-[120px] h-[120px] object-contain" />
          </div>
          <div className="w-3/5 pl-4">
            <h2 className="text-white text-2xl font-bold leading-tight font-display-lg">Ayo Mulai</h2>
            <p className="text-white text-sm mt-1 leading-snug font-body-md">Petualanganmu bersama BioQuest!</p>
          </div>
        </section>

        {/* Login Form */}
        <section>
          <form onSubmit={handleLogin} className="space-y-6">

            {/* Email Input */}
            {/* Tambahkan class 'group' di container ini */}
            <div className="space-y-2 group">
              {/* Tambahkan 'group-focus-within:text-[#479F88]' agar label ikut berubah warna */}
              <label className="block text-lg font-bold text-on-background ml-1 font-label-md transition-colors duration-300 group-focus-within:text-[#479F88]" htmlFor="email">
                Email <span className="text-error">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Masukkan email terdaftar kamu"
                required
                // Ubah styling focus di bawah ini
                className="w-full bg-surface-container border-2 border-transparent rounded-full py-4 px-6 text-on-background focus:outline-none focus:bg-white focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/20 transition-all duration-300 font-body-md"
                style={{ WebkitBoxShadow: '0 0 0 1000px #e0f2ec inset' }}
              />
            </div>

            {/* Password Input */}
            {/* Tambahkan class 'group' di container ini */}
            <div className="space-y-2 relative group">
              <div className="flex justify-between items-end px-1">
                {/* Tambahkan 'group-focus-within:text-[#479F88]' */}
                <label className="block text-lg font-bold text-on-background font-label-md transition-colors duration-300 group-focus-within:text-[#479F88]" htmlFor="password">
                  Kata Sandi <span className="text-error">*</span>
                </label>
                <Link to="/forgot-password" className="text-[10px] font-semibold italic text-error font-body-md hover:underline">
                  Lupa kata sandi?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Masukkan kata sandi kamu"
                  required
                  // Ubah styling focus di bawah ini
                  className="w-full bg-surface-container border-2 border-transparent rounded-full py-4 px-6 pr-14 text-on-background focus:outline-none focus:bg-white focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/20 transition-all duration-300 font-body-md"
                  style={{ WebkitBoxShadow: '0 0 0 1000px #e0f2ec inset' }}
                />
                {/* Password Visibility Toggle Icon */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[#479F88] opacity-70 hover:opacity-100 transition-opacity"
                >
                  <i className={showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'}></i>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6 flex justify-center">
              <button
                type="submit"
                disabled={loading}
                className="bg-primary-container text-white font-bold text-xl py-4 px-16 rounded-full shadow-md active:scale-95 transition-transform font-label-md disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </div>

          </form>
        </section>

        {/* Footer Links */}
        <footer className="mt-12 text-center pb-10">
          <p className="text-on-background text-sm font-medium font-body-md">
            Belum memiliki akun?
            <Link to="/register" className="text-[#479F88] underline font-bold ml-1 hover:text-primary transition-colors">
              Daftar disini
            </Link>
          </p>
        </footer>

      </main>

      <PopUp
        isOpen={popupState.isOpen}
        type={popupState.type}
        title={popupState.title}
        message={popupState.message}
        imageSrc={popupState.imageSrc}
        onClose={closePopup}
      />
    </div>
  );
};

export default Login;