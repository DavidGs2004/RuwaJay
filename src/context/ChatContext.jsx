import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

import { demoProperties } from '../data/properties';
import { useAuth } from './AuthContext';

import {
  subscribeToMessages,
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

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeToast, setActiveToast] = useState(null);

  // Escuchar las conversaciones del usuario
  useEffect(() => {
    if (!user?.id) {
      setConversations([]);
      return;
    }

    return subscribeToConversations(
      user.id,
      setConversations
    );
  }, [user?.id]);

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

        if (last && last.senderId !== user?.id) {
          playNotificationSound();
        }
      }
    );
  }, [activeConversationId, user?.id]);

  // Obtener conversación activa
  const activeConversation = useMemo(() => {
    return (
      conversations.find(
        (conversation) =>
          conversation.id === activeConversationId
      ) || null
    );
  }, [conversations, activeConversationId]);

  // Crear o abrir conversación desde una propiedad
  const startConversationWithProperty = useCallback(
    async (propertyId) => {
      if (!user) return;

      const prop = demoProperties.find(
        (property) => property.id === propertyId
      );

      if (!prop) return;

      const roomId = await getOrCreateConversation(
        user.id,
        prop.ownerId,
        prop.id,
        prop.title
      );

      setActiveConversationId(roomId);
    },
    [user]
  );

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
        user.id,
        user.name || 'Usuario',
        text?.trim() ||
          (image ? '📷 Foto' : '🎤 Audio'),
        extras
      );
    },
    [user]
  );

  // Contador de conversaciones no leídas
  const totalUnreadCount = useMemo(() => {
    return conversations.filter(
      (conversation) =>
        conversation.lastSenderId !== user?.id
    ).length;
  }, [conversations, user?.id]);

  // Cerrar notificación flotante
  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  const value = {
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    messages,
    sendMessage,
    startConversationWithProperty,
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