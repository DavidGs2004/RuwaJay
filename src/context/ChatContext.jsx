import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { demoProperties } from '../data/properties';
import { useAuth } from './AuthContext';
import {
  subscribeToMessages,
  subscribeToConversations,
  sendMessageToFirestore,
  getOrCreateConversation
} from '../lib/chatService';

const ChatContext = createContext(null);

/* ── Web Audio API Chime Sound Generator ── */
function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
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
  } catch { }
}

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeToast, setActiveToast] = useState(null);

  // Subscribe to user's conversations
  useEffect(() => {
    if (!user?.id) {
      setConversations([]);
      return;
    }
    return subscribeToConversations(user.id, setConversations);
  }, [user?.id]);

  // Subscribe to active conversation messages
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    return subscribeToMessages(activeConversationId, (newMessages) => {
      setMessages(newMessages);
      // Play sound if last message is not from user
      const last = newMessages[newMessages.length - 1];
      if (last && last.senderId !== user?.id) {
        playNotificationSound();
      }
    });
  }, [activeConversationId, user?.id]);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  const startConversationWithProperty = useCallback(async (propertyId) => {
    if (!user) return;
    const prop = demoProperties.find((p) => p.id === propertyId);
    if (!prop) return;

    const roomId = await getOrCreateConversation(user.id, prop.ownerId, prop.id, prop.title);
    setActiveConversationId(roomId);
  }, [user]);

  const sendMessage = useCallback(async (convId, text, image = null, isVoice = false) => {
    if (!user || (!text?.trim() && !image && !isVoice)) return;

    const extras = {};
    if (image) extras.image = image;
    if (isVoice) extras.isVoice = true;

    await sendMessageToFirestore(
      convId,
      user.id,
      user.name || 'Usuario',
      text?.trim() || (image ? '📷 Foto' : '🎤 Audio'),
      extras
    );
  }, [user]);

  const totalUnreadCount = useMemo(() => {
    return conversations.filter(c => c.lastSenderId !== user?.id).length;
  }, [conversations, user?.id]);

  const dismissToast = useCallback(() => setActiveToast(null), []);

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

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat debe usarse dentro de ChatProvider');
  return context;
}
