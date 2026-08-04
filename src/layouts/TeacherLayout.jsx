import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import PopUp from '../components/PopUp';
import { supabase } from '../services/supabase';

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
    <div className="min-h-screen bg-surface flex text-on-background relative overflow-hidden font-sans">
      
      <PopUp 
        isOpen={popup.isOpen}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={() => setPopup({ ...popup, isOpen: false })}
        onConfirm={popup.type === 'confirm' ? performLogout : undefined}
        confirmText="Ya, Keluar"
      />

      {/* Hamburger Button (Mobile Only) */}
      <div className="lg:hidden absolute top-4 left-4 z-50">
        <button 
          onClick={toggleSidebar}
          className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg text-[#479F88] active:scale-95 transition-transform"
        >
          <i className={`fa-solid text-3xl ${isSidebarOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
        </button>
      </div>

      {/* Backdrop for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-primary-container shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:w-80 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="pt-20 lg:pt-12 pb-8 px-8 border-b border-white/20">
          <h2 className="text-4xl font-bold text-white font-display-lg tracking-tight">BioQuest</h2>
          <p className="text-white/80 text-sm font-body-md mt-1">Panel Pengajar</p>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-3 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/teacher' && location.pathname.startsWith(item.path));
            return (
              <Link 
                key={item.name}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && setIsSidebarOpen(false)}
                className={`flex items-center gap-4 px-6 py-4 rounded-[20px] font-bold text-lg transition-all duration-300 ${isActive ? 'bg-white text-[#479F88] shadow-md' : 'text-white hover:bg-white/10'}`}
              >
                <i className={`${item.icon} text-[28px]`}></i>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 mt-auto">
          <button 
            onClick={handleLogoutClick}
            className="w-full flex items-center justify-center gap-3 bg-error text-white font-bold py-4 rounded-[20px] shadow-md hover:bg-[#ff7875] transition-colors active:scale-95"
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
