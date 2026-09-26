import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { demoProperties, demoOwners, formatPrice } from '../data/properties';
import { useAuth } from './AuthContext';
import { sanitizeText } from '../utils/security';

const ChatContext = createContext(null);

const STORAGE_KEY = 'ruwajay_chat_conversations';
const BROADCAST_CHANNEL_NAME = 'ruwajay_live_chat';

/* ── Web Audio API Chime Sound Generator (No external audio file needed) ── */
function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Create a pleasant 2-tone melodic notification (E5 -> B5)
    const now = ctx.currentTime;
    
    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Tone 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.08); // B5
    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.22, now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.42);
  } catch {
    // AudioContext blocked or not supported
  }
}

/* ── Helper to determine if a message belongs to the current user ── */
function isUserMsg(msg, currentUserId) {
  if (!msg) return false;
  if (typeof msg.isUser === 'boolean') return msg.isUser;
  if (msg.senderId === 'user' || msg.senderId === 'user-demo' || msg.senderName === 'Tú') return true;
  if (currentUserId && String(msg.senderId) === String(currentUserId)) return true;
  return false;
}

/* ── Generate Initial Default Conversations based on properties & owners ── */
function getInitialConversations() {
  return [
    {
      id: 'conv-prop-1',
      propertyId: 'prop-1',
      ownerId: 'owner-1',
      participantName: 'María Elena López',
      participantAvatar: null,
      participantOnline: true,
      participantPhone: '+502 5482 9104',
      participantRole: 'Arrendante Verificada',
      unreadCount: 1,
      lastMessage: '¡Hola! Con gusto te muestro la casa en Zona 10. ¿Qué día te queda mejor?',
      lastMessageTimestamp: '10:32 a.m.',
      messages: [
        {
          id: 'msg-1',
          senderId: 'user-demo',
          isUser: true,
          senderName: 'Tú',
          text: '¡Hola María Elena! Me interesa la casa amplia con jardín en Zona 10. ¿Aún sigue disponible?',
          timestamp: '10:30 a.m.',
          status: 'read',
        },
        {
          id: 'msg-2',
          senderId: 'owner-1',
          isUser: false,
          senderName: 'María Elena López',
          text: '¡Hola! Con gusto te muestro la casa en Zona 10. ¿Qué día te queda mejor?',
          timestamp: '10:32 a.m.',
          status: 'delivered',
        },
      ],
    },
    {
      id: 'conv-prop-2',
      propertyId: 'prop-2',
      ownerId: 'owner-2',
      participantName: 'Carlos Hernández',
      participantAvatar: null,
      participantOnline: true,
      participantPhone: '+502 4192 8301',
      participantRole: 'Propietario en Zona 14',
      unreadCount: 0,
      lastMessage: 'El edificio cuenta con garita 24/7 y la mensualidad ya incluye la cuota de mantenimiento.',
      lastMessageTimestamp: 'Ayer',
      messages: [
        {
          id: 'msg-p2-1',
          senderId: 'user-demo',
          isUser: true,
          senderName: 'Tú',
          text: 'Buenas tardes Carlos, ¿el apartamento en Zona 14 incluye parqueo y mantenimiento?',
          timestamp: 'Ayer 4:15 p.m.',
          status: 'read',
        },
        {
          id: 'msg-p2-2',
          senderId: 'owner-2',
          isUser: false,
          senderName: 'Carlos Hernández',
          text: 'El edificio cuenta con garita 24/7 y la mensualidad ya incluye la cuota de mantenimiento.',
          timestamp: 'Ayer 4:20 p.m.',
          status: 'read',
        },
      ],
    },
    {
      id: 'conv-prop-3',
      propertyId: 'prop-3',
      ownerId: 'owner-3',
      participantName: 'Ana Patricia Mejía',
      participantAvatar: null,
      participantOnline: false,
      participantPhone: '+502 5901 4478',
      participantRole: 'Arrendante en Antigua',
      unreadCount: 0,
      lastMessage: 'La casa colonial en Antigua está lista para habitar inmediatamente.',
      lastMessageTimestamp: '14 de Sep',
      messages: [
        {
          id: 'msg-p3-1',
          senderId: 'user-demo',
          isUser: true,
          senderName: 'Tú',
          text: 'Hola doña Ana, ¿la casa colonial en Antigua tiene patio con fuente?',
          timestamp: '14 de Sep 11:00 a.m.',
          status: 'read',
        },
        {
          id: 'msg-p3-2',
          senderId: 'owner-3',
          isUser: false,
          senderName: 'Ana Patricia Mejía',
          text: 'La casa colonial en Antigua está lista para habitar inmediatamente.',
          timestamp: '14 de Sep 11:15 a.m.',
          status: 'read',
        },
      ],
    },
  ];
}

/* ── Contextual Reply Engine (Simulates Authentic Real Landlord Responses) ── */
function generateRealisticReply(userMessage, property, owner) {
  const query = userMessage.toLowerCase().trim();
  const propTitle = property?.title || 'la propiedad';
  const price = property?.price ? formatPrice(property.price) : 'el precio acordado';
  const deposit = property?.deposit ? formatPrice(property.deposit) : price;
  const address = property?.address?.approximate || property?.address?.exact || 'la zona';
  const isPetsAllowed = Boolean(property?.petsAllowed);
  const parkingCount = property?.parking || 1;
  const services = property?.servicesIncluded?.join(', ') || 'Agua constante y seguridad';

  // 1. Preguntas sobre Precio, Renta, Depósito y Gastos
  if (query.includes('precio') || query.includes('cuanto') || query.includes('cuánto') || query.includes('renta') || query.includes('mensual') || query.includes('deposito') || query.includes('depósito')) {
    const replies = [
      `¡Hola! La renta mensual de ${propTitle} es de ${price} mensuales. Solicitamos el equivalente a un mes de depósito (${deposit}) en garantía reembolsable.`,
      `Buenas tardes. El precio es de ${price} fijos por mes. El depósito de garantía es de ${deposit}, el cual se reintegra al finalizar el contrato sin inconvenientes.`,
      `Con gusto te confirmo: la mensualidad es de ${price}. Si gustas podemos coordinar una visita para que conozcas los ambientes en persona antes de formalizar.`,
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // 2. Preguntas sobre Visitas, Citas o Ver la Propiedad
  if (query.includes('visita') || query.includes('ver') || query.includes('conocer') || query.includes('cita') || query.includes('cuando puedo') || query.includes('cuándo puedo') || query.includes('horario')) {
    const days = ['mañana por la tarde (a eso de las 3:30 PM)', 'este jueves entre 2:00 PM y 5:00 PM', 'este sábado por la mañana (10:00 AM)'];
    const selectedDay = days[Math.floor(Math.random() * days.length)];
    return `¡Claro que sí, con mucho gusto! Te puedo recibir ${selectedDay}. ¿Ese horario te queda bien o prefieres que busquemos otro momento?`;
  }

  // 3. Preguntas sobre Requisitos, DPI, Contrato o Papelería en Guatemala
  if (query.includes('requisito') || query.includes('papeleria') || query.includes('papelería') || query.includes('dpi') || query.includes('fiador') || query.includes('contrato')) {
    return `Para el contrato solicitamos: 1) Fotocopia de DPI de ambos lados, 2) Constancia de ingresos o estados de cuenta de los últimos 3 meses, y 3) Un fiador solidario con su respectivo DPI. El contrato lo podemos formalizar aquí mismo en RuwaJay.`;
  }

  // 4. Preguntas sobre Mascotas
  if (query.includes('mascota') || query.includes('perro') || query.includes('gato') || query.includes('animal')) {
    if (isPetsAllowed) {
      return `¡Sí, con gusto! En esta vivienda sí permitimos mascotas educadas (perros pequeños o gatos). Solamente pedimos que se mantenga el cuidado del inmueble y las áreas compartidas.`;
    } else {
      return `Fíjate que por reglamento interno del condominio / edificio lamentablemente no se permiten mascotas. Cualquier otra duda con el mayor de los gustos.`;
    }
  }

  // 5. Preguntas sobre Parqueo / Garaje / Vehículos
  if (query.includes('parqueo') || query.includes('carro') || query.includes('vehiculo') || query.includes('vehículo') || query.includes('garage') || query.includes('garaje') || query.includes('estacionamiento')) {
    return `La propiedad cuenta con ${parkingCount} espacio(s) de parqueo seguro y techado. Además, hay opciones para parquear visitas coordinando con la garita.`;
  }

  // 6. Preguntas sobre Servicios, Agua, Cisterna, Seguridad y Garita
  if (query.includes('agua') || query.includes('seguridad') || query.includes('garita') || query.includes('cisterna') || query.includes('servicio') || query.includes('mantenimiento') || query.includes('luz')) {
    return `La vivienda cuenta con ${services}. El suministro de agua está garantizado y el sector cuenta con vigilancia activa 24 horas al día.`;
  }

  // 7. Preguntas sobre Ubicación, Zona y Dirección
  if (query.includes('ubicacion') || query.includes('ubicación') || query.includes('donde') || query.includes('dónde') || query.includes('direccion') || query.includes('dirección') || query.includes('zona') || query.includes('sector')) {
    return `Está muy bien ubicada en ${address}, con accesos rápidos a vías principales, supermercados y transporte. Al momento de confirmar la visita te comparto la ubicación exacta por GPS.`;
  }

  // 8. Saludos iniciales
  if (query.includes('hola') || query.includes('buenos') || query.includes('buenas') || query.includes('que tal') || query.includes('qué tal')) {
    return `¡Hola! Muy buenas, gracias por escribir. Estoy a la orden por si deseas más información de ${propTitle} o si te gustaría agendar para ir a verla.`;
  }

  // 9. Despedidas o Agradecimientos
  if (query.includes('gracias') || query.includes('perfecto') || query.includes('excelente') || query.includes('de acuerdo') || query.includes('ok') || query.includes('adios') || query.includes('adiós')) {
    return `¡A ti las gracias! Quedo completamente a tus órdenes. Cualquier duda adicional me avisas por este mismo medio. ¡Feliz día!`;
  }

  // 10. Respuesta conversacional genérica guatemalteca
  const genericReplies = [
    `Con mucho gusto. Fíjate que ${propTitle} está en óptimas condiciones. ¿Te gustaría coordinar una visita para verla en vivo?`,
    `A la orden. Si necesitas más detalles de la vivienda o quieres pasar a verla con tu familia, me avisas y con gusto nos ponemos de acuerdo en el horario.`,
    `Enterado. Tenemos disponibilidad inmediata para mostrar el lugar. ¿Qué día de la semana te quedaría más cómodo?`,
  ];
  return genericReplies[Math.floor(Math.random() * genericReplies.length)];
}

export function ChatProvider({ children }) {
  const { user } = useAuth();

  // Load conversations from localStorage or initialize defaults
  const [conversations, setConversations] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return getInitialConversations();
  });

  const [activeConversationId, setActiveConversationId] = useState(conversations[0]?.id || 'conv-prop-1');
  const [typingMap, setTypingMap] = useState({}); // { [convId]: boolean }
  const [activeToast, setActiveToast] = useState(null); // { id, senderName, text, propertyTitle, avatar, convId }

  // Save to localStorage whenever conversations change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch { /* ignore */ }
  }, [conversations]);

  // Sync across tabs via BroadcastChannel & window storage events
  useEffect(() => {
    let channel = null;
    try {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data?.type === 'CONVERSATIONS_UPDATE') {
          setConversations(event.data.conversations);
        }
      };
    } catch { /* BroadcastChannel fallback */ }

    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setConversations(JSON.parse(e.newValue));
        } catch { /* ignore */ }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      if (channel) channel.close();
    };
  }, []);

  // Request browser Notification permission politely on first interaction
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch { /* ignore */ }
    }
  }, []);

  // Total unread count for badge
  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [conversations]);

  // Active conversation object
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || conversations[0] || null;
  }, [conversations, activeConversationId]);

  // Mark conversation messages as read
  const markAsRead = useCallback((convId) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === convId) {
          const updatedMessages = c.messages.map((m) => ({ ...m, status: 'read' }));
          return { ...c, unreadCount: 0, messages: updatedMessages };
        }
        return c;
      })
    );
  }, []);

  // Start or open a conversation for a specific property
  const startConversationWithProperty = useCallback((propertyId) => {
    const prop = demoProperties.find((p) => p.id === propertyId) || demoProperties[0];
    const owner = demoOwners.find((o) => o.id === prop.ownerId) || demoOwners[0];

    setConversations((prev) => {
      const existing = prev.find((c) => c.propertyId === propertyId);
      if (existing) {
        setActiveConversationId(existing.id);
        return prev;
      }

      // Create new conversation
      const newConv = {
        id: `conv-${prop.id}`,
        propertyId: prop.id,
        ownerId: owner.id,
        participantName: owner.name,
        participantAvatar: null,
        participantOnline: true,
        participantPhone: owner.phone,
        participantRole: 'Arrendante',
        unreadCount: 0,
        lastMessage: `Consulta sobre ${prop.title}`,
        lastMessageTimestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        messages: [
          {
            id: `msg-init-${Date.now()}`,
            senderId: 'owner',
            senderName: owner.name,
            text: `¡Hola! Soy ${owner.name}, propietario(a) de "${prop.title}". ¿En qué te puedo asesorar hoy?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'read',
          },
        ],
      };

      setActiveConversationId(newConv.id);
      return [newConv, ...prev];
    });
  }, []);

  // Send a message and trigger realistic live reply
  const sendMessage = useCallback((convId, text, image = null, isVoice = false) => {
    if (!text?.trim() && !image && !isVoice) return;

    requestNotificationPermission();

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const rawText = text?.trim();
    const cleanText = rawText ? sanitizeText(rawText) : (isVoice ? '🎤 Mensaje de voz (0:08)' : '📷 Foto enviada');
    const safeImage = (typeof image === 'string' && (image.startsWith('data:image/') || image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/'))) ? image : null;

    const userMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      senderId: 'user',
      isUser: true,
      senderName: sanitizeText(user?.name) || 'Tú',
      text: cleanText,
      image: safeImage,
      isVoice: Boolean(isVoice),
      timestamp,
      status: 'sent',
    };

    setConversations((prev) => {
      const updated = prev.map((c) => {
        if (c.id === convId) {
          return {
            ...c,
            lastMessage: userMessage.text,
            lastMessageTimestamp: timestamp,
            messages: [...c.messages, userMessage],
          };
        }
        return c;
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch { /* ignore */ }
      return updated;
    });

    // Schedule realistic owner typing and reply
    setTypingMap((prev) => ({ ...prev, [convId]: true }));

    const delay = Math.floor(Math.random() * 1000) + 1500; // 1.5s to 2.5s

    setTimeout(() => {
      setTypingMap((prev) => ({ ...prev, [convId]: false }));

      setConversations((prev) => {
        const currentConv = prev.find((c) => c.id === convId);
        if (!currentConv) return prev;

        const prop = demoProperties.find((p) => p.id === currentConv.propertyId) || demoProperties[0];
        const owner = demoOwners.find((o) => o.id === currentConv.ownerId) || demoOwners[0];

        const replyText = generateRealisticReply(cleanText, prop, owner);
        const replyTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const replyMessage = {
          id: `msg-reply-${Date.now()}`,
          senderId: owner.id,
          isUser: false,
          senderName: owner.name,
          text: replyText,
          timestamp: replyTimestamp,
          status: 'delivered',
        };

        const isCurrentlyActive = activeConversationId === convId;

        const updated = prev.map((c) => {
          if (c.id === convId) {
            return {
              ...c,
              lastMessage: replyText,
              lastMessageTimestamp: replyTimestamp,
              unreadCount: isCurrentlyActive ? 0 : (c.unreadCount || 0) + 1,
              messages: [...c.messages, replyMessage],
            };
          }
          return c;
        });

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch { /* ignore */ }

        // 1. Play native Web Audio API sound notification
        playNotificationSound();

        // 2. Trigger In-App Floating Toast Notification (even on other pages)
        setActiveToast({
          id: Date.now(),
          senderName: owner.name,
          text: replyText,
          propertyTitle: prop.title,
          propertyThumbnail: prop.thumbnail,
          convId,
        });

        // Auto dismiss toast after 5.5s
        setTimeout(() => {
          setActiveToast((current) => (current?.convId === convId ? null : current));
        }, 5500);

        // 3. Trigger Browser Notification API (if tab is hidden or user gave permission)
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
          try {
            new Notification(`${owner.name} (RuwaJay)`, {
              body: replyText,
              icon: prop.thumbnail || '/favicon.ico',
            });
          } catch { /* ignore */ }
        }

        return updated;
      });
    }, delay);
  }, [user, activeConversationId, requestNotificationPermission]);

  const resetDemoChats = useCallback(() => {
    const initial = getInitialConversations();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    } catch { /* ignore */ }
    setConversations(initial);
    setActiveConversationId('conv-prop-1');
  }, []);

  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  const value = {
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    markAsRead,
    startConversationWithProperty,
    totalUnreadCount,
    typingMap,
    activeToast,
    dismissToast,
    resetDemoChats,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

const fallbackContextValue = {
  conversations: getInitialConversations(),
  activeConversation: getInitialConversations()[0],
  activeConversationId: 'conv-prop-1',
  setActiveConversationId: () => {},
  sendMessage: () => {},
  markAsRead: () => {},
  startConversationWithProperty: () => {},
  totalUnreadCount: 1,
  typingMap: {},
  activeToast: null,
  dismissToast: () => {},
};

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    return fallbackContextValue;
  }
  return context;
}
