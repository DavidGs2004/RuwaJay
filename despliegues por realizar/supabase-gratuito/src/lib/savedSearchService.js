import { collection,doc,setDoc,deleteDoc,onSnapshot,serverTimestamp } from 'firebase/firestore';
import { firebaseAuth,firestore } from './firebase';
export async function saveSearch(search) {
  const uid=firebaseAuth?.currentUser?.uid;
  if(!uid) throw new Error('Debes iniciar sesión para guardar una búsqueda.');
  await setDoc(doc(firestore,'users',uid,'saved_searches',search.id),{...search,notifyPush:Boolean(search.notifyPush),createdAt:serverTimestamp()});
}
export function subscribeSavedSearches(uid,onChange) {
  if(!uid){onChange([]);return()=>{};}
  return onSnapshot(collection(firestore,'users',uid,'saved_searches'),snap=>onChange(snap.docs.map(d=>({...d.data(),id:d.id}))));
}
export async function deleteSavedSearch(id) { await deleteDoc(doc(firestore,'users',firebaseAuth.currentUser.uid,'saved_searches',id)); }
