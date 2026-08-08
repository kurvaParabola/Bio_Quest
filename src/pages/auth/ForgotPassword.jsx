/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PopUp from '../../components/PopUp';
import { supabase } from '../../services/supabase';

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [popup, setPopup] = useState({ isOpen: false, type: 'success', title: '', message: '' });

  const handleNextStep = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password'
    });
    
    if (error) {
      setPopup({
        isOpen: true,
        type: 'error',
        title: 'Gagal',
        message: error.message,
      });
    } else {
      setPopup({
        isOpen: true,
        type: 'success',
        title: 'Email Terkirim!',
        message: 'Tautan pemulihan telah dikirim. Silakan cek kotak masuk atau folder spam email Anda.',
      });
    }
    setLoading(false);
  };

  const handleClosePopup = () => {
    setPopup({ ...popup, isOpen: false });
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
           <Link to="/login" className="text-[#479F88] flex items-center font-bold text-sm hover:opacity-80 transition-opacity">
              <i className="fa-solid fa-arrow-left mr-1"></i> Kembali
            </Link>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#479F88] tracking-tight font-display-lg text-center">
          Pulihkan Akun
        </h1>
      </header>
      
      <main className="w-full px-6 -mt-16 z-10 max-w-md">
        <section className="bg-primary-container rounded-[30px] md:rounded-[40px] p-4 md:p-6 flex items-center shadow-lg mb-8 overflow-hidden min-h-[140px] md:min-h-[160px]">
          <div className="w-2/5 flex justify-center -ml-2 md:-ml-4">
            <i className="fa-solid fa-unlock-keyhole text-[60px] md:text-[80px] text-white opacity-90 drop-shadow-md"></i>
          </div>
          <div className="w-3/5 pl-2 text-white">
            <h2 className="text-xl md:text-2xl font-bold mb-1 md:mb-2 tracking-tight font-display-lg">
              Lupa Sandi?
            </h2>
            <p className="text-xs md:text-sm leading-tight opacity-90 font-body-md">
              Jangan khawatir, mari kita atur ulang akses BioQuest-mu.
            </p>
          </div>
        </section>
        
        <section>
          <form onSubmit={handleNextStep} className="space-y-6">
            <div className="space-y-2 group">
              <label className="block text-lg font-bold text-on-background ml-1 font-label-md transition-colors duration-300 group-focus-within:text-[#479F88]">Email Pemulihan *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Masukkan email terdaftar kamu" required className="w-full bg-surface-container border-2 border-transparent rounded-full py-4 px-6 text-on-background focus:outline-none focus:bg-white focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/20 transition-all duration-300 font-body-md" style={{ WebkitBoxShadow: '0 0 0 1000px #e0f2ec inset' }} />
            </div>
            
            <div className="pt-6 flex justify-center">
              <button 
                type="submit" 
                disabled={loading}
                className="bg-primary-container text-white font-bold text-xl py-4 px-16 rounded-full shadow-md active:scale-95 transition-transform font-label-md disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? "Memproses..." : "Kirim Tautan"}
              </button>
            </div>
          </form>
        </section>
        
        <footer className="mt-12 text-center pb-10">
          <p className="text-on-background text-sm font-medium font-body-md">
            Ingat kata sandi kamu? <Link to="/login" className="text-[#479F88] underline font-bold ml-1 hover:text-primary transition-colors">Masuk disini</Link>
          </p>
        </footer>
      </main>
    </div>
  );
};

export default ForgotPassword;