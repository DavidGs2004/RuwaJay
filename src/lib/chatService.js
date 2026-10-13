import { collection, query, orderBy, onSnapshot, doc, writeBatch, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { callBackend, usesServerOperations } from './backendService';
import { firebaseAuth, firestore, functions } from './firebase';
import { conversationId, timestampMillis } from './contracts';
import { uploadChatMedia } from './mediaService';
export const buildConversationId = conversationId;
export function subscribeToMessages(roomId, onUpdate, onError = console.error) {
  if (!roomId || !firebaseAuth?.currentUser) { onUpdate([]); return () => {}; }
  return onSnapshot(query(collection(firestore, 'conversations', roomId, 'messages'), orderBy('createdAt','asc')),
    snap => onUpdate(snap.docs.map(d => ({ ...d.data(), id: d.id,
      timestamp: d.data().createdAt?.toDate?.().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) || '',
    }))), onError);
}
export function subscribeToConversations(userId, onUpdate, onError = console.error) {
  if (!userId) { onUpdate([]); return () => {}; }
  return onSnapshot(query(collection(firestore,'conversations'),where('participants','array-contains',userId)),
    snap => onUpdate(snap.docs.filter(d=>!d.data().migratedTo && !d.data().archived).map(d => ({ ...d.data(),id:d.id })).sort((a,b) => timestampMillis(b.lastMessageTimestamp)-timestampMillis(a.lastMessageTimestamp))), onError);
}
export function subscribeToConversation(roomId, userId, onUpdate, onError = console.error) {
  if (!roomId || !userId) return () => {};
  return onSnapshot(doc(firestore,'conversations',roomId), snap => onUpdate(snap.exists()?{...snap.data(),id:snap.id}:null), onError);
}
export async function getOrCreateConversation(seekerId, ownerId, propertyId) {
  if (!firebaseAuth?.currentUser) throw new Error('Debes iniciar sesi?n.');
  return (await callBackend('openConversation',{seekerId,ownerId,propertyId})).id;
}
export async function sendMessageToFirestore(roomId, _senderId, senderName, text, extras = {}) {
  const account = firebaseAuth?.currentUser;
  if (!account) throw new Error('CHAT_REQUIRES_FIREBASE_AUTH');
  if ((text || '').length > 4000) throw new Error('El mensaje supera los 4000 caracteres.');
  const media = extras.media || extras.image;
  const type = extras.type || (media ? (extras.isVoice ? 'audio' : 'image') : 'text');
  const mediaUrl = media ? await uploadChatMedia(roomId, media) : null;
  if(usesServerOperations)return(await callBackend('sendMessage',{roomId,type,text:text||'',...(mediaUrl?{mediaUrl}:{}),...(type==='location'?{latitude:extras.latitude,longitude:extras.longitude}:{})},{expectedUid:account.uid})).id;
  const messageRef = doc(collection(firestore,'conversations',roomId,'messages'));
  const batch = writeBatch(firestore);
  batch.set(messageRef,{ senderId:account.uid, senderName, text:text || (type==='audio'?'Audio':type==='image'?'Foto':''),
    type, ...(mediaUrl?{mediaUrl}:{}), createdAt:serverTimestamp(), status:'sent' });
  batch.update(doc(firestore,'conversations',roomId),{lastMessage:text || (type==='audio'?'Audio':'Foto'),lastMessageTimestamp:serverTimestamp(),lastSenderId:account.uid,lastMessageId:messageRef.id});
  await batch.commit();
  return messageRef.id;
}
export async function markConversationRead(roomId) {
  const uid = firebaseAuth?.currentUser?.uid;
  if (uid && roomId) await updateDoc(doc(firestore,'conversations',roomId),{[`readAt.${uid}`]:serverTimestamp()});
}
export async function migrateConversationToEmailRoom(conversation) {
  return conversation.id; // Migration is an audited server operation, never a browser copy.
}
