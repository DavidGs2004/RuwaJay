import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { enableNotifications, subscribeNotifications } from '../../lib/notificationService';
export default function NotificationCenter() {
  const { user } = useAuth();
  const [items,setItems]=useState([]),[open,setOpen]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    setItems([]);setOpen(false);
    if(!user?.id) return;
    return subscribeNotifications(user.id,setItems,e=>setError(e.message));
  },[user?.id]);
  if(!user) return null;
  return <aside className="fixed bottom-24 right-3 z-[90]">
    <button onClick={()=>setOpen(!open)} className="rounded-full bg-forest text-white px-4 py-3 shadow-lg">Avisos {items.filter(i=>!i.readAt).length || ''}</button>
    {open && <div className="mt-2 rounded-2xl bg-white shadow-xl p-4 max-h-96 overflow-auto w-80 max-w-[90vw]">
      <button className="text-forest font-bold mb-3" onClick={async()=>{try{await enableNotifications();setError('Notificaciones activadas.');}catch(e){setError(e.message);}}}>Activar notificaciones en este dispositivo</button>
      {error && <p role="status" className="text-sm mb-2">{error}</p>}
      {!items.length && <p>No tienes avisos.</p>}
      {items.slice(0,50).map(item=><Link key={item.id} to={item.path?.startsWith('/')&&!item.path.startsWith('//')?item.path:'/perfil'}
        onClick={()=>{updateDoc(doc(firestore,'users',user.id,'notifications',item.id),{readAt:serverTimestamp()}).catch(e=>setError(e.message));setOpen(false);}}
        className="block border-b py-3"><strong>{item.title}</strong><p className="text-sm">{item.body}</p></Link>)}
    </div>}
  </aside>;
}
