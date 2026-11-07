import React, { useState, useEffect } from 'react';

/**
 * MediaLightboxModal
 * Modal penampil gambar / media soal interaktif layar penuh dengan fitur zoom
 * Memudahkan siswa melihat detail anatomi, struktur mikroskopis, dan diagram soal.
 */
const MediaLightboxModal = ({ isOpen, onClose, src, title = 'Media Soal' }) => {
    const [zoom, setZoom] = useState(1);

    // Reset zoom setiap kali modal dibuka / berganti gambar
    useEffect(() => {
        if (isOpen) {
            setZoom(1);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, src]);

    // Keyboard shortcut: Esc to close, +/- to zoom
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === '+' || e.key === '=') {
                setZoom(prev => Math.min(2.5, +(prev + 0.25).toFixed(2)));
            } else if (e.key === '-' || e.key === '_') {
                setZoom(prev => Math.max(0.75, +(prev - 0.25).toFixed(2)));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !src) return null;

    const handleZoomIn = (e) => {
        e.stopPropagation();
        setZoom(prev => Math.min(2.5, +(prev + 0.25).toFixed(2)));
    };

    const handleZoomOut = (e) => {
        e.stopPropagation();
        setZoom(prev => Math.max(0.75, +(prev - 0.25).toFixed(2)));
    };

    const handleResetZoom = (e) => {
        e.stopPropagation();
        setZoom(1);
    };

    const toggleZoomClick = (e) => {
        e.stopPropagation();
        setZoom(prev => (prev === 1 ? 1.75 : 1));
    };

    const handleOpenInNewTab = (e) => {
        e.stopPropagation();
        if (src.startsWith('data:')) {
            const win = window.open();
            if (win) {
                win.document.write(`<title>${title}</title><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="${src}" style="max-width:100%;max-height:100vh;object-contain:contain;"/></body>`);
            }
        } else {
            window.open(src, '_blank');
        }
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex flex-col bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
            onClick={onClose}
        >
            {/* Top Bar Controls */}
            <header
                className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-black/40 border-b border-white/10"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-[#479F88]/30 border border-[#479F88] flex items-center justify-center text-[#5af2ca] text-sm shrink-0">
                        <i className="fa-solid fa-image"></i>
                    </span>
                    <div className="truncate">
                        <h4 className="text-white font-bold text-sm sm:text-base font-display-lg truncate">
                            {title}
                        </h4>
                        <p className="text-[11px] text-gray-400 font-body-md hidden sm:block">
                            Klik gambar atau gunakan tombol zoom untuk melihat detail
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Zoom Toolbar */}
                    <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full p-1 border border-white/10">
                        <button
                            type="button"
                            onClick={handleZoomOut}
                            disabled={zoom <= 0.75}
                            className="w-8 h-8 rounded-full text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center text-xs transition-colors"
                            title="Perkecil (-)"
                        >
                            <i className="fa-solid fa-minus"></i>
                        </button>

                        <button
                            type="button"
                            onClick={handleResetZoom}
                            className="px-2.5 h-8 text-[11px] font-mono font-bold text-[#5af2ca] hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
                            title="Reset Zoom (100%)"
                        >
                            {Math.round(zoom * 100)}%
                        </button>

                        <button
                            type="button"
                            onClick={handleZoomIn}
                            disabled={zoom >= 2.5}
                            className="w-8 h-8 rounded-full text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center text-xs transition-colors"
                            title="Perbesar (+)"
                        >
                            <i className="fa-solid fa-plus"></i>
                        </button>
                    </div>

                    {/* Open in New Tab Button */}
                    <button
                        type="button"
                        onClick={handleOpenInNewTab}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs transition-colors hidden sm:flex border border-white/10"
                        title="Buka Gambar di Tab Baru"
                    >
                        <i className="fa-solid fa-arrow-up-right-from-square"></i>
                    </button>

                    {/* Close Button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/15 hover:bg-red-500/80 text-white flex items-center justify-center text-sm transition-colors border border-white/20 ml-1"
                        title="Tutup (Esc)"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </header>

            {/* Image Canvas Viewport */}
            <main
                className="flex-1 overflow-auto flex items-center justify-center p-4 sm:p-6 select-none relative"
                onClick={onClose}
            >
                <div
                    className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-200 ease-out cursor-zoom-in"
                    style={{
                        transform: `scale(${zoom})`,
                        cursor: zoom > 1 ? 'zoom-out' : 'zoom-in'
                    }}
                    onClick={toggleZoomClick}
                >
                    <img
                        src={src}
                        alt={title}
                        className="max-h-[80vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl border border-white/20 bg-black/30 pointer-events-auto"
                        draggable={false}
                    />
                </div>
            </main>

            {/* Footer Hint */}
            <footer
                className="py-2.5 px-4 text-center bg-black/40 border-t border-white/10 text-[11px] text-gray-400 font-body-md"
                onClick={e => e.stopPropagation()}
            >
                <span>💡 Tip: Klik gambar untuk zoom • Tekan tombol <strong>Esc</strong> atau tombol silang untuk menutup</span>
            </footer>
        </div>
    );
};

export default MediaLightboxModal;

