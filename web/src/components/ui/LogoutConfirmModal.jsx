import useModalFocus from '../../hooks/useModalFocus';
import { LogOut } from 'lucide-react';

export default function LogoutConfirmModal({ isOpen, onClose, onConfirm, isBusy = false }) {
  const modalRef = useModalFocus(isOpen, onClose, isBusy);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
      onClick={() => { if (!isBusy) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
    >
      <div
        className="relative max-w-sm w-full bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-border text-center overflow-hidden animate-[scale-up_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 bg-gradient-to-r from-terracota via-naranja to-terracota -mt-6 sm:-mt-7 -mx-6 sm:-mx-7 mb-6" />

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-terracota mb-3.5 border border-red-100 ring-8 ring-red-50/50 shadow-xs">
          <LogOut size={26} />
        </div>

        <h3 id="logout-modal-title" className="text-lg font-black text-cafe mb-1.5">
          ¿Cerrar sesión?
        </h3>
        <p className="text-xs text-text-muted leading-relaxed mb-6">
          ¿Estás seguro de que deseas salir? Deberás ingresar tus credenciales nuevamente para acceder a tu cuenta.
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isBusy}
            onClick={onClose}
            className="flex-1 rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-black text-cafe hover:bg-crema active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            No, quedarme
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={onConfirm}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-terracota hover:bg-terracota-dark active:scale-[0.98] px-4 py-2.5 text-xs font-black text-white shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-75"
          >
            {isBusy ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Cerrando...</span>
              </>
            ) : (
              <span>Sí, salir</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
