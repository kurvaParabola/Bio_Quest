import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('users').select('nama_lengkap').eq('id', session.user.id).single();
        if (data && data.nama_lengkap) {
          const first = data.nama_lengkap.split(' ')[0];
          setFirstName(first);
        }
      }
    };
    fetchUserData();
  }, []);

  // Mock Data untuk Dashboard Guru
  const [teacherData] = useState({
    name: 'Bu Frida',
    totalClasses: 3,
    totalStudents: 90,
    activeStudents: 17,
    stats: {
      avg: '60%',
      min: '20%',
      max: '80%'
    },
    // Data untuk barchart progres tiap kelas
    classProgress: [
      { id: 1, className: 'Kelas X-1', progress: 80 },
      { id: 2, className: 'Kelas X-2', progress: 45 },
      { id: 3, className: 'Kelas X-3', progress: 55 },
    ]
  });

  return (
    <div className="w-full pb-10">
      
      {/* Header Section */}
      <header 
        className="w-full bg-surface-container pt-8 md:pt-16 lg:pt-16 pb-16 md:pb-24 px-6 md:px-8 relative z-0"
        style={{ borderBottomLeftRadius: '5% 15%', borderBottomRightRadius: '5% 15%' }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Typografi Selamat Datang */}
          <h1 className="text-3xl md:text-4xl font-bold text-[#479F88] tracking-tight font-display-lg text-center lg:text-left mt-2">
            Halo, {firstName || "Guru"}!
          </h1>
          <p className="text-center lg:text-left text-sm md:text-base text-on-background/60 mt-2 font-body-md">
            Lihat perkembangan kelas Anda hari ini.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-6 -mt-16 relative z-10 max-w-7xl mx-auto flex flex-col justify-start mb-6 space-y-6 animate-in fade-in duration-300">
        
        {/* ROW 1: Grid Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Bubble Total Kelas */}
          <div className="bg-primary-container text-white p-6 rounded-[24px] shadow-md flex justify-between items-center relative overflow-hidden">
            <div className="z-10">
              <p className="text-sm font-bold font-label-md opacity-90">Total Kelas</p>
              <p className="text-5xl font-extrabold font-display-lg mt-2">{teacherData.totalClasses}</p>
            </div>
            <i className="fa-solid fa-chalkboard-user text-[80px] opacity-20 absolute -right-4 -bottom-4"></i>
          </div>

          {/* Bubble Total Siswa */}
          <div className="bg-primary-container text-white p-6 rounded-[24px] shadow-md flex justify-between items-center relative overflow-hidden">
            <div className="z-10">
              <p className="text-sm font-bold font-label-md opacity-90">Total Siswa</p>
              <p className="text-5xl font-extrabold font-display-lg mt-2">{teacherData.totalStudents}</p>
            </div>
            <i className="fa-solid fa-users text-[80px] opacity-20 absolute -right-4 -bottom-4"></i>
          </div>

          {/* Bubble Siswa Aktif */}
          <div className="bg-primary-container text-white p-6 rounded-[24px] shadow-md flex justify-between items-center relative overflow-hidden md:col-span-2 lg:col-span-1">
            <div className="z-10">
              <div className="flex items-center gap-2 mb-2">
                <i className="fa-solid fa-user-check text-xl opacity-80 animate-pulse"></i>
                <p className="text-sm font-bold font-label-md">Total Siswa Aktif</p>
              </div>
              <p className="text-5xl font-extrabold font-display-lg">
                {teacherData.activeStudents}<span className="text-2xl font-normal opacity-60">/{teacherData.totalStudents}</span>
              </p>
            </div>
            <i className="fa-solid fa-chart-line text-[80px] opacity-20 absolute -right-4 -bottom-4"></i>
          </div>

        </div>

        {/* ROW 3: Statistik Progres Keseluruhan & Bar Chart */}
        <section className="bg-primary-container text-white rounded-[32px] p-6 lg:p-8 shadow-lg border border-white/10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold font-label-md tracking-wide">
              Statistik Progres Keseluruhan
            </h3>
            <i className="fa-solid fa-share-nodes text-2xl opacity-80 cursor-pointer hover:opacity-100 transition-opacity"></i>
          </div>

          {/* AREA GRAFIK BATANG */}
          <div className="bg-[#e0f2ec] rounded-[24px] p-6 min-h-[250px] lg:min-h-[300px] flex items-end justify-around gap-4 relative shadow-inner">
            
            {/* Garis Dasar/Y-Axis Grafik */}
            <div className="absolute bottom-8 left-6 right-6 h-0.5 bg-[#479F88]/30"></div>

            {/* Loop Data Menjadi Batang Grafik */}
            {teacherData.classProgress.map((item) => (
              <div key={item.id} className="flex flex-col items-center group relative z-10 w-16 lg:w-24">
                
                {/* Nilai Persentase di Atas Batang */}
                <span className="text-xs lg:text-sm font-bold text-[#387d6b] mb-2 opacity-80 group-hover:scale-110 transition-transform">
                  {item.progress}%
                </span>

                {/* Batang Grafik */}
                <div 
                  className="w-full bg-[#387d6b] rounded-t-xl transition-all duration-700 shadow-md group-hover:bg-[#479F88]"
                  style={{ height: `${item.progress * 1.5}px` }} 
                />

                {/* Label Nama Kelas */}
                <span className="text-xs lg:text-sm font-bold text-[#387d6b] mt-3 tracking-tight whitespace-nowrap">
                  {item.className}
                </span>

              </div>
            ))}

          </div>

          {/* Ringkasan Skor */}
          <div className="flex justify-between items-center px-4 pt-6 text-sm lg:text-base font-bold font-body-md text-white/90">
            <div>AVG : <span className="font-extrabold text-white">{teacherData.stats.avg}</span></div>
            <div className="opacity-40">|</div>
            <div>MIN : <span className="font-extrabold text-white">{teacherData.stats.min}</span></div>
            <div className="opacity-40">|</div>
            <div>MAX : <span className="font-extrabold text-white">{teacherData.stats.max}</span></div>
          </div>

        </section>

        {/* ROW 4: Tombol Utama Aksi */}
        <div className="pt-4 flex justify-center pb-8">
          <button 
            onClick={() => navigate('/teacher/classes')}
            className="w-full max-w-sm bg-primary-container text-white font-bold text-xl py-4 rounded-full shadow-md active:scale-95 transition-transform font-label-md hover:bg-[#387d6b]"
          >
            Lihat Detail Kelas
          </button>
        </div>

      </main>

    </div>
  );
};

export default TeacherDashboard;