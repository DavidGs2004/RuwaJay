import { collection,doc,getDocs,setDoc,addDoc,updateDoc,deleteDoc,onSnapshot,serverTimestamp } from 'firebase/firestore';
import { firestore } from './firebase';
export function subscribeToUsers(onUpdate,onError=console.error) {
  return onSnapshot(collection(firestore,'users'), snap => onUpdate(snap.docs.map(d=>({...d.data(),id:d.id,createdAt:d.data().createdAt?.toDate?.().toISOString() || d.data().createdAt}))),onError);
}
export async function updateUserRole(userId,role) {
  if(!['seeker','owner','admin'].includes(role)) throw new Error('Rol invalido.');
  await updateDoc(doc(firestore,'users',userId),{role});
}
export async function updateUserStatus(userId,status) {
  if(!['active','suspended'].includes(status)) throw new Error('Estado invalido.');
  await updateDoc(doc(firestore,'users',userId),{status,suspended:status==='suspended'});
}
export async function deleteProperty(id) { await deleteDoc(doc(firestore,'properties',id)); }
export function subscribeToSystemUpdates(onUpdate,isAdmin=false,onError=console.error) {
  return onSnapshot(collection(firestore,'system_updates'),snap=>onUpdate(snap.docs.map(d=>({...d.data(),id:d.id,
    createdAt:d.data().createdAt?.toDate?.().toISOString() || d.data().createdAt,
  })).filter(v=>isAdmin||v.active!==false)),onError);
}
export async function createSystemUpdate(data) {
  const ref=await addDoc(collection(firestore,'system_updates'),{...data,createdAt:serverTimestamp()});return {...data,id:ref.id};
}
export async function updateSystemUpdate(id,data) { await updateDoc(doc(firestore,'system_updates',id),{...data,updatedAt:serverTimestamp()}); }
export async function deleteSystemUpdate(id) { await deleteDoc(doc(firestore,'system_updates',id)); }
export async function fetchAdminStats() {
  const [properties,users]=await Promise.all([getDocs(collection(firestore,'properties')),getDocs(collection(firestore,'users'))]);
  return {totalProperties:properties.size,totalUsers:users.size};
}
