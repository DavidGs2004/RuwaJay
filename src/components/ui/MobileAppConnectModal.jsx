import { useState } from 'react';
import { Smartphone, Download, ExternalLink, QrCode, X, Check, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export default function MobileAppConnectModal({ isOpen, onClose, targetPath = '' }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Limpiar ruta para deep link
  const cleanPath = targetPath.startsWith('/') ? targetPath.slice(1) : targetPath;
  const deepLink = cleanPath ? `ruwajay://${cleanPath}` : 'ruwajay://home';
  const webLink = `${window.location.origin}/${cleanPath}`;

  const handleOpenApp = () => {
    // Intentar abrir el esquema nativo de la app
    window.location.href = deepLink;
    // Timeout para informar si no está instalada
    setTimeout(() => {
      // Si la ventana sigue visible después de 2 segundos, la app probablemente no esté instalada
    }, 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(deepLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-lg overflow-hidden bg-white rounded-3xl shadow-2xl border border-border-light text-cafe"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-app-modal-title"
      >
        {/* Franja superior con degradado de marca */}
        <div className="h-2.5 bg-gradient-to-r from-forest via-dorado to-terracota" />

        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-crema-warm/80 hover:bg-crema-dark text-cafe/70 hover:text-cafe transition-colors"
          aria-label="Cerrar modal"
        >
          <X size={18} />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header con icono y logo */}
          <div className="flex items-center gap-3.5 mb-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest/10 text-forest border border-forest/20 shadow-xs">
              <Smartphone size={28} className="text-forest animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-forest text-white">
                  Android Nativo
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-dorado">
                  <Sparkles size={12} />
                  Sincronizado
                </span>
              </div>
              <h2 id="mobile-app-modal-title" className="text-xl sm:text-2xl font-black text-cafe tracking-tight">
                Vincular con App Móvil RuwaJay
              </h2>
            </div>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed mb-6">
            Abre propiedades, comunícate en el chat y gestiona tus anuncios directamente en tu teléfono móvil con la misma cuenta y sincronización en tiempo real.
          </p>

          {/* Tarjeta de Deep Link Directo */}
          <div className="p-4 rounded-2xl bg-crema/70 border border-border mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Enlace directo a la app (Deep Link)
              </span>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1 text-xs font-bold text-forest hover:text-forest-dark transition-colors"
              >
                {copied ? <Check size={13} className="text-jade" /> : null}
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
            <code className="block p-2.5 rounded-xl bg-white text-xs font-mono font-bold text-forest border border-border-light break-all select-all">
              {deepLink}
            </code>
          </div>

          {/* Acciones principales */}
          <div className="space-y-3">
            <button
              onClick={handleOpenApp}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-forest hover:bg-forest-light text-white font-extrabold text-base shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <Smartphone size={20} />
              <span>Abrir en la App Móvil</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white hover:bg-crema-warm text-cafe font-bold text-sm border border-border transition-colors"
            >
              <span>Continuar navegando en la Web</span>
            </button>
          </div>

          {/* Nota de soporte */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-text-muted">
            <ShieldCheck size={14} className="text-jade" />
            <span>Misma base de datos, fotos y favoritos sincronizados</span>
          </div>
        </div>
      </div>
    </div>
  );
}
