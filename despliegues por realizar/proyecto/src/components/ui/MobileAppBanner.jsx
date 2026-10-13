import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Smartphone, X, ExternalLink } from 'lucide-react';

export default function MobileAppBanner({ onOpenModal }) {
  const [dismissed, setDismissed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Si ya lo descartó en esta sesión, recordar
    const isDismissed = sessionStorage.getItem('ruwajay_app_banner_dismissed');
    if (isDismissed) setDismissed(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('ruwajay_app_banner_dismissed', 'true');
  };

  const currentPath = location.pathname.startsWith('/') ? location.pathname.slice(1) : location.pathname;
  const deepLink = currentPath ? `ruwajay://${currentPath}` : 'ruwajay://home';

  const handleOpenApp = () => {
    window.location.href = deepLink;
    if (onOpenModal) {
      setTimeout(onOpenModal, 600);
    }
  };

  if (dismissed) return null;

  return (
    <div className="relative z-40 bg-gradient-to-r from-forest via-forest-dark to-cafe text-white px-3 py-2 text-xs md:hidden shadow-xs border-b border-forest-light/30">
      <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/logo/logo.png"
            alt="RuwaJay"
            className="h-8 w-8 rounded-full bg-white p-0.5 object-contain flex-shrink-0 shadow-xs"
          />
          <div className="min-w-0">
            <p className="font-extrabold text-[12px] truncate leading-tight">
              RuwaJay App Móvil 🇬🇹
            </p>
            <p className="text-[10px] text-crema-warm/80 truncate leading-tight">
              Sincronizada con tu cuenta en Android
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleOpenApp}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-dorado hover:bg-dorado-light text-cafe text-[11px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95"
          >
            <Smartphone size={12} />
            <span>Abrir</span>
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            aria-label="Cerrar aviso de app móvil"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
