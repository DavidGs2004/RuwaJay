import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  getDocs,
  serverTimestamp,
  doc,
  setDoc,
  writeBatch,
  where,
} from 'firebase/firestore';
import { firebaseAuth, firestore, firebaseWebEnabled } from './firebase';
import { publishRealtimeEvent } from './realtimeService';

const LOCAL_CONVERSATIONS_KEY = 'ruwajay_local_conversations';
const LOCAL_MESSAGES_KEY = 'ruwajay_local_messages';
const CHAT_EVENT = 'ruwajay:chats-changed';

function readLocal(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function notifyLocalChatChange() {
  window.dispatchEvent(new Event(CHAT_EVENT));
  publishRealtimeEvent('CHAT_CHANGED');
}

function localConversationsFor(userId) {
  return readLocal(LOCAL_CONVERSATIONS_KEY, [])
    .filter((conversation) => conversation.participants?.includes(userId));
}

function mergeConversations(localItems, remoteItems) {
  const merged = new Map(localItems.map((item) => [item.id, item]));
  remoteItems.forEach((item) => merged.set(item.id, { ...merged.get(item.id), ...item }));
  return [...merged.values()];
}

function upsertLocalConversation(roomId, sharedData) {
  const conversations = readLocal(LOCAL_CONVERSATIONS_KEY, []);
  const previous = conversations.find((item) => item.id === roomId);
  const conversation = {
    ...previous,
    id: roomId,
    ...sharedData,
    createdAt: previous?.createdAt || new Date().toISOString(),
    lastMessage: previous?.lastMessage || 'Conversación habilitada después de confirmar la visita.',
    lastMessageTimestamp: previous?.lastMessageTimestamp || new Date().toISOString(),
  };
  localStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify([
    conversation,
    ...conversations.filter((item) => item.id !== roomId),
  ]));
  notifyLocalChatChange();
}

/**
 * Suscribe a los mensajes de una conversación específica.
 */
export function subscribeToMessages(roomId, onUpdate) {
  if (!roomId) return () => {};
  if (!firebaseWebEnabled || !firestore || !firebaseAuth?.currentUser) {
    const emit = () => {
      const messagesByRoom = readLocal(LOCAL_MESSAGES_KEY, {});
      onUpdate(Array.isArray(messagesByRoom[roomId]) ? messagesByRoom[roomId] : []);
    };
    emit();
    window.addEventListener('storage', emit);
    window.addEventListener(CHAT_EVENT, emit);
    window.addEventListener('ruwajay:chat_changed', emit);
    return () => {
      window.removeEventListener('storage', emit);
      window.removeEventListener(CHAT_EVENT, emit);
      window.removeEventListener('ruwajay:chat_changed', emit);
    };
  }

  const q = query(
    collection(firestore, 'conversations', roomId, 'messages'),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        // Convert Firestore timestamp to friendly string if needed
        timestamp: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente'
      };
    });
    onUpdate(messages);
  });
}

/**
 * Suscribe a la lista de conversaciones de un usuario.
 */
export function subscribeToConversations(userId, onUpdate) {
  if (!userId) return () => {};
  let remoteUidItems = [];
  let remoteEmailItems = [];
  const activeEmail = String(firebaseAuth?.currentUser?.email || '').trim().toLowerCase();
  const getRemoteItems = () => mergeConversations(remoteUidItems, remoteEmailItems);
  const emitMerged = () => onUpdate(mergeConversations(localConversationsFor(userId), getRemoteItems()));
  if (!firebaseWebEnabled || !firestore || !firebaseAuth?.currentUser) {
    const emit = emitMerged;
    emit();
    window.addEventListener('storage', emit);
    window.addEventListener(CHAT_EVENT, emit);
    window.addEventListener('ruwajay:chat_changed', emit);
    return () => {
      window.removeEventListener('storage', emit);
      window.removeEventListener(CHAT_EVENT, emit);
      window.removeEventListener('ruwajay:chat_changed', emit);
    };
  }

  const q = query(
    collection(firestore, 'conversations'),
    where('participants', 'array-contains', userId)
  );

  emitMerged();
  window.addEventListener(CHAT_EVENT, emitMerged);
  window.addEventListener('storage', emitMerged);
  const unsubscribeUid = onSnapshot(q, (snapshot) => {
    remoteUidItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
      const aTime = a.lastMessageTimestamp?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
      const bTime = b.lastMessageTimestamp?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
    emitMerged();
  }, (error) => {
    console.warn('No se pudieron cargar las conversaciones:', error);
    emitMerged();
  });
  let unsubscribeEmail = () => {};
  if (activeEmail) {
    const emailQuery = query(
      collection(firestore, 'conversations'),
      where('ownerEmail', '==', activeEmail)
    );
    unsubscribeEmail = onSnapshot(emailQuery, (snapshot) => {
      remoteEmailItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      emitMerged();
    }, (error) => {
      console.warn('No se pudieron cargar las conversaciones asociadas al correo:', error);
      emitMerged();
    });
  }
  return () => {
    unsubscribeUid();
    unsubscribeEmail();
    window.removeEventListener(CHAT_EVENT, emitMerged);
    window.removeEventListener('storage', emitMerged);
  };
}

/**
 * Envía un mensaje a Firestore.
 */
export async function sendMessageToFirestore(roomId, senderId, senderName, text, extras = {}) {
  if (!roomId) return;

  if (!firebaseWebEnabled || !firestore || !firebaseAuth?.currentUser) {
    throw new Error('CHAT_REQUIRES_FIREBASE_AUTH');
  }

  const message = {
    senderId,
    senderName,
    text,
    createdAt: serverTimestamp(),
    status: 'sent',
    ...extras
  };

  const messageRef = await addDoc(collection(firestore, 'conversations', roomId, 'messages'), message);

  // Update conversation metadata
  await setDoc(doc(firestore, 'conversations', roomId), {
    lastMessage: text,
    lastMessageTimestamp: serverTimestamp(),
    lastSenderId: senderId
  }, { merge: true });

  return messageRef.id;
}

/**
 * Crea o recupera una conversación entre un buscador y un propietario por una propiedad.
 */
export function buildConversationId(seekerId, ownerId, propertyId) {
  return [seekerId, ownerId, propertyId].sort().join('_').replace(/[^a-zA-Z0-9_]/g, '');
}

export function subscribeToConversation(roomId, userId, onUpdate) {
  if (!roomId || !userId) return () => {};

  if (!firebaseWebEnabled || !firestore || !firebaseAuth?.currentUser) {
    const emit = () => {
      const conversation = readLocal(LOCAL_CONVERSATIONS_KEY, []).find((item) => item.id === roomId) || null;
      onUpdate(conversation);
    };
    emit();
    window.addEventListener(CHAT_EVENT, emit);
    window.addEventListener('storage', emit);
    return () => {
      window.removeEventListener(CHAT_EVENT, emit);
      window.removeEventListener('storage', emit);
    };
  }

  const emitLocal = () => {
    const localConversation = readLocal(LOCAL_CONVERSATIONS_KEY, [])
      .find((item) => item.id === roomId && item.participants?.includes(userId));
    if (localConversation) onUpdate(localConversation);
  };
  emitLocal();
  window.addEventListener(CHAT_EVENT, emitLocal);
  window.addEventListener('storage', emitLocal);
  const unsubscribe = onSnapshot(
    doc(firestore, 'conversations', roomId),
    (snapshot) => snapshot.exists()
      ? onUpdate({ id: snapshot.id, ...snapshot.data() })
      : emitLocal(),
    (error) => {
      console.warn('No se pudo abrir la conversación solicitada:', error);
      emitLocal();
    }
  );
  return () => {
    unsubscribe();
    window.removeEventListener(CHAT_EVENT, emitLocal);
    window.removeEventListener('storage', emitLocal);
  };
}

export async function getOrCreateConversation(seekerId, ownerId, propertyId, propertyTitle, details = {}) {
  const baseRoomId = buildConversationId(seekerId, ownerId, propertyId);
  const roomId = details.emailRoom
    ? `email_${baseRoomId}_${String(details.ownerEmail || '').replace(/[^a-zA-Z0-9]/g, '')}`
    : baseRoomId;
  const sharedData = {
    participants: [seekerId, ownerId],
    participantEmails: [details.tenantEmail || details.seekerEmail, details.ownerEmail]
      .map((email) => String(email || '').trim().toLowerCase())
      .filter(Boolean),
    propertyId,
    propertyTitle,
    propertyImage: details.propertyImage || '',
    propertyPrice: Number(details.propertyPrice) || 0,
    seekerId,
    ownerId,
    seekerName: details.tenantName || details.seekerName || 'Interesado',
    seekerPhone: details.tenantPhone || details.seekerPhone || '',
    seekerPhoto: details.tenantPhoto || details.seekerPhoto || '',
    seekerEmail: String(details.tenantEmail || details.seekerEmail || '').trim().toLowerCase(),
    ownerName: details.ownerName || 'Propietario',
    ownerPhone: details.ownerPhone || '',
    ownerPhoto: details.ownerPhoto || '',
    ownerEmail: String(details.ownerEmail || '').trim().toLowerCase(),
  };

  upsertLocalConversation(roomId, sharedData);

  if (!firebaseWebEnabled || !firestore || !firebaseAuth?.currentUser) {
    return roomId;
  }

  /*
    const conversations = readLocal(LOCAL_CONVERSATIONS_KEY, []);
    if (!conversations.some((conversation) => conversation.id === roomId)) {
      conversations.unshift({
        id: roomId,
        ...sharedData,
        createdAt: new Date().toISOString(),
        lastMessage: 'Conversación habilitada después de confirmar la visita.',
      });
      localStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify(conversations));
      notifyLocalChatChange();
    }
    return roomId;
  } */

  const roomRef = doc(firestore, 'conversations', roomId);
  await setDoc(roomRef, {
    ...sharedData,
    createdAt: serverTimestamp(),
    lastMessage: 'Conversación habilitada después de confirmar la visita.',
    lastMessageTimestamp: serverTimestamp(),
  }, { merge: true });

  return roomId;
}

export async function migrateConversationToEmailRoom(conversation, details = {}) {
  if (!firebaseAuth?.currentUser || !firestore || !conversation?.id) return null;
  if (!details.ownerEmail || !details.tenantEmail) return null;

  const targetRoomId = await getOrCreateConversation(
    conversation.seekerId,
    conversation.ownerId,
    conversation.propertyId,
    conversation.propertyTitle,
    { ...conversation, ...details, emailRoom: true }
  );
  if (targetRoomId === conversation.id) return targetRoomId;

  const source = await getDocs(query(
    collection(firestore, 'conversations', conversation.id, 'messages'),
    orderBy('createdAt', 'asc')
  ));
  if (!source.empty) {
    const batch = writeBatch(firestore);
    source.docs.slice(0, 450).forEach((messageSnapshot) => {
      batch.set(
        doc(firestore, 'conversations', targetRoomId, 'messages', messageSnapshot.id),
        messageSnapshot.data(),
        { merge: true }
      );
    });
    await batch.commit();
  }
  return targetRoomId;
}
