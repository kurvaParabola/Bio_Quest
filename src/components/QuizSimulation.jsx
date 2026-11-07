import React, { useState, useEffect } from 'react';
import qikoHype from '../assets/qiko_hype.svg';
import qikoSmile from '../assets/qiko_smile.svg';
import qikoSad from '../assets/qiko_sad.svg';
import qikoConfused from '../assets/qiko_confused.svg';
import MediaLightboxModal from './MediaLightboxModal';
import { isValidMediaUrl } from '../utils/mediaCompressor';

const checkIfAnswered = (q, ans) => {
    if (!q || ans === undefined || ans === null || ans === '') return false;
    if (q.question_type === 'multiple_choice') {
        return !!ans;
    }
    if (q.question_type === 'multiple_select') {
        return Array.isArray(ans) && ans.length > 0;
    }
    if (q.question_type === 'short_answer') {
        return typeof ans === 'string' && ans.trim().length > 0;
    }
    if (q.question_type === 'statement_verification') {
        return typeof ans === 'boolean';
    }
    if (q.question_type === 'matching') {
        return typeof ans === 'object' && Object.keys(ans).length > 0;
    }
    if (q.question_type === 'pin_point') {
        return typeof ans === 'object' && Object.values(ans).some(v => typeof v === 'string' && v.trim().length > 0);
    }
    return true;
};

const getQuestionTypeLabel = (type) => {
    switch (type) {
        case 'multiple_choice': return 'Pilihan Ganda';
        case 'multiple_select': return 'Pilihan Ganda Kompleks';
        case 'short_answer': return 'Isian Singkat';
        case 'statement_verification': return 'Benar / Salah';
        case 'matching': return 'Menjodohkan';
        case 'pin_point': return 'Tandai Titik';
        default: return 'Soal';
    }
};

const QuizSimulation = ({ quiz, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [doubtful, setDoubtful] = useState({});
    const [previewMedia, setPreviewMedia] = useState(null);
    const [showMiniMap, setShowMiniMap] = useState(false);
    const [showConfirmFinish, setShowConfirmFinish] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [score, setScore] = useState(0);
    const [maxScore, setMaxScore] = useState(0);
    const [results, setResults] = useState([]);

    const questions = quiz.questions || [];
    const currentQ = questions[currentIndex];

    // Status counts and progress percentage
    const answeredCount = questions.filter(q => checkIfAnswered(q, answers[q.id])).length;
    const doubtfulCount = questions.filter(q => !!doubtful[q.id]).length;
    const unansweredCount = questions.length - answeredCount;
    const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

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
            setShowConfirmFinish(true);
        }
    };

    const restartSimulation = () => {
        setCurrentIndex(0);
        setAnswers({});
        setDoubtful({});
        setIsFinished(false);
        setScore(0);
        setMaxScore(0);
        setResults([]);
        setShowConfirmFinish(false);
        setShowMiniMap(false);
        if (quiz.settings?.globalTimerMinutes) {
            setGlobalTime(quiz.settings.globalTimerMinutes * 60);
        }
        if (questions[0]?.settings?.timerSeconds) {
            setQuestionTime(questions[0].settings.timerSeconds);
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
            const mainImg = q.settings?.mainImage;
            return (
                <div className="mt-6">
                    {mainImg && (
                        <div className="flex justify-end mb-2">
                            <button
                                type="button"
                                onClick={() => setPreviewMedia({ url: mainImg, title: `Gambar Anatomi / Peta Titik Soal ${currentIndex + 1}` })}
                                className="px-3.5 py-1.5 rounded-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold shadow-2xs flex items-center gap-1.5 active:scale-95 transition-all"
                            >
                                <i className="fa-solid fa-magnifying-glass-plus text-[#479F88]"></i>
                                <span>Buka Gambar Penuh</span>
                            </button>
                        </div>
                    )}
                    <div className="relative inline-block w-full max-w-2xl bg-gray-100 rounded-3xl overflow-hidden border-2 border-gray-200 mx-auto block text-center">
                        <img src={mainImg} alt="Main Pin Point" className="w-full h-auto object-contain mx-auto" />
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

    const renderResultAnswerDetail = (res) => {
        const q = res.question;
        const userAns = res.answer;

        if (q.question_type === 'multiple_choice') {
            const correctOpt = q.options.find(o => o.isCorrect);
            return (
                <div className="space-y-2 mb-4">
                    {q.options.map((opt, i) => {
                        const isUserPick = userAns === opt.id;
                        const isCorrectOpt = opt.isCorrect;

                        let style = 'border-gray-200 bg-white text-gray-700';
                        let badge = null;

                        if (isUserPick && isCorrectOpt) {
                            style = 'border-[#479F88] bg-[#e0f2ec]/60 text-[#479F88] font-bold';
                            badge = <span className="text-[11px] bg-[#479F88] text-white px-2.5 py-0.5 rounded-full font-bold">Jawaban Anda (Benar)</span>;
                        } else if (isUserPick && !isCorrectOpt) {
                            style = 'border-[#ff4d4f] bg-[#ffe5e5]/60 text-[#ff4d4f] font-bold';
                            badge = <span className="text-[11px] bg-[#ff4d4f] text-white px-2.5 py-0.5 rounded-full font-bold">Jawaban Anda (Salah)</span>;
                        } else if (!isUserPick && isCorrectOpt) {
                            style = 'border-[#479F88]/60 bg-[#e0f2ec]/30 text-[#479F88] font-semibold';
                            badge = <span className="text-[11px] bg-[#e0f2ec] text-[#479F88] border border-[#479F88]/30 px-2.5 py-0.5 rounded-full font-bold">Kunci Jawaban</span>;
                        }

                        return (
                            <div key={opt.id || i} className={`p-3.5 rounded-2xl border-2 flex items-center justify-between gap-3 text-sm transition-all ${style}`}>
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                                        {String.fromCharCode(65 + i)}
                                    </span>
                                    <span>{opt.type === 'text' ? opt.text : <img src={opt.media} alt="Opsi" className="max-h-16 rounded-lg" />}</span>
                                </div>
                                {badge}
                            </div>
                        );
                    })}
                </div>
            );
        }

        if (q.question_type === 'multiple_select') {
            const userArr = Array.isArray(userAns) ? userAns : [];
            return (
                <div className="space-y-2 mb-4">
                    {q.options.map((opt, i) => {
                        const isUserPick = userArr.includes(opt.id);
                        const isCorrectOpt = opt.isCorrect;

                        let style = 'border-gray-200 bg-white text-gray-700';
                        let badge = null;

                        if (isUserPick && isCorrectOpt) {
                            style = 'border-[#479F88] bg-[#e0f2ec]/60 text-[#479F88] font-bold';
                            badge = <span className="text-[11px] bg-[#479F88] text-white px-2.5 py-0.5 rounded-full font-bold">Dipilih (Benar)</span>;
                        } else if (isUserPick && !isCorrectOpt) {
                            style = 'border-[#ff4d4f] bg-[#ffe5e5]/60 text-[#ff4d4f] font-bold';
                            badge = <span className="text-[11px] bg-[#ff4d4f] text-white px-2.5 py-0.5 rounded-full font-bold">Dipilih (Salah)</span>;
                        } else if (!isUserPick && isCorrectOpt) {
                            style = 'border-[#479F88]/60 bg-[#e0f2ec]/30 text-[#479F88] font-semibold';
                            badge = <span className="text-[11px] bg-[#e0f2ec] text-[#479F88] border border-[#479F88]/30 px-2.5 py-0.5 rounded-full font-bold">Harusnya Dipilih</span>;
                        }

                        return (
                            <div key={opt.id || i} className={`p-3.5 rounded-2xl border-2 flex items-center justify-between gap-3 text-sm transition-all ${style}`}>
                                <div className="flex items-center gap-3">
                                    <i className={`fa-solid ${isUserPick ? 'fa-square-check text-[#479F88]' : 'fa-square text-gray-300'}`}></i>
                                    <span>{opt.type === 'text' ? opt.text : <img src={opt.media} alt="Opsi" className="max-h-16 rounded-lg" />}</span>
                                </div>
                                {badge}
                            </div>
                        );
                    })}
                </div>
            );
        }

        if (q.question_type === 'short_answer') {
            const correctTexts = q.options?.map(o => o.text).join(' atau ');
            return (
                <div className="space-y-2 mb-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-gray-200">
                        <span className="text-gray-500 font-semibold">Jawaban Anda:</span>
                        <span className={`font-bold ${res.isCorrect ? 'text-[#479F88]' : 'text-[#ff4d4f]'}`}>
                            {userAns || '(Tidak dijawab)'}
                        </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1">
                        <span className="text-gray-500 font-semibold">Kunci Jawaban:</span>
                        <span className="text-[#479F88] font-bold">{correctTexts || '-'}</span>
                    </div>
                </div>
            );
        }

        if (q.question_type === 'statement_verification') {
            const correctVal = q.options[0]?.isCorrect;
            return (
                <div className="space-y-2 mb-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-gray-200">
                        <span className="text-gray-500 font-semibold">Jawaban Anda:</span>
                        <span className={`font-bold ${res.isCorrect ? 'text-[#479F88]' : 'text-[#ff4d4f]'}`}>
                            {userAns === true ? 'Benar' : userAns === false ? 'Salah' : '(Tidak dijawab)'}
                        </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1">
                        <span className="text-gray-500 font-semibold">Kunci Jawaban:</span>
                        <span className="text-[#479F88] font-bold">{correctVal ? 'Benar' : 'Salah'}</span>
                    </div>
                </div>
            );
        }

        if (q.question_type === 'matching') {
            const currentAns = userAns || {};
            return (
                <div className="space-y-2 mb-4">
                    {q.options?.map((opt, leftIndex) => {
                        const placedTargetIndex = currentAns[leftIndex];
                        const placedTarget = placedTargetIndex !== undefined ? q.options[placedTargetIndex]?.right : null;
                        const isPairCorrect = placedTargetIndex === leftIndex;

                        return (
                            <div key={leftIndex} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                                <div className="flex items-center gap-2 font-bold text-gray-700">
                                    <span className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs">
                                        {leftIndex + 1}
                                    </span>
                                    <span>{opt.left?.type === 'text' ? opt.left?.content : <img src={opt.left?.content} alt="" className="max-h-12 rounded" />}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-arrow-right text-xs text-gray-400 hidden sm:inline"></i>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${isPairCorrect ? 'bg-[#e0f2ec] text-[#479F88] border-[#479F88]/30' : 'bg-[#ffe5e5] text-[#ff4d4f] border-[#ff4d4f]/30'}`}>
                                        {placedTarget ? (placedTarget.type === 'text' ? placedTarget.content : 'Gambar') : '(Tidak dipasangkan)'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }

        if (q.question_type === 'pin_point') {
            const currentAns = userAns || {};
            return (
                <div className="space-y-2 mb-4">
                    {q.options?.map((marker, idx) => {
                        const studentLabel = currentAns[marker.id] || '';
                        const isMarkerCorrect = studentLabel.toLowerCase().trim() === marker.label?.toLowerCase().trim();

                        return (
                            <div key={marker.id} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                                <div className="flex items-center gap-2 font-bold text-gray-700">
                                    <span className="w-6 h-6 rounded-full bg-[#479F88] text-white flex items-center justify-center text-xs">
                                        {idx + 1}
                                    </span>
                                    <span>Titik #{idx + 1}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold ${isMarkerCorrect ? 'text-[#479F88]' : 'text-[#ff4d4f]'}`}>
                                        Jawaban: {studentLabel || '(Kosong)'}
                                    </span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs font-bold text-[#479F88]">
                                        Kunci: {marker.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }

        return null;
    };

    if (isFinished) {
        const correctCount = results.filter(r => r.isCorrect).length;
        const scorePercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

        let qikoImg = qikoHype;
        let resultGreeting = 'Luar Biasa!';
        let resultFeedback = 'Hasil simulasi kuis Anda sangat memuaskan. Pertahankan prestasimu!';
        let badgeTone = 'bg-[#e0f2ec] text-[#479F88] border-[#479F88]/30';

        if (scorePercent < 60) {
            qikoImg = qikoSad;
            resultGreeting = 'Tetap Semangat!';
            resultFeedback = 'Jangan berkecil hati, pelajari kembali pembahasannya dan coba lagi!';
            badgeTone = 'bg-[#ffe5e5] text-[#ff4d4f] border-[#ff4d4f]/30';
        } else if (scorePercent < 80) {
            qikoImg = qikoSmile;
            resultGreeting = 'Kerja Bagus!';
            resultFeedback = 'Pemahaman Anda sudah baik. Cek pembahasan di bawah untuk menyempurnakan jawaban.';
            badgeTone = 'bg-amber-50 text-[#716500] border-amber-300';
        }

        return (
            <div className="fixed inset-0 z-[100] bg-surface-container flex flex-col overflow-y-auto animate-in fade-in duration-300">
                {/* Result Header */}
                <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3.5 flex justify-between items-center shadow-xs z-10 shrink-0 sticky top-0">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onClose} 
                            className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-error transition-colors flex items-center justify-center flex-shrink-0"
                            title="Tutup Simulasi"
                        >
                            <i className="fa-solid fa-xmark text-lg"></i>
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="bg-[#e0f2ec] text-[#479F88] text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex-shrink-0">
                                    Hasil Simulasi
                                </span>
                                <h2 className="font-bold text-gray-800 line-clamp-1 text-sm md:text-base">
                                    {quiz.title || 'Kuis Tanpa Judul'}
                                </h2>
                            </div>
                            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                                Ringkasan Nilai & Pembahasan Soal
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={restartSimulation}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 font-bold text-xs md:text-sm shadow-xs transition-all active:scale-95"
                            title="Ulangi Simulasi Kuis"
                        >
                            <i className="fa-solid fa-rotate-right text-xs text-[#479F88]"></i>
                            <span className="hidden sm:inline">Ulangi</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#479F88] hover:bg-[#387d6b] text-white font-bold text-xs md:text-sm shadow-xs transition-all active:scale-95"
                        >
                            <span>Tutup</span>
                        </button>
                    </div>
                </header>

                {/* Result Body */}
                <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-6 py-8 pb-16">
                    {/* Hero Card Nilai Utama (dengan Maskot Qiko) */}
                    <div className="bg-gradient-to-br from-[#e0f2ec]/60 via-white to-white rounded-[32px] p-6 md:p-8 shadow-sm border border-[#479F88]/20 mb-8 relative overflow-hidden">
                        {/* Ambient soft glow in background */}
                        <div className="absolute -right-12 -top-12 w-48 h-48 bg-[#479F88]/10 rounded-full blur-2xl pointer-events-none" />

                        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 relative z-10">
                            {/* Qiko Mascot Illustration */}
                            <div className="flex-shrink-0 flex flex-col items-center">
                                <div className="relative">
                                    <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-white shadow-md border-2 border-white flex items-center justify-center p-2.5">
                                        <img 
                                            src={qikoImg} 
                                            alt="Qiko Result" 
                                            className="w-full h-full object-contain hover:scale-105 transition-transform duration-300" 
                                        />
                                    </div>
                                    <span className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] md:text-[11px] font-black uppercase border shadow-2xs whitespace-nowrap ${badgeTone}`}>
                                        {scorePercent >= 80 ? 'Sangat Baik' : scorePercent >= 60 ? 'Cukup Baik' : 'Perlu Latihan'}
                                    </span>
                                </div>
                            </div>

                            {/* Score Info & Metrics */}
                            <div className="flex-1 text-center md:text-left w-full">
                                <h3 className="text-2xl md:text-3xl font-bold text-gray-800 font-display-lg">
                                    {resultGreeting}
                                </h3>
                                <p className="text-xs md:text-sm text-gray-600 font-body-md mt-1 mb-5 max-w-lg leading-relaxed">
                                    {resultFeedback}
                                </p>

                                {/* Quick Stats Grid */}
                                <div className="grid grid-cols-3 gap-2.5 sm:gap-3 bg-white/90 backdrop-blur-xs p-3.5 md:p-4 rounded-2xl border border-gray-100 shadow-2xs">
                                    {/* Total Skor */}
                                    <div className="text-center">
                                        <span className="block text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-wider">Total Skor</span>
                                        <div className="text-xl md:text-2xl font-black text-[#479F88] mt-0.5">
                                            {score} <span className="text-xs md:text-sm font-bold text-gray-400">/ {maxScore}</span>
                                        </div>
                                    </div>

                                    {/* Soal Benar */}
                                    <div className="text-center border-x border-gray-100">
                                        <span className="block text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-wider">Soal Benar</span>
                                        <div className="text-xl md:text-2xl font-black text-[#479F88] mt-0.5 flex items-center justify-center gap-1">
                                            <i className="fa-solid fa-circle-check text-xs"></i>
                                            <span>{correctCount}</span>
                                            <span className="text-xs md:text-sm font-bold text-gray-400">/{results.length}</span>
                                        </div>
                                    </div>

                                    {/* Akurasi */}
                                    <div className="text-center">
                                        <span className="block text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-wider">Akurasi</span>
                                        <div className="text-xl md:text-2xl font-black text-[#716500] mt-0.5">
                                            {scorePercent}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action buttons inside card */}
                        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 mt-6 pt-5 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={restartSimulation}
                                className="px-5 py-2.5 rounded-full border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 font-bold text-xs md:text-sm shadow-2xs transition-all active:scale-95 flex items-center gap-2"
                            >
                                <i className="fa-solid fa-rotate-right text-xs text-[#479F88]"></i>
                                <span>Ulangi Simulasi</span>
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-7 py-2.5 rounded-full bg-[#479F88] hover:bg-[#387d6b] text-white font-bold text-xs md:text-sm shadow-sm transition-all active:scale-95 flex items-center gap-2"
                            >
                                <i className="fa-solid fa-check text-xs"></i>
                                <span>Tutup Simulasi</span>
                            </button>
                        </div>
                    </div>

                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-6 bg-[#479F88] rounded-full inline-block"></span>
                            <h3 className="text-lg md:text-xl font-bold text-gray-800 font-display-lg">
                                Ringkasan Jawaban & Pembahasan
                            </h3>
                        </div>
                        <span className="text-xs font-bold text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-2xs">
                            {results.length} Soal
                        </span>
                    </div>

                    {/* Question Review Cards */}
                    <div className="space-y-5">
                        {results.map((res, idx) => (
                            <div 
                                key={res.question.id || idx} 
                                className={`rounded-3xl p-6 md:p-7 shadow-xs border-2 transition-all relative overflow-hidden ${
                                    res.isCorrect 
                                        ? 'bg-gradient-to-b from-[#e0f2ec]/20 via-white to-white border-[#479F88]/30 hover:border-[#479F88]/50' 
                                        : 'bg-gradient-to-b from-red-50/30 via-white to-white border-red-200 hover:border-red-300'
                                }`}
                            >
                                {/* Question Header */}
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-black px-3 py-1 rounded-full uppercase flex items-center gap-1.5 ${
                                            res.isCorrect 
                                                ? 'bg-[#e0f2ec] text-[#479F88]' 
                                                : 'bg-red-100 text-red-600'
                                        }`}>
                                            <i className={`fa-solid ${res.isCorrect ? 'fa-check' : 'fa-xmark'} text-xs`}></i>
                                            Soal {idx + 1}
                                        </span>
                                        <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2.5 py-1 rounded-full">
                                            {getQuestionTypeLabel(res.question.question_type)}
                                        </span>
                                    </div>

                                    <div className={`px-3.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border shadow-2xs ${
                                        res.isCorrect 
                                            ? 'bg-[#e0f2ec] text-[#479F88] border-[#479F88]/30' 
                                            : 'bg-red-50 text-red-600 border-red-200'
                                    }`}>
                                        <i className={`fa-solid ${res.isCorrect ? 'fa-circle-check text-[#479F88]' : 'fa-circle-xmark text-red-500'}`}></i>
                                        <span>{res.isCorrect ? 'Benar' : 'Salah'}</span>
                                        <span className="opacity-70 font-semibold">• {res.earned} / {res.max} Poin</span>
                                    </div>
                                </div>

                                {/* Media Soal jika ada */}
                                {isValidMediaUrl(res.question.question_media) && (
                                    <div
                                        onClick={() => setPreviewMedia({ url: res.question.question_media, title: `Gambar Soal ${idx + 1}` })}
                                        className="mb-4 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 hover:border-[#479F88]/40 transition-all flex justify-center p-3 relative group cursor-pointer"
                                        title="Klik untuk membuka gambar penuh"
                                    >
                                        <img src={res.question.question_media} alt="Media Soal" className="max-h-52 object-contain rounded-xl transition-transform duration-200 group-hover:scale-[1.02]" loading="lazy" />
                                        <div className="absolute bottom-2.5 right-2.5 bg-black/70 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 opacity-85 group-hover:opacity-100 backdrop-blur-xs shadow-xs">
                                            <i className="fa-solid fa-magnifying-glass-plus text-[10px] text-[#5af2ca]"></i>
                                            <span>Buka Gambar</span>
                                        </div>
                                    </div>
                                )}

                                {/* Question Text */}
                                <h4 className="text-base md:text-lg font-bold text-gray-800 mb-4 whitespace-pre-wrap leading-relaxed font-display-lg">
                                    {res.question.question_text}
                                </h4>

                                {/* Answer Breakdown */}
                                {renderResultAnswerDetail(res)}

                                {/* Explanation Box */}
                                {res.question.settings?.explanation && (
                                    <div className="mt-4 bg-[#f8fcfb] border border-[#e0f2ec] rounded-2xl p-4 md:p-5">
                                        <div className="flex items-center gap-2 text-[#479F88] font-bold text-xs uppercase tracking-wider mb-1.5">
                                            <i className="fa-solid fa-lightbulb"></i> Pembahasan Soal
                                        </div>
                                        <p className="text-gray-700 font-body-md text-sm leading-relaxed whitespace-pre-wrap">
                                            {res.question.settings.explanation}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        );
    }

    if (!currentQ) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-surface-container flex flex-col overflow-hidden animate-in fade-in duration-300">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3.5 flex justify-between items-center shadow-xs z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onClose} 
                        className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-error transition-colors flex items-center justify-center flex-shrink-0"
                        title="Tutup Simulasi"
                    >
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="bg-[#e0f2ec] text-[#479F88] text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex-shrink-0">
                                Simulasi
                            </span>
                            <h2 className="font-bold text-gray-800 line-clamp-1 text-sm md:text-base">
                                {quiz.title || 'Kuis Tanpa Judul'}
                            </h2>
                        </div>
                        <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                            Soal {currentIndex + 1} dari {questions.length}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                    {/* Mini Map Toggle Button */}
                    <button
                        type="button"
                        onClick={() => setShowMiniMap(prev => !prev)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs md:text-sm shadow-xs transition-all active:scale-95 ${
                            showMiniMap
                                ? 'bg-[#479F88] text-white ring-2 ring-[#479F88]/30'
                                : 'bg-white border border-[#479F88] text-[#479F88] hover:bg-[#e0f2ec]'
                        }`}
                        title="Buka Mini Map Soal"
                    >
                        <i className="fa-solid fa-table-cells-large"></i>
                        <span>Mini Map</span>
                    </button>

                    {/* Timer Display */}
                    {quiz.settings?.timerType !== 'none' && (
                        <div className="flex items-center gap-1.5 bg-[#e0f2ec] text-[#479F88] px-3.5 py-2 rounded-full font-bold shadow-xs text-xs md:text-sm">
                            <i className="fa-regular fa-clock"></i>
                            <span className="font-mono">{formatTime(quiz.settings?.timerType === 'global' ? globalTime : questionTime)}</span>
                        </div>
                    )}
                </div>
            </header>

            {/* Progress Slider Bar Persentase Pengerjaan (Kiri ke Kanan) */}
            <div className="w-full bg-gray-200 h-2 relative shrink-0 shadow-inner">
                <div
                    className="bg-gradient-to-r from-[#479F88] to-[#5af2ca] h-full transition-all duration-500 ease-out relative"
                    style={{ width: `${progressPercent}%` }}
                >
                    {progressPercent > 0 && (
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-[#479F88] rounded-full shadow-md pointer-events-none z-10 transition-all duration-300"
                            style={{
                                right: 0,
                                transform: progressPercent >= 100 ? 'translate(0, -50%)' : 'translate(50%, -50%)'
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Drawer Mini Map Soal */}
            {showMiniMap && (
                <div className="fixed inset-0 z-[110] flex justify-end animate-in fade-in duration-200">
                    <div 
                        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
                        onClick={() => setShowMiniMap(false)}
                    />

                    <aside className="relative z-10 w-full max-w-sm bg-white h-full shadow-2xl flex flex-col p-6 animate-in slide-in-from-right duration-300">
                        {/* Header Drawer */}
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 font-display-lg flex items-center gap-2">
                                    <i className="fa-solid fa-table-cells-large text-[#479F88]"></i>
                                    Mini Map Soal
                                </h3>
                                <p className="text-xs text-gray-500 font-body-md mt-0.5">
                                    Pilih nomor untuk berpindah soal
                                </p>
                            </div>
                            <button
                                onClick={() => setShowMiniMap(false)}
                                className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-error transition-colors flex items-center justify-center"
                                title="Tutup Mini Map"
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        {/* Indikator Status & Legenda Warna */}
                        <div className="grid grid-cols-3 gap-2 my-5 text-center">
                            {/* Sudah Dijawab (Hijau) */}
                            <div className="bg-[#e0f2ec]/60 border border-[#479F88]/30 p-3 rounded-2xl flex flex-col items-center">
                                <div className="w-4 h-4 rounded-full bg-[#479F88] mb-1 shadow-xs"></div>
                                <span className="text-sm font-black text-[#479F88]">{answeredCount}</span>
                                <span className="text-[10px] font-bold text-gray-600 mt-0.5">Sudah Dijawab</span>
                            </div>

                            {/* Masih Ragu (Kuning / Amber) */}
                            <div className="bg-amber-50 border border-amber-300/80 p-3 rounded-2xl flex flex-col items-center">
                                <div className="w-4 h-4 rounded-full bg-[#fde430] border border-[#dfc700] mb-1 shadow-xs"></div>
                                <span className="text-sm font-black text-[#716500]">{doubtfulCount}</span>
                                <span className="text-[10px] font-bold text-gray-600 mt-0.5">Masih Ragu</span>
                            </div>

                            {/* Belum Dijawab (Abu-abu) */}
                            <div className="bg-gray-50 border border-gray-200 p-3 rounded-2xl flex flex-col items-center">
                                <div className="w-4 h-4 rounded-full bg-gray-200 border border-gray-300 mb-1"></div>
                                <span className="text-sm font-black text-gray-600">{unansweredCount}</span>
                                <span className="text-[10px] font-bold text-gray-600 mt-0.5">Belum Dijawab</span>
                            </div>
                        </div>

                        {/* Grid Nomor Soal */}
                        <div className="flex-1 overflow-y-auto p-2">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">
                                Navigasi Nomor Soal:
                            </p>
                            <div className="grid grid-cols-5 gap-3 p-2">
                                {questions.map((q, idx) => {
                                    const isCurrent = idx === currentIndex;
                                    const isRagu = !!doubtful[q.id];
                                    const isDone = checkIfAnswered(q, answers[q.id]);

                                    let badgeColor = 'bg-white text-gray-600 border-2 border-gray-200 hover:border-gray-300';
                                    if (isRagu) {
                                        badgeColor = 'bg-[#fde430] text-[#716500] border-2 border-[#dfc700] shadow-xs';
                                    } else if (isDone) {
                                        badgeColor = 'bg-[#479F88] text-white border-2 border-[#479F88] shadow-xs';
                                    }

                                    return (
                                        <button
                                            key={q.id || idx}
                                            onClick={() => {
                                                setCurrentIndex(idx);
                                                setShowMiniMap(false);
                                            }}
                                            className={`h-11 aspect-square rounded-2xl font-bold text-base transition-all flex items-center justify-center relative active:scale-95 ${badgeColor} ${
                                                isCurrent ? 'ring-4 ring-[#479F88]/25 scale-105 font-black z-10 shadow-sm' : ''
                                            }`}
                                        >
                                            {idx + 1}
                                            {isRagu && (
                                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] text-white font-black shadow-xs">
                                                    ?
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer Drawer */}
                        <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowMiniMap(false);
                                    setShowConfirmFinish(true);
                                }}
                                className="w-full py-3 bg-[#479F88] hover:bg-[#387d6b] text-white font-bold rounded-full text-sm shadow-sm active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                            >
                                <i className="fa-solid fa-flag-checkered text-xs"></i>
                                <span>Selesaikan Kuis</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowMiniMap(false)}
                                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-full text-xs transition-colors text-center"
                            >
                                Tutup Panel
                            </button>
                        </div>
                    </aside>
                </div>
            )}

            {/* Main Question Body */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
                <div className="max-w-3xl mx-auto pb-20">
                    {/* Header Soal & Info Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-400 tracking-wider">
                                SOAL {currentIndex + 1} DARI {questions.length}
                            </span>
                            {doubtful[currentQ.id] ? (
                                <span className="text-[11px] font-bold bg-amber-100 text-[#716500] border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <i className="fa-solid fa-flag text-[9px]"></i> Masih Ragu
                                </span>
                            ) : checkIfAnswered(currentQ, answers[currentQ.id]) ? (
                                <span className="text-[11px] font-bold bg-[#e0f2ec] text-[#479F88] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <i className="fa-solid fa-check text-[9px]"></i> Sudah Dijawab
                                </span>
                            ) : (
                                <span className="text-[11px] font-bold bg-gray-100 text-gray-400 px-2.5 py-0.5 rounded-full">
                                    Belum Dijawab
                                </span>
                            )}
                        </div>
                        <span className="text-xs font-bold bg-white border border-gray-200 px-3 py-1 rounded-full text-[#479F88] shadow-xs">
                            {currentQ.settings?.points ?? 10} Poin
                        </span>
                    </div>

                    {/* Question Content */}
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mb-6">
                        {isValidMediaUrl(currentQ.question_media) && (
                            <div
                                onClick={() => setPreviewMedia({ url: currentQ.question_media, title: `Gambar Soal ${currentIndex + 1}` })}
                                className="mb-6 rounded-2xl overflow-hidden bg-gray-50 border-2 border-gray-100 hover:border-[#479F88]/40 transition-all flex flex-col items-center justify-center p-4 relative group cursor-pointer shadow-2xs hover:shadow-sm"
                                title="Klik untuk membuka & memperbesar gambar penuh"
                            >
                                <img
                                    src={currentQ.question_media}
                                    alt="Media Soal"
                                    className="max-h-64 object-contain rounded-xl shadow-xs transition-transform duration-300 group-hover:scale-[1.02]"
                                    loading="lazy"
                                />
                                <div className="absolute bottom-3 right-3 bg-black/75 hover:bg-black/90 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md backdrop-blur-xs transition-all opacity-85 group-hover:opacity-100">
                                    <i className="fa-solid fa-magnifying-glass-plus text-xs text-[#5af2ca]"></i>
                                    <span>Buka Gambar Penuh</span>
                                </div>
                            </div>
                        )}
                        <h3 className="text-xl md:text-2xl font-bold text-gray-800 font-display-lg leading-relaxed whitespace-pre-wrap">
                            {currentQ.question_text || 'Pertanyaan belum diisi...'}
                        </h3>

                        {renderAnswerInput()}
                    </div>

                    {/* Navigation Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                        {quiz.settings?.timerType !== 'per_question' ? (
                            <button
                                onClick={() => setCurrentIndex(p => Math.max(0, p - 1))}
                                disabled={currentIndex === 0}
                                className="w-full sm:w-auto px-6 py-3 rounded-full font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm shadow-sm flex items-center justify-center gap-2"
                            >
                                <i className="fa-solid fa-arrow-left"></i>
                                <span>Sebelumnya</span>
                            </button>
                        ) : <div />}

                        {/* Tombol Ragu-ragu (Tengah) */}
                        <button
                            type="button"
                            onClick={() => setDoubtful(prev => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }))}
                            className={`w-full sm:w-auto px-6 py-3 rounded-full font-bold transition-all text-sm shadow-sm flex items-center justify-center gap-2 border-2 active:scale-95 ${
                                doubtful[currentQ.id]
                                    ? 'bg-[#fde430] text-[#716500] border-[#dfc700] ring-4 ring-[#fde430]/30'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400 hover:bg-amber-50/40'
                            }`}
                        >
                            <i className={`fa-solid ${doubtful[currentQ.id] ? 'fa-flag text-[#716500]' : 'fa-regular fa-flag text-gray-400'}`}></i>
                            <span>{doubtful[currentQ.id] ? 'Masih Ragu' : 'Tandai Ragu-ragu'}</span>
                        </button>

                        {/* Tombol Selanjutnya / Selesai */}
                        <button
                            onClick={handleNext}
                            className="w-full sm:w-auto bg-[#479F88] hover:bg-[#387d6b] text-white px-8 py-3 rounded-full font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            <span>{currentIndex === questions.length - 1 ? 'Selesai & Lihat Hasil' : 'Selanjutnya'}</span>
                            <i className="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>

                    {/* ========================================================= */}
                    {/* NAVIGASI NOMOR DI BAGIAN BAWAH (PERSIS SEPERTI SISWA)     */}
                    {/* ========================================================= */}
                    <div className="mt-8 pt-4 flex flex-col items-center justify-center">
                        <div className="flex items-center justify-center gap-2.5 sm:gap-3 py-2 px-3 overflow-x-auto max-w-full scrollbar-none">
                            {questions.map((q, idx) => {
                                const isCurrent = idx === currentIndex;
                                const isRagu = !!doubtful[q.id];
                                const isDone = checkIfAnswered(q, answers[q.id]);

                                if (isCurrent) {
                                    if (isRagu) {
                                        return (
                                            <button
                                                key={q.id || idx}
                                                type="button"
                                                onClick={() => {
                                                    if (quiz.settings?.timerType !== 'per_question') {
                                                        setCurrentIndex(idx);
                                                    }
                                                }}
                                                className="w-10 h-10 rounded-full bg-[#fde430] text-[#716500] border-2 border-[#dfc700] ring-4 ring-[#fde430]/35 scale-105 font-extrabold text-base flex items-center justify-center shadow-md transition-all z-10 flex-shrink-0 relative active:scale-95"
                                                title={`Soal ${idx + 1} (Sedang Dibuka - Masih Ragu)`}
                                            >
                                                {idx + 1}
                                                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-600 border-2 border-white rounded-full"></span>
                                            </button>
                                        );
                                    }

                                    return (
                                        <button
                                            key={q.id || idx}
                                            type="button"
                                            onClick={() => {
                                                if (quiz.settings?.timerType !== 'per_question') {
                                                    setCurrentIndex(idx);
                                                }
                                            }}
                                            className="w-10 h-10 rounded-full bg-[#479F88] text-white font-extrabold text-base flex items-center justify-center shadow-md ring-4 ring-[#479F88]/25 scale-105 transition-all z-10 flex-shrink-0 relative active:scale-95"
                                            title={`Soal ${idx + 1} (Sedang Dibuka${isDone ? ' - Sudah Dijawab' : ''})`}
                                        >
                                            {idx + 1}
                                        </button>
                                    );
                                }

                                // Lingkaran Tidak Aktif (Soft circle abu-abu muda / hijau jika sudah dijawab / kuning jika ragu)
                                let circleBg = "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]";
                                if (isRagu) {
                                    circleBg = "bg-[#fde430] text-[#716500] border border-[#dfc700] shadow-xs hover:bg-[#fae020]";
                                } else if (isDone) {
                                    circleBg = "bg-[#479F88] text-white shadow-xs hover:bg-[#387d6b]";
                                }

                                return (
                                    <button
                                        key={q.id || idx}
                                        type="button"
                                        onClick={() => {
                                            if (quiz.settings?.timerType !== 'per_question') {
                                                setCurrentIndex(idx);
                                            }
                                        }}
                                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full font-bold text-sm sm:text-base flex items-center justify-center transition-all flex-shrink-0 active:scale-95 relative ${circleBg}`}
                                        title={`Soal ${idx + 1} (${isRagu ? 'Masih Ragu' : isDone ? 'Sudah Dijawab' : 'Belum Dijawab'})`}
                                    >
                                        {idx + 1}
                                        {isRagu && (
                                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-500 border border-white rounded-full"></span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal Konfirmasi Selesai Kuis */}
            {showConfirmFinish && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-[#e0f2ec] rounded-[32px] p-6 md:p-8 w-full max-w-sm text-center shadow-2xl border-2 border-white/50 relative animate-in zoom-in-95 duration-200">
                        {/* Qiko Mascot Illustration */}
                        <div className="flex justify-center mb-3">
                            <img 
                                src={unansweredCount > 0 || doubtfulCount > 0 ? qikoConfused : qikoSmile} 
                                alt="Qiko Konfirmasi" 
                                className="w-24 h-24 md:w-28 md:h-28 object-contain drop-shadow-md hover:scale-105 transition-transform" 
                            />
                        </div>

                        <h3 className="text-2xl font-bold text-gray-800 mb-2 font-display-lg">
                            Selesaikan Kuis?
                        </h3>
                        
                        <p className="text-xs md:text-sm text-gray-600 mb-5 font-body-md leading-relaxed px-1">
                            {unansweredCount > 0 
                                ? `Masih ada ${unansweredCount} soal yang belum Anda jawab. Apakah Anda yakin ingin menyelesaikan simulasi sekarang?`
                                : doubtfulCount > 0
                                ? `Semua soal telah dijawab, namun masih ada ${doubtfulCount} soal bertanda ragu. Yakin ingin mengakhiri?`
                                : 'Semua soal telah terjawab dengan lengkap! Yakin ingin menyelesaikan simulasi kuis ini?'}
                        </p>

                        {/* Status Summary Cards */}
                        <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-3 mb-6 border border-[#479F88]/20 grid grid-cols-3 gap-2 text-center shadow-2xs">
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Terjawab</span>
                                <span className="text-base font-black text-[#479F88]">{answeredCount}/{questions.length}</span>
                            </div>
                            <div className="flex flex-col items-center border-x border-gray-100">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Ragu-ragu</span>
                                <span className="text-base font-black text-[#716500]">{doubtfulCount}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Belum Diisi</span>
                                <span className={`text-base font-black ${unansweredCount > 0 ? 'text-[#ff4d4f]' : 'text-gray-400'}`}>
                                    {unansweredCount}
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowConfirmFinish(false)}
                                className="flex-1 py-3.5 rounded-full text-gray-700 bg-white font-bold text-sm shadow-sm hover:bg-gray-50 border border-gray-200 active:scale-95 transition-all"
                            >
                                Periksa Lagi
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowConfirmFinish(false);
                                    finishSimulation();
                                }}
                                className="flex-1 py-3.5 rounded-full text-white bg-[#479F88] hover:bg-[#387d6b] font-bold text-sm shadow-md active:scale-95 transition-all"
                            >
                                Ya, Selesaikan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Layar Penuh Media / Gambar Soal */}
            <MediaLightboxModal
                isOpen={!!previewMedia}
                src={previewMedia?.url}
                title={previewMedia?.title}
                onClose={() => setPreviewMedia(null)}
            />
        </div>
    );
};

export default QuizSimulation;
