import { useNavigate } from 'react-router-dom';
import { MessageSquare, X, ArrowRight } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

export default function ChatNotificationToast() {
  const { activeToast, dismissToast, setActiveConversationId, markAsRead } = useChat();
  const navigate = useNavigate();

  if (!activeToast) return null;

  const handleOpenChat = () => {
    setActiveConversationId(activeToast.convId);
    markAsRead(activeToast.convId);
    dismissToast();
    navigate('/chat');
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-4 right-4 z-[110] max-w-sm w-[calc(100vw-2rem)] sm:w-96 rounded-2xl bg-white/95 backdrop-blur-md border border-forest/20 shadow-2xl p-3.5 animate-[slide-up_0.3s_cubic-bezier(0.22,1,0.36,1)] transition-all"
    >
      <div className="flex items-start gap-3">
        {/* Avatar or thumbnail */}
        <div className="relative shrink-0">
          <div className="w-11 h-11 rounded-full bg-forest text-white font-bold flex items-center justify-center text-sm shadow-xs overflow-hidden">
            {activeToast.propertyThumbnail ? (
              <img src={activeToast.propertyThumbnail} alt="" className="w-full h-full object-cover" />
            ) : (
              activeToast.senderName?.charAt(0) || 'R'
            )}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-jade border-2 border-white rounded-full flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          </span>
        </div>

        {/* Text Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-xs font-black text-cafe truncate flex items-center gap-1">
              <span className="text-forest">●</span> {activeToast.senderName}
            </h4>
            <button
              onClick={dismissToast}
              className="rounded-full p-1 text-text-muted hover:bg-crema hover:text-cafe transition-colors"
              aria-label="Cerrar notificación"
            >
              <X size={14} />
            </button>
          </div>

          <p className="text-[11px] font-semibold text-text-muted truncate mt-0.5">
            {activeToast.propertyTitle}
          </p>

          <p className="text-xs text-cafe/90 line-clamp-2 mt-1 font-medium bg-crema/40 p-1.5 rounded-xl border border-border/50">
            "{activeToast.text}"
          </p>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="text-[10px] text-text-muted font-bold flex items-center gap-1">
              <MessageSquare size={11} className="text-forest" /> Nuevo mensaje en vivo
            </span>

            <button
              onClick={handleOpenChat}
              className="inline-flex items-center gap-1 rounded-xl bg-forest px-3 py-1.5 text-xs font-black text-white hover:bg-forest-dark transition-all shadow-xs active:scale-95"
            >
              Responder <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
