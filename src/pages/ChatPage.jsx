import PrivateMedia from '../components/chat/PrivateMedia';
import MediaSendPreviewModal from '../components/chat/MediaSendPreviewModal';
import MediaViewerModal from '../components/chat/MediaViewerModal';
import FullEmojiPickerModal from '../components/chat/FullEmojiPickerModal';
import ChatWallpaperModal, { WALLPAPER_PRESETS } from '../components/chat/ChatWallpaperModal';
import { fetchPropertyById } from '../lib/propertyService';
import { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Send, Image as ImageIcon, MapPin, Calendar, CheckCheck,
  ArrowLeft, Search, User, Clock, Phone, Video, MoreVertical,
  ShieldAlert, Mic, Smile, Paperclip, X, Check, Eye, ChevronRight,
  RotateCcw, Home, Lock, Trash2, Pencil, Ban, Square, Play, Pause,
  Reply, Palette, Plus
} from 'lucide-react';
import { demoProperties, demoOwners, formatPrice } from '../data/properties';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useCall } from '../context/CallContext';
import { firebaseAuth } from '../lib/firebase';

function isUserMsg(message, currentUserId) {
  return Boolean(message && currentUserId && message.senderId === currentUserId);
}

function formatConversationTime(value) {
  if (!value) return '';
  let date = null;
  if (typeof value?.toDate === 'function') date = value.toDate();
  else if (typeof value?.seconds === 'number') date = new Date(value.seconds * 1000);
  else if (value instanceof Date) date = value;
  else if (typeof value === 'string' || typeof value === 'number') date = new Date(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function formatChatDateHeader(messages) {
  if (!messages || messages.length === 0) return 'Hoy';
  const lastMsg = messages[messages.length - 1];
  const rawTime = lastMsg.createdAt || lastMsg.timestamp;
  let date = null;
  if (typeof rawTime?.toDate === 'function') date = rawTime.toDate();
  else if (typeof rawTime?.seconds === 'number') date = new Date(rawTime.seconds * 1000);
  else if (rawTime instanceof Date) date = rawTime;
  else if (typeof rawTime === 'string' || typeof rawTime === 'number') {
    const parsed = new Date(rawTime);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }
  if (!date) return 'Hoy';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (msgDay === today) return 'Hoy';
  if (msgDay === yesterday) return 'Ayer';
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function ChatAvatar({ src, name, size = 'md', fallbackBg = 'light', className = '' }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const isValidSrc = typeof src === 'string' && src.trim().length > 0 && !hasError;
  const initial = (name && typeof name === 'string' && name.trim()) ? name.trim().charAt(0).toUpperCase() : 'U';

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs rounded-xl',
    md: 'h-11 w-11 text-sm rounded-2xl',
    lg: 'h-10 w-10 text-sm rounded-2xl',
  }[size] || 'h-11 w-11 text-sm rounded-2xl';

  const fallbackClasses = fallbackBg === 'solid'
    ? 'bg-forest text-white'
    : 'bg-forest/10 text-forest';

  return (
    <div className={`relative shrink-0 ${sizeClasses} overflow-hidden border border-border shadow-2xs bg-[#FAF5EE] ${className}`}>
      {isValidSrc ? (
        <img
          src={src.trim()}
          alt={name || ''}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className={`flex h-full w-full items-center justify-center font-black ${fallbackClasses}`}>
          {initial}
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startCall } = useCall();
  const currentUserPhoto = user?.avatarImage || user?.photoURL || user?.avatar || firebaseAuth?.currentUser?.photoURL || null;
  const {
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    clearChat,
    markAsRead,
    startConversationWithProperty,
    totalUnreadCount,
    typingMap,
    resetDemoChats, chatError,
    dismissToast,
  } = useChat();

  const [inputText, setInputText] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread'
  const [mobileView, setMobileView] = useState('chat'); // 'list' | 'chat'
  const [selectedImage, setSelectedImage] = useState(null);
  const [pendingSendMedia, setPendingSendMedia] = useState(null);
  const [viewingMedia, setViewingMedia] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [confirmClearChat, setConfirmClearChat] = useState(false);
  const [activeReactionPicker, setActiveReactionPicker] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // New features state
  const [replyingTo, setReplyingTo] = useState(null); // { id, senderName, text, type }
  const [fullEmojiPickerMsgId, setFullEmojiPickerMsgId] = useState(null);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [wallpaperConfig, setWallpaperConfig] = useState({ preset: 'default', image: null });

  // Voice recording & review states (WhatsApp style)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioReview, setAudioReview] = useState(null); // { blob, url, duration }
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioReviewRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const recorderRef = useRef(null);
  const recordingStream = useRef(null);

  // Swipe gesture touch tracking
  const msgTouchStartX = useRef({});

  // Messages feed ref
  const messagesFeedRef = useRef(null);
  const fileInputRef = useRef(null);
  const initialScrollDoneRef = useRef({});
  const prevMsgCountRef = useRef({});

  // Load custom wallpaper from localStorage (100% private to this user)
  useEffect(() => {
    if (!activeConversationId) return;
    try {
      const specific = localStorage.getItem(`ruwajay_chat_wallpaper_${activeConversationId}`);
      if (specific) {
        setWallpaperConfig(JSON.parse(specific));
        return;
      }
      const globalWp = localStorage.getItem('ruwajay_chat_wallpaper_global');
      if (globalWp) {
        setWallpaperConfig(JSON.parse(globalWp));
        return;
      }
    } catch (e) {
      console.warn('Error reading chat wallpaper:', e);
    }
    setWallpaperConfig({ preset: 'default', image: null });
  }, [activeConversationId]);

  const handleApplyWallpaper = (config) => {
    setWallpaperConfig(config);
    try {
      if (config.applyGlobally) {
        localStorage.setItem('ruwajay_chat_wallpaper_global', JSON.stringify(config));
        if (activeConversationId) {
          localStorage.removeItem(`ruwajay_chat_wallpaper_${activeConversationId}`);
        }
      } else if (activeConversationId) {
        localStorage.setItem(`ruwajay_chat_wallpaper_${activeConversationId}`, JSON.stringify(config));
      }
    } catch (e) {
      console.warn('Error saving chat wallpaper:', e);
    }
  };

  // If a property is passed via URL (?property=prop-1), switch or start chat with it
  const urlPropertyId = searchParams.get('property');
  const urlConversationId = searchParams.get('conversation');
  const [chatBlocked, setChatBlocked] = useState(false);
  const [visitRevision, setVisitRevision] = useState(0);

  useEffect(() => {
    const refreshVisitAccess = () => setVisitRevision((revision) => revision + 1);
    window.addEventListener('storage', refreshVisitAccess);
    window.addEventListener('ruwajay:visits-changed', refreshVisitAccess);
    window.addEventListener('ruwajay:visits_changed', refreshVisitAccess);
    window.addEventListener('ruwajay:chat-changed', refreshVisitAccess);
    window.addEventListener('ruwajay:chat_changed', refreshVisitAccess);
    return () => {
      window.removeEventListener('storage', refreshVisitAccess);
      window.removeEventListener('ruwajay:visits-changed', refreshVisitAccess);
      window.removeEventListener('ruwajay:visits_changed', refreshVisitAccess);
      window.removeEventListener('ruwajay:chat-changed', refreshVisitAccess);
      window.removeEventListener('ruwajay:chat_changed', refreshVisitAccess);
    };
  }, []);

  useEffect(() => {
    if (!urlConversationId) return;
    setChatBlocked(false);
    setActiveConversationId(urlConversationId);
    setMobileView('chat');
  }, [urlConversationId, setActiveConversationId]);

  useEffect(() => {
    if (urlConversationId) return;
    if (!urlPropertyId || !user?.id) return;

    let mounted = true;
    startConversationWithProperty(urlPropertyId).then(() => {
      if (mounted) { setChatBlocked(false); setMobileView('chat'); }
    }).catch(() => { if (mounted) setChatBlocked(true); });
    return () => { mounted = false; };
  }, [urlConversationId, urlPropertyId, user?.id, startConversationWithProperty]);

  // Auto-select first contact if none is selected
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0 && !urlConversationId && !urlPropertyId) {
      setActiveConversationId(conversations[0].id);
    }
  }, [activeConversationId, conversations, urlConversationId, urlPropertyId, setActiveConversationId]);

  // Mark active conversation as read
  useEffect(() => {
    if (activeConversationId) {
      markAsRead(activeConversationId);
    }
  }, [activeConversationId, markAsRead]);

  // Posicionar directamente en el último mensaje sin animación de transición al entrar a un chat
  useLayoutEffect(() => {
    const feed = messagesFeedRef.current;
    if (!feed || !activeConversationId) return;

    const messages = activeConversation?.messages;
    const count = messages?.length || 0;

    if (!initialScrollDoneRef.current[activeConversationId]) {
      if (count > 0) {
        feed.scrollTop = feed.scrollHeight;
        initialScrollDoneRef.current[activeConversationId] = true;
        prevMsgCountRef.current[activeConversationId] = count;
      }
    } else {
      const prevCount = prevMsgCountRef.current[activeConversationId] || 0;
      if (count > prevCount) {
        prevMsgCountRef.current[activeConversationId] = count;
        const lastMsg = messages[count - 1];
        const isMyMsg = isUserMsg(lastMsg, user?.id);
        const isNearBottom = feed.scrollHeight - feed.scrollTop <= feed.clientHeight + 300;

        if (isNearBottom || isMyMsg) {
          feed.scrollTop = feed.scrollHeight;
        }
      }
    }
  }, [activeConversationId, activeConversation?.messages, user?.id]);

  useEffect(() => {
    const feed = messagesFeedRef.current;
    if (!feed || !activeConversationId) return;

    if (initialScrollDoneRef.current[activeConversationId]) {
      const isNearBottom = feed.scrollHeight - feed.scrollTop <= feed.clientHeight + 200;
      if (isNearBottom) {
        feed.scrollTop = feed.scrollHeight;
      }
    }
  }, [activeConversation?.messages, typingMap, activeConversationId]);

  // Current Property & Owner details for active chat
  const [activeProperty, setActiveProperty] = useState(null);
  useEffect(() => {
    let active = true; setActiveProperty(null);
    if (activeConversation?.propertyId) fetchPropertyById(activeConversation.propertyId).then(p => { if (active) setActiveProperty(p); });
    return () => { active = false; };
  }, [activeConversation?.propertyId]);

  const activeOwner = useMemo(() => {
    if (activeProperty?.ownerName) {
      return {
        id: activeProperty.ownerId || activeConversation?.ownerId || 'owner-custom',
        name: activeProperty.ownerName,
        phone: activeProperty.ownerPhone || '',
        photo: activeProperty.ownerPhoto || activeConversation?.participantAvatar || null,
        avatar: activeProperty.ownerPhoto || activeConversation?.participantAvatar || null,
        verified: Boolean(activeProperty.verified),
      };
    }

    return {
      id: activeConversation?.ownerId || 'owner-custom',
      name: activeConversation?.participantName || 'Propietario',
      phone: activeConversation?.participantPhone || '',
      photo: activeConversation?.participantAvatar || null,
      avatar: activeConversation?.participantAvatar || null,
      verified: false,
    };
  }, [activeConversation, activeProperty]);

  // Filtered conversations in sidebar
  const filteredConversations = useMemo(() => {
    return (conversations || []).filter((c) => {
      const name = c.participantName || '';
      const lastMsg = c.lastMessage || '';
      const matchesSearch =
        name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        lastMsg.toLowerCase().includes(searchFilter.toLowerCase());
      if (filterTab === 'unread') {
        return matchesSearch && (c.unreadCount || 0) > 0;
      }
      return matchesSearch;
    });
  }, [conversations, searchFilter, filterTab]);

  // Handle message submission
  const handleSend = async (textToSend = inputText) => {
    if (!textToSend.trim() && !selectedImage) return;
    if (!activeConversation?.id) return;

    if (editingMessage) {
      try {
        await editMessage(activeConversation.id, editingMessage.id, textToSend.trim());
        setEditingMessage(null);
        setInputText('');
      } catch (error) {
        console.error('Error al editar mensaje:', error);
        window.alert('No se pudo editar el mensaje. Intenta nuevamente.');
      }
      return;
    }

    try {
      await sendMessage(activeConversation.id, textToSend, selectedImage, false, replyingTo);
      setInputText('');
      setSelectedImage(null);
      setReplyingTo(null);
    } catch (error) {
      if (error?.message === 'CHAT_REQUIRES_FIREBASE_AUTH') {
        window.alert('Para enviar mensajes en tiempo real debes cerrar esta sesión e iniciar nuevamente con Google. Así ambos usuarios recibirán el mismo historial.');
        return;
      }
      window.alert('No se pudo enviar el mensaje. Revisa tu conexión e inténtalo otra vez.');
    }
  };

  const handleStartEdit = (msg) => {
    setEditingMessage(msg);
    setInputText(msg.text || '');
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInputText('');
  };

  const handleDeleteMessage = async (messageId) => {
    if (!activeConversation?.id || !messageId) return;
    try {
      await deleteMessage(activeConversation.id, messageId);
      setConfirmDeleteId(null);
    } catch (error) {
      console.error('Error al eliminar mensaje:', error);
      window.alert('No se pudo eliminar el mensaje.');
    }
  };

  const handleClearChat = async () => {
    if (!activeConversation?.id) return;
    try {
      await clearChat(activeConversation.id);
      setConfirmClearChat(false);
    } catch (error) {
      console.error('Error al vaciar chat:', error);
      window.alert('No se pudo vaciar el chat.');
    }
  };

  // WhatsApp-style Voice Note Flow:
  // 1. Mic icon starts recording
  // 2. Red stop button stops recording and enters review state
  // 3. Green arrow send button enables and sends audio
  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    recordingStream.current?.getTracks().forEach(track => track.stop());
    clearInterval(recordingTimerRef.current);
    if (audioReview?.url) URL.revokeObjectURL(audioReview.url);
  }, [audioReview]);

  const handleStartRecording = async () => {
    if (!activeConversation?.id) return;
    if (audioReview) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStream.current = stream;
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        clearInterval(recordingTimerRef.current);
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioReview({ blob, url, duration: recordingSeconds });
        setIsRecordingAudio(false);
      };

      recorderRef.current = recorder;
      recorder.start();
      setIsRecordingAudio(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(sec => sec + 1);
      }, 1000);
    } catch {
      window.alert('Permite el acceso al micrófono de tu dispositivo para grabar audio.');
    }
  };

  const handleStopRecording = () => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
  };

  const handleCancelAudio = () => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
      recordingStream.current?.getTracks().forEach(t => t.stop());
    }
    clearInterval(recordingTimerRef.current);
    if (audioReview?.url) URL.revokeObjectURL(audioReview.url);
    setIsRecordingAudio(false);
    setRecordingSeconds(0);
    setAudioReview(null);
    setAudioPlaying(false);
  };

  const handleSendAudioReview = async () => {
    if (!audioReview?.blob || !activeConversation?.id) return;
    const blobToSend = audioReview.blob;
    const room = activeConversation.id;
    handleCancelAudio();
    try {
      await sendMessage(room, '', blobToSend, true, replyingTo);
      setReplyingTo(null);
    } catch (err) {
      console.error('Error al enviar audio:', err);
      window.alert('No se pudo enviar el audio: ' + (err?.message || 'Intenta nuevamente.'));
    }
  };

  const toggleAudioPreview = () => {
    if (!audioReviewRef.current) return;
    if (audioPlaying) {
      audioReviewRef.current.pause();
      setAudioPlaying(false);
    } else {
      audioReviewRef.current.play();
      setAudioPlaying(true);
    }
  };

  // Media selection for preview modal
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video');
    const previewUrl = URL.createObjectURL(file);
    setPendingSendMedia({
      file,
      url: previewUrl,
      src: previewUrl,
      type: isVideo ? 'video' : 'image',
      name: file.name,
    });
    e.target.value = '';
  };

  const handleConfirmSendMedia = async (caption) => {
    if (!pendingSendMedia || !activeConversation?.id) return;
    const mediaToSend = pendingSendMedia;
    setPendingSendMedia(null);
    try {
      await sendMessage(activeConversation.id, caption || '', mediaToSend.file, false, replyingTo);
      setReplyingTo(null);
    } catch (error) {
      console.error('Error enviando archivo multimedia:', error);
      if (error?.message === 'CHAT_REQUIRES_FIREBASE_AUTH') {
        window.alert('Para enviar mensajes en tiempo real debes cerrar esta sesión e iniciar nuevamente con Google.');
        return;
      }
      window.alert('No se pudo enviar el archivo multimedia. Revisa tu conexión.');
    } finally {
      if (mediaToSend.url) {
        URL.revokeObjectURL(mediaToSend.url);
      }
    }
  };

  const handleCancelSendMedia = () => {
    if (pendingSendMedia?.url) {
      URL.revokeObjectURL(pendingSendMedia.url);
    }
    setPendingSendMedia(null);
  };

  // Quick Questions Suggestions
  const quickQuestions = [
    '¿Aceptan mascotas en la vivienda?',
    '¿Cuánto solicitan de depósito en garantía?',
    '¿Cuándo podríamos agendar una visita en persona?',
    '¿Cuáles son los requisitos de papelería / fiador?',
    '¿El inmueble cuenta con garita y agua constante?',
    '¿El precio mensual incluye mantenimiento?',
  ];

  // Feed background style based on wallpaperConfig
  const feedStyle = useMemo(() => {
    if (wallpaperConfig?.image) {
      return {
        backgroundImage: `url(${wallpaperConfig.image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        scrollBehavior: 'auto',
        overflowAnchor: 'auto',
      };
    }
    const preset = WALLPAPER_PRESETS.find(p => p.id === wallpaperConfig?.preset);
    if (preset?.id === 'default') {
      return {
        backgroundImage: `radial-gradient(#00000006 1px, transparent 1px)`,
        backgroundSize: '16px 16px',
        backgroundColor: '#FAF6F0',
        scrollBehavior: 'auto',
        overflowAnchor: 'auto',
      };
    }
    return {
      backgroundColor: preset?.bgColor || '#FAF6F0',
      scrollBehavior: 'auto',
      overflowAnchor: 'auto',
    };
  }, [wallpaperConfig]);

  // If chat is blocked because no confirmed visit exists
  if (chatBlocked && urlPropertyId) {
    const blockedProp = demoProperties.find((p) => p.id === urlPropertyId);
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-[#FAF5EE] p-6">
        <div className="max-w-md w-full rounded-3xl border-2 border-border bg-white p-8 shadow-elevated text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-5">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-black text-cafe mb-2">Chat aún no disponible</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-4">
            Para chatear con el propietario de{' '}
            <strong className="text-cafe">"{blockedProp?.title || 'esta propiedad'}"</strong>,
            primero debes solicitar una visita y esperar a que el propietario la acepte.
          </p>
          <div className="rounded-2xl bg-[#FAF5EE] border border-border-light p-4 mb-6 text-left">
            <p className="text-xs font-black text-cafe mb-2">¿Cómo funciona?</p>
            <ol className="space-y-2 text-xs text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-forest text-white flex items-center justify-center text-[10px] font-black mt-0.5">1</span>
                <span>Visita la ficha de la vivienda y haz clic en <strong className="text-cafe">"Solicitar una visita"</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-forest text-white flex items-center justify-center text-[10px] font-black mt-0.5">2</span>
                <span>El propietario recibirá tu solicitud y podrá <strong className="text-cafe">aceptar o rechazar</strong> la cita.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-forest text-white flex items-center justify-center text-[10px] font-black mt-0.5">3</span>
                <span>Una vez aceptada, se desbloqueará el <strong className="text-cafe">chat en vivo</strong> para coordinar los detalles.</span>
              </li>
            </ol>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {blockedProp && (
              <Link
                to={`/propiedad/${blockedProp.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-xs font-black text-white hover:bg-forest-dark transition-all shadow-xs"
              >
                <Calendar size={14} /> Solicitar visita
              </Link>
            )}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-crema px-5 py-2.5 text-xs font-bold text-cafe hover:bg-border/60 transition-all"
            >
              <ArrowLeft size={14} /> Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[#F0EBE1]/40 overflow-hidden font-sans text-cafe">
      
      {/* ══════════════ STANDALONE MESSENGER WEB HEADER ══════════════ */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-3 sm:px-6 shadow-xs z-20">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => navigate('/explorar')}
            className="flex items-center gap-2 rounded-xl border border-border bg-[#FAF5EE] px-3 py-2 text-xs font-black text-cafe hover:border-forest hover:bg-forest hover:text-white transition-all shadow-2xs group"
            title="Salir del chat y volver al explorador de propiedades"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            <span className="font-extrabold">Salir del chat</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 border-l border-border pl-3">
            <Link to="/" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <img src={`${import.meta.env.BASE_URL}logo/logo.png`} alt="RuwaJay" className="h-7 w-7 object-contain" />
              <span className="text-sm font-black text-forest">
                Ruwa<span className="text-terracota">Jay</span>
              </span>
            </Link>
            <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-black text-forest">
              Mensajería en Vivo
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-cafe bg-[#FAF8F5] p-1 pr-3 rounded-2xl border border-border shadow-2xs">
            <ChatAvatar
              src={currentUserPhoto}
              name={user?.name || 'Mi Perfil'}
              size="sm"
              fallbackBg="solid"
            />
            <span className="hidden sm:inline font-black truncate max-w-[120px]">{user?.name || 'Mi Perfil'}</span>
          </div>
        </div>
      </header>

      {/* ══════════════ TWO-COLUMN MESSENGER BODY ══════════════ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: CONVERSATION LIST */}
        <aside
          className={`w-full md:w-80 lg:w-96 flex-col border-r border-border bg-white shrink-0 z-10 ${
            mobileView === 'list' ? 'flex' : 'hidden md:flex'
          }`}
        >
          {/* Top Search & Filter Bar */}
          <div className="p-3 border-b border-border/80 bg-[#FAF8F5]/60 space-y-2.5">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar conversación o mensaje..."
                className="w-full rounded-2xl border border-border bg-white pl-9 pr-3.5 py-2 text-xs font-medium text-cafe outline-none focus:border-forest transition-colors shadow-2xs"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-crema/60 rounded-xl">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                  filterTab === 'all'
                    ? 'bg-white text-forest shadow-xs'
                    : 'text-text-muted hover:text-cafe'
                }`}
              >
                Todos ({conversations.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('unread')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                  filterTab === 'unread'
                    ? 'bg-white text-forest shadow-xs'
                    : 'text-text-muted hover:text-cafe'
                }`}
              >
                No leídos {totalUnreadCount > 0 && `(${totalUnreadCount})`}
              </button>
            </div>
          </div>

          {/* Conversations Scroll Feed */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-text-muted">
                <User size={36} className="text-border mb-3 opacity-60" />
                <p className="text-xs font-bold text-cafe">No hay conversaciones</p>
                <p className="text-[11px] text-text-muted mt-1">
                  {searchFilter ? 'No coincide con tu búsqueda' : 'Inicia un chat desde cualquier propiedad disponible'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                const isUnread = !isActive && (conv.unreadCount || 0) > 0;

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      dismissToast?.();
                      setMobileView('chat');
                    }}
                    className={`flex items-center gap-3 p-3 sm:p-3.5 cursor-pointer transition-all ${
                      isActive
                        ? 'bg-forest/10 border-l-4 border-forest shadow-2xs'
                        : isUnread
                        ? 'bg-amber-50/50 hover:bg-amber-50'
                        : 'hover:bg-[#FAF8F5]'
                    }`}
                  >
                    {/* User Avatar */}
                    <ChatAvatar
                      src={conv.participantAvatar}
                      name={conv.participantName}
                      size="md"
                      fallbackBg="light"
                    />

                    {/* Middle Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className={`truncate text-xs font-black ${isActive ? 'text-forest' : 'text-cafe'}`}>
                          {conv.participantName}
                        </h4>
                        <span className="text-[10px] text-text-muted font-bold shrink-0 ml-1">
                          {formatConversationTime(conv.lastMessageTimestamp)}
                        </span>
                      </div>

                      <p className={`truncate text-[11px] leading-tight ${isUnread ? 'font-black text-cafe' : 'text-text-muted'}`}>
                        {conv.lastMessage || 'Conversación iniciada'}
                      </p>

                      {conv.propertyTitle && (
                        <p className="truncate text-[10px] text-forest font-bold mt-1 opacity-90 flex items-center gap-1">
                          <Home size={10} className="shrink-0" />
                          <span>{conv.propertyTitle}</span>
                        </p>
                      )}
                    </div>

                    {/* Unread Badge */}
                    {isUnread && (
                      <div className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-forest text-white text-[10px] font-black shrink-0 shadow-2xs">
                        {conv.unreadCount}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: ACTIVE CHAT SCREEN */}
        <main
          className={`flex-1 flex-col bg-[#FAF8F5]/30 overflow-hidden relative ${
            mobileView === 'chat' ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Active Chat Top Header */}
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-3 sm:px-5 shadow-2xs z-10">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  {/* Mobile Back to List button */}
                  <button
                    type="button"
                    onClick={() => setMobileView('list')}
                    className="flex md:hidden h-8 w-8 items-center justify-center rounded-xl border border-border bg-[#FAF8F5] text-cafe shrink-0 hover:bg-crema"
                  >
                    <ArrowLeft size={16} />
                  </button>

                  {/* Contact Avatar */}
                  <ChatAvatar
                    src={activeConversation.participantAvatar || activeOwner?.photo}
                    name={activeConversation.participantName}
                    size="lg"
                    fallbackBg="solid"
                  />

                  {/* Contact Details */}
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate text-xs sm:text-sm font-black text-cafe">
                        {activeConversation.participantName}
                      </h3>
                      <span className="hidden sm:inline-block rounded-md bg-crema px-1.5 py-0.5 text-[9px] font-black text-forest uppercase tracking-wider">
                        {activeConversation.participantRole}
                      </span>
                    </div>
                    <p className="truncate text-[10px] sm:text-[11px] text-text-muted flex items-center gap-1.5">
                      {typingMap[activeConversation.id] ? (
                        <span className="text-forest font-bold animate-pulse">Escribiendo...</span>
                      ) : activeConversation.participantOnline ? (
                        <span className="text-forest font-bold">En línea ahora</span>
                      ) : (
                        <span className="text-text-muted">Mensajería privada</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Actions & Property Badge */}
                <div className="flex items-center gap-2">
                  {/* Property Card Pill */}
                  {activeProperty && (
                    <Link
                      to={`/propiedad/${activeConversation.propertyId}`}
                      className="hidden sm:flex items-center gap-2 rounded-2xl border border-border bg-[#FAF5EE] p-1.5 pr-3 hover:border-forest hover:bg-white transition-all shadow-2xs max-w-[210px]"
                    >
                      <img
                        src={activeProperty.thumbnail}
                        alt=""
                        className="h-8 w-8 rounded-xl object-cover"
                      />
                      <div className="min-w-0 text-left">
                        <p className="truncate text-[11px] font-extrabold text-cafe">{activeProperty.title}</p>
                        <p className="text-[10px] font-bold text-forest">{formatPrice(activeProperty.price)}/mes</p>
                      </div>
                    </Link>
                  )}

                  {/* Custom Wallpaper Button */}
                  <button
                    type="button"
                    onClick={() => setShowWallpaperModal(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-[#FAF8F5] text-cafe hover:border-forest hover:bg-forest hover:text-white transition-all shadow-2xs"
                    title="Personalizar fondo de pantalla (Solo visible para ti)"
                  >
                    <Palette size={15} />
                  </button>

                  {/* Voice Call via WebRTC */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeConversation) return;
                      startCall({
                        recipientId: activeConversation.participantId,
                        recipientName: activeConversation.participantName || 'Contacto RuwaJay',
                        recipientAvatar: activeConversation.participantAvatar || '',
                        recipientPhone: activeConversation.participantPhone || '',
                        recipientEmail: activeConversation.participantEmail || '',
                        propertyTitle: activeProperty?.title || activeConversation?.propertyTitle || 'Propiedad RuwaJay',
                        propertyImage: activeProperty?.images?.[0] || activeConversation?.propertyImage || '',
                        roomId: activeConversation.id,
                        conversation: activeConversation,
                      });
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-[#FAF8F5] text-cafe hover:border-forest hover:bg-forest hover:text-white transition-all shadow-2xs"
                    title="Llamada de voz en vivo"
                  >
                    <Phone size={15} />
                  </button>

                  {/* Clear Chat Button (Only for this user) */}
                  <button
                    type="button"
                    onClick={() => setConfirmClearChat(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-[#FAF8F5] text-cafe hover:border-red-500 hover:bg-red-50 hover:text-red-600 transition-all shadow-2xs"
                    title="Vaciar mi chat (solo para mí)"
                  >
                    <Trash2 size={15} />
                  </button>

                  {/* Visit Shortcut */}
                  <Link
                    to={`/propiedad/${activeConversation.propertyId}`}
                    className="hidden md:inline-flex items-center gap-1 rounded-xl bg-forest px-3 py-2 text-xs font-black text-white hover:bg-forest-dark transition-all shadow-xs"
                  >
                    <Calendar size={13} /> Agendar Visita
                  </Link>
                </div>
              </div>

              {/* Safety Warning Banner */}
              <div className="flex items-center justify-center gap-2 border-b border-amber-200/60 dark:border-amber-800/40 bg-amber-50/90 dark:bg-amber-950/40 px-3 py-1.5 text-[11px] font-semibold text-amber-900 dark:text-amber-200 shrink-0">
                <ShieldAlert size={14} className="shrink-0 text-terracota" />
                <span className="truncate">
                  <strong>Consejo de seguridad:</strong> No realices depósitos antes de visitar el inmueble en persona y firmar el contrato.
                </span>
              </div>

              {/* Messages Feed with dynamic custom wallpaper */}
              <div
                ref={messagesFeedRef}
                className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3"
                style={feedStyle}
              >
                {chatError && <p role="alert" className="text-red-600 text-xs text-center">{chatError}</p>}
                
                {/* Date Badge */}
                <div className="flex justify-center my-2">
                  <span className="rounded-full bg-white/90 backdrop-blur-xs px-3.5 py-1 text-[10px] font-bold text-text-secondary shadow-2xs border border-[#E8D9C8]/60">
                    {formatChatDateHeader(activeConversation?.messages)}
                  </span>
                </div>

                {activeConversation.messages.map((msg) => {
                  const isUser = isUserMsg(msg, user?.id);
                  const isDeleted = Boolean(msg.isDeleted);
                  const canEdit = isUser && !isDeleted && !msg.image && msg.type !== 'audio' && msg.type !== 'video';
                  const canDelete = isUser && !isDeleted;

                  return (
                    <div
                      key={msg.id}
                      onTouchStart={(e) => {
                        msgTouchStartX.current[msg.id] = e.touches[0].clientX;
                      }}
                      onTouchEnd={(e) => {
                        const start = msgTouchStartX.current[msg.id] || 0;
                        const diff = e.changedTouches[0].clientX - start;
                        if (diff > 50) {
                          setReplyingTo({
                            id: msg.id,
                            senderName: isUser ? 'Tú' : (activeConversation.participantName || 'Contacto'),
                            text: msg.text || (msg.type === 'image' ? '📷 Foto' : msg.type === 'video' ? '🎥 Video' : msg.type === 'audio' ? '🎵 Nota de voz' : 'Mensaje'),
                            type: msg.type,
                          });
                        }
                      }}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-[fade-in_0.2s_ease-out] group relative`}
                    >
                      {/* Action buttons on hover */}
                      {!isDeleted && (
                        <div
                          className={`absolute -top-3.5 ${
                            isUser ? 'right-2' : 'left-2'
                          } z-10 hidden group-hover:flex items-center gap-1 bg-white/95 backdrop-blur-md rounded-full px-2 py-0.5 shadow-md border border-[#E8D9C8] text-cafe`}
                        >
                          {/* Reply Button (Swipe to reply parity) */}
                          <button
                            type="button"
                            onClick={() => setReplyingTo({
                              id: msg.id,
                              senderName: isUser ? 'Tú' : (activeConversation.participantName || 'Contacto'),
                              text: msg.text || (msg.type === 'image' ? '📷 Foto' : msg.type === 'video' ? '🎥 Video' : msg.type === 'audio' ? '🎵 Nota de voz' : 'Mensaje'),
                              type: msg.type,
                            })}
                            className="p-1 hover:text-forest transition-colors rounded-full hover:bg-crema"
                            title="Responder a este mensaje"
                          >
                            <Reply size={13} />
                          </button>

                          {/* Quick Reactions trigger */}
                          <button
                            type="button"
                            onClick={() => setActiveReactionPicker(activeReactionPicker === msg.id ? null : msg.id)}
                            className="p-1 hover:text-forest transition-colors rounded-full hover:bg-crema"
                            title="Reaccionar con emoji"
                          >
                            <Smile size={13} />
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(msg)}
                              className="p-1 hover:text-forest transition-colors rounded-full hover:bg-crema"
                              title="Editar mensaje"
                            >
                              <Pencil size={13} />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(msg.id)}
                              className="p-1 hover:text-red-600 transition-colors rounded-full hover:bg-red-50"
                              title="Eliminar mensaje"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Emoji Quick Picker Bar with + button for Full Emoji Keyboard */}
                      {activeReactionPicker === msg.id && (
                        <div className={`absolute -top-10 ${isUser ? 'right-0' : 'left-0'} z-30 flex items-center gap-1 rounded-full bg-white/95 backdrop-blur-md px-2.5 py-1 shadow-lg border border-[#E8D9C8] animate-[scale-in_0.15s_ease-out]`}>
                          {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => {
                            const selected = msg.reactions?.[user?.id] === emoji;
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  toggleReaction(activeConversation.id, msg.id, emoji, msg.reactions?.[user?.id]);
                                  setActiveReactionPicker(null);
                                }}
                                className={`text-sm sm:text-base p-1 hover:scale-125 transition-transform rounded-full ${
                                  selected ? 'bg-forest/20' : ''
                                }`}
                              >
                                {emoji}
                              </button>
                            );
                          })}
                          
                          {/* Plus button to open full emoji keyboard */}
                          <button
                            type="button"
                            onClick={() => {
                              setFullEmojiPickerMsgId(msg.id);
                              setActiveReactionPicker(null);
                            }}
                            className="h-7 w-7 rounded-full bg-forest/10 hover:bg-forest hover:text-white text-forest flex items-center justify-center text-xs font-black transition-all ml-0.5"
                            title="Más emojis (Teclado completo)"
                          >
                            <Plus size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveReactionPicker(null)}
                            className="text-text-muted hover:text-cafe ml-0.5 p-0.5"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}

                      {/* Message Bubble Container */}
                      <div
                        className={`relative max-w-[88%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-xs transition-all hover:shadow-md ${
                          isUser
                            ? 'bg-gradient-to-br from-[#0B5D3B] to-[#116E47] text-white rounded-br-2xs border border-forest/15'
                            : 'bg-white text-cafe rounded-bl-2xs border border-[#E8D9C8]/70 shadow-2xs'
                        }`}
                      >
                        {/* Header name */}
                        <p className={`text-[9px] font-black uppercase tracking-widest mb-1 opacity-80 ${isUser ? 'text-white/80 text-right' : 'text-forest'}`}>
                          {isUser
                            ? `${user?.name || 'Tú'} · ${activeConversation.currentUserRole}`
                            : `${activeConversation.participantName} · ${activeConversation.participantRole}`}
                        </p>

                        {/* Quoted Message / Reply Preview inside bubble */}
                        {msg.replyTo && (
                          <div className={`mb-2 p-2 rounded-xl text-xs border-l-4 ${
                            isUser
                              ? 'bg-black/25 border-emerald-300 text-white'
                              : 'bg-forest/10 border-forest text-cafe'
                          }`}>
                            <p className="font-black text-[10px] opacity-90">
                              {msg.replyTo.senderName || 'Mensaje citado'}
                            </p>
                            <p className="truncate text-[11px] opacity-80 mt-0.5">
                              {msg.replyTo.text || 'Archivo adjunto'}
                            </p>
                          </div>
                        )}

                        {isDeleted ? (
                          <div className="flex items-center gap-1.5 py-1 text-xs italic opacity-75">
                            <Ban size={14} className="shrink-0" />
                            <span>Este mensaje fue eliminado</span>
                          </div>
                        ) : (
                          <>
                            {/* Image if attached */}
                            {msg.image && (
                              <div
                                className="mb-2 overflow-hidden rounded-xl cursor-pointer group/media relative"
                                onClick={() => setViewingMedia({
                                  src: msg.image,
                                  url: msg.image,
                                  type: 'image',
                                  senderName: isUser ? `${user?.name || 'Tú'}` : activeConversation.participantName,
                                  time: msg.timestamp,
                                })}
                              >
                                <PrivateMedia src={msg.image} alt="Adjunto" className="max-h-60 w-full object-cover rounded-xl transition-transform duration-200 group-hover/media:scale-[1.02]" />
                                <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/15 transition-colors flex items-center justify-center opacity-0 group-hover/media:opacity-100 pointer-events-none">
                                  <span className="bg-black/60 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1 shadow-md">
                                    <Eye size={12} /> Ver foto
                                  </span>
                                </div>
                              </div>
                            )}

                            {(msg.type === 'image' || msg.type === 'video') && msg.mediaUrl && (
                              <div
                                className="mb-2 overflow-hidden rounded-xl cursor-pointer group/media relative"
                                onClick={() => setViewingMedia({
                                  src: msg.mediaUrl,
                                  url: msg.mediaUrl,
                                  type: msg.type,
                                  senderName: isUser ? `${user?.name || 'Tú'}` : activeConversation.participantName,
                                  time: msg.timestamp,
                                })}
                              >
                                <PrivateMedia
                                  type={msg.type}
                                  src={msg.mediaUrl}
                                  alt="Adjunto"
                                  className="max-h-60 rounded-xl transition-transform duration-200 group-hover/media:scale-[1.02]"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/15 transition-colors flex items-center justify-center opacity-0 group-hover/media:opacity-100 pointer-events-none">
                                  <span className="bg-black/60 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1 shadow-md">
                                    <Eye size={12} /> {msg.type === 'video' ? 'Ver video' : 'Ver foto'}
                                  </span>
                                </div>
                              </div>
                            )}

                            {msg.type === 'audio' && msg.mediaUrl ? (
                              <PrivateMedia type="audio" src={msg.mediaUrl} className="max-w-full" />
                            ) : msg.type !== 'image' && msg.type !== 'video' ? (
                              <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                            ) : null}

                            {msg.isVoice && !msg.mediaUrl && (
                              <span className="text-xs">Audio antiguo sin archivo disponible</span>
                            )}
                          </>
                        )}

                        {/* Timestamp & Double Checkmarks */}
                        <div className={`mt-1.5 flex items-center justify-end gap-1 text-[9px] font-bold ${isUser ? 'text-white/70' : 'text-text-muted/70'}`}>
                          {msg.isEdited && !isDeleted && (
                            <span className="italic text-[8px] opacity-80 mr-0.5">(editado)</span>
                          )}
                          <span>{msg.timestamp}</span>
                          {isUser && !isDeleted && (
                            <CheckCheck
                              size={13}
                              className={msg.status === 'read' ? 'text-[#22C55E]' : 'text-white/60'}
                              title={msg.status === 'read' ? 'Leído por el destinatario' : 'Entregado'}
                            />
                          )}
                        </div>

                        {/* Emoji Reactions at the bottom of the bubble */}
                        {!isDeleted && msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className={`flex flex-wrap items-center gap-1 mt-2 pt-1 border-t ${
                            isUser ? 'border-white/15 justify-end' : 'border-border/60 justify-start'
                          }`}>
                            {Object.entries(
                              Object.values(msg.reactions).reduce((acc, emoji) => {
                                if (emoji) acc[emoji] = (acc[emoji] || 0) + 1;
                                return acc;
                              }, {})
                            ).map(([emoji, count]) => {
                              const userReacted = msg.reactions?.[user?.id] === emoji;
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => toggleReaction(activeConversation.id, msg.id, emoji, msg.reactions?.[user?.id])}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold shadow-2xs border transition-all ${
                                    userReacted
                                      ? isUser ? 'bg-white/25 text-white border-white/50' : 'bg-forest/15 text-forest border-forest/30'
                                      : isUser ? 'bg-black/20 text-white/90 border-white/10 hover:bg-white/10' : 'bg-[#FAF5EE] text-cafe border-border hover:bg-white'
                                  }`}
                                  title={userReacted ? 'Hiciste clic para reaccionar (haz clic para quitar)' : `Reaccionar con ${emoji}`}
                                >
                                  <span>{emoji}</span>
                                  {count > 1 && <span className="text-[9px] opacity-80">{count}</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Typing Indicator */}
                {typingMap[activeConversation.id] && (
                  <div className="flex items-start animate-[slide-up_0.2s_ease-out]">
                    <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 shadow-xs border border-border/70 rounded-bl-2xs">
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-forest animate-bounce" />
                        <span className="h-2 w-2 rounded-full bg-forest animate-bounce [animation-delay:0.2s]" />
                        <span className="h-2 w-2 rounded-full bg-forest animate-bounce [animation-delay:0.4s]" />
                      </div>
                      <span className="text-xs font-semibold text-text-muted">
                        {activeConversation.participantName} está escribiendo...
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Questions Chips Carousel */}
              <div className="no-scrollbar flex shrink-0 items-center gap-2 overflow-x-auto border-t border-border/60 bg-[#FAF8F5] px-3 py-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-text-muted shrink-0">
                  Preguntar rápido:
                </span>
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="shrink-0 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-bold text-cafe transition-all hover:border-forest hover:bg-forest hover:text-white shadow-2xs"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Replying Banner (Swipe to reply feedback) */}
              {replyingTo && (
                <div className="flex items-center justify-between border-t border-forest/20 bg-forest/5 px-4 py-2 text-xs shrink-0 animate-[slide-down_0.15s_ease-out]">
                  <div className="flex items-center gap-2 min-w-0 border-l-4 border-forest pl-2">
                    <Reply size={15} className="text-forest shrink-0" />
                    <div className="min-w-0">
                      <span className="font-bold text-forest text-[11px] block">Respondiendo a {replyingTo.senderName}:</span>
                      <span className="text-text-muted truncate italic text-[11px] block max-w-sm">{replyingTo.text}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="text-text-muted hover:text-cafe p-1 shrink-0 ml-2 rounded-full hover:bg-forest/10"
                    title="Cancelar respuesta"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Editing Banner */}
              {editingMessage && (
                <div className="flex items-center justify-between border-t border-forest/20 bg-forest/10 px-4 py-2 text-xs shrink-0 animate-[slide-down_0.15s_ease-out]">
                  <div className="flex items-center gap-2 min-w-0">
                    <Pencil size={14} className="text-forest shrink-0" />
                    <span className="font-bold text-forest shrink-0">Editando mensaje:</span>
                    <span className="text-text-muted truncate italic max-w-sm">"{editingMessage.text}"</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-text-muted hover:text-cafe p-1 shrink-0 ml-2 rounded-full hover:bg-forest/10"
                    title="Cancelar edición"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* ══════════════ MESSAGE INPUT / AUDIO CONTROLS ══════════════ */}
              <div className="flex shrink-0 items-center gap-2 border-t border-[#E8D9C8]/80 bg-white/95 backdrop-blur-md p-2.5 sm:p-3">
                
                {/* 1. STATE: LIVE AUDIO RECORDING */}
                {isRecordingAudio ? (
                  <div className="flex flex-1 items-center justify-between gap-3 bg-red-50/80 border border-red-200/80 rounded-2xl px-4 py-2 animate-[fade-in_0.15s_ease-out]">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-red-600 animate-ping" />
                      <span className="text-xs font-black text-red-600">Grabando audio...</span>
                      <span className="text-xs font-mono font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-lg">
                        {formatTimer(recordingSeconds)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Cancel Recording */}
                      <button
                        type="button"
                        onClick={handleCancelAudio}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-text-muted hover:text-red-600 transition-colors shadow-2xs border border-red-200"
                        title="Cancelar y descartar"
                      >
                        <Trash2 size={16} />
                      </button>

                      {/* Red Stop Button (Transitions to review mode) */}
                      <button
                        type="button"
                        onClick={handleStopRecording}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md transition-all active:scale-95"
                        title="Detener grabación"
                      >
                        <Square size={16} fill="white" />
                      </button>
                    </div>
                  </div>
                ) : audioReview ? (
                  /* 2. STATE: AUDIO REVIEW (WhatsApp Flow: Stop -> Review -> Green Send Arrow) */
                  <div className="flex flex-1 items-center justify-between gap-2.5 bg-emerald-50/70 border border-emerald-200/70 rounded-2xl px-3.5 py-1.5 animate-[fade-in_0.15s_ease-out]">
                    <audio
                      ref={audioReviewRef}
                      src={audioReview.url}
                      onEnded={() => setAudioPlaying(false)}
                      className="hidden"
                    />

                    <div className="flex items-center gap-2 min-w-0">
                      {/* Play/Pause Preview */}
                      <button
                        type="button"
                        onClick={toggleAudioPreview}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-white shadow-xs hover:bg-forest-dark transition-all"
                        title={audioPlaying ? "Pausar" : "Escuchar audio"}
                      >
                        {audioPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                      </button>

                      <div>
                        <p className="text-[11px] font-black text-forest">Nota de voz lista</p>
                        <p className="text-[10px] font-mono text-text-muted">
                          {formatTimer(audioReview.duration || 0)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Discard audio */}
                      <button
                        type="button"
                        onClick={handleCancelAudio}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-text-muted hover:text-red-600 transition-colors shadow-2xs border border-border"
                        title="Descartar audio"
                      >
                        <Trash2 size={16} />
                      </button>

                      {/* Green Send Arrow Button */}
                      <button
                        type="button"
                        onClick={handleSendAudioReview}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22C55E] hover:bg-[#16A34A] text-white shadow-md transition-all active:scale-95"
                        title="Enviar nota de voz"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 3. STATE: STANDARD TEXT & ATTACHMENT CONTROLS */
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] text-text-muted hover:bg-crema hover:text-cafe transition-all shadow-2xs border border-[#E8D9C8]/50"
                      title="Adjuntar foto o video"
                    >
                      <Paperclip size={17} />
                    </button>

                    {/* Microphone Button (Starts WhatsApp-style recording) */}
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] text-text-muted hover:bg-crema hover:text-forest transition-all shadow-2xs border border-[#E8D9C8]/50"
                      title="Grabar nota de voz"
                    >
                      <Mic size={17} />
                    </button>

                    {/* Text Input */}
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder={editingMessage ? "Modifica tu mensaje..." : `Escribe un mensaje a ${activeConversation.participantName}...`}
                      className="min-h-11 min-w-0 flex-1 rounded-2xl border border-[#E8D9C8] bg-[#FAF8F5] px-4 text-xs sm:text-sm font-medium text-cafe outline-none transition-all focus:border-forest focus:bg-white shadow-2xs"
                    />

                    {/* Send Button */}
                    <button
                      type="button"
                      onClick={() => handleSend()}
                      disabled={!inputText.trim()}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest text-white shadow-md transition-all hover:bg-forest-dark active:scale-95 disabled:opacity-35 disabled:hover:bg-forest"
                      aria-label={editingMessage ? "Actualizar mensaje" : "Enviar mensaje"}
                      title={editingMessage ? "Actualizar mensaje" : "Enviar mensaje"}
                    >
                      {editingMessage ? <Check size={17} /> : <Send size={16} />}
                    </button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-text-muted">
              <p>Selecciona una conversación para empezar a chatear.</p>
            </div>
          )}
        </main>
      </div>

      {/* Confirmation Modal for Clearing Chat (Only for this user) */}
      {confirmClearChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-[fade-in_0.15s_ease-out]">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center border border-border">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-black text-cafe mb-2">¿Vaciar chat para mí?</h3>
            <p className="text-xs text-text-secondary leading-relaxed mb-6">
              Esta acción vaciará el historial únicamente para ti. El otro usuario continuará conservando su chat intacto.
            </p>
            <div className="flex gap-2.5 justify-center">
              <button
                type="button"
                onClick={() => setConfirmClearChat(false)}
                className="flex-1 py-2.5 rounded-xl border border-border bg-[#FAF8F5] text-xs font-bold text-cafe hover:bg-crema transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClearChat}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                Vaciar solo para mí
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Single Message */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-[fade-in_0.15s_ease-out]">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center border border-border">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-black text-cafe mb-2">¿Eliminar mensaje?</h3>
            <p className="text-xs text-text-secondary leading-relaxed mb-6">
              El mensaje se marcará como eliminado para todos los participantes del chat.
            </p>
            <div className="flex gap-2.5 justify-center">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-border bg-[#FAF8F5] text-xs font-bold text-cafe hover:bg-crema transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMessage(confirmDeleteId)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                Eliminar para todos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Emoji Keyboard Modal for Reactions */}
      {fullEmojiPickerMsgId && (
        <FullEmojiPickerModal
          currentReaction={
            activeConversation?.messages?.find(m => m.id === fullEmojiPickerMsgId)?.reactions?.[user?.id]
          }
          onSelect={(emoji) => {
            toggleReaction(
              activeConversation.id,
              fullEmojiPickerMsgId,
              emoji,
              activeConversation?.messages?.find(m => m.id === fullEmojiPickerMsgId)?.reactions?.[user?.id]
            );
            setFullEmojiPickerMsgId(null);
          }}
          onClose={() => setFullEmojiPickerMsgId(null)}
        />
      )}

      {/* Custom Wallpaper Modal */}
      {showWallpaperModal && (
        <ChatWallpaperModal
          currentConfig={wallpaperConfig}
          conversationId={activeConversation?.id}
          onApply={handleApplyWallpaper}
          onClose={() => setShowWallpaperModal(false)}
        />
      )}

      {/* Pre-send Preview Modal with Send / Cancel */}
      {pendingSendMedia && (
        <MediaSendPreviewModal
          media={pendingSendMedia}
          onSend={handleConfirmSendMedia}
          onCancel={handleCancelSendMedia}
        />
      )}

      {/* Fullscreen Pinch-to-zoom Media Viewer */}
      {viewingMedia && (
        <MediaViewerModal
          media={viewingMedia}
          onClose={() => setViewingMedia(null)}
        />
      )}
    </div>
  );
}
