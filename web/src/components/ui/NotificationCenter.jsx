import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, X, CheckCheck } from 'lucide-react';
import { doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { enableNotifications, subscribeNotifications } from '../../lib/notificationService';
import useModalFocus from '../../hooks/useModalFocus';

export default function NotificationCenter({ className = '' }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const location = useLocation();
  const uidRef = useRef(user?.id);
  uidRef.current = user?.id;
  const panelRef = useModalFocus(open, () => setOpen(false));

  useEffect(() => {
    setItems([]); setOpen(false); setError(''); setStatus(''); setLoading(true); setBusy(false);
    if (!user?.id) return;
    return subscribeNotifications(user.id, next => { setItems(next); setLoading(false); }, () => {
      setLoading(false);
      setError('No pudimos cargar tus avisos. Revisa tu conexión y vuelve a intentarlo.');
    });
  }, [user?.id]);

  useEffect(() => { setOpen(false); }, [location.pathname, location.search]);

  const activate = async () => {
    if (busy) return;
    const uid = user.id;
    setBusy(true); setError(''); setStatus('');
    try {
      await enableNotifications();
      if (uidRef.current === uid) setStatus('Notificaciones activadas en este dispositivo.');
    } catch (e) {
      if (uidRef.current === uid) setError(e.message || 'No se pudieron activar las notificaciones.');
    } finally {
      if (uidRef.current === uid) setBusy(false);
    }
  };

  
  const markAllAsRead = async () => {
    if (!user?.id || !items.length) return;
    const unreadItems = items.filter(item => !item.readAt);
    if (!unreadItems.length) return;
    // Optimistic update immediately removes the unread badge
    setItems(prev => prev.map(item => ({ ...item, readAt: item.readAt || new Date() })));
    try {
      const batch = writeBatch(firestore);
      unreadItems.forEach(item => {
        batch.update(doc(firestore, 'users', user.id, 'notifications', item.id), {
          readAt: serverTimestamp(),
        });
      });
      await batch.commit();
    } catch (e) {
      console.error('Error marcando notificaciones como leídas:', e);
    }
  };

  if (!user) return null;
  const unread = items.filter(item => !item.readAt).length;

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Avisos${unread ? `, ${unread} sin leer` : ''}`}
        title="Ver avisos y notificaciones"
        className="relative flex items-center justify-center gap-1.5 rounded-full border border-border bg-[#FAF8F5] px-3 py-2 text-xs font-black text-cafe hover:border-forest hover:bg-forest hover:text-white transition-all shadow-2xs group"
      >
        <Bell size={16} aria-hidden="true" className="text-forest group-hover:text-white transition-colors" />
        <span className="hidden sm:inline font-extrabold">Avisos</span>
        {unread > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-forest text-[11px] font-black text-white px-1 shadow-xs group-hover:bg-white group-hover:text-forest transition-colors">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-start justify-end bg-black/40 p-3 pt-16 sm:p-6"
          onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-center-title"
            className="flex max-h-[min(36rem,80dvh)] w-96 max-w-full flex-col rounded-2xl bg-white shadow-2xl text-cafe border border-border overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-border p-4 bg-[#FAF8F5]">
              <h2 id="notification-center-title" className="font-bold flex items-center gap-2 text-sm text-cafe">
                <Bell size={18} className="text-forest" />
                <span>Tus avisos {unread > 0 && `(${unread} sin leer)`}</span>
              </h2>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    title="Marcar todas las notificaciones como leídas"
                    className="flex items-center gap-1 text-xs font-bold text-forest bg-forest/10 hover:bg-forest/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <CheckCheck size={14} />
                    <span>Marcar leídas</span>
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Cerrar avisos"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1.5 hover:bg-black/5 text-cafe transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-4 flex-1 divide-y divide-border/60" aria-busy={loading}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <button
                  type="button"
                  disabled={busy}
                  className="text-forest text-xs font-bold hover:underline disabled:opacity-60 text-left"
                  onClick={activate}
                >
                  {busy ? 'Activando…' : 'Activar notificaciones en este dispositivo'}
                </button>
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-xs font-bold text-forest bg-forest/10 hover:bg-forest/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <CheckCheck size={13} />
                    <span>Marcar todas como leídas</span>
                  </button>
                )}
              </div>
              {error && <p role="alert" className="text-xs mb-3 text-red-700">{error}</p>}
              {status && <p role="status" className="text-xs mb-3 text-forest">{status}</p>}
              {loading ? (
                <p role="status" className="text-xs text-text-muted py-2">Cargando avisos…</p>
              ) : !items.length && (
                <p className="text-xs text-text-muted py-2">No tienes avisos. Aquí verás novedades de tus visitas, mensajes y búsquedas.</p>
              )}
              <div className="space-y-2 pt-2">
                {items.slice(0, 50).map(item => (
                  <Link
                    key={item.id}
                    to={typeof item.path === 'string' && item.path.startsWith('/') && !item.path.startsWith('//') && !item.path.includes('\\') ? item.path : '/perfil'}
                    onClick={() => {
                      if (!item.readAt) {
                        setItems(prev => prev.map(it => it.id === item.id ? { ...it, readAt: new Date() } : it));
                        updateDoc(doc(firestore, 'users', user.id, 'notifications', item.id), { readAt: serverTimestamp() })
                          .catch(() => { if (uidRef.current === user.id) setError('No se pudo marcar el aviso como leído.'); });
                      }
                      setOpen(false);
                    }}
                    className={`block rounded-xl border border-border/70 p-3 break-words hover:bg-crema transition-colors ${!item.readAt ? 'bg-forest/5 font-semibold' : 'bg-white'}`}
                  >
                    <div className="flex items-center gap-1.5">
                      {!item.readAt && <span className="h-2 w-2 rounded-full bg-forest shrink-0" aria-label="Sin leer" />}
                      <strong className="text-xs sm:text-sm text-cafe">{item.title}</strong>
                    </div>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">{item.body}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
