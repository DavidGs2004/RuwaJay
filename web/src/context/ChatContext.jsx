import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { subscribeToMessages, subscribeToConversation, subscribeToConversations, sendMessageToFirestore,
  getOrCreateConversation, markConversationRead, editMessageInFirestore, deleteMessageFromFirestore, deleteMessageForEveryone, deleteMessageForMe, toggleReactionInFirestore, clearChatInFirestore } from '../lib/chatService';
import { fetchPropertyById } from '../lib/propertyService';
import { unreadConversation, timestampMillis } from '../lib/contracts';
import { firebaseAuth, firestore } from '../lib/firebase';
import { appPathname } from '../lib/navigation';
const ChatContext = createContext(null);
const isViewingChat = () => document.visibilityState === 'visible' && appPathname(window.location.pathname, import.meta.env.BASE_URL) === '/chat';

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
  const sessionStartTime = useRef(Date.now());
  const previous = useRef(null);
  const itemsRef = useRef([]);
  const locallyReadRoomsRef = useRef(new Map());
  const activeConversationIdRef = useRef(activeConversationId);
  useEffect(() => { activeConversationIdRef.current = activeConversationId; }, [activeConversationId]);
  const [userPresences, setUserPresences] = useState({});

  // Optimize Firestore usage: Only observe presence for the active conversation's participant
  useEffect(() => {
    if (!firestore || !user?.id || !activeConversationId) return;
    const activeItem = items.find(i => i.id === activeConversationId);
    const otherId = activeItem ? otherParticipantId(activeItem, user.id) : null;
    if (!otherId) return;

    let unsubFallback = null;
    const unsubscribeProfile = onSnapshot(doc(firestore, 'public_profiles', otherId), snap => {
      if (!snap.exists()) return;
      const data = snap.data() || {};
      const avatar = data.avatarImage || data.avatar || data.photoURL || data.photoUrl || null;
      const isOnline = Boolean(data.isOnline);
      const name = data.name || null;
      setUserPresences(prev => ({
        ...prev,
        [otherId]: { avatar, isOnline, name }
      }));
    }, () => {
      // Do not cascade aggressive fallback loops to users/{id}
    });

    return () => {
      unsubscribeProfile();
      unsubFallback?.();
    };
  }, [activeConversationId, items, user?.id]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const markAsRead = useCallback(async room => {
    const currentUid = user?.id || firebaseAuth?.currentUser?.uid;
    if (!room || !currentUid || !isViewingChat()) return;

    const target = itemsRef.current.find(item => item.id === room);
    if (!target) return;

    const getUnread = (item) => {
      if (!item) return 0;
      if (typeof item.unreadCount === 'object' && item.unreadCount !== null) {
        return Number(item.unreadCount[currentUid]) || 0;
      }
      return typeof item.unreadCount === 'number' ? item.unreadCount : 0;
    };

    const contactId = otherParticipantId(target, currentUid);
    const roomsToMark = itemsRef.current.filter(item => {
      if (item.id === room) return getUnread(item) > 0;
      const otherId = otherParticipantId(item, currentUid);
      if (contactId && otherId === contactId) {
        return getUnread(item) > 0;
      }
      return false;
    }).map(item => item.id);

    // Evitar bucle recursivo de escrituras si ya todo está leído
    if (roomsToMark.length === 0) return;

    const readAt = new Date();
    const readTime = readAt.getTime();
    for (const rId of roomsToMark) {
      locallyReadRoomsRef.current.set(rId, readTime);
    }

    setActiveToast(current => (current && roomsToMark.includes(current.convId) ? null : current));

    setItems(current => current.map(item => roomsToMark.includes(item.id)
      ? {
          ...item,
          readAt: { ...(item.readAt || {}), [currentUid]: readAt },
          unreadCount: typeof item.unreadCount === 'object' && item.unreadCount !== null
            ? { ...item.unreadCount, [currentUid]: 0 }
            : 0
        }
      : item));

    const results = await Promise.allSettled(roomsToMark.map(id => markConversationRead(id, readAt)));
    const failure = results.find(result => result.status === 'rejected');
    if (failure) setChatError(failure.reason?.message || 'No se pudo marcar el chat como leido.');
  }, [user?.id]);

  const openConversation = useCallback(room => {
    activeConversationIdRef.current = room;
    setActiveConversationId(room);
    setActiveToast(current => (current && current.convId === room ? null : current));
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

    // Prioritize active profile avatar from Firestore, fallback to conversation doc
    const rawAvatar = (isOwner ? item.seekerPhoto : item.ownerPhoto)
      || item.participantAvatar
      || item.otherUserPhoto
      || null;

    const participantAvatar = (typeof rawAvatar === 'string' && rawAvatar.trim() && rawAvatar.trim() !== 'null' && rawAvatar.trim() !== 'undefined')
      ? rawAvatar.trim()
      : null;

    const isActiveRoom = item.id === activeConversationIdRef.current && isViewingChat();

    const storedCount = typeof item.unreadCount === 'object' && item.unreadCount !== null
      ? item.unreadCount[currentUid]
      : (typeof item.unreadCounts === 'object' && item.unreadCounts !== null
          ? item.unreadCounts[currentUid]
          : (typeof item.unreadCount === 'number' ? item.unreadCount : null));

    const isUnread = unreadConversation(item, currentUid);
    let calculatedUnread = 0;
    if (!isActiveRoom && isUnread) {
      if (typeof storedCount === 'number' && storedCount > 0) {
        calculatedUnread = storedCount;
      } else {
        calculatedUnread = 1;
      }
    }

    const presence = userPresences[participantId];
    const resolvedAvatar = presence?.avatar || participantAvatar;

    return {
      ...item,
      participantId: participantId || '',
      participantName: String(presence?.name || participantName),
      participantPhone,
      participantAvatar: resolvedAvatar,
      participantRole: isOwner ? 'Interesado' : 'Propietario',
      currentUserRole: isOwner ? 'Propietario' : 'Interesado',
      participantOnline: presence?.isOnline === true,
      unreadCount: calculatedUnread
    };
  }, [user?.id, userPresences]);
  // Profile updates change presentation, not the lifetime of the room listener.
  const decorateRef = useRef(decorate);
  useEffect(() => { decorateRef.current = decorate; }, [decorate]);
  useEffect(() => {
    setItems([]); setMessages([]); setDirect(null); setActiveConversationId(null); setActiveToast(null); previous.current = null;
    sessionStartTime.current = Date.now();
    if (!user?.id) return;
    return subscribeToConversations(user.id, values => {
      const currentUid = user?.id || firebaseAuth?.currentUser?.uid;
      const reconciledValues = values.map(item => {
        const localReadTime = locallyReadRoomsRef.current.get(item.id);
        if (localReadTime && currentUid) {
          const remoteReadTime = timestampMillis(item.readAt?.[currentUid]);
          if (!remoteReadTime || remoteReadTime < localReadTime) {
            return {
              ...item,
              readAt: {
                ...(item.readAt || {}),
                [currentUid]: new Date(localReadTime)
              }
            };
          }
        }
        return item;
      });

      itemsRef.current = reconciledValues;
      const next = new Map(reconciledValues.map(v => [v.id, timestampMillis(v.lastMessageTimestamp)]));
      if (previous.current) {
        for (const item of reconciledValues) {
          const isFromOther = Boolean(item.lastSenderId && item.lastSenderId !== user.id);
          const prevTime = previous.current.get(item.id);
          const currentTime = next.get(item.id) || 0;
          const hasNewTimestamp = typeof prevTime === 'number' && currentTime > prevTime;
          const isLiveInSession = currentTime >= sessionStartTime.current - 1500;
          const isCurrentlyOpen = activeConversationIdRef.current === item.id && isViewingChat();
          const isUnread = unreadConversation(item, user.id);

          if (isFromOther && hasNewTimestamp && isLiveInSession && !isCurrentlyOpen && isUnread) {
            const value = decorateRef.current(item);
            setActiveToast({
              convId: item.id,
              senderName: value.participantName,
              propertyTitle: item.propertyTitle,
              propertyThumbnail: item.propertyImage,
              text: item.lastMessage
            });
          }
        }
      }
      previous.current = next; setItems(reconciledValues); setChatError('');
    }, error => setChatError(error.message));
  }, [user?.id]);
  useEffect(() => {
    setDirect(null); setMessages([]);
    if (!user?.id || !activeConversationId) return;
    const a = subscribeToConversation(activeConversationId, user.id, setDirect, error => setChatError(error.message));
    const b = subscribeToMessages(activeConversationId, value => {
      setMessages(value);
    }, error => setChatError(error.message));
    return () => { a(); b(); };
  }, [user?.id, activeConversationId, markAsRead]);
  useEffect(() => {
    const readVisible=()=>{
      if(activeConversationId && isViewingChat()) markAsRead(activeConversationId);
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
        const isCurrentActive = conv.id === activeConversationId || existing.id === activeConversationId;
        const unreadCount = isCurrentActive
          ? 0
          : (existing.id === conv.id
              ? Math.max(existing.unreadCount || 0, conv.unreadCount || 0)
              : (existing.unreadCount || 0) + (conv.unreadCount || 0));
        if (convTime > existingTime) {
          contactMap.set(contactKey, {
            ...conv,
            unreadCount,
          });
        } else {
          existing.unreadCount = unreadCount;
        }
      }
    }
    return Array.from(contactMap.values()).sort(
      (a, b) => timestampMillis(b.lastMessageTimestamp) - timestampMillis(a.lastMessageTimestamp)
    );
  }, [items, decorate, user?.id, activeConversationId]);
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
  const sendMessage = useCallback((room, text, media = null, isVoice = false, replyTo = null) => {
    const currentUid = user?.id || firebaseAuth?.currentUser?.uid;
    const conv = itemsRef.current.find(i => i.id === room);
    const recipientId = conv ? otherParticipantId(conv, currentUid) : null;
    return sendMessageToFirestore(room, currentUid, user?.name || 'Usuario', text?.trim() || '', {
      media,
      isVoice,
      replyTo,
      recipientId,
      participants: conv?.participants
    });
  }, [user?.id, user?.name]);
  const editMessage = useCallback((room, messageId, newText) => editMessageInFirestore(room, messageId, newText), []);
  const deleteMessage = useCallback((room, messageId, forEveryone = true) => {
    const currentUid = user?.id || firebaseAuth?.currentUser?.uid;
    if (forEveryone) {
      return deleteMessageForEveryone(room, messageId);
    } else {
      return deleteMessageForMe(room, messageId, currentUid);
    }
  }, [user?.id]);
  const toggleReaction = useCallback((room, messageId, emoji, currentEmoji) => toggleReactionInFirestore(room, messageId, emoji, user?.id || firebaseAuth?.currentUser?.uid, currentEmoji), [user?.id]);
  const clearChat = useCallback((room) => clearChatInFirestore(room), []);
  return <ChatContext.Provider value={{ conversations, activeConversation, activeConversationId, setActiveConversationId:openConversation,
    messages, sendMessage, editMessage, deleteMessage, toggleReaction, clearChat, startConversationWithProperty, markAsRead, typingMap:{}, chatError,
    resetDemoChats:() => setActiveConversationId(null), totalUnreadCount:conversations.reduce((acc, v) => acc + (v.unreadCount || 0), 0),
    activeToast, dismissToast:() => setActiveToast(null) }}>{children}</ChatContext.Provider>;
}
export function useChat() {
  const value = useContext(ChatContext);
  if (!value) throw new Error('useChat requiere ChatProvider.');
  return value;
}
