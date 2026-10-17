import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToMessages, subscribeToConversation, subscribeToConversations, sendMessageToFirestore,
  getOrCreateConversation, markConversationRead, editMessageInFirestore, deleteMessageFromFirestore, toggleReactionInFirestore, clearChatInFirestore } from '../lib/chatService';
import { fetchPropertyById } from '../lib/propertyService';
import { unreadConversation, timestampMillis } from '../lib/contracts';
import { firebaseAuth } from '../lib/firebase';
const ChatContext = createContext(null);

function otherParticipantId(item, currentUid) {
  return item?.participants?.find(uid => uid && uid !== currentUid)
    || (item?.ownerId === currentUid ? item?.seekerId : item?.ownerId)
    || '';
}

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [direct, setDirect] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeToast, setActiveToast] = useState(null);
  const [chatError, setChatError] = useState('');
  const previous = useRef(null);
  const itemsRef = useRef([]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const markAsRead = useCallback(async room => {
    const currentUid = user?.id || firebaseAuth?.currentUser?.uid;
    if (!room || !currentUid) return;

    // La bandeja agrupa por contacto varias conversaciones (por inmueble). Al
    // abrir una, todas las conversaciones de ese contacto deben quedar leidas.
    const target = itemsRef.current.find(item => item.id === room);
    const contactId = otherParticipantId(target, currentUid);
    const roomIds = contactId
      ? itemsRef.current
        .filter(item => otherParticipantId(item, currentUid) === contactId)
        .map(item => item.id)
      : [room];
    const uniqueRoomIds = [...new Set(roomIds.filter(Boolean))];
    const readAt = new Date();

    // Actualizacion optimista: evita que el indicador salte 1 -> 2 -> 1
    // mientras Firestore confirma las escrituras.
    setItems(current => current.map(item => uniqueRoomIds.includes(item.id)
      ? { ...item, readAt: { ...(item.readAt || {}), [currentUid]: readAt } }
      : item));

    const results = await Promise.allSettled(uniqueRoomIds.map(markConversationRead));
    const failure = results.find(result => result.status === 'rejected');
    if (failure) setChatError(failure.reason?.message || 'No se pudo marcar el chat como leido.');
  }, [user?.id]);

  const openConversation = useCallback(room => {
    setActiveConversationId(room);
    void markAsRead(room);
  }, [markAsRead]);
  const decorate = useCallback(item => {
    const currentUid = user?.id || firebaseAuth?.currentUser?.uid;
    const isOwner = item.ownerId === currentUid;
    let participantId = otherParticipantId(item, currentUid);
    let participantName = item.participantName;
    if (!participantName || participantName === 'Usuario') {
      participantName = isOwner ? item.seekerName : item.ownerName;
    }
    if (!participantName && item.otherUserName) {
      participantName = item.otherUserName;
    }
    if (!participantName) {
      participantName = 'Usuario';
    }
    const participantPhone = (isOwner ? item.seekerPhone : item.ownerPhone) || item.participantPhone || '';
    const participantAvatar = (isOwner ? item.seekerPhoto : item.ownerPhoto) || item.participantAvatar || item.otherUserPhoto || null;
    return {
      ...item,
      participantId: participantId || '',
      participantName: String(participantName),
      participantPhone,
      participantAvatar,
      participantRole: isOwner ? 'Interesado' : 'Propietario',
      currentUserRole: isOwner ? 'Propietario' : 'Interesado',
      participantOnline: false,
      unreadCount: unreadConversation(item, currentUid) ? 1 : 0
    };
  }, [user?.id]);
  useEffect(() => {
    setItems([]); setMessages([]); setDirect(null); setActiveConversationId(null); setActiveToast(null); previous.current = null;
    if (!user?.id) return;
    return subscribeToConversations(user.id, values => {
      const next = new Map(values.map(v => [v.id, timestampMillis(v.lastMessageTimestamp)]));
      if (previous.current) for (const item of values) {
        if (item.lastSenderId && item.lastSenderId !== user.id && next.get(item.id) > (previous.current.get(item.id) || 0)) {
          const value = decorate(item);
          setActiveToast({ convId:item.id, senderName:value.participantName, propertyTitle:item.propertyTitle,
            propertyThumbnail:item.propertyImage, text:item.lastMessage });
        }
      }
      previous.current = next; setItems(values); setChatError('');
    }, error => setChatError(error.message));
  }, [user?.id, decorate]);
  useEffect(() => {
    setDirect(null); setMessages([]);
    if (!user?.id || !activeConversationId) return;
    const a = subscribeToConversation(activeConversationId, user.id, setDirect, error => setChatError(error.message));
    const b = subscribeToMessages(activeConversationId, value => {
      setMessages(value);
      if (document.visibilityState === 'visible' && location.pathname === '/chat') markAsRead(activeConversationId);
    }, error => setChatError(error.message));
    return () => { a(); b(); };
  }, [user?.id, activeConversationId, markAsRead]);
  useEffect(() => {
    const readVisible=()=>{
      if(activeConversationId && document.visibilityState==='visible' && location.pathname==='/chat') markAsRead(activeConversationId);
    };
    document.addEventListener('visibilitychange',readVisible);
    window.addEventListener('focus',readVisible);
    return()=>{document.removeEventListener('visibilitychange',readVisible);window.removeEventListener('focus',readVisible);};
  },[activeConversationId,markAsRead]);
  const conversations = useMemo(() => {
    const currentUid = user?.id || firebaseAuth?.currentUser?.uid;
    const decorated = items.map(decorate);

    // 1. Filtrar únicamente personas con las que realmente se ha hecho contacto
    const realContacts = decorated.filter(item => {
      if (!item.participantId || item.participantId === currentUid) return false;
      if (!item.lastMessage) return false;
      const isAutoPlaceholder = (item.participantName === 'Usuario' || !item.lastSenderId) &&
        String(item.lastMessage).trim().toLowerCase().startsWith('consulta sobre');
      if (isAutoPlaceholder) return false;
      return true;
    });

    // 2. Desduplicar: Cada contacto debe aparecer EXACTAMENTE UNA VEZ
    const contactMap = new Map();
    for (const conv of realContacts) {
      const contactKey = (conv.participantId || conv.participantName || '').trim().toLowerCase();
      if (!contactKey) continue;
      if (!contactMap.has(contactKey)) {
        contactMap.set(contactKey, { ...conv });
      } else {
        const existing = contactMap.get(contactKey);
        const existingTime = timestampMillis(existing.lastMessageTimestamp);
        const convTime = timestampMillis(conv.lastMessageTimestamp);
        if (convTime > existingTime) {
          contactMap.set(contactKey, {
            ...conv,
            unreadCount: Math.max(existing.unreadCount || 0, conv.unreadCount || 0),
          });
        } else {
          existing.unreadCount = Math.max(existing.unreadCount || 0, conv.unreadCount || 0);
        }
      }
    }
    return Array.from(contactMap.values()).sort(
      (a, b) => timestampMillis(b.lastMessageTimestamp) - timestampMillis(a.lastMessageTimestamp)
    );
  }, [items, decorate, user?.id]);
  const activeConversation = useMemo(() => {
    const item = items.find(v => v.id === activeConversationId) || direct;
    if (!item) return null;
    const currentUid = user?.id || firebaseAuth?.currentUser?.uid;
    const otherId = item.participants?.find(uid => uid !== currentUid);
    const myClearedTime = timestampMillis(item.clearedAt?.[currentUid]) || 0;
    const visibleMessages = messages.filter(m => timestampMillis(m.createdAt) > myClearedTime);
    return { ...decorate(item), messages: visibleMessages.map(message => ({ ...message,
      status: timestampMillis(item.readAt?.[otherId]) >= timestampMillis(message.createdAt) ? 'read' : 'sent' })) };
  }, [items, direct, messages, activeConversationId, decorate, user?.id]);
  const startConversationWithProperty = useCallback(async propertyId => {
    const existing = items.find(v => v.propertyId === propertyId);
    if (existing) { openConversation(existing.id); return existing.id; }
    const property = await fetchPropertyById(propertyId);
    if (!property) throw new Error('Vivienda inexistente.');
    const room = await getOrCreateConversation(user.id, property.ownerId, propertyId, property.title);
    openConversation(room); return room;
  }, [items, user?.id, openConversation]);
  const sendMessage = useCallback((room, text, media = null, isVoice = false, replyTo = null) =>
    sendMessageToFirestore(room, user?.id, user?.name || 'Usuario', text?.trim() || '', { media, isVoice, replyTo }), [user?.id, user?.name]);
  const editMessage = useCallback((room, messageId, newText) => editMessageInFirestore(room, messageId, newText), []);
  const deleteMessage = useCallback((room, messageId) => deleteMessageFromFirestore(room, messageId), []);
  const toggleReaction = useCallback((room, messageId, emoji, currentEmoji) => toggleReactionInFirestore(room, messageId, emoji, user?.id || firebaseAuth?.currentUser?.uid, currentEmoji), [user?.id]);
  const clearChat = useCallback((room) => clearChatInFirestore(room), []);
  return <ChatContext.Provider value={{ conversations, activeConversation, activeConversationId, setActiveConversationId:openConversation,
    messages, sendMessage, editMessage, deleteMessage, toggleReaction, clearChat, startConversationWithProperty, markAsRead, typingMap:{}, chatError,
    resetDemoChats:() => setActiveConversationId(null), totalUnreadCount:conversations.filter(v => v.unreadCount).length,
    activeToast, dismissToast:() => setActiveToast(null) }}>{children}</ChatContext.Provider>;
}
export function useChat() {
  const value = useContext(ChatContext);
  if (!value) throw new Error('useChat requiere ChatProvider.');
  return value;
}
