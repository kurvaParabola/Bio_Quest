import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import PopUp from '../components/PopUp';
import logo from '../assets/logo_bioquest.svg';

const TeacherLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [popup, setPopup] = useState({ isOpen: false, type: 'confirm', title: '', message: '' });
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleLogoutClick = () => {
    setPopup({
      isOpen: true,
      type: 'confirm',
      title: 'Keluar?',
      message: 'Apakah Anda yakin ingin keluar?',
    });
    // Close sidebar on mobile when logout is clicked
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const performLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Beranda', path: '/teacher', icon: 'fa-solid fa-house' },
    { name: 'Kelas & Siswa', path: '/teacher/classes', icon: 'fa-solid fa-users' },
    { name: 'Manajemen Kuis', path: '/teacher/quizzes', icon: 'fa-solid fa-clipboard-question' },
    { name: 'Detail Analitik', path: '/teacher/analytics', icon: 'fa-solid fa-chart-pie' }
  ];

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row text-on-background relative font-sans">
      
      <PopUp 
        isOpen={popup.isOpen}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={() => setPopup({ ...popup, isOpen: false })}
        onConfirm={popup.type === 'confirm' ? performLogout : undefined}
        confirmText="Ya, Keluar"
      />

      {/* Mobile Top App Bar (Clean, no floating overlap on content) */}
      <div className="lg:hidden sticky top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-md border-b border-[#479F88]/15 px-4 flex items-center justify-between z-30 shadow-xs shrink-0">
        <button 
          type="button"
          onClick={toggleSidebar}
          className="w-10 h-10 bg-[#e0f2ec] rounded-full flex items-center justify-center text-[#479F88] active:scale-95 transition-transform"
          aria-label="Buka Menu"
        >
          <i className={`fa-solid ${isSidebarOpen ? 'fa-xmark' : 'fa-bars'} text-lg`}></i>
        </button>

        <div className="flex items-center gap-2">
          <img src={logo} alt="BioQuest" className="w-7 h-7 object-contain" />
          <span className="font-bold text-[#479F88] font-display text-base">BioQuest Guru</span>
        </div>

        <button 
          type="button"
          onClick={handleLogoutClick}
          className="w-9 h-9 rounded-full flex items-center justify-center text-error/80 hover:text-error hover:bg-red-50 transition-colors"
          title="Keluar"
        >
          <i className="fa-solid fa-arrow-right-from-bracket text-sm"></i>
        </button>
      </div>

      {/* Backdrop for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-primary-container shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:w-80 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="pt-8 lg:pt-12 pb-6 px-6 lg:px-8 border-b border-white/20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-white rounded-[14px] flex items-center justify-center shrink-0 shadow-md border-2 border-white/10">
              <img src={logo} alt="BioQuest Logo" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white font-display-lg tracking-tight leading-none">BioQuest</h2>
              <p className="text-white/80 text-xs font-body-md mt-1">Panel Pengajar</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/teacher' && location.pathname.startsWith(item.path));
            return (
              <Link 
                key={item.name}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && setIsSidebarOpen(false)}
                className={`flex items-center gap-3.5 px-5 py-3.5 rounded-[18px] font-bold text-base transition-all duration-300 ${isActive ? 'bg-white text-[#479F88] shadow-md' : 'text-white hover:bg-white/10'}`}
              >
                <i className={`${item.icon} text-[22px]`}></i>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 mt-auto">
          <button 
            onClick={handleLogoutClick}
            className="w-full flex items-center justify-center gap-3 bg-error text-white font-bold py-3.5 rounded-[18px] shadow-md hover:bg-[#ff7875] transition-colors active:scale-95 text-sm md:text-base"
          >
            <i className="fa-solid fa-arrow-right-from-bracket"></i>
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative max-h-screen overflow-y-auto w-full bg-surface">
        <Outlet />
      </main>
    </div>
  );
};

export default TeacherLayout;
