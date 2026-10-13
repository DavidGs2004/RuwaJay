import { useState, useEffect } from 'react';
import { X, Megaphone, Bell, Sparkles, AlertTriangle, Wrench, Shield, CheckCircle } from 'lucide-react';
import { subscribeToSystemUpdates } from '../../lib/adminService';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export default function SystemUpdatesModal({
  isOpen,
  onClose,
  updates: propUpdates,
  loading: propLoading,
}) {
  const { isAdmin } = useAuth();
  const [internalUpdates, setInternalUpdates] = useState([]);
  const [internalLoading, setInternalLoading] = useState(true);

  const updates = propUpdates !== undefined ? propUpdates : internalUpdates;
  const loading = propLoading !== undefined ? propLoading : internalLoading;

  useEffect(() => {
    if (!isOpen || propUpdates !== undefined) return;
    setInternalLoading(true);
    const unsub = subscribeToSystemUpdates((list) => {
      setInternalUpdates(list.filter((u) => u.active !== false));
      setInternalLoading(false);
    }, false);

    const safetyTimer = setTimeout(() => {
      setInternalLoading(false);
    }, 1200);

    return () => {
      clearTimeout(safetyTimer);
      unsub();
    };
  }, [isOpen, propUpdates]);

  // Si no se han hecho cambios o no hay actualizaciones activas, ocultar y no mostrar al usuario
  if (!isOpen) return null;
  if (!loading && updates.length === 0) return null;

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'alerta':
        return { label: 'Alerta', icon: AlertTriangle, bg: 'bg-red-50 text-red-700 border-red-200' };
      case 'mantenimiento':
        return { label: 'Mantenimiento', icon: Wrench, bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'mejora':
        return { label: 'Mejora', icon: Sparkles, bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      default:
        return { label: 'Novedad', icon: Megaphone, bg: 'bg-forest/10 text-forest border-forest/20' };
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl border border-[#E8D9C8] bg-white p-6 shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest/10 text-forest">
              <Megaphone size={22} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-cafe">Actualizaciones del Sistema</h2>
              <p className="text-xs text-text-muted">Novedades y avisos de la plataforma RuwaJay</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-text-muted hover:bg-crema hover:text-cafe transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-forest border-t-transparent mb-3" />
              <p className="text-xs font-semibold">Cargando comunicados...</p>
            </div>
          ) : updates.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-crema text-forest">
                <CheckCircle size={24} />
              </div>
              <p className="text-sm font-bold text-cafe">No hay comunicados recientes</p>
              <p className="text-xs text-text-muted mt-1">El sistema está funcionando con normalidad.</p>
            </div>
          ) : (
            updates.map((item) => {
              const badge = getCategoryBadge(item.category);
              const IconComp = badge.icon;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border bg-[#FDFBF7] p-4 transition-all hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${badge.bg}`}
                    >
                      <IconComp size={11} /> {badge.label}
                    </span>
                    {item.priority === 'urgente' && (
                      <span className="rounded-lg bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                        Urgente
                      </span>
                    )}
                    <span className="text-[11px] font-medium text-text-muted ml-auto">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString('es-GT', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Reciente'}
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-cafe mb-1.5">{item.title}</h3>
                  <p className="text-xs leading-relaxed text-text-secondary whitespace-pre-line">
                    {item.content}
                  </p>

                  <div className="mt-3 pt-2 border-t border-[#E8D9C8]/60 flex items-center justify-between text-[11px] text-text-muted">
                    <span>Emitido por: <strong>{item.createdBy || 'Administrador RuwaJay'}</strong></span>
                    <span>🇬🇹 Guatemala</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
          {isAdmin ? (
            <Link
              to="/perfil?tab=admin"
              onClick={onClose}
              className="flex items-center gap-1.5 font-bold text-forest hover:underline"
            >
              <Shield size={14} /> Gestionar en Panel Admin
            </Link>
          ) : (
            <span className="text-text-muted">RuwaJay v2.0 • Alquileres Seguros</span>
          )}
          <button
            onClick={onClose}
            className="rounded-xl bg-forest px-4 py-2 font-bold text-white shadow-sm hover:bg-forest/90 transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
