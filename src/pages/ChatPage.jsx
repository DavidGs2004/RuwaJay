import { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Send, Image as ImageIcon, MapPin, Calendar, CheckCheck,
  ArrowLeft, Search, User, Clock, Phone, Video, MoreVertical,
  ShieldAlert, Mic, Smile, Paperclip, X, Check, Eye, ChevronRight,
  RotateCcw, Home
} from 'lucide-react';
import { demoProperties, demoOwners, formatPrice } from '../data/properties';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

function isUserMsg(msg, currentUserId) {
  if (!msg) return false;
  if (typeof msg.isUser === 'boolean') return msg.isUser;
  if (msg.senderId === 'user' || msg.senderId === 'user-demo' || msg.senderName === 'Tú') return true;
  if (currentUserId && String(msg.senderId) === String(currentUserId)) return true;
  return false;
}

export default function ChatPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    markAsRead,
    startConversationWithProperty,
    totalUnreadCount,
    typingMap,
    resetDemoChats,
  } = useChat();

  const [inputText, setInputText] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread'
  const [showCallModal, setShowCallModal] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [mobileView, setMobileView] = useState('chat'); // 'list' | 'chat'
  const [selectedImage, setSelectedImage] = useState(null);

  const messagesFeedRef = useRef(null);
  const fileInputRef = useRef(null);

  // If a property is passed via URL (?property=prop-1), switch or start chat with it
  const urlPropertyId = searchParams.get('property');
  useEffect(() => {
    if (urlPropertyId) {
      startConversationWithProperty(urlPropertyId);
      setMobileView('chat');
    }
  }, [urlPropertyId, startConversationWithProperty]);

  // Mark active conversation as read
  useEffect(() => {
    if (activeConversationId) {
      markAsRead(activeConversationId);
    }
  }, [activeConversationId, markAsRead]);

  // Scroll to bottom when new messages arrive or when typing
  useEffect(() => {
    const feed = messagesFeedRef.current;
    if (!feed) return;
    feed.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' });
  }, [activeConversation?.messages, typingMap]);

  // Simulated call timer
  useEffect(() => {
    let interval = null;
    if (showCallModal) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [showCallModal]);

  // Current Property & Owner details for active chat
  const activeProperty = useMemo(() => {
    return demoProperties.find((p) => p.id === activeConversation?.propertyId) || demoProperties[0];
  }, [activeConversation]);

  const activeOwner = useMemo(() => {
    return demoOwners.find((o) => o.id === activeConversation?.ownerId) || demoOwners[0];
  }, [activeConversation]);

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
  const handleSend = (textToSend = inputText) => {
    if (!textToSend.trim() && !selectedImage) return;
    if (!activeConversation?.id) return;

    sendMessage(activeConversation.id, textToSend, selectedImage);
    setInputText('');
    setSelectedImage(null);
  };

  // Handle simulated Voice Note
  const handleSendVoiceNote = () => {
    if (!activeConversation?.id) return;
    sendMessage(activeConversation.id, '', null, true);
  };

  // Handle image upload from file picker
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result);
    };
    reader.readAsDataURL(file);
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

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[#F0EBE1]/40 overflow-hidden font-sans text-cafe">
      
      {/* ══════════════ STANDALONE MESSENGER WEB HEADER (FACEBOOK STYLE) ══════════════ */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-3 sm:px-6 shadow-xs z-20">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Back to main portal button */}
          <button
            type="button"
            onClick={() => navigate('/explorar')}
            className="flex items-center gap-2 rounded-xl border border-border bg-[#FAF5EE] px-3 py-2 text-xs font-black text-cafe hover:border-forest hover:bg-forest hover:text-white transition-all shadow-2xs group"
            title="Salir del chat y volver al explorador de propiedades"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            <span className="font-extrabold">Salir del chat</span>
          </button>

          {/* Platform Branding */}
          <div className="hidden sm:flex items-center gap-2 border-l border-border pl-3">
            <Link to="/" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <img src="/logo/logo.png" alt="RuwaJay" className="h-7 w-7 object-contain" />
              <span className="text-sm font-black text-forest">
                Ruwa<span className="text-terracota">Jay</span>
              </span>
            </Link>
            <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-black text-forest">
              Mensajería en Vivo
            </span>
          </div>
        </div>

        {/* User Presence & Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-cafe bg-[#FAF8F5] px-3 py-1.5 rounded-xl border border-border">
            <span className="h-2 w-2 rounded-full bg-jade animate-pulse" />
            <span className="hidden min-[480px]:inline text-text-muted">Inquilino:</span>
            <span className="font-extrabold text-cafe truncate max-w-[130px]">{user?.name || 'Tú'}</span>
          </div>

          <button
            type="button"
            onClick={resetDemoChats}
            className="flex items-center gap-1 rounded-xl border border-border bg-white px-2.5 py-1.5 text-[11px] font-bold text-text-muted hover:border-terracota hover:text-terracota hover:bg-terracota/5 transition-colors shadow-2xs"
            title="Restablece las conversaciones originales de prueba"
          >
            <RotateCcw size={12} />
            <span className="hidden sm:inline">Reiniciar</span>
          </button>
        </div>
      </header>

      {/* ══════════════ MAIN MESSAGING WORKSPACE ══════════════ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        
        {/* ══════════════ LEFT SIDEBAR: CONVERSATIONS LIST ══════════════ */}
        <aside
          className={`flex flex-col border-r border-border bg-[#FAF8F5] transition-all duration-300 md:flex ${
            mobileView === 'list' ? 'flex-1 md:w-80 lg:w-96 md:flex-none' : 'hidden md:flex md:w-80 lg:w-96'
          }`}
        >
          {/* Sidebar Header & Search */}
          <div className="border-b border-border bg-white p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-cafe">Bandeja de Entrada</h2>
                {totalUnreadCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-forest px-1.5 text-[11px] font-black text-white shadow-2xs">
                    {totalUnreadCount}
                  </span>
                )}
              </div>

              <span className="text-[10px] font-extrabold text-text-muted">
                {conversations.length} contactos
              </span>
            </div>

            {/* Search Bar */}
            <div className="relative mt-3">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar conversación o arrendante..."
                className="w-full rounded-xl border border-border bg-[#FAF5EE] py-2 pl-9 pr-8 text-xs font-medium text-cafe outline-none transition-colors focus:border-forest focus:bg-white"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-cafe"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Tabs: Todos / No leídos */}
            <div className="flex gap-2 mt-3 pt-1">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`rounded-xl px-3 py-1 text-xs font-bold transition-all ${
                  filterTab === 'all'
                    ? 'bg-forest text-white shadow-2xs'
                    : 'bg-crema/60 text-text-muted hover:text-cafe'
                }`}
              >
                Todos ({conversations.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('unread')}
                className={`flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-bold transition-all ${
                  filterTab === 'unread'
                    ? 'bg-forest text-white shadow-2xs'
                    : 'bg-crema/60 text-text-muted hover:text-cafe'
                }`}
              >
                No leídos {totalUnreadCount > 0 && `(${totalUnreadCount})`}
              </button>
            </div>
          </div>

          {/* Conversation Items Feed */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40 no-scrollbar">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => {
                const isActive = conv.id === activeConversation?.id;
                const isTyping = Boolean(typingMap[conv.id]);
                const prop = demoProperties.find((p) => p.id === conv.propertyId);

                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      markAsRead(conv.id);
                      setMobileView('chat');
                    }}
                    className={`flex w-full items-center gap-3 p-3.5 text-left transition-all hover:bg-white/80 ${
                      isActive ? 'bg-white border-l-4 border-forest shadow-xs' : ''
                    }`}
                  >
                    {/* Avatar with online status */}
                    <div className="relative shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-forest text-sm font-black text-white shadow-xs">
                        {conv.participantName.charAt(0)}
                      </div>
                      {conv.participantOnline && (
                        <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-jade" />
                      )}
                    </div>

                    {/* Content Preview */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="truncate text-xs font-black text-cafe">
                          {conv.participantName}
                        </h4>
                        <span className="shrink-0 text-[10px] font-semibold text-text-muted">
                          {conv.lastMessageTimestamp}
                        </span>
                      </div>

                      {prop && (
                        <p className="truncate text-[10px] font-bold text-forest mt-0.5">
                          {prop.title}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-2 mt-1">
                        {isTyping ? (
                          <p className="truncate text-xs font-bold text-forest animate-pulse flex items-center gap-1">
                            <span>●</span> escribiendo...
                          </p>
                        ) : (
                          <p className={`truncate text-xs ${conv.unreadCount > 0 ? 'font-black text-cafe' : 'text-text-muted font-normal'}`}>
                            {conv.lastMessage}
                          </p>
                        )}

                        {conv.unreadCount > 0 && (
                          <span className="flex h-4 min-w-[16px] shrink-0 items-center justify-center rounded-full bg-terracota px-1 text-[10px] font-black text-white">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <p className="text-xs text-text-muted">No se encontraron conversaciones.</p>
              </div>
            )}
          </div>
        </aside>

        {/* ══════════════ RIGHT MAIN PANEL: ACTIVE CONVERSATION ══════════════ */}
        <main
          className={`flex flex-1 flex-col min-w-0 bg-[#EFEAE2] transition-all duration-300 ${
            mobileView === 'chat' ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Active Chat Header */}
              <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3 shadow-xs shrink-0">
                <div className="flex min-w-0 items-center gap-3">
                  {/* Mobile back to list button */}
                  <button
                    onClick={() => setMobileView('list')}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-cafe hover:bg-crema md:hidden"
                    aria-label="Volver a la lista de chats"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="relative shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-sm font-black text-white shadow-xs">
                      {activeConversation.participantName.charAt(0)}
                    </div>
                    {activeConversation.participantOnline && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-jade" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="flex items-center gap-1.5 truncate text-sm font-black text-cafe">
                      <span className="truncate">{activeConversation.participantName}</span>
                      {activeOwner.verified && (
                        <span className="inline-flex items-center rounded-full bg-jade/10 px-1.5 py-0.5 text-[10px] font-black text-forest">
                          ✓ Verificado
                        </span>
                      )}
                    </h3>
                    <p className="truncate text-xs font-semibold">
                      {typingMap[activeConversation.id] ? (
                        <span className="text-forest animate-pulse font-bold">● escribiendo respuesta en vivo...</span>
                      ) : activeConversation.participantOnline ? (
                        <span className="text-forest font-bold">En línea ahora</span>
                      ) : (
                        <span className="text-text-muted">Responde en ~15 min</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Actions & Property Badge */}
                <div className="flex items-center gap-2">
                  {/* Property Card Pill */}
                  {activeProperty && (
                    <Link
                      to={`/propiedad/${activeProperty.id}`}
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

                  {/* Simulated Voice Call */}
                  <button
                    type="button"
                    onClick={() => setShowCallModal(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-[#FAF8F5] text-cafe hover:border-forest hover:bg-forest hover:text-white transition-all shadow-2xs"
                    title="Llamada de voz en vivo"
                  >
                    <Phone size={15} />
                  </button>

                  {/* Visit Shortcut */}
                  <Link
                    to={`/propiedad/${activeProperty.id}`}
                    className="hidden md:inline-flex items-center gap-1 rounded-xl bg-forest px-3 py-2 text-xs font-black text-white hover:bg-forest-dark transition-all shadow-xs"
                  >
                    <Calendar size={13} /> Agendar Visita
                  </Link>
                </div>
              </div>

              {/* Safety Warning Banner */}
              <div className="flex items-center justify-center gap-2 border-b border-amber-200/60 bg-amber-50/90 px-3 py-1.5 text-[11px] font-semibold text-amber-900 shrink-0">
                <ShieldAlert size={14} className="shrink-0 text-terracota" />
                <span className="truncate">
                  <strong>Consejo de seguridad:</strong> No realices depósitos antes de visitar el inmueble en persona y firmar el contrato.
                </span>
              </div>

              {/* Messages Feed */}
              <div
                ref={messagesFeedRef}
                className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3"
                style={{
                  backgroundImage: `radial-gradient(#00000008 1px, transparent 1px)`,
                  backgroundSize: '16px 16px',
                }}
              >
                {/* Date Badge */}
                <div className="flex justify-center my-2">
                  <span className="rounded-full bg-white/80 backdrop-blur-xs px-3 py-1 text-[10px] font-bold text-text-muted shadow-2xs border border-border/50">
                    Hoy
                  </span>
                </div>

                {activeConversation.messages.map((msg) => {
                  const isUser = isUserMsg(msg, user?.id);

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-[fade-in_0.15s_ease-out]`}
                    >
                      <div
                        className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl p-3.5 shadow-xs ${
                          isUser
                            ? 'bg-[#D9FDD3] text-cafe rounded-br-2xs border border-[#C2E8BC]'
                            : 'bg-white text-cafe rounded-bl-2xs border border-border/70'
                        }`}
                      >
                        {/* Sender header name */}
                        <p className={`text-[10px] font-black mb-1 ${isUser ? 'text-forest text-right' : 'text-forest'}`}>
                          {isUser ? 'Tú (Inquilino)' : activeConversation.participantName}
                        </p>

                        {/* Image if attached */}
                        {msg.image && (
                          <div className="mb-2 overflow-hidden rounded-xl">
                            <img src={msg.image} alt="Adjunto" className="max-h-60 w-full object-cover rounded-xl" />
                          </div>
                        )}

                        {/* Voice Note Simulation */}
                        {msg.isVoice ? (
                          <div className="flex items-center gap-2.5 py-1">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest text-white">
                              <Mic size={15} />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="h-4 w-1 rounded-full bg-forest/60" />
                              <span className="h-6 w-1 rounded-full bg-forest" />
                              <span className="h-3 w-1 rounded-full bg-forest/40" />
                              <span className="h-5 w-1 rounded-full bg-forest/70" />
                              <span className="h-2 w-1 rounded-full bg-forest/30" />
                              <span className="h-4 w-1 rounded-full bg-forest/60" />
                            </div>
                            <span className="text-[11px] font-mono font-bold text-text-muted">0:08</span>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm font-medium leading-relaxed break-words whitespace-pre-wrap">
                            {msg.text}
                          </p>
                        )}

                        {/* Timestamp and status check */}
                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-text-muted/80">
                          <span>{msg.timestamp}</span>
                          {isUser && (
                            <CheckCheck
                              size={13}
                              className={msg.status === 'read' ? 'text-[#53BDEB]' : 'text-forest/70'}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Typing Indicator Bubble */}
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

              {/* Image upload preview */}
              {selectedImage && (
                <div className="flex items-center gap-3 border-t border-border bg-white p-3 shrink-0">
                  <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-border">
                    <img src={selectedImage} alt="Previa" className="h-full w-full object-cover" />
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <span className="text-xs font-semibold text-cafe">Foto lista para enviar</span>
                </div>
              )}

              {/* Message Input Controls */}
              <div className="flex shrink-0 items-center gap-2 border-t border-border bg-white p-2.5 sm:p-3">
                {/* Image Attachment Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-text-muted hover:bg-crema hover:text-cafe transition-colors"
                  title="Adjuntar foto"
                >
                  <Paperclip size={18} />
                </button>

                {/* Simulated Voice Note Button */}
                <button
                  type="button"
                  onClick={handleSendVoiceNote}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-text-muted hover:bg-crema hover:text-forest transition-colors"
                  title="Enviar nota de voz simulada"
                >
                  <Mic size={18} />
                </button>

                {/* Text Input */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={`Escribe a ${activeConversation.participantName}...`}
                  className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-[#FDFBF7] px-4 text-xs sm:text-sm font-medium text-cafe outline-none transition-colors focus:border-forest focus:bg-white"
                />

                {/* Send Button */}
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!inputText.trim() && !selectedImage}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest text-white shadow-md transition-all hover:bg-forest-dark active:scale-95 disabled:opacity-40 disabled:hover:bg-forest"
                  aria-label="Enviar mensaje"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-text-muted">
              <p>Selecciona una conversación para empezar a chatear.</p>
            </div>
          )}
        </main>
      </div>

      {/* ══════════════ SIMULATED VOICE CALL MODAL ══════════════ */}
      {showCallModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-[fade-in_0.2s_ease-out]">
          <div className="flex w-full max-w-sm flex-col items-center rounded-3xl bg-[#1A1A1A] p-8 text-center text-white shadow-2xl border border-white/10">
            {/* Avatar Pulse */}
            <div className="relative mb-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-forest text-2xl font-black shadow-lg">
                {activeConversation?.participantName?.charAt(0) || 'M'}
              </div>
              <span className="absolute inset-0 rounded-full border-2 border-jade animate-ping" />
            </div>

            <h3 className="text-lg font-black">{activeConversation?.participantName}</h3>
            <p className="text-xs font-semibold text-white/60 mt-1">{activeConversation?.participantPhone}</p>

            <div className="my-6 rounded-full bg-white/10 px-4 py-1.5 text-xs font-mono text-jade font-bold">
              {callDuration > 0
                ? `${Math.floor(callDuration / 60)}:${String(callDuration % 60).padStart(2, '0')}`
                : 'Conectando audio en vivo...'}
            </div>

            <p className="text-xs text-white/50 mb-8 max-w-[240px]">
              Llamada de voz de prueba a través de la plataforma segura de RuwaJay Guatemala.
            </p>

            {/* End Call Button */}
            <button
              type="button"
              onClick={() => setShowCallModal(false)}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
              aria-label="Finalizar llamada"
            >
              <Phone size={22} className="rotate-[135deg]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
