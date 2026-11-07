import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import PopUp from '../../components/PopUp';
import QuizSimulation from '../../components/QuizSimulation';
import MediaLightboxModal from '../../components/MediaLightboxModal';
import { compressImageFile, DEFAULT_MAX_DIMENSION, OPTION_MAX_DIMENSION, TARGET_MAX_SIZE_BYTES } from '../../utils/mediaCompressor';

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

const QuestionEditorBody = ({ q, qIndex, updateQuestion, updateOption, addOption, removeOption, handleImageUpload, updateSetting, setPreviewLightbox }) => {
    
    if (q.question_type === 'multiple_choice' || q.question_type === 'multiple_select') {
        return (
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Opsi Jawaban</label>
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
                                        <div className="relative inline-block group">
                                            <img
                                                src={opt.media}
                                                alt="Opsi"
                                                className="max-h-12 rounded-xl shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => setPreviewLightbox && setPreviewLightbox({ url: opt.media, title: `Gambar Opsi ${optIndex + 1}` })}
                                                title="Klik untuk melihat ukuran penuh"
                                            />
                                            <button onClick={() => updateOption(qIndex, optIndex, 'media', null)} className="absolute -top-2 -right-2 bg-error text-white w-5 h-5 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-sm" title="Hapus Gambar Opsi">
                                                <i className="fa-solid fa-xmark text-[10px]"></i>
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <input type="file" id={`opt-media-${opt.id}`} className="hidden" accept="image/*,video/gif" onChange={(e) => handleImageUpload(e, (url) => updateOption(qIndex, optIndex, 'media', url), { maxDimension: OPTION_MAX_DIMENSION })} />
                                            <label htmlFor={`opt-media-${opt.id}`} className="cursor-pointer text-sm text-[#479F88] hover:underline font-bold flex items-center gap-2 bg-gray-50 border border-gray-200 px-4 py-1.5 rounded-full">
                                                <i className="fa-solid fa-upload"></i> Unggah Media Opsi (Maks. 5 MB)
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
                        <i className="fa-solid fa-plus"></i> Tambah Opsi
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
                <label className="block text-sm font-bold text-gray-700 mb-3">Pasangan Menjodohkan</label>
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
                                            <img src={opt.left.content} className="max-h-32 rounded-sm object-contain w-full bg-gray-100 cursor-pointer" alt="" onClick={() => setPreviewLightbox && setPreviewLightbox({ url: opt.left.content, title: 'Media Target Kiri' })} title="Klik untuk melihat ukuran penuh" />
                                            <button onClick={() => updateMatch(optIndex, 'left', 'content', '')} className="absolute -top-2 -right-2 bg-error text-white rounded-full w-6 h-6 text-[10px] flex items-center justify-center shadow-md"><i className="fa-solid fa-xmark"></i></button>
                                        </div>
                                    ) : (
                                        <label className="flex items-center justify-center h-20 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-200 transition-colors">
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, url => updateMatch(optIndex, 'left', 'content', url), { maxDimension: OPTION_MAX_DIMENSION })} />
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
                                            <img src={opt.right.content} className="max-h-32 rounded-sm object-contain w-full bg-gray-100 cursor-pointer" alt="" onClick={() => setPreviewLightbox && setPreviewLightbox({ url: opt.right.content, title: 'Media Opsi Kanan' })} title="Klik untuk melihat ukuran penuh" />
                                            <button onClick={() => updateMatch(optIndex, 'right', 'content', '')} className="absolute -top-2 -right-2 bg-error text-white rounded-full w-6 h-6 text-[10px] flex items-center justify-center shadow-md"><i className="fa-solid fa-xmark"></i></button>
                                        </div>
                                    ) : (
                                        <label className="flex items-center justify-center h-20 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-200 transition-colors">
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, url => updateMatch(optIndex, 'right', 'content', url), { maxDimension: OPTION_MAX_DIMENSION })} />
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
                <label className="block text-sm font-bold text-gray-700 mb-3">Tebak Gambar</label>
                
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
                                <h4 className="text-sm font-bold text-gray-700 mb-4">Label Titik</h4>
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
    const [teacherClasses, setTeacherClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [teacherId, setTeacherId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTypeFilter, setSelectedTypeFilter] = useState('all'); // 'all', 'pretest', 'posttest'
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showSimulation, setShowSimulation] = useState(false);
    const [previewLightbox, setPreviewLightbox] = useState(null);
    const [isCompressingMedia, setIsCompressingMedia] = useState(false);

    // Publish to class modal states
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [publishTargetClassIds, setPublishTargetClassIds] = useState([]);
    const [targetQuizForPublish, setTargetQuizForPublish] = useState(null);

    const [currentQuiz, setCurrentQuiz] = useState({
        id: null,
        title: '',
        description: '',
        status: 'draft',
        quiz_type: 'pretest',
        target_class_ids: [],
        settings: { timerType: 'none', globalTimerMinutes: 30 },
        questions: []
    });

    const [popup, setPopup] = useState({ isOpen: false, type: 'success', title: '', message: '', onConfirm: null, confirmText: 'Ya' });

    const fetchQuizzes = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setTeacherId(session.user.id);

            // Fetch Teacher Classes
            try {
                const { data: clsData } = await supabase
                    .from('classes')
                    .select('id, name, code')
                    .eq('teacher_id', session.user.id)
                    .order('name', { ascending: true });
                if (clsData) {
                    setTeacherClasses(clsData);
                }
            } catch (err) {
                console.warn("Error fetching classes:", err);
            }

            // Fetch Quizzes
            try {
                const { data, error } = await supabase
                    .from('quizzes')
                    .select('*')
                    .eq('teacher_id', session.user.id)
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    // Fetch quiz_classes junction if available
                    try {
                        const { data: qcData } = await supabase.from('quiz_classes').select('*');
                        if (qcData) {
                            data.forEach(q => {
                                const linked = qcData.filter(qc => qc.quiz_id === q.id).map(qc => qc.class_id);
                                if (linked.length > 0) {
                                    q.target_class_ids = linked;
                                } else {
                                    q.target_class_ids = q.target_class_ids || q.settings?.target_class_ids || [];
                                }
                            });
                        }
                    } catch (e) {
                        data.forEach(q => {
                            q.target_class_ids = q.target_class_ids || q.settings?.target_class_ids || [];
                        });
                    }
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
            quiz_type: 'pretest',
            target_class_ids: [],
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

            let assigned = quiz.target_class_ids || quiz.settings?.target_class_ids || [];
            try {
                const { data: qcData } = await supabase.from('quiz_classes').select('class_id').eq('quiz_id', quiz.id);
                if (qcData && qcData.length > 0) {
                    assigned = qcData.map(qc => qc.class_id);
                }
            } catch (e) {
                console.warn(e);
            }

            if (!error) {
                setCurrentQuiz({
                    ...quiz,
                    quiz_type: (quiz.quiz_type === 'posttest' || quiz.settings?.quiz_type === 'posttest') ? 'posttest' : 'pretest',
                    target_class_ids: assigned,
                    settings: quiz.settings || { timerType: 'none', globalTimerMinutes: 30 },
                    questions: (questions || []).map(q => ({
                        ...q,
                        settings: { points: 10, timerSeconds: 60, ...(q.settings || {}) }
                    }))
                });
                setView('editor');
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const handleSimulateQuiz = async (quiz) => {
        setLoading(true);
        try {
            const { data: questions, error } = await supabase
                .from('questions')
                .select('*')
                .eq('quiz_id', quiz.id)
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (!questions || questions.length === 0) {
                setPopup({
                    isOpen: true,
                    type: 'error',
                    title: 'Belum Ada Soal',
                    message: 'Kuis ini belum memiliki soal untuk disimulasikan. Silakan edit kuis dan tambahkan soal terlebih dahulu.'
                });
                setLoading(false);
                return;
            }

            let assigned = quiz.target_class_ids || quiz.settings?.target_class_ids || [];
            try {
                const { data: qcData } = await supabase.from('quiz_classes').select('class_id').eq('quiz_id', quiz.id);
                if (qcData && qcData.length > 0) {
                    assigned = qcData.map(qc => qc.class_id);
                }
            } catch (e) {
                console.warn(e);
            }

            setCurrentQuiz({
                ...quiz,
                quiz_type: (quiz.quiz_type === 'posttest' || quiz.settings?.quiz_type === 'posttest') ? 'posttest' : 'pretest',
                target_class_ids: assigned,
                settings: quiz.settings || { timerType: 'none', globalTimerMinutes: 30 },
                questions: questions.map(q => ({
                    ...q,
                    settings: { points: 10, timerSeconds: 60, ...(q.settings || {}) }
                }))
            });
            setShowSimulation(true);
        } catch (e) {
            console.error("Error loading quiz for simulation:", e);
            setPopup({
                isOpen: true,
                type: 'error',
                title: 'Gagal Memuat Kuis',
                message: 'Terjadi kesalahan saat memuat soal untuk simulasi.'
            });
        }
        setLoading(false);
    };

    const validateQuiz = (quizObj) => {
        if (!quizObj.title.trim()) {
            setPopup({ isOpen: true, type: 'error', title: 'Gagal', message: 'Judul kuis tidak boleh kosong.' });
            return false;
        }

        for (let i = 0; i < quizObj.questions.length; i++) {
            const q = quizObj.questions[i];
            if (!q.question_text.trim() && q.question_type !== 'pin_point') {
                setPopup({ isOpen: true, type: 'error', title: 'Gagal', message: `Soal ke-${i + 1} tidak boleh kosong.` });
                return false;
            }
            if (q.question_type === 'multiple_choice' || q.question_type === 'multiple_select') {
                const hasCorrect = q.options.some(opt => opt.isCorrect);
                if (!hasCorrect) {
                    setPopup({ isOpen: true, type: 'error', title: 'Gagal', message: `Soal ke-${i + 1} harus memiliki setidaknya satu jawaban benar.` });
                    return false;
                }
            } else if (q.question_type === 'short_answer') {
                if (q.options.length === 0 || !q.options[0].text.trim()) {
                    setPopup({ isOpen: true, type: 'error', title: 'Gagal', message: `Soal ke-${i + 1} harus memiliki minimal satu variasi jawaban benar.` });
                    return false;
                }
            } else if (q.question_type === 'pin_point') {
                if (!q.settings?.mainImage || q.options.length === 0) {
                    setPopup({ isOpen: true, type: 'error', title: 'Gagal', message: `Soal ke-${i + 1} harus memiliki gambar utama dan minimal satu titik penanda.` });
                    return false;
                }
            }
        }
        return true;
    };

    const handleOpenPublishModalFromEditor = () => {
        if (!validateQuiz(currentQuiz)) return;
        setTargetQuizForPublish(null);
        const initial = currentQuiz.target_class_ids && currentQuiz.target_class_ids.length > 0
            ? currentQuiz.target_class_ids
            : teacherClasses.map(c => c.id);
        setPublishTargetClassIds(initial);
        setIsPublishModalOpen(true);
    };

    const handleOpenPublishModalFromList = (quiz) => {
        setTargetQuizForPublish(quiz);
        const initial = quiz.target_class_ids && quiz.target_class_ids.length > 0
            ? quiz.target_class_ids
            : teacherClasses.map(c => c.id);
        setPublishTargetClassIds(initial);
        setIsPublishModalOpen(true);
    };

    const handleConfirmPublish = async () => {
        if (publishTargetClassIds.length === 0) {
            setPopup({
                isOpen: true,
                type: 'error',
                title: 'Pilih Kelas',
                message: 'Silakan pilih minimal 1 kelas untuk menerbitkan kuis ini.'
            });
            return;
        }

        setIsPublishModalOpen(false);

        if (targetQuizForPublish) {
            await updatePublishedClassesForQuiz(targetQuizForPublish.id, publishTargetClassIds);
        } else {
            await saveQuiz('published', publishTargetClassIds);
        }
    };

    const updatePublishedClassesForQuiz = async (quizId, classIds) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('quizzes')
                .update({
                    status: 'published',
                    target_class_ids: classIds,
                    updated_at: new Date()
                })
                .eq('id', quizId);

            if (error) {
                await supabase.from('quizzes').update({
                    status: 'published',
                    settings: { target_class_ids: classIds },
                    updated_at: new Date()
                }).eq('id', quizId);
            }

            try {
                await supabase.from('quiz_classes').delete().eq('quiz_id', quizId);
                const rows = classIds.map(cid => ({ quiz_id: quizId, class_id: cid }));
                await supabase.from('quiz_classes').insert(rows);
            } catch (e) {
                console.warn(e);
            }

            setPopup({
                isOpen: true,
                type: 'success',
                title: 'Berhasil Diterbitkan',
                message: `Kuis berhasil diterbitkan ke ${classIds.length} kelas.`
            });
            fetchQuizzes();
        } catch (e) {
            console.error(e);
            setPopup({ isOpen: true, type: 'error', title: 'Gagal', message: 'Terjadi kesalahan saat menerbitkan kuis.' });
        }
        setLoading(false);
    };

    const saveQuiz = async (statusToSave, selectedClasses = null) => {
        if (!validateQuiz(currentQuiz)) return;

        setLoading(true);
        let savedQuizId = currentQuiz.id;
        const assignedClasses = selectedClasses !== null
            ? selectedClasses
            : (currentQuiz.target_class_ids || []);

        const finalQuizType = (currentQuiz.quiz_type === 'posttest') ? 'posttest' : 'pretest';

        const quizData = {
            title: currentQuiz.title,
            description: currentQuiz.description,
            status: statusToSave,
            quiz_type: finalQuizType,
            target_class_ids: assignedClasses,
            settings: {
                ...(currentQuiz.settings || {}),
                quiz_type: finalQuizType,
                target_class_ids: assignedClasses
            },
            teacher_id: teacherId,
            updated_at: new Date()
        };

        try {
            if (savedQuizId) {
                let { error } = await supabase
                    .from('quizzes')
                    .update(quizData)
                    .eq('id', savedQuizId);

                if (error) {
                    const fallbackData = {
                        title: currentQuiz.title,
                        description: currentQuiz.description,
                        status: statusToSave,
                        settings: quizData.settings,
                        updated_at: new Date()
                    };
                    const { error: err2 } = await supabase.from('quizzes').update(fallbackData).eq('id', savedQuizId);
                    if (err2) throw err2;
                }
            } else {
                let { data, error } = await supabase
                    .from('quizzes')
                    .insert([quizData])
                    .select()
                    .single();

                if (error || !data) {
                    const fallbackData = {
                        title: currentQuiz.title,
                        description: currentQuiz.description,
                        status: statusToSave,
                        settings: quizData.settings,
                        teacher_id: teacherId
                    };
                    const { data: d2, error: err2 } = await supabase.from('quizzes').insert([fallbackData]).select().single();
                    if (err2 || !d2) throw err2;
                    savedQuizId = d2.id;
                } else {
                    savedQuizId = data.id;
                }
            }

            // Sync quiz_classes table
            try {
                await supabase.from('quiz_classes').delete().eq('quiz_id', savedQuizId);
                if (statusToSave === 'published' && assignedClasses.length > 0) {
                    const rows = assignedClasses.map(cid => ({ quiz_id: savedQuizId, class_id: cid }));
                    await supabase.from('quiz_classes').insert(rows);
                }
            } catch (qcErr) {
                console.warn('quiz_classes sync skipped:', qcErr);
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
                message: statusToSave === 'published'
                    ? `Kuis berhasil diterbitkan ke ${assignedClasses.length} kelas.`
                    : 'Kuis berhasil disimpan sebagai Draft.'
            });
            fetchQuizzes();
            setView('list');
        } catch (e) {
            console.error(e);
            setPopup({ isOpen: true, type: 'error', title: 'Kesalahan Sistem', message: e.message || 'Gagal menyimpan kuis. Pastikan tabel di database sudah diperbarui.' });
        }

        setLoading(false);
    };

    const handleDeleteQuiz = (quiz) => {
        setPopup({
            isOpen: true,
            type: 'confirm',
            title: 'Hapus Kuis?',
            message: `Apakah Anda yakin ingin menghapus kuis "${quiz.title}"? Seluruh soal dan data nilai kuis ini akan dihapus secara permanen.`,
            confirmText: 'Ya, Hapus',
            onConfirm: () => performDeleteQuiz(quiz.id)
        });
    };

    const performDeleteQuiz = async (quizId) => {
        setPopup(p => ({ ...p, isOpen: false }));
        setLoading(true);
        try {
            await supabase.from('quizzes').delete().eq('id', quizId);
            setPopup({ isOpen: true, type: 'success', title: 'Berhasil', message: 'Kuis telah berhasil dihapus.' });
            fetchQuizzes();
        } catch (e) {
            console.error(e);
            setPopup({ isOpen: true, type: 'error', title: 'Gagal', message: 'Terjadi kesalahan saat menghapus kuis.' });
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

    const handleImageUpload = async (e, callback, customOptions = {}) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input file agar dapat memilih file yang sama jika perlu
        e.target.value = '';

        setIsCompressingMedia(true);
        try {
            const result = await compressImageFile(file, {
                maxDimension: customOptions.maxDimension || DEFAULT_MAX_DIMENSION,
                quality: customOptions.quality || 0.8,
                targetMaxBytes: TARGET_MAX_SIZE_BYTES
            });

            callback(result.dataUrl);
        } catch (err) {
            console.error('Compress media error:', err);
            setPopup({
                isOpen: true,
                type: 'error',
                title: 'Gagal Memproses Gambar',
                message: err.message || 'Gagal memproses file gambar.'
            });
        } finally {
            setIsCompressingMedia(false);
        }
    };

    const handleAutoResize = (e) => {
        e.target.style.height = 'auto';
        e.target.style.height = (e.target.scrollHeight) + 'px';
    };

    const renderPublishModal = () => {
        if (!isPublishModalOpen) return null;

        const isAllSelected = teacherClasses.length > 0 && publishTargetClassIds.length === teacherClasses.length;

        const handleToggleAll = () => {
            if (isAllSelected) {
                setPublishTargetClassIds([]);
            } else {
                setPublishTargetClassIds(teacherClasses.map(c => c.id));
            }
        };

        const activeQuiz = targetQuizForPublish || currentQuiz;
        const qType = activeQuiz.quiz_type || activeQuiz.settings?.quiz_type || 'pretest';

        return (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-[32px] p-6 md:p-8 max-w-lg w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="flex items-start justify-between pb-4 border-b border-gray-100">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                    qType === 'pretest' ? 'bg-[#e0f2ec] text-[#479F88]' : 'bg-amber-100 text-amber-800'
                                }`}>
                                    {qType === 'pretest' ? 'Pre-Test' : 'Post-Test'}
                                </span>
                                <span className="text-xs text-gray-400 font-bold">Publikasi Kelas</span>
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-gray-800 font-display-lg leading-tight">
                                Pilih Kelas Tujuan
                            </h3>
                            <p className="text-xs text-gray-500 font-body-md mt-1">
                                Pilih kelas yang dapat mengakses dan mengerjakan "{activeQuiz.title || 'Kuis'}".
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsPublishModalOpen(false)}
                            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    {/* Select All Toggle Bar */}
                    <div className="pt-4 pb-2">
                        <div
                            onClick={handleToggleAll}
                            className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                                isAllSelected
                                    ? 'border-[#479F88] bg-[#e0f2ec]/60 shadow-sm'
                                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                                    isAllSelected
                                        ? 'bg-[#479F88] text-white shadow-sm'
                                        : 'bg-white border-2 border-gray-300 text-transparent'
                                }`}>
                                    <i className="fa-solid fa-check"></i>
                                </div>
                                <span className="font-bold text-sm text-gray-800">
                                    Pilih Semua Kelas
                                </span>
                            </div>
                            <span className="text-xs font-bold text-[#479F88] bg-white px-2.5 py-1 rounded-full shadow-sm border border-[#479F88]/20">
                                {publishTargetClassIds.length} / {teacherClasses.length} Dipilih
                            </span>
                        </div>
                    </div>

                    {/* Classes Checkbox List */}
                    <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1 my-2">
                        {teacherClasses.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-2xl p-6 border border-dashed border-gray-200">
                                <i className="fa-solid fa-chalkboard-user text-3xl text-gray-300 mb-2"></i>
                                <p className="text-sm font-bold text-gray-600">Belum Ada Kelas</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Buat kelas terlebih dahulu di menu Manajemen Kelas untuk menerbitkan kuis ini.
                                </p>
                            </div>
                        ) : (
                            teacherClasses.map(cls => {
                                const isSelected = publishTargetClassIds.includes(cls.id);
                                const toggle = () => {
                                    if (isSelected) {
                                        setPublishTargetClassIds(prev => prev.filter(id => id !== cls.id));
                                    } else {
                                        setPublishTargetClassIds(prev => [...prev, cls.id]);
                                    }
                                };

                                return (
                                    <div
                                        key={cls.id}
                                        onClick={toggle}
                                        className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                                            isSelected
                                                ? 'border-[#479F88] bg-[#e0f2ec]/40 shadow-sm'
                                                : 'border-gray-200 hover:border-gray-300 bg-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold transition-all ${
                                                isSelected
                                                    ? 'bg-[#479F88] text-white shadow-sm'
                                                    : 'border-2 border-gray-300 text-transparent'
                                            }`}>
                                                <i className="fa-solid fa-check"></i>
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-gray-800">{cls.name}</p>
                                                <p className="text-[11px] text-gray-400 font-mono">Kode Kelas: {cls.code}</p>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <span className="text-xs font-bold text-[#479F88]">
                                                <i className="fa-solid fa-circle-check text-base"></i>
                                            </span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-gray-100 flex gap-3">
                        <button
                            type="button"
                            onClick={() => setIsPublishModalOpen(false)}
                            className="flex-1 py-3 px-5 rounded-full font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmPublish}
                            disabled={publishTargetClassIds.length === 0 || loading}
                            className="flex-1 py-3 px-5 rounded-full font-bold text-white bg-[#479F88] hover:bg-[#387d6b] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm shadow-md flex items-center justify-center gap-2"
                        >
                            <i className="fa-solid fa-paper-plane"></i>
                            <span>Terbitkan</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (showSimulation) {
        return <QuizSimulation quiz={currentQuiz} onClose={() => setShowSimulation(false)} />;
    }

    if (view === 'list') {
        const filteredQuizzes = quizzes.filter(q => {
            const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                (q.description && q.description.toLowerCase().includes(searchQuery.toLowerCase()));
            
            const qType = q.quiz_type || q.settings?.quiz_type || 'pretest';
            const matchesType = selectedTypeFilter === 'all' || qType === selectedTypeFilter;

            return matchesSearch && matchesType;
        });

        const getTargetClassesLabel = (quiz) => {
            const classIds = quiz.target_class_ids || quiz.settings?.target_class_ids || [];
            if (!classIds || classIds.length === 0) return 'Belum ada kelas';
            if (teacherClasses.length > 0 && classIds.length === teacherClasses.length) {
                return 'Semua Kelas';
            }
            const names = teacherClasses
                .filter(c => classIds.includes(c.id))
                .map(c => c.name);
            if (names.length === 0) return `${classIds.length} Kelas`;
            if (names.length <= 2) return names.join(', ');
            return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
        };

        return (
            <div className="w-full pb-10 animate-in fade-in duration-300">
                <PopUp {...popup} onClose={() => setPopup(p => ({ ...p, isOpen: false }))} onConfirm={popup.onConfirm} />
                {renderPublishModal()}

                {/* Header Section */}
                <header
                    className="w-full bg-surface-container pt-8 md:pt-16 lg:pt-16 pb-16 md:pb-24 px-6 md:px-8 relative z-0"
                    style={{ borderBottomLeftRadius: '5% 15%', borderBottomRightRadius: '5% 15%' }}
                >
                    <div className="max-w-7xl mx-auto text-center lg:text-left mt-2 flex flex-col md:flex-row justify-between items-center md:items-end gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-[#479F88] tracking-tight font-display-lg">Manajemen Kuis</h1>
                            <p className="text-sm md:text-base text-on-background/60 mt-2 font-body-md">Buat dan kelola Pre-Test serta Post-Test untuk kelas Anda.</p>
                        </div>
                        <button
                            onClick={handleCreateNew}
                            className="bg-[#fde430] text-[#716500] px-6 py-3 rounded-full font-bold shadow-lg hover:bg-[#dfc700] hover:text-[#504700] active:scale-95 transition-all flex items-center justify-center gap-2 w-full md:w-auto"
                        >
                            <i className="fa-solid fa-plus"></i> Buat Kuis Baru
                        </button>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="w-full px-6 -mt-6 md:-mt-16 relative z-10 max-w-7xl mx-auto flex flex-col justify-start space-y-6">
                    {/* Banner Controls - Selaras dengan ClassManagement */}
                    <section className="bg-primary-container rounded-[40px] p-6 shadow-lg mb-2 flex flex-col gap-4">
                        <div className="bg-black/10 rounded-[28px] p-1.5 flex relative gap-1">
                            <button 
                                onClick={() => setSelectedTypeFilter('all')}
                                className={`flex-1 py-3.5 text-center rounded-[24px] font-bold text-sm md:text-base transition-all duration-300 z-10 ${selectedTypeFilter === 'all' ? 'bg-white text-[#479F88] shadow-md' : 'text-white hover:bg-white/10'}`}
                            >
                                Semua Kuis
                            </button>
                            <button 
                                onClick={() => setSelectedTypeFilter('pretest')}
                                className={`flex-1 py-3.5 text-center rounded-[24px] font-bold text-sm md:text-base transition-all duration-300 z-10 ${selectedTypeFilter === 'pretest' ? 'bg-white text-[#479F88] shadow-md' : 'text-white hover:bg-white/10'}`}
                            >
                                Pre-Test
                            </button>
                            <button 
                                onClick={() => setSelectedTypeFilter('posttest')}
                                className={`flex-1 py-3.5 text-center rounded-[24px] font-bold text-sm md:text-base transition-all duration-300 z-10 ${selectedTypeFilter === 'posttest' ? 'bg-white text-[#479F88] shadow-md' : 'text-white hover:bg-white/10'}`}
                            >
                                Post-Test
                            </button>
                        </div>
                    </section>

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
                            <p className="text-gray-400 mt-2 font-body-md">Mulai buat Pre-Test atau Post-Test pertamamu untuk siswa!</p>
                        </div>
                    ) : filteredQuizzes.length === 0 ? (
                        <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100">
                            <i className="fa-solid fa-search text-6xl text-gray-300 mb-4"></i>
                            <h3 className="text-xl font-bold text-gray-600 font-display-lg">Kuis Tidak Ditemukan</h3>
                            <p className="text-gray-400 mt-2 font-body-md">Coba gunakan kata kunci atau filter kategori yang lain.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredQuizzes.map(quiz => {
                                const qType = quiz.quiz_type || quiz.settings?.quiz_type || 'pretest';
                                const isPublished = quiz.status === 'published';

                                return (
                                    <div 
                                        key={quiz.id} 
                                        className="bg-white rounded-[24px] p-5 shadow-sm border border-[#479F88]/20 hover:border-[#479F88]/50 transition-all duration-300 flex flex-col justify-between"
                                    >
                                        <div>
                                            {/* Top Badges & Delete Button */}
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                                                        qType === 'pretest' ? 'bg-[#e0f2ec] text-[#479F88]' : 'bg-amber-100 text-amber-800'
                                                    }`}>
                                                        {qType === 'pretest' ? 'Pre-Test' : 'Post-Test'}
                                                    </span>
                                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                                        isPublished ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        {isPublished ? 'Terbit' : 'Draft'}
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={() => handleDeleteQuiz(quiz)}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-error hover:bg-red-50 transition-colors"
                                                    title="Hapus Kuis"
                                                >
                                                    <i className="fa-solid fa-trash-can text-sm"></i>
                                                </button>
                                            </div>

                                            {/* Title & Description */}
                                            <h3 className="text-[#479F88] font-bold text-lg font-display line-clamp-1">
                                                {quiz.title}
                                            </h3>
                                            <p className="text-xs text-on-background/60 mt-1 font-body-md line-clamp-2 min-h-[32px]">
                                                {quiz.description || 'Tidak ada deskripsi.'}
                                            </p>

                                            {/* Target Class Pill */}
                                            <div className="mt-3 bg-[#e0f2ec] text-[#479F88] text-xs font-bold py-1.5 px-3.5 rounded-full flex items-center justify-between">
                                                <span className="truncate">Kelas : {getTargetClassesLabel(quiz)}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenPublishModalFromList(quiz)}
                                                    className="underline hover:opacity-80 text-[11px] font-bold ml-2 flex-shrink-0"
                                                >
                                                    {isPublished ? 'Ubah' : 'Pilih'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Bottom Action Buttons (Clean & No Clutter) */}
                                        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                                            <button
                                                onClick={() => handleSimulateQuiz(quiz)}
                                                className="flex-1 bg-white border-2 border-[#479F88] text-[#479F88] hover:bg-[#e0f2ec] py-2.5 px-3 rounded-full font-bold text-xs sm:text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
                                                title="Simulasi Kuis"
                                            >
                                                <i className="fa-regular fa-eye text-sm"></i>
                                                <span>Simulasi</span>
                                            </button>
                                            <button
                                                onClick={() => handleEditQuiz(quiz)}
                                                className="flex-1 bg-[#479F88] text-white py-2.5 px-3 rounded-full font-bold text-xs sm:text-sm shadow-sm hover:bg-[#387d6b] active:scale-95 transition-all text-center"
                                            >
                                                Edit Kuis
                                            </button>
                                            {!isPublished && (
                                                <button
                                                    onClick={() => handleOpenPublishModalFromList(quiz)}
                                                    className="flex-1 bg-[#fde430] text-[#716500] hover:bg-[#dfc700] py-2.5 px-3 rounded-full font-bold text-xs sm:text-sm shadow-sm active:scale-95 transition-all text-center"
                                                >
                                                    Terbitkan
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>
        );
    }

    return (
        <div className="w-full pb-10 animate-in slide-in-from-right-4 duration-300">
            <PopUp {...popup} onClose={() => setPopup(p => ({ ...p, isOpen: false }))} onConfirm={popup.onConfirm} />
            {renderPublishModal()}

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
                            onClick={handleOpenPublishModalFromEditor}
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
                    <div className="space-y-5">
                        {/* Pilihan Tipe Kuis */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Tipe Kuis <span className="text-[#479F88]">*</span>
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Pre-Test */}
                                <div
                                    onClick={() => setCurrentQuiz(prev => ({ ...prev, quiz_type: 'pretest' }))}
                                    className={`cursor-pointer p-4 rounded-2xl border-2 transition-all select-none ${
                                        (currentQuiz.quiz_type || 'pretest') === 'pretest'
                                            ? 'border-[#479F88] bg-[#e0f2ec] text-[#479F88] shadow-sm'
                                            : 'border-gray-200 bg-white hover:border-[#479F88]/40 text-gray-600'
                                    }`}
                                >
                                    <p className="text-base font-bold leading-tight">Pre-Test</p>
                                    <p className="text-xs opacity-75 font-normal mt-1">Ujian / Evaluasi Awal Materi</p>
                                </div>

                                {/* Post-Test */}
                                <div
                                    onClick={() => setCurrentQuiz(prev => ({ ...prev, quiz_type: 'posttest' }))}
                                    className={`cursor-pointer p-4 rounded-2xl border-2 transition-all select-none ${
                                        currentQuiz.quiz_type === 'posttest'
                                            ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm'
                                            : 'border-gray-200 bg-white hover:border-amber-400/40 text-gray-600'
                                    }`}
                                >
                                    <p className="text-base font-bold leading-tight">Post-Test</p>
                                    <p className="text-xs opacity-75 font-normal mt-1">Evaluasi Akhir Materi</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Judul Kuis</label>
                            <input
                                type="text"
                                value={currentQuiz.title}
                                onChange={e => setCurrentQuiz({ ...currentQuiz, title: e.target.value })}
                                placeholder="Contoh: Pre-Test Sistem Peredaran Darah"
                                className="w-full border-2 border-gray-200 rounded-full px-4 py-3 focus:outline-none focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/20 transition-all font-body-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Deskripsi</label>
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
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Durasi Total</label>
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
                                            <label className="block text-sm font-bold text-gray-700 mb-1" title="Durasi Detik">Waktu Detik</label>
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
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-bold text-gray-700">Gambar Pendukung Soal</label>
                                        <span className="text-[11px] text-gray-400 font-bold">Maks. 5 MB (Otomatis Dioptimasi)</span>
                                    </div>
                                    <div className="bg-surface-container rounded-3xl p-6 border-2 border-dashed border-gray-300 flex items-center justify-center min-h-[120px]">
                                        {q.question_media ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="relative inline-block group">
                                                    <img
                                                        src={q.question_media}
                                                        alt="Media Soal"
                                                        className="max-h-48 rounded-2xl shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                                        onClick={() => setPreviewLightbox({ url: q.question_media, title: `Gambar Soal No. ${qIndex + 1}` })}
                                                        title="Klik untuk melihat ukuran penuh"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuestion(qIndex, 'question_media', null)}
                                                        className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                                                        title="Hapus Media"
                                                    >
                                                        <i className="fa-solid fa-xmark text-sm"></i>
                                                    </button>
                                                    <div
                                                        onClick={() => setPreviewLightbox({ url: q.question_media, title: `Gambar Soal No. ${qIndex + 1}` })}
                                                        className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/85 text-white text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer flex items-center gap-1 shadow-sm backdrop-blur-xs"
                                                    >
                                                        <i className="fa-solid fa-magnifying-glass-plus text-[10px]"></i>
                                                        <span>Perbesar</span>
                                                    </div>
                                                </div>
                                                {q.question_media.startsWith('blob:') ? (
                                                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1">
                                                        <i className="fa-solid fa-triangle-exclamation"></i>
                                                        File sesi lokal lama. Silakan unggah ulang agar dapat dibuka oleh siswa.
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] font-bold text-[#479F88] bg-[#e0f2ec] border border-[#479F88]/30 px-3 py-1 rounded-full flex items-center gap-1">
                                                        <i className="fa-solid fa-circle-check"></i>
                                                        Media Teroptimasi & Siap Dibuka Siswa
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                {isCompressingMedia ? (
                                                    <div className="flex items-center gap-2 text-sm font-bold text-[#479F88] animate-pulse">
                                                        <i className="fa-solid fa-spinner fa-spin"></i>
                                                        <span>Mengompresi & mengoptimalkan media...</span>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <input
                                                            type="file"
                                                            id={`media-${q.id}`}
                                                            className="hidden"
                                                            accept="image/*,video/gif"
                                                            onChange={(e) => handleImageUpload(e, (url) => updateQuestion(qIndex, 'question_media', url), { maxDimension: DEFAULT_MAX_DIMENSION })}
                                                        />
                                                        <label
                                                            htmlFor={`media-${q.id}`}
                                                            className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-full text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm text-gray-600"
                                                        >
                                                            <i className="fa-regular fa-image text-[#479F88] text-lg"></i> Unggah Gambar atau GIF
                                                        </label>
                                                        <p className="text-[11px] text-gray-400 mt-2 font-body-md">
                                                            Maks. 5 MB. Otomatis dikompresi agar ringan dimuat oleh siswa.
                                                        </p>
                                                    </div>
                                                )}
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
                                setPreviewLightbox={setPreviewLightbox}
                            />
                            
                            <div className="mt-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Penjelasan</label>
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

            <MediaLightboxModal
                isOpen={!!previewLightbox}
                src={previewLightbox?.url}
                title={previewLightbox?.title}
                onClose={() => setPreviewLightbox(null)}
            />
        </div>
    );
};

export default QuizManagement;
