import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PopUp from '../../components/PopUp';
import { supabase } from '../../services/supabase';

const ClassManagement = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Kelas'); // 'Kelas' or 'Siswa'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  
  const [popup, setPopup] = useState({ isOpen: false, type: 'confirm', title: '', message: '', targetId: null, targetType: '' });

  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassCode, setNewClassCode] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleOpenAddClass = () => {
    // Generate random 7-character alphanumeric code
    const generatedCode = Math.random().toString(36).substring(2, 9).toUpperCase();
    setNewClassCode(generatedCode);
    setNewClassName('');
    setIsAddClassOpen(true);
  };

  const [teacherId, setTeacherId] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const fetchTeacherAndData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setTeacherId(session.user.id);
        fetchData(session.user.id);
      }
    };
    fetchTeacherAndData();
  }, []);

  const fetchData = async (tid) => {
    // Fetch classes
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', tid)
      .order('created_at', { ascending: false });
      
    if (classData) {
      setClasses(classData.map(c => ({
        id: c.id,
        name: c.name,
        code: c.code,
        progress: 0
      })));
    }

    // Fetch students
    const { data: membersData, error: membersError } = await supabase
      .from('class_members')
      .select(`
        id,
        student_id,
        classes!inner(id, name, teacher_id),
        users!inner(nama_lengkap)
      `)
      .eq('classes.teacher_id', tid)
      .order('joined_at', { ascending: false });

    if (membersData) {
      setStudents(membersData.map(m => ({
        id: m.id,
        name: m.users.nama_lengkap,
        className: m.classes.name,
        progress: 0
      })));
    }
  };

  const handleCopyCode = (e, code) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setPopup({
      isOpen: true,
      type: 'success',
      title: 'Berhasil Disalin',
      message: `Kode kelas ${code} telah disalin ke clipboard!`,
    });
  };

  const handleRefresh = async () => {
    if (!teacherId) return;
    setIsRefreshing(true);
    await fetchData(teacherId);
    // Add a slight delay for visual feedback if it fetches too fast
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim() || !teacherId) return;
    
    const { data, error } = await supabase
      .from('classes')
      .insert([
        { name: newClassName, code: newClassCode, teacher_id: teacherId }
      ])
      .select();

    if (error) {
      setPopup({ isOpen: true, type: 'error', title: 'Gagal', message: error.message });
      return;
    }
    
    if (data && data.length > 0) {
      setClasses([{
        id: data[0].id,
        name: data[0].name,
        code: data[0].code,
        progress: 0
      }, ...classes]);
      setIsAddClassOpen(false);
      
      setPopup({
        isOpen: true,
        type: 'success',
        title: 'Berhasil',
        message: `Kelas ${newClassName} berhasil dibuat!`,
      });
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDeleteClick = (e, item, type) => {
    e.stopPropagation();
    setPopup({
      isOpen: true,
      type: 'confirm',
      title: `Hapus ${type}?`,
      message: `Apakah Anda yakin ingin menghapus ${item.name}?`,
      targetId: item.id,
      targetType: type
    });
  };

  const confirmDelete = () => {
    if (popup.targetType === 'Kelas') {
      setClasses(classes.filter(c => c.id !== popup.targetId));
    } else {
      setStudents(students.filter(s => s.id !== popup.targetId));
    }
    setPopup({ ...popup, isOpen: false });
  };

  const filteredClasses = classes.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="w-full pb-10">
      
      <PopUp 
        isOpen={popup.isOpen}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={() => setPopup({ ...popup, isOpen: false })}
        onConfirm={confirmDelete}
        confirmText="Ya, Hapus"
      />

      {/* Add Class Modal */}
      {isAddClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-[#e0f2ec] rounded-[32px] p-6 w-full max-w-sm text-center shadow-2xl border-2 border-white/20 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold text-[#479F88] mb-6 font-display-lg">
              Buat Kelas Baru
            </h3>
            
            <form onSubmit={handleAddClass} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="block text-sm font-bold text-[#479F88] font-label-md">
                  Nama Kelas
                </label>
                <input 
                  type="text" 
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Contoh: Kelas XI - MIPA 1"
                  required
                  className="w-full bg-white border-2 border-transparent rounded-[16px] py-3 px-4 text-[#479F88] font-bold focus:outline-none focus:border-[#479F88] focus:ring-2 focus:ring-[#479F88]/20 transition-all font-body-md"
                />
              </div>
              
              <div className="space-y-1">
                <label className="block text-sm font-bold text-[#479F88] font-label-md">
                  Kode Kelas (Otomatis)
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={newClassCode}
                    readOnly
                    className="w-full bg-gray-100 border-2 border-gray-200 rounded-[16px] py-3 px-4 text-gray-500 font-bold focus:outline-none focus:border-[#479F88] focus:ring-2 focus:ring-[#479F88]/20 transition-all font-body-md cursor-not-allowed uppercase"
                  />
                  <i className="fa-solid fa-lock absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                </div>
                <p className="text-[10px] text-[#479F88]/80 italic mt-1 text-center font-bold">Kode ini akan digunakan siswa untuk bergabung.</p>
              </div>

              <div className="flex gap-4 w-full pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddClassOpen(false)}
                  className="flex-1 py-3.5 rounded-full text-[#479F88] bg-white font-bold text-sm shadow-md active:scale-95 transition-transform border border-transparent hover:border-[#479F88]/30"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-full text-white bg-[#479F88] font-bold text-sm shadow-md active:scale-95 transition-transform"
                >
                  Buat Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header Section */}
      <header 
        className="w-full bg-surface-container pt-20 lg:pt-16 pb-24 px-8 relative z-0"
        style={{ borderBottomLeftRadius: '5% 15%', borderBottomRightRadius: '5% 15%' }}
      >
        <div className="max-w-7xl mx-auto text-center lg:text-left mt-2">
          {/* Typografi Judul */}
          <h1 className="text-4xl font-bold text-[#479F88] tracking-tight font-display-lg">
            Kelola Kelas & Siswa
          </h1>
          <p className="text-base text-on-background/60 mt-2 font-body-md">
            Pantau perkembangan dan atur kelas Anda.
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full px-6 -mt-16 relative z-10 max-w-7xl mx-auto flex flex-col justify-start space-y-6 animate-in fade-in duration-300">
        
        {/* Banner Controls */}
        <section className="bg-primary-container rounded-[40px] p-6 shadow-lg mb-2 flex flex-col gap-4">
          <div className="bg-black/10 rounded-[28px] p-1.5 flex relative">
            <button 
              onClick={() => { setActiveTab('Kelas'); setExpandedId(null); }}
              className={`flex-1 py-3.5 text-center rounded-[24px] font-bold text-base transition-all duration-300 z-10 ${activeTab === 'Kelas' ? 'bg-white text-[#479F88] shadow-md' : 'text-white hover:bg-white/10'}`}
            >
              Data Kelas
            </button>
            <button 
              onClick={() => { setActiveTab('Siswa'); setExpandedId(null); }}
              className={`flex-1 py-3.5 text-center rounded-[24px] font-bold text-base transition-all duration-300 z-10 ${activeTab === 'Siswa' ? 'bg-white text-[#479F88] shadow-md' : 'text-white hover:bg-white/10'}`}
            >
              Data Siswa
            </button>
          </div>
          
          {activeTab === 'Kelas' && (
            <button 
              onClick={handleOpenAddClass}
              className="w-full bg-white text-[#479F88] font-bold py-3 px-4 rounded-[20px] flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform text-sm hover:bg-[#e0f2ec]"
            >
              <i className="fa-solid fa-circle-plus text-lg"></i>
              <span>Tambah Kelas Baru</span>
            </button>
          )}
        </section>

        {/* Search & Refresh Bar */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder={`Cari ${activeTab.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-[3px] border-[#479F88] rounded-full py-3.5 px-6 pr-12 text-[#479F88] font-medium focus:outline-none focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/30 placeholder:text-[#479F88]/50 shadow-sm text-base transition-all duration-300"
            />
            <i className="fa-solid fa-magnifying-glass absolute right-4 top-1/2 -translate-y-1/2 text-[#479F88] text-2xl pointer-events-none"></i>
          </div>
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`flex-shrink-0 w-[54px] h-[54px] bg-white border-[3px] border-[#479F88] rounded-full flex items-center justify-center text-[#479F88] shadow-sm hover:bg-[#e0f2ec] active:scale-95 transition-all duration-300 ${isRefreshing ? 'opacity-70 cursor-not-allowed' : ''}`}
            title="Muat Ulang Data"
          >
            <i className={`fa-solid fa-rotate-right text-2xl ${isRefreshing ? 'fa-spin' : ''}`}></i>
          </button>
        </div>

        {/* List Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2 items-start">
          {activeTab === 'Kelas' ? (
            filteredClasses.length > 0 ? filteredClasses.map((cls) => (
              <div 
                key={cls.id} 
                onClick={() => toggleExpand(cls.id)}
                className="bg-white rounded-[24px] p-4 shadow-sm border border-[#479F88]/20 cursor-pointer transition-all duration-300"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className="text-[#479F88] font-bold text-lg font-display">{cls.name}</h3>
                    <div 
                      onClick={(e) => handleCopyCode(e, cls.code)}
                      className="bg-[#e0f2ec] text-[#479F88] text-xs font-bold py-1 px-3 rounded-full inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#cbe6dc] transition-colors group"
                      title="Salin Kode Kelas"
                    >
                      Kode : {cls.code}
                      <i className="fa-regular fa-copy text-[14px] opacity-70 group-hover:opacity-100"></i>
                    </div>
                  </div>
                  <div className="w-[45%] text-right">
                    <div className="flex justify-between text-xs mb-1 font-bold">
                      <span className="text-[#479F88]/70 italic">Progres :</span>
                      <span className={cls.progress < 50 ? "text-error" : "text-[#479F88]"}>{cls.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-1 relative">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 relative ${cls.progress < 50 ? 'bg-error' : 'bg-[#479F88]'}`} 
                        style={{ width: `${cls.progress}%` }} 
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-sm" />
                      </div>
                    </div>
                    <p className="text-[9px] text-gray-400 italic">Klik untuk Selengkapnya...</p>
                  </div>
                </div>

                {expandedId === cls.id && (
                  <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100 animate-in slide-in-from-top-2">
                    <button 
                      onClick={(e) => handleDeleteClick(e, cls, 'Kelas')}
                      className="flex-1 bg-[#ff4d4f] text-white font-bold py-2.5 rounded-full text-sm shadow-sm hover:bg-[#ff7875] transition-colors"
                    >
                      Hapus Kelas
                    </button>
                    <button className="flex-1 bg-[#479F88] text-white font-bold py-2.5 rounded-full text-sm shadow-sm hover:bg-[#387d6b] transition-colors">
                      Lihat Detail
                    </button>
                  </div>
                )}
              </div>
            )) : (
              <p className="text-center text-gray-500 py-8">Kelas tidak ditemukan.</p>
            )
          ) : (
            filteredStudents.length > 0 ? filteredStudents.map((student) => (
              <div 
                key={student.id} 
                onClick={() => toggleExpand(student.id)}
                className="bg-white rounded-[24px] p-4 shadow-sm border border-[#479F88]/20 cursor-pointer transition-all duration-300"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className="text-[#479F88] font-bold text-lg font-display">{student.name}</h3>
                    <div className="bg-[#e0f2ec] text-[#479F88] text-xs font-bold py-1 px-3 rounded-full inline-block">
                      {student.className}
                    </div>
                  </div>
                  <div className="w-[45%] text-right">
                    <div className="flex justify-between text-xs mb-1 font-bold">
                      <span className="text-[#479F88]/70 italic">Progres :</span>
                      <span className={student.progress < 50 ? "text-error" : "text-[#479F88]"}>{student.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-1 relative">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 relative ${student.progress < 50 ? 'bg-error' : 'bg-[#479F88]'}`} 
                        style={{ width: `${student.progress}%` }} 
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-sm" />
                      </div>
                    </div>
                    <p className="text-[9px] text-gray-400 italic">Klik untuk Selengkapnya...</p>
                  </div>
                </div>

                {expandedId === student.id && (
                  <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100 animate-in slide-in-from-top-2">
                    <button 
                      onClick={(e) => handleDeleteClick(e, student, 'Siswa')}
                      className="flex-1 bg-[#ff4d4f] text-white font-bold py-2.5 rounded-full text-sm shadow-sm hover:bg-[#ff7875] transition-colors"
                    >
                      Hapus Siswa
                    </button>
                    <button className="flex-1 bg-[#479F88] text-white font-bold py-2.5 rounded-full text-sm shadow-sm hover:bg-[#387d6b] transition-colors">
                      Lihat Detail
                    </button>
                  </div>
                )}
              </div>
            )) : (
              <p className="text-center text-gray-500 py-8">Siswa tidak ditemukan.</p>
            )
          )}
        </div>
      </main>
    </div>
  );
};

export default ClassManagement;
