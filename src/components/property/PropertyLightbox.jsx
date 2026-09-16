import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Image as ImageIcon } from 'lucide-react';

/**
 * PropertyLightbox — Luxury full-screen photo gallery for property details
 * Features:
 * - High-res centered image preview
 * - Bottom filmstrip with thumbnail navigation
 * - Zoom in/out capability
 * - Full keyboard navigation (Arrows, Escape)
 * - Touch-friendly navigation
 */
export default function PropertyLightbox({
  isOpen,
  onClose,
  images = [],
  initialIndex = 0,
  propertyTitle = '',
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setIsZoomed(false);
  }, [initialIndex, isOpen]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-between bg-black/95 backdrop-blur-md select-none animate-[fade-in_0.2s_ease-out]">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 sm:p-6 text-white z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-xs font-bold">
            <ImageIcon size={14} className="text-dorado" />
            <span>{currentIndex + 1} de {images.length}</span>
          </div>
          {propertyTitle && (
            <h4 className="text-sm font-bold text-white/90 truncate max-w-[200px] sm:max-w-md hidden sm:block">
              {propertyTitle}
            </h4>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom toggle */}
          <button
            type="button"
            onClick={() => setIsZoomed(!isZoomed)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 active:scale-95"
            title={isZoomed ? "Reducir zoom" : "Ampliar imagen"}
            aria-label="Zoom"
          >
            {isZoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-terracota hover:text-white active:scale-95"
            title="Cerrar (Esc)"
            aria-label="Cerrar galería"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Image Area */}
      <div className="relative flex flex-1 items-center justify-center p-2 sm:p-6 overflow-hidden">
        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 sm:left-6 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-white hover:text-cafe active:scale-90"
              aria-label="Foto anterior"
            >
              <ChevronLeft size={26} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 sm:right-6 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-white hover:text-cafe active:scale-90"
              aria-label="Foto siguiente"
            >
              <ChevronRight size={26} />
            </button>
          </>
        )}

        {/* The Image */}
        <div
          className={`relative max-h-full max-w-full transition-all duration-300 ${
            isZoomed ? 'cursor-zoom-out scale-125 sm:scale-150' : 'cursor-zoom-in'
          }`}
          onClick={() => setIsZoomed(!isZoomed)}
        >
          <img
            src={images[currentIndex]}
            alt={`Foto ${currentIndex + 1}`}
            className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-2xl transition-transform"
          />
        </div>
      </div>

      {/* Bottom Filmstrip Thumbnails */}
      {images.length > 1 && (
        <div className="flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md z-10 border-t border-white/10">
          <div className="flex gap-2.5 overflow-x-auto max-w-4xl py-1 px-2 no-scrollbar">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setIsZoomed(false);
                  setCurrentIndex(idx);
                }}
                className={`relative shrink-0 h-14 w-20 sm:h-16 sm:w-24 rounded-lg overflow-hidden transition-all ${
                  idx === currentIndex
                    ? 'ring-3 ring-forest scale-105 opacity-100'
                    : 'opacity-50 hover:opacity-90'
                }`}
              >
                <img src={img} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
