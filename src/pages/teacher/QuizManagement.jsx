import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import PopUp from '../../components/PopUp';
import QuizSimulation from '../../components/QuizSimulation';

const CustomSelect = ({ value, onChange, options, className, containerClassName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOpt = options.find(o => o.value === value) || options[0];

    return (
        <div className={`relative ${containerClassName || 'w-full'}`}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`flex justify-between items-center bg-white border cursor-pointer ${className}`}
            >
                <span>{selectedOpt?.label}</span>
                <i className={`fa-solid fa-chevron-down text-[10px] text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </div>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-2 min-w-[140px] flex flex-col gap-1">
                        {options.map(opt => (
                            <div
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                className={`px-3 py-2 cursor-pointer text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${value === opt.value ? 'bg-[#e0f2ec] text-[#479F88]' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
                            >
                                {value === opt.value && <i className="fa-solid fa-circle text-[6px]"></i>}
                                {opt.label}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const QuestionEditorBody = ({ q, qIndex, updateQuestion, updateOption, addOption, removeOption, handleImageUpload, updateSetting }) => {
    
    if (q.question_type === 'multiple_choice' || q.question_type === 'multiple_select') {
        return (
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Opsi Jawaban (Pilih yang benar)</label>
                <div className="space-y-3">
                    {q.options.map((opt, optIndex) => (
                        <div key={opt.id} className={`flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3 p-3 rounded-2xl md:rounded-full border-2 transition-all ${opt.isCorrect ? 'border-[#479F88] bg-[#e0f2ec]/50' : 'border-gray-200 bg-white'}`}>
                            <button
                                onClick={() => updateOption(qIndex, optIndex, 'isCorrect', !opt.isCorrect)}
                                className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-colors ml-1 ${q.question_type === 'multiple_choice' ? 'rounded-full' : 'rounded-md'} ${opt.isCorrect ? 'bg-[#479F88] text-white' : 'bg-gray-200 border border-gray-300'}`}
                            >
                                {opt.isCorrect && <i className="fa-solid fa-check text-xs"></i>}
                            </button>

                            <CustomSelect
                                value={opt.type}
                                onChange={val => updateOption(qIndex, optIndex, 'type', val)}
                                options={[
                                    { value: 'text', label: 'Teks' },
                                    { value: 'image', label: 'Gambar' }
                                ]}
                                className="border-gray-300 rounded-full px-3 py-1.5 text-xs font-bold text-gray-600"
                                containerClassName="w-24 flex-shrink-0"
                            />

                            {opt.type === 'text' ? (
                                <input
                                    type="text"
                                    value={opt.text}
                                    onChange={e => updateOption(qIndex, optIndex, 'text', e.target.value)}
                                    placeholder={`Opsi ${optIndex + 1}`}
                                    className="flex-1 bg-white border border-gray-300 rounded-full px-4 py-1.5 focus:outline-none focus:border-[#479F88] focus:ring-2 focus:ring-[#479F88]/30 transition-all font-body-md text-on-background"
                                />
                            ) : (
                                <div className="flex-1 px-2 flex items-center">
                                    {opt.media ? (
                                        <div className="relative inline-block">
                                            <img src={opt.media} alt="Opsi" className="max-h-12 rounded-xl shadow-sm" />
                                            <button onClick={() => updateOption(qIndex, optIndex, 'media', null)} className="absolute -top-2 -right-2 bg-error text-white w-5 h-5 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-sm">
                                                <i className="fa-solid fa-xmark text-[10px]"></i>
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <input type="file" id={`opt-media-${opt.id}`} className="hidden" accept="image/*,video/gif" onChange={(e) => handleImageUpload(e, (url) => updateOption(qIndex, optIndex, 'media', url))} />
                                            <label htmlFor={`opt-media-${opt.id}`} className="cursor-pointer text-sm text-[#479F88] hover:underline font-bold flex items-center gap-2 bg-gray-50 border border-gray-200 px-4 py-1.5 rounded-full">
                                                <i className="fa-solid fa-upload"></i> Unggah Media Opsi
                                            </label>
                                        </>
                                    )}
                                </div>
                            )}

                            {q.options.length > 3 && (
                                <button onClick={() => removeOption(qIndex, optIndex)} className="text-gray-400 hover:text-error transition-colors p-2 flex-shrink-0 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center mr-1" title="Hapus Opsi">
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                {q.options.length < 5 && (
                    <button onClick={() => addOption(qIndex, q.question_type)} className="mt-4 text-sm font-bold text-[#479F88] hover:text-[#387d6b] flex items-center gap-1 transition-colors">
                        <i className="fa-solid fa-plus"></i> Tambah Opsi (Maks 5)
                    </button>
                )}
            </div>
        );
    }

    if (q.question_type === 'short_answer') {
        return (
            <div>
                <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-bold text-gray-700">Kemungkinan Jawaban Benar</label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs font-bold text-gray-600">Case Sensitive</span>
                        <input type="checkbox" checked={q.settings?.caseSensitive || false} onChange={e => updateSetting(qIndex, 'caseSensitive', e.target.checked)} className="w-4 h-4 text-[#479F88] rounded" />
                    </label>
                </div>
                <div className="space-y-3">
                    {q.options.map((opt, optIndex) => (
                        <div key={opt.id} className="flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3 p-3 rounded-2xl md:rounded-full border-2 transition-all border-[#479F88] bg-[#e0f2ec]/50">
                            <div className="w-6 h-6 rounded-full bg-[#479F88] text-white flex items-center justify-center flex-shrink-0 ml-1">
                                <i className="fa-solid fa-check text-xs"></i>
                            </div>
                            <input type="text" value={opt.text} onChange={e => updateOption(qIndex, optIndex, 'text', e.target.value)} placeholder="Contoh: Sel Darah Merah" className="flex-1 bg-white border border-gray-300 rounded-full px-4 py-1.5 focus:outline-none focus:border-[#479F88] focus:ring-2 focus:ring-[#479F88]/30 transition-all font-body-md text-on-background" />
                            {q.options.length > 1 && (
                                <button onClick={() => removeOption(qIndex, optIndex)} className="text-gray-400 hover:text-error transition-colors p-2 flex-shrink-0 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center mr-1"><i className="fa-solid fa-xmark"></i></button>
                            )}
                        </div>
                    ))}
                </div>
                {q.options.length < 5 && (
                    <button onClick={() => addOption(qIndex, 'short_answer')} className="mt-4 text-sm font-bold text-[#479F88] hover:text-[#387d6b] flex items-center gap-1 transition-colors">
                        <i className="fa-solid fa-plus"></i> Tambah Variasi Jawaban
                    </button>
                )}
            </div>
        );
    }

    if (q.question_type === 'statement_verification') {
        const opt = q.options[0];
        if (!opt) return null;
        
        return (
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Kunci Jawaban Pernyataan</label>
                <div className="flex gap-2 bg-gray-50 border-2 border-gray-200 p-1.5 rounded-full inline-flex shadow-sm">
                    <button onClick={() => updateOption(qIndex, 0, 'isCorrect', true)} className={`px-10 py-3 rounded-full text-sm font-bold transition-colors ${opt.isCorrect ? 'bg-[#479F88] text-white shadow-md' : 'text-gray-500 hover:bg-gray-200'}`}>Benar</button>
                    <button onClick={() => updateOption(qIndex, 0, 'isCorrect', false)} className={`px-10 py-3 rounded-full text-sm font-bold transition-colors ${!opt.isCorrect ? 'bg-[#ff4d4f] text-white shadow-md' : 'text-gray-500 hover:bg-gray-200'}`}>Salah</button>
                </div>
            </div>
        );
    }

    if (q.question_type === 'matching') {
        const updateMatch = (optIndex, side, field, value) => {
            const newOpt = { ...q.options[optIndex] };
            newOpt[side] = { ...newOpt[side], [field]: value };
            updateOption(qIndex, optIndex, 'replace_all', newOpt);
        };

        return (
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Pasangan Menjodohkan (Kiri - Kanan)</label>
                <div className="space-y-4">
                    {q.options.map((opt, optIndex) => (
                        <div key={opt.id} className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-3xl border-2 border-gray-200 bg-gray-50 relative">
                            {/* Kiri */}
                            <div className="flex-1 w-full bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-gray-500">Target</span>
                                    <CustomSelect value={opt.left.type} onChange={val => updateMatch(optIndex, 'left', 'type', val)} options={[{value:'text',label:'Teks'},{value:'image',label:'Gambar'}]} className="border-gray-200 rounded-full px-2 py-1 text-[10px]" containerClassName="w-20" />
                                </div>
                                {opt.left.type === 'text' ? (
                                    <textarea value={opt.left.content} onChange={e => { e.target.style.height = 'auto'; e.target.style.height = (e.target.scrollHeight) + 'px'; updateMatch(optIndex, 'left', 'content', e.target.value); }} rows="1" className="w-full bg-gray-50 border-2 border-transparent focus:border-[#479F88] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-[#479F88]/20 resize-none font-body-md pt-3.5 overflow-hidden transition-all" placeholder="Isi kiri..."/>
                                ) : (
                                    opt.left.content ? (
                                        <div className="relative">
                                            <img src={opt.left.content} className="max-h-32 rounded-sm object-contain w-full bg-gray-100" alt=""/>
                                            <button onClick={() => updateMatch(optIndex, 'left', 'content', '')} className="absolute -top-2 -right-2 bg-error text-white rounded-full w-6 h-6 text-[10px] flex items-center justify-center shadow-md"><i className="fa-solid fa-xmark"></i></button>
                                        </div>
                                    ) : (
                                        <label className="flex items-center justify-center h-20 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-200 transition-colors">
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, url => updateMatch(optIndex, 'left', 'content', url))} />
                                            <span className="text-xs font-bold text-gray-500"><i className="fa-solid fa-upload mr-1"></i> Gambar</span>
                                        </label>
                                    )
                                )}
                            </div>
                            
                            <div className="text-gray-400 rotate-90 md:rotate-0 flex-shrink-0"><i className="fa-solid fa-arrow-right-arrow-left"></i></div>

                            {/* Kanan */}
                            <div className="flex-1 w-full bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-gray-500">Opsi</span>
                                    <CustomSelect value={opt.right.type} onChange={val => updateMatch(optIndex, 'right', 'type', val)} options={[{value:'text',label:'Teks'},{value:'image',label:'Gambar'}]} className="border-gray-200 rounded-full px-2 py-1 text-[10px]" containerClassName="w-20" />
                                </div>
                                {opt.right.type === 'text' ? (
                                    <textarea value={opt.right.content} onChange={e => { e.target.style.height = 'auto'; e.target.style.height = (e.target.scrollHeight) + 'px'; updateMatch(optIndex, 'right', 'content', e.target.value); }} rows="1" className="w-full bg-gray-50 border-2 border-transparent focus:border-[#479F88] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-[#479F88]/20 resize-none font-body-md pt-3.5 overflow-hidden transition-all" placeholder="Isi kanan..."/>
                                ) : (
                                    opt.right.content ? (
                                        <div className="relative">
                                            <img src={opt.right.content} className="max-h-32 rounded-sm object-contain w-full bg-gray-100" alt=""/>
                                            <button onClick={() => updateMatch(optIndex, 'right', 'content', '')} className="absolute -top-2 -right-2 bg-error text-white rounded-full w-6 h-6 text-[10px] flex items-center justify-center shadow-md"><i className="fa-solid fa-xmark"></i></button>
                                        </div>
                                    ) : (
                                        <label className="flex items-center justify-center h-20 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-200 transition-colors">
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, url => updateMatch(optIndex, 'right', 'content', url))} />
                                            <span className="text-xs font-bold text-gray-500"><i className="fa-solid fa-upload mr-1"></i> Gambar</span>
                                        </label>
                                    )
                                )}
                            </div>

                            {q.options.length > 2 && (
                                <button onClick={() => removeOption(qIndex, optIndex)} className="absolute -top-3 -right-3 bg-white text-gray-400 hover:text-error border border-gray-200 shadow-sm transition-colors p-2 rounded-full w-8 h-8 flex items-center justify-center"><i className="fa-solid fa-trash text-xs"></i></button>
                            )}
                        </div>
                    ))}
                </div>
                {q.options.length < 6 && (
                    <button onClick={() => addOption(qIndex, 'matching')} className="mt-4 text-sm font-bold text-[#479F88] hover:text-[#387d6b] flex items-center gap-1 transition-colors">
                        <i className="fa-solid fa-plus"></i> Tambah Pasangan
                    </button>
                )}
            </div>
        );
    }

    if (q.question_type === 'pin_point') {
        const mainImage = q.settings?.mainImage;

        const handleImageClick = (e) => {
            const rect = e.target.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            
            // Add a new marker to options
            const newMarker = { id: Date.now().toString(), x, y, label: '' };
            addOption(qIndex, 'pin_point_marker', newMarker);
        };

        return (
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Tebak Gambar (Pin Point)</label>
                
                {!mainImage ? (
                    <div className="bg-surface-container rounded-3xl p-6 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center min-h-[200px]">
                        <input type="file" id={`pin-main-${q.id}`} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, url => updateSetting(qIndex, 'mainImage', url))} />
                        <label htmlFor={`pin-main-${q.id}`} className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-full text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm text-gray-600 mb-2">
                            <i className="fa-regular fa-image text-[#479F88] text-lg"></i> Unggah Gambar Utama
                        </label>
                        <p className="text-xs text-gray-500 font-bold">Unggah gambar anatomi/peta yang akan ditandai.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="relative inline-block w-full max-w-2xl bg-gray-100 rounded-3xl overflow-hidden border-2 border-gray-200">
                            <img src={mainImage} alt="Main Pin Point" onClick={handleImageClick} className="w-full h-auto cursor-crosshair object-contain" />
                            {q.options.map((marker, idx) => (
                                <div key={marker.id} className="absolute flex flex-col items-center pointer-events-none" style={{ left: `${marker.x}%`, top: `${marker.y}%`, transform: 'translate(-50%, -50%)' }}>
                                    <div className="w-6 h-6 bg-[#479F88] text-white rounded-full flex items-center justify-center font-bold text-xs shadow-md border-2 border-white mb-1">{idx + 1}</div>
                                </div>
                            ))}
                            <button onClick={() => { updateSetting(qIndex, 'mainImage', null); updateSetting(qIndex, 'clear_options', true); }} className="absolute top-4 right-4 bg-white/90 text-error px-4 py-2 rounded-full text-xs font-bold shadow-sm hover:bg-white transition-colors backdrop-blur-sm"><i className="fa-solid fa-trash mr-1"></i> Ganti Gambar</button>
                        </div>
                        
                        {q.options.length > 0 && (
                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200">
                                <h4 className="text-sm font-bold text-gray-700 mb-4">Label Titik (Jawaban Benar)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {q.options.map((marker, idx) => (
                                        <div key={marker.id} className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 bg-[#479F88] text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ml-1 shadow-sm">{idx + 1}</div>
                                            <input type="text" value={marker.label} onChange={e => updateOption(qIndex, idx, 'label', e.target.value)} placeholder="Contoh: Ventrikel Kiri" className="flex-1 bg-white border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-[#479F88] focus:ring-2 focus:ring-[#479F88]/30 transition-all font-body-md text-on-background shadow-sm" />
                                            <button onClick={() => removeOption(qIndex, idx)} className="text-gray-400 hover:text-error transition-colors p-2 flex-shrink-0 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center mr-1"><i className="fa-solid fa-xmark"></i></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {q.options.length === 0 && (
                            <p className="text-sm text-gray-500 font-bold bg-[#e0f2ec] text-[#479F88] p-4 rounded-2xl inline-block"><i className="fa-solid fa-info-circle mr-2"></i>Klik di mana saja pada gambar untuk menambahkan titik tebakan.</p>
                        )}
                    </div>
                )}
            </div>
        );
    }
    
    return null;
}

const QuizManagement = () => {
    const [view, setView] = useState('list'); // 'list' or 'editor'
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [teacherId, setTeacherId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showSimulation, setShowSimulation] = useState(false);

    const [currentQuiz, setCurrentQuiz] = useState({
        id: null,
        title: '',
        description: '',
        status: 'draft',
        settings: { timerType: 'none', globalTimerMinutes: 30 },
        questions: []
    });

    const [popup, setPopup] = useState({ isOpen: false, type: 'success', title: '', message: '' });

    const fetchQuizzes = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setTeacherId(session.user.id);
            try {
                const { data, error } = await supabase
                    .from('quizzes')
                    .select('*')
                    .eq('teacher_id', session.user.id)
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    setQuizzes(data);
                }
            } catch (e) {
                console.error("Error fetching quizzes. Table might not exist yet.", e);
            }
        }
        if (showLoading) setLoading(false);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchQuizzes(false);
        setTimeout(() => setIsRefreshing(false), 500);
    };

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const handleCreateNew = () => {
        setCurrentQuiz({
            id: null,
            title: '',
            description: '',
            status: 'draft',
            settings: { timerType: 'none', globalTimerMinutes: 30 },
            questions: [
                {
                    id: Date.now().toString(),
                    question_text: '',
                    question_media: null,
                    question_type: 'multiple_choice',
                    options: [
                        { id: '1', text: '', media: null, isCorrect: true, type: 'text' },
                        { id: '2', text: '', media: null, isCorrect: false, type: 'text' },
                        { id: '3', text: '', media: null, isCorrect: false, type: 'text' }
                    ],
                    settings: { points: 10, timerSeconds: 60 }
                }
            ]
        });
        setView('editor');
    };

    const handleEditQuiz = async (quiz) => {
        setLoading(true);
        try {
            const { data: questions, error } = await supabase
                .from('questions')
                .select('*')
                .eq('quiz_id', quiz.id)
                .order('created_at', { ascending: true });

            if (!error) {
                setCurrentQuiz({
                    ...quiz,
                    settings: quiz.settings || { timerType: 'none', globalTimerMinutes: 30 },
                    questions: (questions || []).map(q => ({ ...q, settings: { points: 10, timerSeconds: 60, ...(q.settings || {}) } }))
                });
                setView('editor');
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const saveQuiz = async (statusToSave) => {
        if (!currentQuiz.title.trim()) {
            setPopup({ isOpen: true, type: 'error', title: 'Gagal', message: 'Judul kuis tidak boleh kosong.' });
            return;
        }

        for (let i = 0; i < currentQuiz.questions.length; i++) {
            const q = currentQuiz.questions[i];
            if (!q.question_text.trim() && q.question_type !== 'pin_point') {
                setPopup({ isOpen: true, type: 'error', title: 'Gagal', message: `Soal ke-${i + 1} tidak boleh kosong.` });
                return;
            }
            if (q.question_type === 'multiple_choice' || q.question_type === 'multiple_select') {
                const hasCorrect = q.options.some(opt => opt.isCorrect);
                if (!hasCorrect) {
                    setPopup({ isOpen: true, type: 'error', title: 'Gagal', message: `Soal ke-${i + 1} harus memiliki setidaknya satu jawaban benar.` });
                    return;
                }
            } else if (q.question_type === 'short_answer') {
                if (q.options.length === 0 || !q.options[0].text.trim()) {
                    setPopup({ isOpen: true, type: 'error', title: 'Gagal', message: `Soal ke-${i + 1} harus memiliki minimal satu variasi jawaban benar.` });
                    return;
                }
            } else if (q.question_type === 'pin_point') {
                if (!q.settings?.mainImage || q.options.length === 0) {
                    setPopup({ isOpen: true, type: 'error', title: 'Gagal', message: `Soal ke-${i + 1} (Pin Point) harus memiliki gambar utama dan minimal satu titik penanda.` });
                    return;
                }
            }
        }

        setLoading(true);
        let savedQuizId = currentQuiz.id;

        try {
            if (savedQuizId) {
                const { error } = await supabase
                    .from('quizzes')
                    .update({ title: currentQuiz.title, description: currentQuiz.description, status: statusToSave, settings: currentQuiz.settings, updated_at: new Date() })
                    .eq('id', savedQuizId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('quizzes')
                    .insert([{ title: currentQuiz.title, description: currentQuiz.description, status: statusToSave, settings: currentQuiz.settings, teacher_id: teacherId }])
                    .select()
                    .single();
                if (error || !data) throw error;
                savedQuizId = data.id;
            }

            await supabase.from('questions').delete().eq('quiz_id', savedQuizId);

            const questionsToInsert = currentQuiz.questions.map(q => ({
                quiz_id: savedQuizId,
                question_text: q.question_text,
                question_media: q.question_media,
                question_type: q.question_type,
                options: q.options,
                settings: q.settings || {}
            }));

            if (questionsToInsert.length > 0) {
                await supabase.from('questions').insert(questionsToInsert);
            }

            setPopup({
                isOpen: true,
                type: 'success',
                title: 'Berhasil',
                message: `Kuis berhasil disimpan sebagai ${statusToSave === 'published' ? 'Diterbitkan' : 'Draft'}.`
            });
            fetchQuizzes();
            setView('list');
        } catch (e) {
            console.error(e);
            setPopup({ isOpen: true, type: 'error', title: 'Kesalahan Sistem', message: 'Pastikan tabel kuis dan soal sudah diupdate (penghapusan constraint question_type & penambahan kolom settings).' });
        }

        setLoading(false);
    };

    const addQuestion = () => {
        setCurrentQuiz(prev => ({
            ...prev,
            questions: [
                ...prev.questions,
                {
                    id: Date.now().toString(),
                    question_text: '',
                    question_media: null,
                    question_type: 'multiple_choice',
                    options: [
                        { id: '1', text: '', media: null, isCorrect: true, type: 'text' },
                        { id: '2', text: '', media: null, isCorrect: false, type: 'text' },
                        { id: '3', text: '', media: null, isCorrect: false, type: 'text' }
                    ],
                    settings: { points: 10, timerSeconds: 60 }
                }
            ]
        }));
    };

    const removeQuestion = (index) => {
        setCurrentQuiz(prev => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== index)
        }));
    };

    const updateQuestion = (index, field, value) => {
        setCurrentQuiz(prev => {
            const newQuestions = [...prev.questions];
            newQuestions[index] = { ...newQuestions[index], [field]: value };

            if (field === 'question_type') {
                const oldSettings = newQuestions[index].settings || {};
                const baseSettings = { points: oldSettings.points ?? 10, timerSeconds: oldSettings.timerSeconds ?? 60 };

                if (value === 'multiple_choice' || value === 'multiple_select') {
                    newQuestions[index].options = [
                        { id: Date.now().toString()+'1', text: '', media: null, isCorrect: true, type: 'text' },
                        { id: Date.now().toString()+'2', text: '', media: null, isCorrect: false, type: 'text' }
                    ];
                    newQuestions[index].settings = { ...baseSettings };
                } else if (value === 'short_answer') {
                    newQuestions[index].options = [{ id: Date.now().toString(), text: '' }];
                    newQuestions[index].settings = { ...baseSettings, caseSensitive: false };
                } else if (value === 'statement_verification') {
                    newQuestions[index].options = [{ id: Date.now().toString(), text: '', isCorrect: true }];
                    newQuestions[index].settings = { ...baseSettings };
                } else if (value === 'matching') {
                    newQuestions[index].options = [{ id: Date.now().toString(), left: {type: 'text', content: ''}, right: {type: 'text', content: ''} }];
                    newQuestions[index].settings = { ...baseSettings };
                } else if (value === 'pin_point') {
                    newQuestions[index].options = [];
                    newQuestions[index].settings = { ...baseSettings, mainImage: null };
                }
            } else if (field === 'question_type' && value === 'multiple_choice') {
                let foundCorrect = false;
                newQuestions[index].options = newQuestions[index].options.map(opt => {
                    if (opt.isCorrect) {
                        if (foundCorrect) return { ...opt, isCorrect: false };
                        foundCorrect = true;
                    }
                    return opt;
                });
                if (!foundCorrect && newQuestions[index].options.length > 0) {
                    newQuestions[index].options[0].isCorrect = true;
                }
            }

            return { ...prev, questions: newQuestions };
        });
    };

    const addOption = (qIndex, typeHint, customData = null) => {
        setCurrentQuiz(prev => {
            const newQuestions = [...prev.questions];
            const q = { ...newQuestions[qIndex], options: [...newQuestions[qIndex].options] };
            newQuestions[qIndex] = q;
            
            if (customData && typeHint === 'pin_point_marker') {
                q.options.push(customData);
            } else if (typeHint === 'short_answer') {
                q.options.push({ id: Date.now().toString(), text: '' });
            } else if (typeHint === 'statement_verification') {
                // Now only allows 1 statement, but if they somehow get here, we can add it.
                q.options.push({ id: Date.now().toString(), text: '', isCorrect: true });
            } else if (typeHint === 'matching') {
                q.options.push({ id: Date.now().toString(), left: {type: 'text', content: ''}, right: {type: 'text', content: ''} });
            } else {
                q.options.push({ id: Date.now().toString(), text: '', media: null, isCorrect: false, type: 'text' });
            }
            return { ...prev, questions: newQuestions };
        });
    };

    const removeOption = (qIndex, optIndex) => {
        setCurrentQuiz(prev => {
            const newQuestions = [...prev.questions];
            const q = { ...newQuestions[qIndex], options: [...newQuestions[qIndex].options] };
            q.options = q.options.filter((_, i) => i !== optIndex);
            newQuestions[qIndex] = q;
            return { ...prev, questions: newQuestions };
        });
    };

    const updateOption = (qIndex, optIndex, field, value) => {
        setCurrentQuiz(prev => {
            const newQuestions = [...prev.questions];
            const q = { ...newQuestions[qIndex], options: [...newQuestions[qIndex].options] };
            newQuestions[qIndex] = q;
            
            if (field === 'replace_all') {
                q.options[optIndex] = value;
            } else if (field === 'isCorrect' && q.question_type === 'multiple_choice' && value === true) {
                q.options = q.options.map((opt, i) => ({
                    ...opt,
                    isCorrect: i === optIndex
                }));
            } else {
                q.options[optIndex] = { ...q.options[optIndex], [field]: value };
            }
            
            return { ...prev, questions: newQuestions };
        });
    };
    
    const updateSetting = (qIndex, field, value) => {
        setCurrentQuiz(prev => {
            const newQuestions = [...prev.questions];
            const q = { ...newQuestions[qIndex], settings: { ...newQuestions[qIndex].settings } };
            newQuestions[qIndex] = q;

            if (field === 'clear_options') {
                q.options = [];
            } else {
                q.settings[field] = value;
            }
            return { ...prev, questions: newQuestions };
        });
    };

    const handleImageUpload = (e, callback) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            callback(url);
        }
    };

    const handleAutoResize = (e) => {
        e.target.style.height = 'auto';
        e.target.style.height = (e.target.scrollHeight) + 'px';
    };

    if (view === 'list') {
        const filteredQuizzes = quizzes.filter(q => 
            q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (q.description && q.description.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        return (
            <div className="w-full pb-10 animate-in fade-in duration-300">
                <PopUp {...popup} onClose={() => setPopup(p => ({ ...p, isOpen: false }))} />

                {/* Header Section */}
                <header
                    className="w-full bg-surface-container pt-8 md:pt-16 lg:pt-16 pb-16 md:pb-24 px-6 md:px-8 relative z-0"
                    style={{ borderBottomLeftRadius: '5% 15%', borderBottomRightRadius: '5% 15%' }}
                >
                    <div className="max-w-7xl mx-auto text-center lg:text-left mt-2 flex flex-col md:flex-row justify-between items-center md:items-end gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-[#479F88] tracking-tight font-display-lg">Manajemen Kuis</h1>
                            <p className="text-base text-on-background/60 mt-2 font-body-md">Buat dan kelola kuis untuk siswa Anda.</p>
                        </div>
                        <button
                            onClick={handleCreateNew}
                            className="bg-[#479F88] text-white px-6 py-3 rounded-full font-bold shadow-md hover:bg-[#387d6b] active:scale-95 transition-all flex items-center justify-center gap-2 w-full md:w-auto"
                        >
                            <i className="fa-solid fa-plus"></i> Buat Kuis Baru
                        </button>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="w-full px-6 -mt-6 md:-mt-16 relative z-10 max-w-7xl mx-auto flex flex-col justify-start space-y-6">
                    {/* Search & Refresh Bar */}
                    <div className="flex gap-3 items-center">
                        <div className="relative flex-1">
                            <input 
                                type="text" 
                                placeholder="Cari kuis berdasarkan judul atau deskripsi..."
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

                    {loading ? (
                        <div className="text-center py-20"><i className="fa-solid fa-spinner fa-spin text-4xl text-[#479F88]"></i></div>
                    ) : quizzes.length === 0 ? (
                        <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100">
                            <i className="fa-solid fa-folder-open text-6xl text-gray-300 mb-4"></i>
                            <h3 className="text-xl font-bold text-gray-600 font-display-lg">Belum Ada Kuis</h3>
                            <p className="text-gray-400 mt-2 font-body-md">Mulai buat kuis pertamamu untuk siswa!</p>
                        </div>
                    ) : filteredQuizzes.length === 0 ? (
                        <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100">
                            <i className="fa-solid fa-search text-6xl text-gray-300 mb-4"></i>
                            <h3 className="text-xl font-bold text-gray-600 font-display-lg">Kuis Tidak Ditemukan</h3>
                            <p className="text-gray-400 mt-2 font-body-md">Coba gunakan kata kunci pencarian yang lain.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredQuizzes.map(quiz => (
                                <div key={quiz.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                                    <div className={`absolute top-0 left-0 w-2 h-full ${quiz.status === 'published' ? 'bg-[#479F88]' : 'bg-gray-400'}`}></div>
                                    <div className="flex justify-between items-start mb-2 pl-4">
                                        <h3 className="font-bold text-xl text-on-background line-clamp-1">{quiz.title}</h3>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${quiz.status === 'published' ? 'bg-[#e0f2ec] text-[#479F88]' : 'bg-gray-100 text-gray-500'}`}>
                                            {quiz.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-6 pl-4 line-clamp-2 min-h-[40px] font-body-md">{quiz.description || 'Tidak ada deskripsi.'}</p>

                                    <div className="flex gap-2 pl-4">
                                        <button onClick={() => handleEditQuiz(quiz)} className="flex-1 py-2 bg-surface-container text-[#479F88] rounded-xl font-bold hover:bg-[#e0f2ec] transition-colors text-sm">
                                            <i className="fa-solid fa-pen-to-square mr-2"></i> Edit
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        );
    }

    if (showSimulation) {
        return <QuizSimulation quiz={currentQuiz} onClose={() => setShowSimulation(false)} />;
    }

    return (
        <div className="w-full pb-10 animate-in slide-in-from-right-4 duration-300">
            <PopUp {...popup} onClose={() => setPopup(p => ({ ...p, isOpen: false }))} />

            {/* Header Section */}
            <header
                className="w-full bg-surface-container pt-8 md:pt-16 lg:pt-16 pb-16 md:pb-24 px-6 md:px-8 relative z-0"
                style={{ borderBottomLeftRadius: '5% 15%', borderBottomRightRadius: '5% 15%' }}
            >
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-end gap-4 mt-2">
                    <div className="text-center md:text-left w-full md:w-auto">
                        <button onClick={() => setView('list')} className="text-[#479F88] hover:text-[#387d6b] transition-colors font-bold flex items-center justify-center md:justify-start gap-2 mb-2 w-full md:w-auto">
                            <i className="fa-solid fa-arrow-left"></i> Kembali
                        </button>
                        <h1 className="text-3xl md:text-4xl font-bold text-[#479F88] tracking-tight font-display-lg">Editor Kuis</h1>
                        <p className="text-sm md:text-base text-on-background/60 mt-2 font-body-md">Sesuaikan soal dan jawaban kuis Anda.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full md:w-auto">
                        <button 
                            onClick={() => setShowSimulation(true)}
                            className="flex-1 md:flex-none px-6 py-3 bg-white text-gray-700 border-2 border-gray-200 rounded-full font-bold hover:bg-gray-50 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                        >
                            <i className="fa-regular fa-eye"></i> Simulasi
                        </button>
                        <button 
                            onClick={() => saveQuiz('draft')}
                            disabled={loading}
                            className="flex-1 md:flex-none px-6 py-3 bg-white text-[#479F88] border-2 border-[#479F88] rounded-full font-bold hover:bg-[#e0f2ec] active:scale-95 transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                        >
                            <i className="fa-regular fa-floppy-disk"></i> Simpan Draft
                        </button>
                        <button
                            onClick={() => saveQuiz('published')}
                            disabled={loading}
                            className="flex-1 md:flex-none px-6 py-3 bg-[#479F88] text-white rounded-full font-bold shadow-md hover:bg-[#387d6b] active:scale-95 transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                        >
                            <i className="fa-solid fa-paper-plane"></i> Terbitkan
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="w-full px-6 -mt-6 md:-mt-16 relative z-10 max-w-4xl mx-auto flex flex-col justify-start space-y-8">
                <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <h2 className="text-2xl font-bold text-[#479F88] mb-6 font-display-lg">Informasi Kuis</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Judul Kuis</label>
                            <input
                                type="text"
                                value={currentQuiz.title}
                                onChange={e => setCurrentQuiz({ ...currentQuiz, title: e.target.value })}
                                placeholder="Contoh: Kuis Sistem Pencernaan"
                                className="w-full border-2 border-gray-200 rounded-full px-4 py-3 focus:outline-none focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/20 transition-all font-body-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Deskripsi (Opsional)</label>
                            <textarea
                                value={currentQuiz.description}
                                onChange={e => setCurrentQuiz({ ...currentQuiz, description: e.target.value })}
                                onInput={handleAutoResize}
                                placeholder="Berikan instruksi atau deksripsi kuis..."
                                rows="2"
                                className="w-full border-2 border-gray-200 rounded-3xl px-4 py-3 focus:outline-none focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/20 transition-all font-body-md overflow-hidden resize-none"
                            />
                        </div>
                        
                        <div className="pt-4 border-t border-gray-100">
                            <h3 className="text-lg font-bold text-gray-700 mb-4 font-display-lg">Pengaturan Waktu</h3>
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Mode Waktu Kuis</label>
                                    <CustomSelect
                                        value={currentQuiz.settings?.timerType || 'none'}
                                        onChange={val => setCurrentQuiz(prev => ({ ...prev, settings: { ...prev.settings, timerType: val } }))}
                                        options={[
                                            { value: 'none', label: 'Tidak Ada Waktu' },
                                            { value: 'global', label: 'Waktu Per Kuis' },
                                            { value: 'per_question', label: 'Waktu Per Soal' }
                                        ]}
                                        className="border-gray-200 rounded-full px-4 py-3 font-body-md text-gray-700"
                                    />
                                </div>
                                {currentQuiz.settings?.timerType === 'global' && (
                                    <div className="w-full md:w-1/3 animate-in fade-in zoom-in duration-200">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Durasi Total (Menit)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="1"
                                                value={currentQuiz.settings.globalTimerMinutes || 30}
                                                onChange={e => setCurrentQuiz(prev => ({ ...prev, settings: { ...prev.settings, globalTimerMinutes: parseInt(e.target.value) || 30 } }))}
                                                className="w-full border-2 border-gray-200 rounded-full px-4 py-3 focus:outline-none focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/20 transition-all font-body-md pr-12"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">mnt</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {currentQuiz.settings?.timerType === 'none' && 'Kuis dikerjakan tanpa batas waktu.'}
                                {currentQuiz.settings?.timerType === 'global' && 'Kuis akan otomatis tertutup setelah waktu global habis.'}
                                {currentQuiz.settings?.timerType === 'per_question' && 'Setiap soal akan memiliki batas waktu yang harus Anda atur pada masing-masing soal di bawah.'}
                            </p>
                        </div>
                    </div>
                </section>

                <div className="space-y-6">
                    {currentQuiz.questions.map((q, qIndex) => (
                        <section key={q.id} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative">
                            <div className="absolute -top-3 -left-3 w-8 h-8 bg-[#479F88] text-white flex items-center justify-center rounded-full font-bold shadow-md z-10">
                                {qIndex + 1}
                            </div>

                            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                                <div className="flex-1 w-full">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Pertanyaan</label>
                                    <textarea
                                        value={q.question_text}
                                        onChange={e => updateQuestion(qIndex, 'question_text', e.target.value)}
                                        onInput={handleAutoResize}
                                        placeholder="Ketik pertanyaan di sini..."
                                        rows="2"
                                        className="w-full border-2 border-gray-200 rounded-3xl px-4 py-3 focus:outline-none focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/20 transition-all font-body-md overflow-hidden resize-none"
                                    />
                                </div>
                                <div className="w-full md:w-56">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Tipe Soal</label>
                                    <CustomSelect
                                        value={q.question_type}
                                        onChange={val => updateQuestion(qIndex, 'question_type', val)}
                                        options={[
                                            { value: 'multiple_choice', label: 'Pilihan Ganda' },
                                            { value: 'multiple_select', label: 'Pilihan Kompleks' },
                                            { value: 'short_answer', label: 'Isian Singkat' },
                                            { value: 'statement_verification', label: 'Verifikasi Pernyataan' },
                                            { value: 'matching', label: 'Menjodohkan' },
                                            { value: 'pin_point', label: 'Labeling' }
                                        ]}
                                        className="border-gray-200 rounded-full px-4 py-3 font-body-md text-gray-700"
                                    />
                                </div>
                                <div className="flex gap-4 w-full md:w-auto">
                                    <div className="w-24">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Poin</label>
                                        <input 
                                            type="number" 
                                            min="0"
                                            value={q.settings?.points ?? 10} 
                                            onChange={e => updateSetting(qIndex, 'points', parseInt(e.target.value) || 0)} 
                                            className="w-full border-2 border-gray-200 rounded-full px-4 py-3 focus:outline-none focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/20 transition-all font-body-md text-center" 
                                        />
                                    </div>
                                    {currentQuiz.settings?.timerType === 'per_question' && (
                                        <div className="w-32 animate-in fade-in zoom-in duration-200">
                                            <label className="block text-sm font-bold text-gray-700 mb-1" title="Durasi (Detik)">Waktu (dtk)</label>
                                            <input 
                                                type="number" 
                                                min="1"
                                                value={q.settings?.timerSeconds ?? 60} 
                                                onChange={e => updateSetting(qIndex, 'timerSeconds', parseInt(e.target.value) || 60)} 
                                                className="w-full border-2 border-gray-200 rounded-full px-4 py-3 focus:outline-none focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/20 transition-all font-body-md text-center" 
                                            />
                                        </div>
                                    )}
                                </div>
                                {currentQuiz.questions.length > 1 && (
                                    <button onClick={() => removeQuestion(qIndex)} className="text-gray-400 hover:text-error md:ml-2 p-2 transition-colors self-end md:self-center" title="Hapus Soal">
                                        <i className="fa-solid fa-trash text-xl"></i>
                                    </button>
                                )}
                            </div>

                            {q.question_type !== 'pin_point' && (
                                <div className="mb-6">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Gambar Pendukung Soal (Opsional)</label>
                                    <div className="bg-surface-container rounded-3xl p-6 border-2 border-dashed border-gray-300 flex items-center justify-center min-h-[120px]">
                                        {q.question_media ? (
                                            <div className="relative inline-block">
                                                <img src={q.question_media} alt="Media" className="max-h-40 rounded-2xl shadow-sm" />
                                                <button onClick={() => updateQuestion(qIndex, 'question_media', null)} className="absolute -top-3 -right-3 bg-error text-white w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-md">
                                                    <i className="fa-solid fa-xmark text-sm"></i>
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                <input type="file" id={`media-${q.id}`} className="hidden" accept="image/*,video/gif" onChange={(e) => handleImageUpload(e, (url) => updateQuestion(qIndex, 'question_media', url))} />
                                                <label htmlFor={`media-${q.id}`} className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-full text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm text-gray-600">
                                                    <i className="fa-regular fa-image text-[#479F88] text-lg"></i> Unggah Gambar atau GIF
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <QuestionEditorBody 
                                q={q} 
                                qIndex={qIndex} 
                                updateQuestion={updateQuestion} 
                                updateOption={updateOption} 
                                addOption={addOption} 
                                removeOption={removeOption} 
                                handleImageUpload={handleImageUpload}
                                updateSetting={updateSetting}
                            />
                            
                            <div className="mt-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Penjelasan (Opsional)</label>
                                <textarea
                                    value={q.settings?.explanation || ''}
                                    onChange={e => updateSetting(qIndex, 'explanation', e.target.value)}
                                    onInput={handleAutoResize}
                                    placeholder="Berikan penjelasan untuk jawaban ini..."
                                    rows="2"
                                    className="w-full border-2 border-gray-200 rounded-3xl px-4 py-3 focus:outline-none focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/20 transition-all font-body-md overflow-hidden resize-none"
                                />
                            </div>
                        </section>
                    ))}
                </div>

                <button
                    onClick={addQuestion}
                    className="w-full py-4 border-2 border-dashed border-[#479F88] text-[#479F88] font-bold rounded-3xl hover:bg-[#e0f2ec] transition-colors flex items-center justify-center gap-2"
                >
                    <i className="fa-solid fa-plus"></i> Tambah Soal Baru
                </button>

            </main>
        </div>
    );
};

export default QuizManagement;
