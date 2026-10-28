import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { enableNotifications, subscribeNotifications } from '../../lib/notificationService';
import useModalFocus from '../../hooks/useModalFocus';
export default function NotificationCenter() {
  const { user } = useAuth();
  const [items,setItems]=useState([]),[open,setOpen]=useState(false),[error,setError]=useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const location = useLocation();
  const uidRef = useRef(user?.id);
  uidRef.current = user?.id;
  const panelRef = useModalFocus(open, () => setOpen(false));
  useEffect(()=>{
    setItems([]);setOpen(false);setError('');setStatus('');setLoading(true);setBusy(false);
    if(!user?.id) return;
    return subscribeNotifications(user.id, next => { setItems(next); setLoading(false); }, () => {
      setLoading(false);
      setError('No pudimos cargar tus avisos. Revisa tu conexión y vuelve a intentarlo.');
    });
  },[user?.id]);
  useEffect(() => { setOpen(false); }, [location.pathname, location.search]);
  const activate = async () => {
    if (busy) return;
    const uid = user.id;
    setBusy(true);setError('');setStatus('');
    try {
      await enableNotifications();
      if (uidRef.current === uid) setStatus('Notificaciones activadas en este dispositivo.');
    } catch (e) {
      if (uidRef.current === uid) setError(e.message || 'No se pudieron activar las notificaciones.');
    } finally {
      if (uidRef.current === uid) setBusy(false);
    }
  };
  if(!user) return null;
  const unread = items.filter(item => !item.readAt).length;
  return <aside className="fixed bottom-24 right-3 z-[80] md:bottom-5">
    <button type="button" onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-expanded={open}
      aria-label={`Avisos${unread ? `, ${unread} sin leer` : ''}`}
      className="flex min-h-11 items-center gap-2 rounded-full bg-forest text-white px-4 py-3 shadow-lg">
      <Bell size={18} aria-hidden="true" /> Avisos {unread > 0 && <span className="rounded-full bg-white px-2 text-xs font-bold text-forest">{unread}</span>}
    </button>
    {open && <div className="fixed inset-0 z-[120] flex items-end justify-end bg-black/40 p-3 pb-24 md:p-5"
      onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="notification-center-title"
        className="flex max-h-[min(36rem,75dvh)] w-96 max-w-full flex-col rounded-2xl bg-white shadow-xl text-cafe">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 id="notification-center-title" className="font-bold">Tus avisos {unread > 0 && `(${unread} sin leer)`}</h2>
          <button type="button" aria-label="Cerrar avisos" onClick={()=>setOpen(false)} className="rounded-full p-3 hover:bg-crema"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto p-4" aria-busy={loading}>
          <button type="button" disabled={busy} className="text-forest font-bold mb-3 min-h-11 disabled:opacity-60" onClick={activate}>
            {busy ? 'Activando…' : 'Activar notificaciones en este dispositivo'}
          </button>
          {error && <p role="alert" className="text-sm mb-3 text-red-700">{error}</p>}
          {status && <p role="status" className="text-sm mb-3 text-forest">{status}</p>}
          {loading ? <p role="status">Cargando avisos…</p> : !items.length && <p>No tienes avisos. Aquí verás novedades de tus visitas, mensajes y búsquedas.</p>}
          {items.slice(0,50).map(item=><Link key={item.id}
            to={typeof item.path === 'string' && item.path.startsWith('/') && !item.path.startsWith('//') && !item.path.includes('\\') ? item.path : '/perfil'}
            onClick={()=>{
              if (!item.readAt) updateDoc(doc(firestore,'users',user.id,'notifications',item.id),{readAt:serverTimestamp()})
                .catch(()=>{if (uidRef.current === user.id) setError('No se pudo marcar el aviso como leído. Vuelve a intentarlo.');});
              setOpen(false);
            }} className={`block rounded-xl border-b border-border p-3 break-words hover:bg-crema ${!item.readAt ? 'bg-forest/5' : ''}`}>
            <strong>{!item.readAt && <span className="text-forest" aria-label="Sin leer">● </span>}{item.title}</strong><p className="text-sm mt-1">{item.body}</p>
          </Link>)}
        </div>
      </div>
    </div>}
  </aside>;
}
