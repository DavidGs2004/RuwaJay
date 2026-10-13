import { collection,onSnapshot,query,where } from 'firebase/firestore';
import { callBackend } from './backendService';
import { firestore } from './firebase';
import { normalizeVisit,timestampMillis } from './contracts';
// Legacy cache is not authoritative and is never used to grant access or reserve a slot.
export function readLocalVisits() { return []; }
export async function createVisit(visit) {
  return callBackend('createVisit',{propertyId:visit.propertyId,date:visit.date||visit.visitDate,time:visit.time||visit.visitTime,notes:visit.notes||''});
}
export async function changeVisitStatus(visitId,status) {
  return callBackend('changeVisitStatus',{visitId,status});
}
export async function deleteVisit(visitId) {
  // Preserve shared history; cancellation releases the slot atomically.
  return changeVisitStatus(visitId,'cancelada');
}
export async function setVisitConversationId() {} // Set by server when the visit is confirmed.
export function subscribeToUserVisits(userId,onChange,onError=console.error) {
  if(!userId){onChange([]);return()=>{};}
  let owner=[],tenant=[];
  const emit=()=>onChange([...new Map([...owner,...tenant].map(v=>[v.id,v])).values()]
    .sort((a,b)=>timestampMillis(b.createdAt)-timestampMillis(a.createdAt)));
  const listen=(field,set)=>onSnapshot(query(collection(firestore,'visits'),where(field,'==',userId)),snap=>{
    set(snap.docs.map(d=>normalizeVisit({...d.data(),id:d.id})));emit();
  },onError);
  const a=listen('ownerId',v=>owner=v),b=listen('tenantId',v=>tenant=v);
  return()=>{a();b();};
}
