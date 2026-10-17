import { collection, query, orderBy, onSnapshot, doc, writeBatch, setDoc, serverTimestamp, updateDoc, where, getDocs, deleteField } from 'firebase/firestore';
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
export async function getOrCreateConversation(seekerId, ownerId, propertyId, propertyTitle = '') {
  if (!firebaseAuth?.currentUser) throw new Error('Debes iniciar sesión.');
  const roomId = [seekerId, ownerId, propertyId].filter(Boolean).sort().join('_').replace(/[^a-zA-Z0-9_]/g, '');
  try {
    const roomRef = doc(firestore, 'conversations', roomId);
    await setDoc(roomRef, {
      participants: [seekerId, ownerId].filter(Boolean),
      propertyId: propertyId || '',
      propertyTitle: propertyTitle || 'Propiedad RuwaJay',
      createdAt: serverTimestamp(),
      seekerId: seekerId || '',
      ownerId: ownerId || '',
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return roomId;
  } catch (err) {
    console.warn('Firestore directo falló al abrir conversación, intentando backend:', err);
    try {
      const res = await callBackend('openConversation', { seekerId, ownerId, propertyId });
      return res?.id || roomId;
    } catch {
      return roomId;
    }
  }
}
export async function sendMessageToFirestore(roomId, _senderId, senderName, text, extras = {}) {
  const account = firebaseAuth?.currentUser;
  if (!account) throw new Error('CHAT_REQUIRES_FIREBASE_AUTH');
  if ((text || '').length > 4000) throw new Error('El mensaje supera los 4000 caracteres.');
  const media = extras.media || extras.image;
  const isVideo = extras.isVideo || (media instanceof File && media.type?.startsWith('video')) || (typeof media === 'string' && media.startsWith('data:video'));
  const type = extras.type || (media ? (extras.isVoice ? 'audio' : isVideo ? 'video' : 'image') : 'text');
  const mediaUrl = media ? await uploadChatMedia(roomId, media) : null;
  try {
    const messageRef = doc(collection(firestore, 'conversations', roomId, 'messages'));
    const batch = writeBatch(firestore);
    batch.set(messageRef, {
      senderId: account.uid,
      senderName: senderName || account.displayName || 'Usuario',
      text: text || (type === 'audio' ? '🎤 Audio' : type === 'video' ? '🎥 Video' : type === 'image' ? '📷 Foto' : ''),
      type,
      ...(extras.replyTo ? { replyTo: extras.replyTo } : {}),
      ...(mediaUrl ? { mediaUrl } : {}),
      ...(type === 'location' ? { latitude: extras.latitude, longitude: extras.longitude } : {}),
      createdAt: serverTimestamp(),
      status: 'sent',
    });
    batch.update(doc(firestore, 'conversations', roomId), {
      lastMessage: text || (type === 'audio' ? '🎤 Audio' : type === 'video' ? '🎥 Video' : type === 'image' ? '📷 Foto' : 'Mensaje'),
      lastMessageTimestamp: serverTimestamp(),
      lastSenderId: account.uid,
      lastMessageId: messageRef.id,
    });
    await batch.commit();
    return messageRef.id;
  } catch (firestoreError) {
    console.warn('Escritura directa en Firestore falló, intentando backend:', firestoreError);
    if (usesServerOperations) {
      return (await callBackend('sendMessage', {
        roomId,
        type,
        text: text || '',
        ...(mediaUrl ? { mediaUrl } : {}),
        ...(type === 'location' ? { latitude: extras.latitude, longitude: extras.longitude } : {}),
      }, { expectedUid: account.uid })).id;
    }
    throw firestoreError;
  }
}
export async function markConversationRead(roomId) {
  const uid = firebaseAuth?.currentUser?.uid;
  if (uid && roomId) await updateDoc(doc(firestore,'conversations',roomId),{[`readAt.${uid}`]:serverTimestamp()});
}
export async function migrateConversationToEmailRoom(conversation) {
  return conversation.id; // Migration is an audited server operation, never a browser copy.
}

export async function editMessageInFirestore(roomId, messageId, newText) {
  if (!roomId || !messageId) throw new Error('Parámetros inválidos.');
  const trimmed = (newText || '').trim();
  if (!trimmed) throw new Error('El mensaje no puede estar vacío.');
  if (trimmed.length > 4000) throw new Error('El mensaje supera los 4000 caracteres.');
  const messageRef = doc(firestore, 'conversations', roomId, 'messages', messageId);
  await updateDoc(messageRef, {
    text: trimmed,
    isEdited: true,
    editedAt: serverTimestamp(),
  });
}

export async function deleteMessageFromFirestore(roomId, messageId) {
  if (!roomId || !messageId) throw new Error('Parámetros inválidos.');
  const messageRef = doc(firestore, 'conversations', roomId, 'messages', messageId);
  await updateDoc(messageRef, {
    isDeleted: true,
    text: 'Este mensaje fue eliminado',
    mediaUrl: deleteField(),
    image: deleteField(),
    deletedAt: serverTimestamp(),
  });
}

export async function toggleReactionInFirestore(roomId, messageId, emoji, userId, currentEmoji) {
  if (!roomId || !messageId || !userId) throw new Error('Parámetros inválidos.');
  const messageRef = doc(firestore, 'conversations', roomId, 'messages', messageId);
  const updateValue = currentEmoji === emoji ? deleteField() : emoji;
  await updateDoc(messageRef, {
    [`reactions.${userId}`]: updateValue,
  });
}

export async function clearChatInFirestore(roomId) {
  if (!roomId) throw new Error('Parámetros inválidos.');
  const uid = firebaseAuth?.currentUser?.uid;
  if (!uid) throw new Error('Debes iniciar sesión.');
  await updateDoc(doc(firestore, 'conversations', roomId), {
    [`clearedAt.${uid}`]: serverTimestamp(),
  });
}

