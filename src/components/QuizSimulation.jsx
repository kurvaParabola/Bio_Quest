import React, { useState, useEffect } from 'react';

const QuizSimulation = ({ quiz, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [isFinished, setIsFinished] = useState(false);
    const [score, setScore] = useState(0);
    const [maxScore, setMaxScore] = useState(0);
    const [results, setResults] = useState([]);

    const questions = quiz.questions || [];
    const currentQ = questions[currentIndex];
    
    // Timer states
    const [globalTime, setGlobalTime] = useState(quiz.settings?.globalTimerMinutes ? quiz.settings.globalTimerMinutes * 60 : null);
    const [questionTime, setQuestionTime] = useState(currentQ?.settings?.timerSeconds || null);

    // Generate shuffled targets for matching
    const matchingTargets = React.useMemo(() => {
        if (!currentQ || currentQ.question_type !== 'matching') return [];
        const targets = currentQ.options.map((opt, i) => ({ index: i, ...opt.right }));
        // Fisher-Yates shuffle
        for (let i = targets.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [targets[i], targets[j]] = [targets[j], targets[i]];
        }
        return targets;
    }, [currentQ]);

    useEffect(() => {
        if (quiz.settings?.timerType === 'global' && globalTime !== null && !isFinished) {
            const timer = setInterval(() => {
                setGlobalTime(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        finishSimulation();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [quiz.settings?.timerType, isFinished]);

    useEffect(() => {
        if (quiz.settings?.timerType === 'per_question' && currentQ && !isFinished) {
            setQuestionTime(currentQ.settings?.timerSeconds || 60);
            const timer = setInterval(() => {
                setQuestionTime(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        handleNext(); // Auto next
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [currentIndex, quiz.settings?.timerType, isFinished, currentQ]);

    // Format time (seconds to MM:SS)
    const formatTime = (seconds) => {
        if (seconds === null) return '--:--';
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleAnswer = (val) => {
        setAnswers(prev => ({ ...prev, [currentQ.id]: val }));
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            finishSimulation();
        }
    };

    const finishSimulation = () => {
        const newResults = questions.map(q => {
            const pts = q.settings?.points ?? 10;
            const ans = answers[q.id];
            let isCorrect = false;
            let earned = 0;
            
            if (q.question_type === 'multiple_choice') {
                const correctOpt = q.options.find(o => o.isCorrect);
                isCorrect = (ans === correctOpt?.id);
                if (isCorrect) earned = pts;
            } else if (q.question_type === 'multiple_select') {
                const correctIds = q.options.filter(o => o.isCorrect).map(o => o.id);
                if (ans && correctIds.every(id => ans.includes(id)) && correctIds.length === ans.length) {
                    isCorrect = true;
                    earned = pts;
                }
            } else if (q.question_type === 'short_answer') {
                const isCaseSensitive = q.settings?.caseSensitive;
                const correctTexts = q.options.map(o => isCaseSensitive ? o.text.trim() : o.text.trim().toLowerCase());
                const studentAns = isCaseSensitive ? (ans || '').trim() : (ans || '').trim().toLowerCase();
                isCorrect = correctTexts.includes(studentAns);
                if (isCorrect) earned = pts;
            } else if (q.question_type === 'statement_verification') {
                const correctVal = q.options[0]?.isCorrect;
                isCorrect = (ans === correctVal);
                if (isCorrect) earned = pts;
            } else if (q.question_type === 'matching') {
                let correctCount = 0;
                if (ans) {
                    q.options.forEach((opt, idx) => {
                        if (ans[idx] === idx) correctCount++;
                    });
                    isCorrect = (correctCount === q.options.length);
                    if (isCorrect) earned = pts;
                }
            } else if (q.question_type === 'pin_point') {
                let correctCount = 0;
                if (ans) {
                    q.options.forEach(marker => {
                        if (ans[marker.id]?.toLowerCase().trim() === marker.label.toLowerCase().trim()) {
                            correctCount++;
                        }
                    });
                    isCorrect = (correctCount === q.options.length);
                    if (isCorrect) earned = pts;
                }
            }
            return { question: q, earned, max: pts, isCorrect, answer: ans };
        });

        const totalEarned = newResults.reduce((acc, r) => acc + r.earned, 0);
        const totalMax = newResults.reduce((acc, r) => acc + r.max, 0);

        setResults(newResults);
        setScore(totalEarned);
        setMaxScore(totalMax);
        setIsFinished(true);
    };

    const renderAnswerInput = () => {
        const q = currentQ;
        const ans = answers[q.id];

        if (q.question_type === 'multiple_choice') {
            return (
                <div className="space-y-3 mt-6">
                    {q.options.map(opt => (
                        <label key={opt.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${ans === opt.id ? 'border-[#479F88] bg-[#e0f2ec]/30' : 'border-gray-200 hover:border-[#479F88]/50'}`}>
                            <input type="radio" name={q.id} value={opt.id} checked={ans === opt.id} onChange={() => handleAnswer(opt.id)} className="w-5 h-5 text-[#479F88] focus:ring-[#479F88]" />
                            <div className="flex-1 font-body-md text-gray-700">
                                {opt.type === 'text' ? opt.text : <img src={opt.media} alt="Opsi" className="max-h-24 rounded-lg" />}
                            </div>
                        </label>
                    ))}
                </div>
            );
        }

        if (q.question_type === 'multiple_select') {
            const selectedArr = ans || [];
            const toggleSelect = (id) => {
                if (selectedArr.includes(id)) handleAnswer(selectedArr.filter(x => x !== id));
                else handleAnswer([...selectedArr, id]);
            };
            return (
                <div className="space-y-3 mt-6">
                    {q.options.map(opt => (
                        <label key={opt.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedArr.includes(opt.id) ? 'border-[#479F88] bg-[#e0f2ec]/30' : 'border-gray-200 hover:border-[#479F88]/50'}`}>
                            <input type="checkbox" checked={selectedArr.includes(opt.id)} onChange={() => toggleSelect(opt.id)} className="w-5 h-5 text-[#479F88] rounded focus:ring-[#479F88]" />
                            <div className="flex-1 font-body-md text-gray-700">
                                {opt.type === 'text' ? opt.text : <img src={opt.media} alt="Opsi" className="max-h-24 rounded-lg" />}
                            </div>
                        </label>
                    ))}
                </div>
            );
        }

        if (q.question_type === 'short_answer') {
            return (
                <div className="mt-6">
                    <input type="text" value={ans || ''} onChange={e => handleAnswer(e.target.value)} placeholder="Ketik jawaban Anda di sini..." className="w-full border-2 border-gray-200 rounded-full px-6 py-4 focus:outline-none focus:border-[#479F88] focus:ring-4 focus:ring-[#479F88]/20 transition-all font-body-md text-lg" />
                </div>
            );
        }

        if (q.question_type === 'statement_verification') {
            return (
                <div className="mt-8 flex gap-4 justify-center">
                    <button onClick={() => handleAnswer(true)} className={`px-12 py-4 rounded-full text-lg font-bold transition-all shadow-sm ${ans === true ? 'bg-[#479F88] text-white scale-105' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Benar</button>
                    <button onClick={() => handleAnswer(false)} className={`px-12 py-4 rounded-full text-lg font-bold transition-all shadow-sm ${ans === false ? 'bg-[#ff4d4f] text-white scale-105' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Salah</button>
                </div>
            );
        }

        if (q.question_type === 'matching') {
            const currentAns = ans || {};
            
            // Filter out targets that are already placed
            const placedIndices = Object.values(currentAns);
            const availableTargets = matchingTargets.filter(t => !placedIndices.includes(t.index));

            const handleDragStart = (e, targetIndex) => {
                e.dataTransfer.setData('targetIndex', targetIndex.toString());
            };

            const handleDrop = (e, leftIndex) => {
                e.preventDefault();
                const targetIndex = parseInt(e.dataTransfer.getData('targetIndex'));
                if (!isNaN(targetIndex)) {
                    handleAnswer({ ...currentAns, [leftIndex]: targetIndex });
                }
            };

            const removeAnswer = (leftIndex) => {
                const newAns = { ...currentAns };
                delete newAns[leftIndex];
                handleAnswer(newAns);
            };

            return (
                <div className="mt-6">
                    {/* Pool of options */}
                    <div className="mb-8 bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-300">
                        <h4 className="text-sm font-bold text-gray-500 mb-4 text-center">Tarik (Drag) Opsi ke Kotak yang Tepat</h4>
                        <div className="flex flex-wrap gap-4 justify-center min-h-[80px]">
                            {availableTargets.map((t) => (
                                <div 
                                    key={`target-${t.index}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, t.index)}
                                    className="bg-white px-6 py-3 rounded-2xl border-2 border-[#479F88] text-[#479F88] font-bold shadow-sm cursor-grab active:cursor-grabbing hover:bg-[#e0f2ec] transition-colors flex items-center justify-center min-w-[120px]"
                                >
                                    {t.type === 'text' ? t.content : <img src={t.content} className="max-h-24 rounded-sm object-contain" alt="" />}
                                </div>
                            ))}
                            {availableTargets.length === 0 && (
                                <div className="text-gray-400 font-bold flex items-center justify-center w-full">Semua opsi telah dipasangkan!</div>
                            )}
                        </div>
                    </div>

                    {/* Drop Zones */}
                    <div className="space-y-4">
                        {q.options.map((opt, leftIndex) => {
                            const placedTargetIndex = currentAns[leftIndex];
                            const placedTarget = placedTargetIndex !== undefined ? q.options[placedTargetIndex].right : null;

                            return (
                                <div key={leftIndex} className="flex flex-col md:flex-row items-stretch gap-4">
                                    <div className="flex-1 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-center min-h-[80px]">
                                        {opt.left.type === 'text' ? <span className="font-body-md font-bold text-gray-700">{opt.left.content}</span> : <img src={opt.left.content} className="max-h-32 rounded-sm object-contain" alt="" />}
                                    </div>
                                    <div className="flex items-center justify-center text-gray-300">
                                        <i className="fa-solid fa-arrow-right text-xl"></i>
                                    </div>
                                    <div 
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => handleDrop(e, leftIndex)}
                                        className={`flex-1 rounded-2xl border-2 flex items-center justify-center min-h-[80px] p-2 transition-all relative ${placedTarget ? 'bg-white border-[#479F88] shadow-sm' : 'bg-gray-50 border-dashed border-gray-300'}`}
                                    >
                                        {placedTarget ? (
                                            <>
                                                <div className="font-bold text-[#479F88]">
                                                    {placedTarget.type === 'text' ? placedTarget.content : <img src={placedTarget.content} className="max-h-32 rounded-sm object-contain" alt="" />}
                                                </div>
                                                <button 
                                                    onClick={() => removeAnswer(leftIndex)}
                                                    className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-gray-200 text-gray-400 hover:text-error rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                                                >
                                                    <i className="fa-solid fa-xmark text-sm"></i>
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-gray-400 font-bold text-sm">Letakkan di sini</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        if (q.question_type === 'pin_point') {
            const currentAns = ans || {};
            return (
                <div className="mt-6">
                    <div className="relative inline-block w-full max-w-2xl bg-gray-100 rounded-3xl overflow-hidden border-2 border-gray-200 mx-auto block text-center">
                        <img src={q.settings?.mainImage} alt="Main Pin Point" className="w-full h-auto object-contain mx-auto" />
                        {q.options.map((marker, idx) => (
                            <div key={marker.id} className="absolute flex flex-col items-center pointer-events-none" style={{ left: `${marker.x}%`, top: `${marker.y}%`, transform: 'translate(-50%, -50%)' }}>
                                <div className="w-6 h-6 bg-[#479F88] text-white rounded-full flex items-center justify-center font-bold text-xs shadow-md border-2 border-white mb-1">{idx + 1}</div>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        {q.options.map((marker, idx) => (
                            <div key={marker.id} className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 bg-[#479F88] text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ml-1 shadow-sm">{idx + 1}</div>
                                <input type="text" value={currentAns[marker.id] || ''} onChange={e => handleAnswer({ ...currentAns, [marker.id]: e.target.value })} placeholder="Ketik label nama..." className="flex-1 bg-white border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-[#479F88] focus:ring-2 focus:ring-[#479F88]/30 transition-all font-body-md text-on-background shadow-sm" />
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return null;
    };

    if (isFinished) {
        return (
            <div className="fixed inset-0 z-[100] bg-surface-container flex flex-col overflow-y-auto animate-in fade-in zoom-in duration-300">
                <div className="max-w-4xl w-full mx-auto px-6 py-12">
                    {/* Header Score */}
                    <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100 mb-8">
                        <div className="w-20 h-20 bg-[#e0f2ec] rounded-full flex items-center justify-center mx-auto mb-6">
                            <i className="fa-solid fa-trophy text-4xl text-[#479F88]"></i>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800 font-display-lg mb-2">Simulasi Selesai</h2>
                        <p className="text-gray-500 font-body-md mb-8">Ini adalah pratinjau hasil akhir dan pembahasan kuis.</p>
                        
                        <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-200 inline-block min-w-[250px]">
                            <span className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Total Skor</span>
                            <div className="text-5xl font-black text-[#479F88]">
                                {score} <span className="text-2xl text-gray-400">/ {maxScore}</span>
                            </div>
                        </div>

                        <div>
                            <button onClick={onClose} className="px-8 py-4 bg-[#479F88] text-white rounded-full font-bold text-lg hover:bg-[#387d6b] transition-colors shadow-md">
                                Tutup Simulasi
                            </button>
                        </div>
                    </div>

                    {/* Review Section */}
                    <h3 className="text-xl font-bold text-gray-800 mb-6 font-display-lg">Ringkasan Jawaban & Pembahasan</h3>
                    <div className="space-y-6">
                        {results.map((res, idx) => (
                            <div key={res.question.id} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden">
                                <div className={`absolute top-0 left-0 w-2 h-full ${res.isCorrect ? 'bg-[#479F88]' : 'bg-[#ff4d4f]'}`}></div>
                                
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Soal {idx + 1}</span>
                                    <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${res.isCorrect ? 'bg-[#e0f2ec] text-[#479F88]' : 'bg-[#ffe5e5] text-[#ff4d4f]'}`}>
                                        {res.isCorrect ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-xmark"></i>}
                                        {res.earned} / {res.max} Poin
                                    </div>
                                </div>
                                
                                <h4 className="text-lg font-bold text-gray-800 mb-4 whitespace-pre-wrap">{res.question.question_text}</h4>
                                
                                {res.question.settings?.explanation && (
                                    <div className="mt-6 bg-[#f8fcfb] border border-[#e0f2ec] rounded-2xl p-6">
                                        <div className="flex items-center gap-2 text-[#479F88] font-bold mb-2">
                                            <i className="fa-solid fa-lightbulb"></i> Pembahasan
                                        </div>
                                        <p className="text-gray-700 font-body-md leading-relaxed whitespace-pre-wrap">
                                            {res.question.settings.explanation}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!currentQ) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-surface-container flex flex-col overflow-hidden animate-in fade-in duration-300">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-error transition-colors flex items-center justify-center">
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                    <div>
                        <h2 className="font-bold text-gray-800 line-clamp-1">{quiz.title || 'Kuis Tanpa Judul'}</h2>
                        <p className="text-xs text-gray-500 font-bold">Mode Simulasi</p>
                    </div>
                </div>
                
                {/* Timer Display */}
                {quiz.settings?.timerType !== 'none' && (
                    <div className="flex items-center gap-2 bg-[#e0f2ec] text-[#479F88] px-4 py-2 rounded-full font-bold shadow-sm">
                        <i className="fa-regular fa-clock"></i>
                        <span>{formatTime(quiz.settings?.timerType === 'global' ? globalTime : questionTime)}</span>
                    </div>
                )}
            </header>

            {/* Main Question Body */}
            <main className="flex-1 overflow-y-auto p-6 md:p-10 relative">
                <div className="max-w-3xl mx-auto pb-20">
                    {/* Progress */}
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-sm font-bold text-gray-400 tracking-wider">SOAL {currentIndex + 1} DARI {questions.length}</span>
                        <span className="text-sm font-bold bg-white border border-gray-200 px-3 py-1 rounded-full text-[#479F88] shadow-sm">
                            {currentQ.settings?.points ?? 10} Poin
                        </span>
                    </div>

                    {/* Question Content */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-8">
                        {currentQ.question_media && (
                            <div className="mb-6 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex justify-center p-4">
                                <img src={currentQ.question_media} alt="Media Soal" className="max-h-64 object-contain rounded-xl shadow-sm" />
                            </div>
                        )}
                        <h3 className="text-xl md:text-2xl font-bold text-gray-800 font-display-lg leading-relaxed whitespace-pre-wrap">
                            {currentQ.question_text || 'Pertanyaan belum diisi...'}
                        </h3>
                        
                        {renderAnswerInput()}
                    </div>
                    
                    {/* Navigation */}
                    <div className="flex justify-between items-center">
                        {quiz.settings?.timerType !== 'per_question' ? (
                            <button 
                                onClick={() => setCurrentIndex(p => Math.max(0, p - 1))}
                                disabled={currentIndex === 0}
                                className="px-6 py-3 rounded-full font-bold text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all"
                            >
                                <i className="fa-solid fa-arrow-left mr-2"></i> Sebelumnya
                            </button>
                        ) : <div />}
                        
                        <button 
                            onClick={handleNext}
                            className="px-8 py-3 bg-[#479F88] text-white rounded-full font-bold shadow-md hover:bg-[#387d6b] transition-all flex items-center"
                        >
                            {currentIndex === questions.length - 1 ? 'Selesai' : 'Selanjutnya'} <i className="fa-solid fa-arrow-right ml-2"></i>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default QuizSimulation;
