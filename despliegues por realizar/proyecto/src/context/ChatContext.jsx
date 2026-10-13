import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToMessages, subscribeToConversation, subscribeToConversations, sendMessageToFirestore,
  getOrCreateConversation, markConversationRead } from '../lib/chatService';
import { fetchPropertyById } from '../lib/propertyService';
import { unreadConversation, timestampMillis } from '../lib/contracts';
const ChatContext = createContext(null);
export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [direct, setDirect] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeToast, setActiveToast] = useState(null);
  const [chatError, setChatError] = useState('');
  const previous = useRef(null);
  const markAsRead = useCallback(room => markConversationRead(room).catch(error => setChatError(error.message)), []);
  const decorate = useCallback(item => {
    const owner = item.ownerId === user?.id;
    return { ...item, participantId: owner ? item.seekerId : item.ownerId,
      participantName: String((owner ? item.seekerName : item.ownerName) || 'Usuario'),
      participantPhone: owner ? item.seekerPhone : item.ownerPhone,
      participantAvatar: owner ? item.seekerPhoto : item.ownerPhoto,
      participantRole: owner ? 'Interesado' : 'Propietario', currentUserRole: owner ? 'Propietario' : 'Interesado',
      participantOnline: false, unreadCount: unreadConversation(item, user?.id) ? 1 : 0 };
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
  const conversations = useMemo(() => items.map(decorate), [items, decorate]);
  const activeConversation = useMemo(() => {
    const item = items.find(v => v.id === activeConversationId) || direct;
    if (!item) return null;
    const otherId = item.participants?.find(uid => uid !== user?.id);
    return { ...decorate(item), messages: messages.map(message => ({ ...message,
      status: timestampMillis(item.readAt?.[otherId]) >= timestampMillis(message.createdAt) ? 'read' : 'sent' })) };
  }, [items, direct, messages, activeConversationId, decorate, user?.id]);
  const startConversationWithProperty = useCallback(async propertyId => {
    const existing = items.find(v => v.propertyId === propertyId);
    if (existing) { setActiveConversationId(existing.id); return existing.id; }
    const property = await fetchPropertyById(propertyId);
    if (!property) throw new Error('Vivienda inexistente.');
    const room = await getOrCreateConversation(user.id, property.ownerId, propertyId);
    setActiveConversationId(room); return room;
  }, [items, user?.id]);
  const sendMessage = useCallback((room, text, media = null, isVoice = false) =>
    sendMessageToFirestore(room, user?.id, user?.name || 'Usuario', text?.trim() || '', { media, isVoice }), [user?.id, user?.name]);
  return <ChatContext.Provider value={{ conversations, activeConversation, activeConversationId, setActiveConversationId,
    messages, sendMessage, startConversationWithProperty, markAsRead, typingMap:{}, chatError,
    resetDemoChats:() => setActiveConversationId(null), totalUnreadCount:conversations.filter(v => v.unreadCount).length,
    activeToast, dismissToast:() => setActiveToast(null) }}>{children}</ChatContext.Provider>;
}
export function useChat() {
  const value = useContext(ChatContext);
  if (!value) throw new Error('useChat requiere ChatProvider.');
  return value;
}
