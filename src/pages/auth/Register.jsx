/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import PopUp from '../../components/PopUp';
import qikoSmile from '../../assets/qiko_smile.svg';

const Register = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [popupState, setPopupState] = useState({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    });

    const closePopup = () => {
        setPopupState(prev => ({ ...prev, isOpen: false }));
        if (popupState.type === 'success') {
            navigate('/login');
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        const fullName = e.target.fullName.value;
        const email = e.target.email.value;
        const password = e.target.password.value;
        const confirmPassword = e.target.confirmPassword.value;

        if (password !== confirmPassword) {
            setPopupState({ isOpen: true, type: 'error', title: 'Gagal', message: 'Kata sandi tidak cocok' });
            setLoading(false);
            return;
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                }
            }
        });

        if (error) {
            setPopupState({ isOpen: true, type: 'error', title: 'Pendaftaran Gagal', message: error.message });
            setLoading(false);
        } else if (data.user) {
            const { error: insertError } = await supabase.from('users').insert([{
                id: data.user.id,
                nama_lengkap: fullName,
                email: email,
                password: password, 
                role: 'student'
            }]);

            if (insertError) {
                setPopupState({ isOpen: true, type: 'error', title: 'Pendaftaran Gagal', message: "Gagal menyimpan profil: " + insertError.message });
                setLoading(false);
            } else {
                setPopupState({ isOpen: true, type: 'success', title: 'Registrasi Berhasil!', message: "Silakan login menggunakan akun yang baru dibuat." });
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
          {/* Status bar icons placeholder */}
        </div>
        <h1 className="text-3xl font-bold text-[#479F88] tracking-tight font-display-lg text-center">
            Daftar Akun
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
            <h2 className="text-white text-2xl font-bold leading-tight font-display-lg">Ayo Bergabung</h2>
            <p className="text-white text-sm mt-1 leading-snug font-body-md">Buat akunmu dan mulai BioQuest!</p>
        </div>
        </section>
        
        {/* Register Form */}
        <section>
          {/* Mengurangi space-y menjadi 5 agar 4 form tidak terlalu memakan tempat vertikal */}
        <form onSubmit={handleRegister} className="space-y-5">
            
            {/* Nama Lengkap Input */}
            <div className="space-y-2 group">
            <label className="block text-lg font-bold text-on-background ml-1 font-label-md transition-colors duration-300 group-focus-within:text-[#479F88]" htmlFor="fullName">
                Nama Lengkap <span className="text-error">*</span>
            </label>
            <input 
                type="text" 
                id="fullName" 
                name="fullName" 
                placeholder="Masukkan nama lengkap kamu" 
                required 
                className="w-full bg-surface-container border-2 border-transparent rounded-full py-4 px-6 text-on-background focus:outline-none focus:bg-white focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/20 transition-all duration-300 font-body-md" 
                style={{ WebkitBoxShadow: '0 0 0 1000px #e0f2ec inset' }}
            />
            </div>

            {/* Email Input */}
            <div className="space-y-2 group">
            <label className="block text-lg font-bold text-on-background ml-1 font-label-md transition-colors duration-300 group-focus-within:text-[#479F88]" htmlFor="email">
                Email <span className="text-error">*</span>
            </label>
            <input 
                type="email" 
                id="email" 
                name="email" 
                placeholder="Masukkan email aktif kamu" 
                required 
                className="w-full bg-surface-container border-2 border-transparent rounded-full py-4 px-6 text-on-background focus:outline-none focus:bg-white focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/20 transition-all duration-300 font-body-md" 
                style={{ WebkitBoxShadow: '0 0 0 1000px #e0f2ec inset' }}
            />
            </div>
            
            {/* Password Input */}
            <div className="space-y-2 relative group">
                <label className="block text-lg font-bold text-on-background ml-1 font-label-md transition-colors duration-300 group-focus-within:text-[#479F88]" htmlFor="password">
                Kata Sandi <span className="text-error">*</span>
                </label>
                <div className="relative">
                <input 
                    type={showPassword ? "text" : "password"} 
                    id="password" 
                    name="password" 
                    placeholder="Buat kata sandi" 
                    required 
                    className="w-full bg-surface-container border-2 border-transparent rounded-full py-4 px-6 pr-14 text-on-background focus:outline-none focus:bg-white focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/20 transition-all duration-300 font-body-md"
                    style={{ WebkitBoxShadow: '0 0 0 1000px #e0f2ec inset' }}
                />
                <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-[#479F88] opacity-70 hover:opacity-100 transition-opacity"
                >
                    <i className={showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'}></i>
                </button>
                </div>
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-2 relative group">
              <label className="block text-lg font-bold text-on-background ml-1 font-label-md transition-colors duration-300 group-focus-within:text-[#479F88]" htmlFor="confirmPassword">
                Konfirmasi Kata Sandi <span className="text-error">*</span>
              </label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  id="confirmPassword" 
                  name="confirmPassword" 
                  placeholder="Ulangi kata sandi" 
                  required 
                  className="w-full bg-surface-container border-2 border-transparent rounded-full py-4 px-6 pr-14 text-on-background focus:outline-none focus:bg-white focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/20 transition-all duration-300 font-body-md"
                  style={{ WebkitBoxShadow: '0 0 0 1000px #e0f2ec inset' }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[#479F88] opacity-70 hover:opacity-100 transition-opacity"
                >
                  <i className={showConfirmPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'}></i>
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
                {loading ? 'Memproses...' : 'Daftar'}
              </button>
            </div>
            
          </form>
        </section>
        
        {/* Footer Links */}
        <footer className="mt-12 text-center pb-10">
          <p className="text-on-background text-sm font-medium font-body-md">
            Sudah memiliki akun? 
            <Link to="/login" className="text-[#479F88] underline font-bold ml-1 hover:text-primary transition-colors">
              Masuk disini
            </Link>
          </p>
        </footer>
        
      </main>
      
      <PopUp 
        isOpen={popupState.isOpen}
        type={popupState.type}
        title={popupState.title}
        message={popupState.message}
        onClose={closePopup}
      />
    </div>
  );
};

export default Register;