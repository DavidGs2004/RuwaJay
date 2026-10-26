import { useState, useEffect } from 'react';
import { X, Send } from 'lucide-react';

export default function MediaSendPreviewModal({ media, onSend, onCancel }) {
  const [caption, setCaption] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  if (!media) return null;

  const isVideo = media.type === 'video' || (media.file && media.file.type.startsWith('video'));

  const handleConfirm = () => {
    onSend(caption.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b141a]/95 backdrop-blur-md text-white select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#111b21] border-b border-white/10 shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors py-1 px-2 rounded-lg hover:bg-white/10"
          title="Cancelar envío"
        >
          <X size={22} />
          <span className="text-sm font-semibold">Cancelar</span>
        </button>

        <span className="text-sm font-medium text-white/70">
          {isVideo ? 'Vista previa de video' : 'Vista previa de imagen'}
        </span>

        <div className="w-16" /> {/* Spacer */}
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
        {isVideo ? (
          <video
            controls
            autoPlay
            playsInline
            src={media.url}
            className="max-h-[68vh] max-w-full rounded-2xl shadow-2xl object-contain bg-black"
          />
        ) : (
          <img
            src={media.url}
            alt="Vista previa"
            className="max-h-[68vh] max-w-full rounded-2xl shadow-2xl object-contain bg-black/40"
          />
        )}
      </div>

      {/* Bottom Caption & Send Bar (Estilo WhatsApp) */}
      <div className="p-3 sm:p-4 bg-[#111b21] border-t border-white/10 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
              }
            }}
            placeholder="Añadir un comentario..."
            autoFocus
            className="flex-1 bg-[#202c33] text-white placeholder-gray-400 text-sm sm:text-base rounded-full px-5 py-3 border border-transparent focus:border-[#25D366]/50 focus:outline-none transition-all"
          />

          <button
            type="button"
            onClick={handleConfirm}
            className="h-12 w-12 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] active:scale-95 text-white flex items-center justify-center shadow-lg transition-transform shrink-0"
            title="Enviar"
          >
            <Send size={20} className="translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
