import { useState } from 'react';
import { useCall } from '../../context/CallContext';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Home,
  Grid,
  Pause,
  Play,
  Minimize2,
  Maximize2,
  X,
  Delete,
  Wifi,
  WifiOff,
} from 'lucide-react';

export default function GlobalCallModal() {
  const {
    callStatus,
    activeCall,
    callDuration,
    isMuted,
    isSpeakerOn,
    isHeld,
    isMinimized,
    dialedDigits,
    remoteMuted,
    connectionQuality,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    toggleHold,
    toggleMinimize,
    sendDtmfTone,
    clearDialedDigits,
  } = useCall();

  const [showKeypad, setShowKeypad] = useState(false);

  if (callStatus === 'idle' || !activeCall) {
    return null;
  }

  // Identificar el nombre y foto de la otra persona con la que se habla
  const otherPersonName = activeCall.isCaller
    ? (activeCall.receiverName || 'Propietario')
    : (activeCall.callerName || 'Cliente');

  const otherPersonAvatar = activeCall.isCaller
    ? activeCall.receiverAvatar
    : activeCall.callerAvatar;

  const formatSecs = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Teclas del marcador DTMF con letras asociadas estilo teléfono
  const dialpadKeys = [
    { num: '1', sub: '' },
    { num: '2', sub: 'ABC' },
    { num: '3', sub: 'DEF' },
    { num: '4', sub: 'GHI' },
    { num: '5', sub: 'JKL' },
    { num: '6', sub: 'MNO' },
    { num: '7', sub: 'PQRS' },
    { num: '8', sub: 'TUV' },
    { num: '9', sub: 'WXYZ' },
    { num: '*', sub: '' },
    { num: '0', sub: '+' },
    { num: '#', sub: '' },
  ];

  // Connection quality indicator
  const ConnectionIndicator = () => {
    if (callStatus !== 'connected') return null;
    return (
      <div className={`flex items-center gap-1 text-[10px] font-bold ${
        connectionQuality === 'good' ? 'text-emerald-400' :
        connectionQuality === 'poor' ? 'text-amber-400' :
        'text-red-400'
      }`}>
        {connectionQuality === 'disconnected' ? <WifiOff size={10} /> : <Wifi size={10} />}
        {connectionQuality === 'good' ? 'Buena conexión' :
         connectionQuality === 'poor' ? 'Conexión débil' :
         'Sin conexión'}
      </div>
    );
  };

  // Remote mute indicator
  const RemoteMuteIndicator = () => {
    if (!remoteMuted || callStatus !== 'connected') return null;
    return (
      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-300/90 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
        <MicOff size={10} />
        <span>{otherPersonName.split(' ')[0]} está en silencio</span>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MODO FLOTANTE / MINIMIZADO (Permite navegar la app mientras se habla)
  // ──────────────────────────────────────────────────────────────────────────
  if (isMinimized && (callStatus === 'connected' || callStatus === 'calling')) {
    return (
      <aside
        aria-label="Llamada en curso minimizada"
        className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 rounded-2xl bg-[#161616]/95 p-3 px-4 text-white shadow-2xl border border-emerald-500/40 backdrop-blur-xl animate-[fade-in_0.2s_ease-out]"
      >
        {/* Avatar pequeño con indicador en vivo */}
        <div className="relative">
          {otherPersonAvatar ? (
            <img
              src={otherPersonAvatar}
              alt={otherPersonName}
              className="h-10 w-10 rounded-full object-cover border border-emerald-500/50"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0B5D3B] text-sm font-black text-white">
              {otherPersonName.charAt(0)}
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-[#161616] animate-pulse" />
        </div>

        {/* Info */}
        <div className="min-w-0 pr-1">
          <p className="truncate text-xs font-bold text-white max-w-[120px]">{otherPersonName}</p>
          <p className="text-[11px] font-mono font-black text-emerald-400">
            {callStatus === 'connected' ? formatSecs(callDuration) : 'Llamando...'}
          </p>
          {remoteMuted && callStatus === 'connected' && (
            <p className="text-[9px] text-amber-300 flex items-center gap-0.5">
              <MicOff size={8} /> Silenciado
            </p>
          )}
        </div>

        {/* Controles rápidos */}
        <div className="flex items-center gap-1.5 ml-2 border-l border-white/10 pl-2">
          {/* Mute */}
          <button
            type="button"
            onClick={toggleMute}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
              isMuted ? 'bg-amber-500 text-slate-950' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
            aria-label={isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
          >
            {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
          </button>

          {/* Altavoz */}
          <button
            type="button"
            onClick={toggleSpeaker}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
              isSpeakerOn ? 'bg-emerald-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white/70'
            }`}
            title={isSpeakerOn ? 'Altavoz activado' : 'Modo discreto'}
            aria-label={isSpeakerOn ? 'Altavoz activado' : 'Modo discreto'}
          >
            {isSpeakerOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          {/* Maximizar */}
          <button
            type="button"
            onClick={toggleMinimize}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
            title="Expandir llamada"
            aria-label="Expandir llamada"
          >
            <Maximize2 size={14} />
          </button>

          {/* Colgar */}
          <button
            type="button"
            onClick={endCall}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white transition-all shadow-md ml-1"
            title="Colgar llamada"
            aria-label="Colgar llamada"
          >
            <PhoneOff size={14} />
          </button>
        </div>
      </aside>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MODAL PRINCIPAL COMPLETO
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-[fade-in_0.2s_ease-out]">
      <div className="flex w-full max-w-sm flex-col items-center rounded-3xl bg-[#161616] p-6 sm:p-7 text-center text-white shadow-2xl border border-white/10 relative overflow-hidden">

        {/* Glow decorativo de fondo */}
        <div
          className="absolute -top-24 -left-24 w-48 h-48 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #10B981 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #D4962A 0%, transparent 70%)' }}
        />

        {/* Barra superior con botón de minimizar */}
        <div className="w-full flex items-center justify-between mb-4">
          {/* ── CALL STATE HEADER BADGE ── */}
          <div className="flex items-center gap-2">
            {callStatus === 'incoming' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Llamada Entrante
              </span>
            )}
            {callStatus === 'calling' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Llamando...
              </span>
            )}
            {callStatus === 'connected' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {isHeld ? 'En Espera (Pausa)' : 'En Llamada'}
              </span>
            )}
            {callStatus === 'ended' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
                Llamada Finalizada
              </span>
            )}
          </div>

          {/* Botón de minimizar a flotante */}
          {callStatus !== 'incoming' && (
            <button
              type="button"
              onClick={toggleMinimize}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all"
              title="Minimizar llamada para seguir navegando"
              aria-label="Minimizar llamada"
            >
              <Minimize2 size={15} />
            </button>
          )}
        </div>

        {/* ── AVATAR WITH RADAR / CALL RINGS ── */}
        {!showKeypad && (
          <div className="relative mb-4 mt-2">
            {otherPersonAvatar ? (
              <img
                src={otherPersonAvatar}
                alt={otherPersonName}
                className="h-24 w-24 rounded-full object-cover shadow-2xl border-2 border-emerald-500/50"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#0B5D3B] text-3xl font-black text-white shadow-2xl border-2 border-emerald-500/50">
                {otherPersonName.charAt(0)}
              </div>
            )}

            {/* Anillos animados para llamando/entrante */}
            {(callStatus === 'incoming' || callStatus === 'calling') && (
              <>
                <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-60 pointer-events-none" />
                <span className="absolute -inset-2 rounded-full border border-emerald-500/40 animate-pulse pointer-events-none" />
              </>
            )}

            {/* Ondas de voz animadas cuando está conectada */}
            {callStatus === 'connected' && !isHeld && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-black/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                {remoteMuted ? (
                  <>
                    <MicOff size={10} className="text-amber-400 mr-0.5" />
                    <span className="w-1 h-2 rounded-full bg-amber-400/40" />
                    <span className="w-1 h-2 rounded-full bg-amber-400/40" />
                    <span className="w-1 h-2 rounded-full bg-amber-400/40" />
                    <span className="w-1 h-2 rounded-full bg-amber-400/40" />
                  </>
                ) : (
                  <>
                    <span className="w-1 h-3 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="w-1 h-5 rounded-full bg-emerald-400 animate-bounce" />
                    <span className="w-1 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="w-1 h-4 rounded-full bg-emerald-400 animate-bounce" />
                  </>
                )}
              </div>
            )}

            {/* Remote mute overlay on avatar */}
            {remoteMuted && callStatus === 'connected' && (
              <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 border-2 border-[#161616] shadow-lg">
                <MicOff size={11} className="text-slate-950" />
              </div>
            )}
          </div>
        )}

        {/* ── PARTICIPANT NAME & PROPERTY INFO ── */}
        <h3 className="text-xl font-black text-white tracking-tight">{otherPersonName}</h3>
        <p className="text-xs font-semibold text-white/60 mt-0.5">
          {activeCall.isCaller ? 'Propietario' : 'Interesado'} · RuwaJay Guatemala
        </p>

        {/* Connection quality & remote mute indicators */}
        <div className="flex items-center gap-2 mt-1.5">
          <ConnectionIndicator />
          <RemoteMuteIndicator />
        </div>

        {activeCall.propertyTitle && !showKeypad && (
          <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold text-white/80 max-w-[260px] truncate">
            <Home size={13} className="shrink-0 text-[#D4962A]" />
            <span className="truncate">{activeCall.propertyTitle}</span>
          </div>
        )}

        {/* ── TIMER OR CALLING STATUS ── */}
        <div className="my-4 rounded-full bg-white/5 px-4 py-1.5 text-xs font-mono font-black border border-white/10">
          {callStatus === 'connected' && (
            <span className="text-emerald-400">{formatSecs(callDuration)}</span>
          )}
          {callStatus === 'calling' && (
            <span className="text-amber-300">Esperando respuesta del contacto...</span>
          )}
          {callStatus === 'incoming' && (
            <span className="text-emerald-300">Te está llamando ahora...</span>
          )}
          {callStatus === 'ended' && (
            <span className="text-white/60">Llamada terminada</span>
          )}
        </div>

        {/* ── TECLADO NUMÉRICO (DTMF DIALPAD) ── */}
        {showKeypad && callStatus === 'connected' && (
          <div className="w-full flex flex-col items-center my-2 p-3 bg-white/5 rounded-2xl border border-white/10 animate-[fade-in_0.2s_ease-out]">
            {/* Display de número marcado */}
            <div className="w-full flex items-center justify-between px-3 py-1.5 bg-black/40 rounded-xl mb-3 border border-white/10">
              <span className="font-mono text-lg font-bold text-emerald-400 tracking-wider truncate">
                {dialedDigits || 'Marcar número'}
              </span>
              {dialedDigits && (
                <button
                  type="button"
                  onClick={clearDialedDigits}
                  className="p-1 text-white/60 hover:text-white transition-all"
                  title="Borrar"
                  aria-label="Borrar"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Cuadrícula de dígitos telefónicos */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-[240px]">
              {dialpadKeys.map(({ num, sub }) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => sendDtmfTone(num)}
                  className="flex flex-col items-center justify-center h-12 rounded-xl bg-white/10 hover:bg-emerald-600 active:scale-95 transition-all text-white font-bold shadow-xs"
                  aria-label={`Marcar ${num}`}
                >
                  <span className="text-base leading-tight">{num}</span>
                  {sub && <span className="text-[9px] text-white/60 leading-none">{sub}</span>}
                </button>
              ))}
            </div>

            {/* Ocultar teclado */}
            <button
              type="button"
              onClick={() => setShowKeypad(false)}
              className="mt-3 text-xs font-bold text-white/60 hover:text-white transition-colors py-1"
            >
              Volver a la llamada
            </button>
          </div>
        )}

        {/* ── ACTION CONTROLS ── */}
        <div className="mt-2 flex items-center justify-center gap-4 w-full">
          {/* 1. LLAMADA ENTRANTE (INCOMING) */}
          {callStatus === 'incoming' && (
            <div className="flex items-center gap-8">
              {/* Rechazar */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={rejectCall}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl transition-all active:scale-95"
                  aria-label="Rechazar llamada"
                >
                  <PhoneOff size={22} />
                </button>
                <span className="text-[11px] font-bold text-white/60">Rechazar</span>
              </div>

              {/* Contestar */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={acceptCall}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/40 transition-all active:scale-95 animate-bounce"
                  aria-label="Contestar llamada"
                >
                  <Phone size={22} />
                </button>
                <span className="text-[11px] font-bold text-emerald-400">Contestar</span>
              </div>
            </div>
          )}

          {/* 2. LLAMANDO (OUTGOING) */}
          {callStatus === 'calling' && (
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={endCall}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl transition-all active:scale-95"
                aria-label="Cancelar llamada"
              >
                <PhoneOff size={22} />
              </button>
              <span className="text-[11px] font-bold text-white/60">Cancelar</span>
            </div>
          )}

          {/* 3. CONECTADA (CONNECTED - TODAS LAS OPCIONES: MUTEAR, ALTAVOZ, MARCAR, PAUSA, COLGAR) */}
          {callStatus === 'connected' && !showKeypad && (
            <div className="w-full flex flex-col gap-5">
              {/* Fila superior de opciones */}
              <div className="grid grid-cols-4 gap-3 w-full">
                {/* 1. Mutear micrófono */}
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className={`flex h-12 w-12 items-center justify-center rounded-full transition-all active:scale-95 border ${
                      isMuted
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                    }`}
                    title={isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
                    aria-label={isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
                  >
                    {isMuted ? <MicOff size={19} /> : <Mic size={19} />}
                  </button>
                  <span className="text-[10px] font-bold text-white/70">
                    {isMuted ? 'Silenciado' : 'Silenciar'}
                  </span>
                </div>

                {/* 2. Altavoz */}
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleSpeaker}
                    className={`flex h-12 w-12 items-center justify-center rounded-full transition-all active:scale-95 border ${
                      isSpeakerOn
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30'
                        : 'bg-white/10 hover:bg-white/20 text-white/70 border-white/20'
                    }`}
                    title={isSpeakerOn ? 'Altavoz activado' : 'Modo auricular'}
                    aria-label={isSpeakerOn ? 'Altavoz activado' : 'Modo auricular'}
                  >
                    {isSpeakerOn ? <Volume2 size={19} /> : <VolumeX size={19} />}
                  </button>
                  <span className="text-[10px] font-bold text-white/70">
                    {isSpeakerOn ? 'Altavoz ON' : 'Altavoz'}
                  </span>
                </div>

                {/* 3. Teclado / Marcar */}
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowKeypad(true)}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all active:scale-95"
                    title="Abrir teclado numérico"
                    aria-label="Abrir teclado numérico"
                  >
                    <Grid size={19} />
                  </button>
                  <span className="text-[10px] font-bold text-white/70">Marcar</span>
                </div>

                {/* 4. Pausa / En espera */}
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleHold}
                    className={`flex h-12 w-12 items-center justify-center rounded-full transition-all active:scale-95 border ${
                      isHeld
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                    }`}
                    title={isHeld ? 'Reanudar llamada' : 'Poner en espera'}
                    aria-label={isHeld ? 'Reanudar llamada' : 'Poner en espera'}
                  >
                    {isHeld ? <Play size={19} /> : <Pause size={19} />}
                  </button>
                  <span className="text-[10px] font-bold text-white/70">
                    {isHeld ? 'Reanudar' : 'Pausa'}
                  </span>
                </div>
              </div>

              {/* Botón principal de colgar */}
              <div className="flex flex-col items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={endCall}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-600/40 transition-all active:scale-95"
                  aria-label="Finalizar llamada"
                >
                  <PhoneOff size={22} />
                </button>
                <span className="text-[11px] font-bold text-red-400">Finalizar</span>
              </div>
            </div>
          )}

          {/* Si el teclado numérico está abierto, mostrar botón rápido de colgar */}
          {callStatus === 'connected' && showKeypad && (
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={endCall}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl transition-all active:scale-95"
                aria-label="Finalizar llamada"
              >
                <PhoneOff size={20} />
              </button>
              <span className="text-[10px] font-bold text-red-400">Finalizar</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
