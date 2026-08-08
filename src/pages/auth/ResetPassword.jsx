/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PopUp from '../../components/PopUp';
import { supabase } from '../../services/supabase';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [popup, setPopup] = useState({ isOpen: false, type: 'success', title: '', message: '' });

  const handleNextStep = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (password !== confirmPassword) {
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'Gagal Menyimpan',
        message: 'Konfirmasi kata sandi baru tidak cocok. Harap periksa kembali ketikan kamu.',
      });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.updateUser({ password });

    if (error) {
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'Gagal Menyimpan',
        message: error.message,
      });
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from('users').update({ password }).eq('id', data.user.id);
    }

    setPopup({
      isOpen: true,
      type: 'success',
      title: 'Sandi Diperbarui',
      message: 'Kata sandi akun kamu berhasil diatur ulang. Silakan masuk menggunakan kata sandi baru.',
    });
    setLoading(false);
  };

  const handleClosePopup = () => {
    setPopup({ ...popup, isOpen: false });
    if (popup.type === 'success') {
      navigate('/login'); 
    }
  };

  return (
    <div className="bg-surface font-sans text-on-background min-h-screen flex flex-col items-center overflow-x-hidden">
      
      <PopUp 
        isOpen={popup.isOpen}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={handleClosePopup}
      />

      <header className="w-full bg-surface-container pt-8 md:pt-12 pb-16 md:pb-24 px-6 md:px-8 relative z-0" style={{ borderBottomLeftRadius: '50% 15%', borderBottomRightRadius: '50% 15%' }}>
        <div className="flex justify-between items-center mb-6 md:mb-10">
          {/* Spacer for consistent header design */}
          <div className="w-10"></div>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#479F88] tracking-tight font-display-lg text-center">
          Sandi Baru
        </h1>
      </header>
      
      <main className="w-full px-6 -mt-16 z-10 max-w-md">
        <section className="bg-primary-container rounded-[30px] md:rounded-[40px] p-4 md:p-6 flex items-center shadow-lg mb-8 overflow-hidden min-h-[140px] md:min-h-[160px]">
          <div className="w-2/5 flex justify-center -ml-2 md:-ml-4">
            <i className="fa-solid fa-lock-open text-[60px] md:text-[80px] text-white opacity-90 drop-shadow-md"></i>
          </div>
          <div className="w-3/5 pl-2 text-white">
            <h2 className="text-xl md:text-2xl font-bold mb-1 md:mb-2 tracking-tight font-display-lg">
              Selesai!
            </h2>
            <p className="text-xs md:text-sm leading-tight opacity-90 font-body-md">
              Buat kata sandi baru yang aman dan mudah diingat.
            </p>
          </div>
        </section>
        
        <section>
          <form onSubmit={handleNextStep} className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-2 relative group">
                <label className="block text-lg font-bold text-on-background ml-1 font-label-md transition-colors duration-300 group-focus-within:text-[#479F88]">Kata Sandi Baru *</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Buat kata sandi baru" required className="w-full bg-surface-container border-2 border-transparent rounded-full py-4 px-6 pr-14 text-on-background focus:outline-none focus:bg-white focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/20 transition-all duration-300 font-body-md" style={{ WebkitBoxShadow: '0 0 0 1000px #e0f2ec inset' }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#479F88] opacity-70 hover:opacity-100 transition-opacity"><i className={showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'}></i></button>
                </div>
              </div>
              <div className="space-y-2 relative group">
                <label className="block text-lg font-bold text-on-background ml-1 font-label-md transition-colors duration-300 group-focus-within:text-[#479F88]">Konfirmasi Kata Sandi *</label>
                <div className="relative">
                  <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulangi kata sandi baru" required className="w-full bg-surface-container border-2 border-transparent rounded-full py-4 px-6 pr-14 text-on-background focus:outline-none focus:bg-white focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/20 transition-all duration-300 font-body-md" style={{ WebkitBoxShadow: '0 0 0 1000px #e0f2ec inset' }} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#479F88] opacity-70 hover:opacity-100 transition-opacity"><i className={showConfirmPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'}></i></button>
                </div>
              </div>
            </div>
            
            <div className="pt-6 flex justify-center">
              <button 
                type="submit" 
                disabled={loading}
                className="bg-primary-container text-white font-bold text-xl py-4 px-16 rounded-full shadow-md active:scale-95 transition-transform font-label-md disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? "Memproses..." : "Simpan Sandi"}
              </button>
            </div>
          </form>
        </section>
        
        <footer className="mt-12 text-center pb-10">
        </footer>
      </main>
    </div>
  );
};

export default ResetPassword;
