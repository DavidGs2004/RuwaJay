import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  where,
  limit
} from 'firebase/firestore';
import { firestore, firebaseWebEnabled } from './firebase';

/**
 * Suscribe a los mensajes de una conversación específica.
 */
export function subscribeToMessages(roomId, onUpdate) {
  if (!firebaseWebEnabled || !firestore || !roomId) return () => {};

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
  if (!firebaseWebEnabled || !firestore || !userId) return () => {};

  const q = query(
    collection(firestore, 'conversations'),
    where('participants', 'array-contains', userId),
    orderBy('lastMessageTimestamp', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const convs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    onUpdate(convs);
  });
}

/**
 * Envía un mensaje a Firestore.
 */
export async function sendMessageToFirestore(roomId, senderId, senderName, text, extras = {}) {
  if (!firebaseWebEnabled || !firestore || !roomId) return;

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
export async function getOrCreateConversation(seekerId, ownerId, propertyId, propertyTitle) {
  // Simple room ID generation for uniqueness
  const roomId = [seekerId, ownerId, propertyId].sort().join('_').replace(/[^a-zA-Z0-9_]/g, '');

  const roomRef = doc(firestore, 'conversations', roomId);
  await setDoc(roomRef, {
    participants: [seekerId, ownerId],
    propertyId,
    propertyTitle,
    createdAt: serverTimestamp(),
    seekerId,
    ownerId
  }, { merge: true });

  return roomId;
}
