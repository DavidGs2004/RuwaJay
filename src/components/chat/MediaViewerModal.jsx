import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';
import PrivateMedia from './PrivateMedia';

export default function MediaViewerModal({ media, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const pinchStartRef = useRef({ dist: 0, scale: 1 });
  const containerRef = useRef(null);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const zoomIn = () => setScale((s) => Math.min(5, s + 0.5));
  const zoomOut = () => {
    setScale((s) => {
      const next = Math.max(1, s - 0.5);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Touch Handlers for Pinch to Zoom & Pan
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartRef.current = { dist, scale };
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchStartRef.current.dist > 0) {
      e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = currentDist / pinchStartRef.current.dist;
      const nextScale = Math.min(5, Math.max(1, pinchStartRef.current.scale * factor));
      setScale(nextScale);
      if (nextScale === 1) setPosition({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      setPosition({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y,
      });
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      pinchStartRef.current = { dist: 0, scale };
    }
    if (e.touches.length === 0) {
      setIsDragging(false);
    }
  };

  // Mouse Handlers for Desktop (Wheel & Pan)
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.002;
    setScale((prev) => {
      const next = Math.min(5, Math.max(1, prev + delta));
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleMouseDown = (e) => {
    if (scale > 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Double Click / Double Tap
  const handleDoubleClick = () => {
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2.5);
    }
  };

  if (!media) return null;

  const mediaSource = media.src || media.url;
  const isVideo = media.type === 'video' || (typeof mediaSource === 'string' && mediaSource.match(/\.(mp4|webm|ogg)$/i));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white select-none">
      {/* Top Header (Estilo WhatsApp) */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-md border-b border-white/10 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/90 hover:text-white transition-colors"
            title="Cerrar"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
              {media.senderName || 'Foto'}
            </h3>
            {media.time && (
              <p className="text-xs text-white/60 leading-tight">
                {media.time}
              </p>
            )}
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {!isVideo && (
            <>
              <button
                type="button"
                onClick={zoomOut}
                disabled={scale <= 1}
                className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white disabled:opacity-40 transition-colors"
                title="Alejar"
              >
                <ZoomOut size={18} />
              </button>
              <button
                type="button"
                onClick={zoomIn}
                disabled={scale >= 5}
                className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white disabled:opacity-40 transition-colors"
                title="Acercar"
              >
                <ZoomIn size={18} />
              </button>
              {scale > 1 && (
                <button
                  type="button"
                  onClick={resetZoom}
                  className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors flex items-center gap-1"
                  title="Restablecer 1x"
                >
                  <RotateCcw size={12} />
                  <span>1x</span>
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors ml-2"
            title="Cerrar visor"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Media Canvas Area */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        className={`flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden relative ${
          scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        }`}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            touchAction: 'none',
          }}
          className="max-h-full max-w-full flex items-center justify-center"
        >
          {isVideo ? (
            <video
              controls
              autoPlay
              playsInline
              src={mediaSource}
              className="max-h-[85vh] max-w-[95vw] rounded-lg shadow-2xl bg-black"
            />
          ) : mediaSource?.startsWith('supabase://') || mediaSource?.startsWith('chat/') ? (
            <PrivateMedia
              src={mediaSource}
              alt="Imagen ampliada"
              className="max-h-[85vh] max-w-[95vw] object-contain rounded-lg shadow-2xl pointer-events-none select-none"
            />
          ) : (
            <img
              src={mediaSource}
              alt="Imagen ampliada"
              className="max-h-[85vh] max-w-[95vw] object-contain rounded-lg shadow-2xl pointer-events-none select-none"
            />
          )}
        </div>

        {/* Floating Hint for double tap or pinch */}
        {scale === 1 && !isVideo && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none bg-black/50 text-white/70 text-xs px-3 py-1.5 rounded-full backdrop-blur-xs">
            Doble toque o pellizca para hacer zoom
          </div>
        )}
      </div>
    </div>
  );
}
