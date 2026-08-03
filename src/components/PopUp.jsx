import React from 'react';

const PopUp = ({ isOpen, type, title, message, onClose, onConfirm, confirmText, imageSrc }) => {
  if (!isOpen) return null;

  const isSuccess = type === 'success';
  const isConfirm = type === 'confirm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm transition-all duration-300">
      
      {/* Card Box PopUp */}
      <div className="bg-[#e0f2ec] rounded-[32px] p-6 w-full max-w-sm text-center shadow-2xl border-2 border-white/20 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Lingkaran Ikon atau Gambar */}
        <div className="flex justify-center mb-4">
          {imageSrc ? (
            <img src={imageSrc} alt="Popup Icon" className="w-[120px] h-[120px] object-contain drop-shadow-md" />
          ) : (
            <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-inner ${isSuccess ? 'bg-[#479F88]/10' : isConfirm ? 'bg-orange-500/10' : 'bg-error/10'}`}>
              <i 
                className={`fa-regular text-[64px] ${isSuccess ? 'fa-circle-check text-[#479F88]' : isConfirm ? 'fa-circle-question text-orange-500' : 'fa-circle-xmark text-error'}`}
              ></i>
            </div>
          )}
        </div>

        {/* Teks Status */}
        <h3 className="text-2xl font-bold text-on-background mb-2 font-display-lg">
          {title}
        </h3>
        <p className="text-sm text-on-background/80 mb-6 font-body-md leading-relaxed px-2">
          {message}
        </p>

        {/* Tombol Aksi */}
        {isConfirm ? (
          <div className="flex gap-4 w-full">
            <button
              onClick={onClose}
              className="flex-1 py-4 rounded-full text-on-background bg-white font-bold text-lg shadow-md active:scale-95 transition-transform border border-gray-200"
            >
              Batal
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-4 rounded-full text-white bg-error font-bold text-lg shadow-md active:scale-95 transition-transform"
            >
              {confirmText || 'Ya'}
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            className={`w-full py-4 rounded-full text-white font-bold text-lg shadow-md active:scale-95 transition-transform font-label-md ${
              isSuccess ? 'bg-[#479F88]' : 'bg-error'
            }`}
          >
            {isSuccess ? 'Lanjutkan' : 'Coba Lagi'}
          </button>
        )}
      </div>
      
    </div>
  );
};

export default PopUp;