import { chatMediaInfo } from './chatMedia';
import { collection, query, orderBy, onSnapshot, doc, writeBatch, setDoc, serverTimestamp, updateDoc, where, getDocs, deleteField, increment, getDoc, deleteDoc } from 'firebase/firestore';
import { callBackend, usesServerOperations, usesSupabaseBackend } from './backendService';
import { firebaseAuth, firestore, functions } from './firebase';
import { conversationId, timestampMillis } from './contracts';
import { uploadChatMedia } from './mediaService';
export const buildConversationId = conversationId;
export function subscribeToMessages(roomId, onUpdate, onError = console.error) {
  if (!roomId || !firebaseAuth?.currentUser) { onUpdate([]); return () => {}; }
  return onSnapshot(query(collection(firestore, 'conversations', roomId, 'messages'), orderBy('createdAt','asc')),
    snap => onUpdate(snap.docs.map(d => {
      const data = d.data({ serverTimestamps: 'estimate' });
      return {
        ...data,
        id: d.id,
        timestamp: data.createdAt?.toDate?.().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) || '',
      };
    })), onError);
}
export function subscribeToConversations(userId, onUpdate, onError = console.error) {
  if (!userId) { onUpdate([]); return () => {}; }
  return onSnapshot(query(collection(firestore,'conversations'),where('participants','array-contains',userId)),
    snap => onUpdate(snap.docs.filter(d=>!d.data().migratedTo && !d.data().archived).map(d => ({ ...d.data({ serverTimestamps: 'estimate' }),id:d.id })).sort((a,b) => timestampMillis(b.lastMessageTimestamp)-timestampMillis(a.lastMessageTimestamp))), onError);
}
export function subscribeToConversation(roomId, userId, onUpdate, onError = console.error) {
  if (!roomId || !userId) return () => {};
  return onSnapshot(doc(firestore,'conversations',roomId), snap => onUpdate(snap.exists()?{...snap.data({ serverTimestamps: 'estimate' }),id:snap.id}:null), onError);
}
export async function getOrCreateConversation(seekerId, ownerId, propertyId, propertyTitle = '', extras = {}) {
  if (!firebaseAuth?.currentUser) throw new Error('Debes iniciar sesión.');
  const result = await callBackend('openConversation', { seekerId, ownerId, propertyId });
  if (!result?.id) throw new Error('No se pudo abrir el chat. Comprueba que la visita esté confirmada e inténtalo de nuevo.');
  return result.id;
}
export async function sendMessageToFirestore(roomId, _senderId, senderName, text, extras = {}) {
  const account = firebaseAuth?.currentUser;
  if (!account) throw new Error('CHAT_REQUIRES_FIREBASE_AUTH');
  if ((text || '').length > 4000) throw new Error('El mensaje supera los 4000 caracteres.');
  const media = extras.media || extras.image;
  const type = extras.type || (media ? chatMediaInfo(media, extras.isVoice).type : 'text');
  if (!media && type === 'text' && !text?.trim()) throw new Error('Escribe un mensaje.');
  const mediaUrl = media ? await uploadChatMedia(roomId, media, extras.isVoice) : null;
  if (firebaseAuth.currentUser?.uid !== account.uid) throw new Error('La sesión cambió. Inténtalo con la cuenta actual.');
  // The gateway commits the message, summary and notification job together.
  // Direct writes remain available for installations without the gateway.
  if (usesSupabaseBackend) {
    try {
      return (await callBackend('sendMessage', {
          roomId, type, text: text || '',
          ...(extras.replyTo ? { replyTo: extras.replyTo } : {}),
          ...(mediaUrl ? { mediaUrl } : {}),
          ...(type === 'location' ? { latitude: extras.latitude, longitude: extras.longitude } : {}),
      }, { expectedUid: account.uid })).id;
    } catch (backendErr) {
      console.warn('Backend sendMessage falló, recurriendo a Firestore directo:', backendErr);
    }
  }
  try {
    let recipientIds = [];
    if (extras.recipientId) {
      recipientIds = [extras.recipientId];
    } else if (Array.isArray(extras.participants) && extras.participants.length > 0) {
      recipientIds = extras.participants.filter(p => p && p !== account.uid);
    }
    if (recipientIds.length === 0) {
      try {
        const convSnap = await getDoc(doc(firestore, 'conversations', roomId));
        if (convSnap.exists()) {
          const data = convSnap.data();
          const p = data.participants || [data.seekerId, data.ownerId];
          recipientIds = (p || []).filter(uid => uid && uid !== account.uid);
        }
      } catch (e) {
        console.warn('Could not determine recipient for unread counter:', e);
      }
    }

    if (firebaseAuth.currentUser?.uid !== account.uid) throw new Error('La sesión cambió.');
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

    const convUpdates = {
      lastMessage: text || (type === 'audio' ? '🎤 Audio' : type === 'video' ? '🎥 Video' : type === 'image' ? '📷 Foto' : 'Mensaje'),
      lastMessageTimestamp: serverTimestamp(),
      lastSenderId: account.uid,
      lastSenderName: senderName || account.displayName || 'Usuario',
      lastMessageId: messageRef.id,
      [`unreadCount.${account.uid}`]: 0,
    };
    for (const rId of recipientIds) {
      convUpdates[`unreadCount.${rId}`] = increment(1);
    }

    batch.update(doc(firestore, 'conversations', roomId), convUpdates);
    await batch.commit();
    return messageRef.id;
  } catch (firestoreError) {
    console.warn('Escritura directa en Firestore falló, intentando backend:', firestoreError);
    if (usesServerOperations) {
      return (await callBackend('sendMessage', {
        roomId,
        type,
        text: text || '',
        ...(extras.replyTo ? { replyTo: extras.replyTo } : {}),
        ...(mediaUrl ? { mediaUrl } : {}),
        ...(type === 'location' ? { latitude: extras.latitude, longitude: extras.longitude } : {}),
      }, { expectedUid: account.uid })).id;
    }
    throw firestoreError;
  }
}
export async function markConversationRead(roomId, readAt = new Date()) {
  const uid = firebaseAuth?.currentUser?.uid;
  if (!uid || !roomId) return;
  try {
    await updateDoc(doc(firestore, 'conversations', roomId), {
      [`readAt.${uid}`]: readAt,
      [`unreadCount.${uid}`]: 0,
    });
  } catch (err) {
    try {
      await setDoc(doc(firestore, 'conversations', roomId), {
        readAt: { [uid]: readAt },
        unreadCount: { [uid]: 0 }
      }, { merge: true });
    } catch (setErr) {
      console.warn('No se pudo actualizar readAt en Firestore:', setErr);
      throw setErr;
    }
  }
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

export async function deleteMessageForEveryone(roomId, messageId) {
  const uid = firebaseAuth?.currentUser?.uid;
  if (!roomId || !messageId || !uid) throw new Error('Debes iniciar sesión y seleccionar un mensaje.');
  const messageRef = doc(firestore, 'conversations', roomId, 'messages', messageId);
  const snap = await getDoc(messageRef);
  if (!snap.exists()) return;
  if (snap.data().senderId !== uid) throw new Error('Solo puedes eliminar para todos tus propios mensajes.');
  if (firebaseAuth.currentUser?.uid !== uid) throw new Error('La sesión cambió.');
  const updatePayload = {
    isDeleted: true,
    text: 'Este mensaje fue eliminado',
    deletedAt: serverTimestamp(),
  };
  if (snap.data().mediaUrl) updatePayload.mediaUrl = deleteField();
  if (snap.data().image) updatePayload.image = deleteField();

  try {
    await updateDoc(messageRef, updatePayload);
  } catch (err) {
    try {
      await deleteDoc(messageRef);
    } catch {
      throw err;
    }
  }
}

export function getLocalDeletedForMeKey(uid, roomId) {
  return `ruwa_deleted_for_me_${uid}_${roomId}`;
}

export function isMessageDeletedForMeLocally(roomId, messageId, uid) {
  if (!roomId || !messageId || !uid) return false;
  try {
    const list = JSON.parse(localStorage.getItem(getLocalDeletedForMeKey(uid, roomId)) || '[]');
    return list.includes(messageId);
  } catch {
    return false;
  }
}

export function hideMessageLocallyForMe(roomId, messageId, uid) {
  if (!roomId || !messageId || !uid) return;
  try {
    const key = getLocalDeletedForMeKey(uid, roomId);
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    if (!list.includes(messageId)) {
      list.push(messageId);
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('Error guardando mensaje eliminado localmente:', e);
  }
}

export async function deleteMessageForMe(roomId, messageId, currentUid) {
  const uid = firebaseAuth?.currentUser?.uid || currentUid;
  if (!roomId || !messageId || !uid) throw new Error('Debes iniciar sesión.');
  hideMessageLocallyForMe(roomId, messageId, uid);
  try {
    await updateDoc(doc(firestore, 'conversations', roomId, 'messages', messageId), {
      [`deletedFor.${uid}`]: true,
    });
  } catch (err) {
    console.warn('No se pudo guardar en Firestore deletedFor, pero se ocultó localmente:', err);
  }
}

export const deleteMessageFromFirestore = deleteMessageForEveryone;

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

