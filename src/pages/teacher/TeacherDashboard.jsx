import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');

  const [teacherData, setTeacherData] = useState({
    totalClasses: 0,
    totalStudents: 0,
    activeStudents: 0,
    stats: { avg: '0%', min: '0%', max: '0%' },
    classProgress: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const userId = session.user.id;
        
        // Fetch User Name
        const { data: userData } = await supabase.from('users').select('nama_lengkap').eq('id', userId).single();
        if (userData && userData.nama_lengkap) {
          setFirstName(userData.nama_lengkap.split(' ')[0]);
        }

        // Fetch Classes
        const { data: classesData } = await supabase.from('classes').select('id, name').eq('teacher_id', userId);
        const classes = classesData || [];
        
        // Fetch Students count
        const { data: membersData } = await supabase
          .from('class_members')
          .select('student_id, classes!inner(teacher_id)')
          .eq('classes.teacher_id', userId);
        const students = membersData || [];

        // Karena tabel hasil kuis/progres siswa belum ada, kita gunakan mock progress sementara 
        // tetapi dengan data kelas yang asli dari database.
        const classProgressData = classes.map(c => ({
          id: c.id,
          className: c.name,
          progress: Math.floor(Math.random() * 40) + 40 // Mock progres 40% - 80%
        }));

        setTeacherData({
          totalClasses: classes.length,
          totalStudents: students.length,
          activeStudents: students.length, // Sementara dianggap aktif semua
          stats: {
            avg: classProgressData.length > 0 ? Math.floor(classProgressData.reduce((a, b) => a + b.progress, 0) / classProgressData.length) + '%' : '0%',
            min: classProgressData.length > 0 ? Math.min(...classProgressData.map(c => c.progress)) + '%' : '0%',
            max: classProgressData.length > 0 ? Math.max(...classProgressData.map(c => c.progress)) + '%' : '0%'
          },
          classProgress: classProgressData
        });
        
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

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
      <main className="w-full px-6 -mt-10 relative z-10 max-w-7xl mx-auto flex flex-col justify-start mb-6 space-y-6 animate-in fade-in duration-300">
        
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
            <i className="fa-solid fa-download text-2xl opacity-80 cursor-pointer hover:opacity-100 transition-opacity"></i>
          </div>

          {/* AREA GRAFIK BATANG DENGAN RECHARTS */}
          <div className="bg-white rounded-[24px] p-4 md:p-6 min-h-[250px] lg:min-h-[300px] relative shadow-inner mb-2 mt-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={[
                  { name: 'Kelas X-1', progress: 85 },
                  { name: 'Kelas X-2', progress: 60 },
                  { name: 'Kelas X-3', progress: 45 },
                  { name: 'Kelas XI-1', progress: 90 },
                  { name: 'Kelas XI-2', progress: 75 },
                ]}
                margin={{ top: 20, right: 20, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 700 }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(71, 159, 136, 0.05)' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', fontWeight: 'bold', color: '#1F2937' }}
                  itemStyle={{ color: '#479F88' }}
                  formatter={(value) => [`${value}%`, 'Progres']}
                />
                <Bar 
                  dataKey="progress" 
                  radius={[8, 8, 8, 8]}
                  barSize={40}
                  animationDuration={1500}
                >
                  {
                    [85, 60, 45, 90, 75].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry > 70 ? '#479F88' : entry > 50 ? '#FBBF24' : '#F87171'} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
            className="w-full max-w-sm bg-[#fde430] text-[#716500] hover:text-[#504700] font-bold text-xl py-4 rounded-full shadow-lg hover:bg-[#dfc700] active:scale-95 transition-all font-label-md flex justify-center items-center gap-2 group"
          >
            Lihat Detail Kelas
            <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
          </button>
        </div>

      </main>

    </div>
  );
};

export default TeacherDashboard;