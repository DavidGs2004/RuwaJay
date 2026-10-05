import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

import { useAuth } from './AuthContext';
import { firebaseAuth } from '../lib/firebase';

import {
  subscribeToMessages,
  subscribeToConversation,
  subscribeToConversations,
  sendMessageToFirestore,
  getOrCreateConversation,
} from '../lib/chatService';

const ChatContext = createContext(null);

/* ── Web Audio API Chime Sound Generator ── */
function playNotificationSound() {
  try {
    const AudioContext =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.1, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.2);
  } catch {
    // Ignorar errores de audio
  }
}

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const chatUserId = firebaseAuth?.currentUser?.uid || user?.id;

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [directConversation, setDirectConversation] = useState(null);
  const [activeToast, setActiveToast] = useState(null);

  // Reparar citas confirmadas antiguas que guardaron el id local del
  // propietario antes de que su sesión de Firebase estuviera disponible.
  useEffect(() => {
    const firebaseUid = firebaseAuth?.currentUser?.uid;
    if (!firebaseUid || !user) return;

    try {
      const visits = JSON.parse(localStorage.getItem('ruwajay_visits') || '[]');
      if (!Array.isArray(visits)) return;
      const userName = String(user.name || '').trim().toLowerCase();

      visits
        .filter((visit) => visit.status === 'confirmada' || visit.status === 'aceptada')
        .filter((visit) => (
          visit.ownerId === user.id ||
          visit.ownerId === firebaseUid ||
          (userName && String(visit.ownerName || '').trim().toLowerCase() === userName)
        ))
        .forEach((visit) => {
          getOrCreateConversation(
            visit.tenantId,
            firebaseUid,
            visit.propertyId,
            visit.propertyTitle || 'Vivienda',
            { ...visit, ownerId: firebaseUid }
          ).catch((error) => console.warn('No se pudo reparar la conversación confirmada:', error));
        });
    } catch (error) {
      console.warn('No se pudieron revisar las citas confirmadas:', error);
    }
  }, [user, chatUserId]);

  // Escuchar las conversaciones del usuario
  useEffect(() => {
    if (!chatUserId) {
      setConversations([]);
      return;
    }

    return subscribeToConversations(
      chatUserId,
      (items) => {
        const emailRoomProperties = new Set(
          items.filter((item) => String(item?.id || '').startsWith('email_')).map((item) => item.propertyId)
        );
        const visibleItems = items.filter((item) => (
          String(item?.id || '').startsWith('email_') || !emailRoomProperties.has(item.propertyId)
        ));
        setConversations(visibleItems.map((conversation) => {
        const isOwner = conversation.ownerId === chatUserId || (
          conversation.ownerEmail && user?.email &&
          String(conversation.ownerEmail).toLowerCase() === String(user.email).toLowerCase()
        );
        return {
          ...conversation,
          participantId: isOwner ? conversation.seekerId : conversation.ownerId,
          participantName: String(isOwner
            ? (conversation.seekerName || 'Interesado')
            : (conversation.ownerName || 'Propietario')),
          participantPhone: isOwner ? conversation.seekerPhone : conversation.ownerPhone,
          participantAvatar: isOwner ? conversation.seekerPhoto : conversation.ownerPhoto,
          participantRole: isOwner ? 'Interesado' : 'Propietario',
          currentUserRole: isOwner ? 'Propietario' : 'Interesado',
          participantOnline: true,
          unreadCount: conversation.lastSenderId && conversation.lastSenderId !== chatUserId ? 1 : 0,
        };
        }));
      }
    );
  }, [chatUserId, user?.email]);

  const decorateConversation = useCallback((conversation) => {
    if (!conversation) return null;
    const isOwner = conversation.ownerId === chatUserId || (
      conversation.ownerEmail && user?.email &&
      String(conversation.ownerEmail).toLowerCase() === String(user.email).toLowerCase()
    );
    return {
      ...conversation,
      participantId: isOwner ? conversation.seekerId : conversation.ownerId,
      participantName: String(isOwner
        ? (conversation.seekerName || 'Interesado')
        : (conversation.ownerName || 'Propietario')),
      participantPhone: isOwner ? conversation.seekerPhone : conversation.ownerPhone,
      participantAvatar: isOwner ? conversation.seekerPhoto : conversation.ownerPhoto,
      participantRole: isOwner ? 'Interesado' : 'Propietario',
      currentUserRole: isOwner ? 'Propietario' : 'Interesado',
      participantOnline: true,
      unreadCount: conversation.lastSenderId && conversation.lastSenderId !== chatUserId ? 1 : 0,
    };
  }, [chatUserId, user?.email]);

  useEffect(() => {
    if (!activeConversationId || !chatUserId) {
      setDirectConversation(null);
      return undefined;
    }
    return subscribeToConversation(activeConversationId, chatUserId, (conversation) => {
      setDirectConversation(decorateConversation(conversation));
    });
  }, [activeConversationId, chatUserId, decorateConversation]);

  // Escuchar los mensajes de la conversación activa
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    return subscribeToMessages(
      activeConversationId,
      (newMessages) => {
        setMessages(newMessages);

        // Reproducir sonido si el último mensaje
        // pertenece a otra persona
        const last =
          newMessages[newMessages.length - 1];

        if (last && last.senderId !== chatUserId) {
          playNotificationSound();
        }
      }
    );
  }, [activeConversationId, chatUserId]);

  // Obtener conversación activa
  const activeConversation = useMemo(() => {
    return (
      conversations.find(
        (conversation) =>
          conversation.id === activeConversationId
      ) || directConversation || null
    );
  }, [conversations, activeConversationId, directConversation]);

  const activeConversationWithMessages = useMemo(() => (
    activeConversation ? { ...activeConversation, messages } : null
  ), [activeConversation, messages]);

  // Crear o abrir conversación desde una propiedad
  const startConversationWithProperty = useCallback(
    async (propertyId) => {
      if (!user) return null;

      const existing = conversations.find((conversation) => conversation.propertyId === propertyId);
      if (existing) {
        setActiveConversationId(existing.id);
        return existing.id;
      }

      let confirmedVisit = null;
      try {
        const parsedVisits = JSON.parse(localStorage.getItem('ruwajay_visits') || '[]');
        const visits = Array.isArray(parsedVisits) ? parsedVisits : [];
        const userPhone = String(user.phone || '').replace(/\D/g, '');
        const fbUid = firebaseAuth?.currentUser?.uid;

        confirmedVisit = visits.find((visit) => {
          if (visit.propertyId !== propertyId) return false;
          if (visit.status !== 'confirmada' && visit.status !== 'aceptada') return false;

          if (visit.tenantId === user.id || visit.ownerId === user.id) return true;
          if (fbUid && (visit.tenantId === fbUid || visit.ownerId === fbUid)) return true;
          if (userPhone) {
            const cleanOwnerPhone = String(visit.ownerPhone || '').replace(/\D/g, '');
            const cleanTenantPhone = String(visit.tenantPhone || '').replace(/\D/g, '');
            if ((cleanOwnerPhone && cleanOwnerPhone === userPhone) || (cleanTenantPhone && cleanTenantPhone === userPhone)) {
              return true;
            }
          }
          return false;
        });
      } catch { /* no confirmed local visit */ }

      if (!confirmedVisit) return;

      const roomId = await getOrCreateConversation(
        confirmedVisit.tenantId,
        confirmedVisit.ownerId,
        confirmedVisit.propertyId,
        confirmedVisit.propertyTitle
      );

      setActiveConversationId(roomId);
      return roomId;
    },
    [user, conversations]
  );

  const markAsRead = useCallback(() => {}, []);
  const resetDemoChats = useCallback(() => {
    localStorage.removeItem('ruwajay_local_conversations');
    localStorage.removeItem('ruwajay_local_messages');
    setActiveConversationId(null);
  }, []);
  const typingMap = useMemo(() => ({}), []);

  // Enviar mensaje a Firestore
  const sendMessage = useCallback(
    async (
      convId,
      text,
      image = null,
      isVoice = false
    ) => {
      if (
        !user ||
        (!text?.trim() && !image && !isVoice)
      ) {
        return;
      }

      const extras = {};

      if (image) {
        extras.image = image;
      }

      if (isVoice) {
        extras.isVoice = true;
      }

      await sendMessageToFirestore(
        convId,
        chatUserId,
        user.name || 'Usuario',
        text?.trim() ||
          (image ? '📷 Foto' : '🎤 Audio'),
        extras
      );
    },
    [user, chatUserId]
  );

  // Contador de conversaciones no leídas
  const totalUnreadCount = useMemo(() => {
    return conversations.filter(
      (conversation) =>
        conversation.lastSenderId !== chatUserId
    ).length;
  }, [conversations, chatUserId]);

  // Cerrar notificación flotante
  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  const value = {
    conversations,
    activeConversation: activeConversationWithMessages,
    activeConversationId,
    setActiveConversationId,
    messages,
    sendMessage,
    startConversationWithProperty,
    markAsRead,
    resetDemoChats,
    typingMap,
    totalUnreadCount,
    activeToast,
    dismissToast,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error(
      'useChat debe usarse dentro de ChatProvider'
    );
  }

  return context;
}
