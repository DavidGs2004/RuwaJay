import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useAuth } from './AuthContext';
import { useChat } from './ChatContext';
import { firebaseAuth } from '../lib/firebase';
import {
  ICE_SERVERS,
  CLIENT_WINDOW_ID,
  playIncomingRingTone,
  playCallingRingbackTone,
  playEndCallTone,
  playDtmfTone,
  stopAllTones,
  subscribeToIncomingCalls,
  createCallSession,
  subscribeToCallSession,
  answerCallSession,
  addIceCandidate,
  endCallSession,
  updateCallMuteState,
} from '../lib/callService';

const CallContext = createContext(null);

export function CallProvider({ children }) {
  const { user } = useAuth();
  const { sendMessage } = useChat();

  const chatUserId = String(firebaseAuth?.currentUser?.uid || user?.id || '').trim();
  const chatUserEmail = String(user?.email || firebaseAuth?.currentUser?.email || '').trim().toLowerCase();

  const allUserIds = [
    chatUserId,
    user?.id,
    firebaseAuth?.currentUser?.uid,
    user?._id,
  ].filter(Boolean).map(String);

  const allUserEmails = [
    chatUserEmail,
    user?.email,
    firebaseAuth?.currentUser?.email,
  ].filter(Boolean).map((e) => String(e).trim().toLowerCase());

  const [callStatus, setCallStatus] = useState('idle'); // 'idle' | 'calling' | 'incoming' | 'connected' | 'ended'
  const [activeCall, setActiveCall] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isHeld, setIsHeld] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dialedDigits, setDialedDigits] = useState('');
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good'); // 'good' | 'poor' | 'disconnected'

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const durationTimerRef = useRef(null);
  const unsubCallDocRef = useRef(null);
  const incomingCallUnsubRef = useRef(null);
  const handledCandidatesRef = useRef(new Set());
  const activeCallRef = useRef(null);
  const isSpeakerOnRef = useRef(true);
  const pendingCandidatesRef = useRef([]); // Buffer for ICE candidates before remote desc is set
  const callStatusRef = useRef('idle');
  const isCallerRef = useRef(false);

  // Sync refs with state
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    isSpeakerOnRef.current = isSpeakerOn;
  }, [isSpeakerOn]);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  /**
   * Helper: Espera brevemente (máximo maxWaitMs) a que ICE recopile los candidatos locales (host + STUN)
   * para incluirlos directamente en el SDP (Offer o Answer). Esto garantiza que no se pierda ningún candidato
   * local por desfase de tiempo o bloqueadores de peticiones.
   */
  const waitForIceGathering = useCallback((pc, maxWaitMs = 700) => {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      const timer = setTimeout(() => {
        console.log('[CallContext] ICE gathering timeout alcanzado (' + maxWaitMs + 'ms), enviando con candidatos recopilados');
        resolve();
      }, maxWaitMs);

      const checkState = () => {
        console.log('[CallContext] ICE gathering state:', pc.iceGatheringState);
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timer);
          pc.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };
      pc.addEventListener('icegatheringstatechange', checkState);
    });
  }, []);

  /**
   * Conecta el stream de audio remoto tanto al elemento DOM como a un objeto Audio en memoria
   * garantizando que la voz suene sin importar si la pestaña está en segundo plano o si el navegador
   * restringe el autoplay.
   */
  const attachRemoteStream = useCallback((stream) => {
    if (!stream) return;

    const audioTracks = stream.getAudioTracks();
    console.log('[CallContext] Conectando audio remoto. Pistas de audio:', audioTracks.length);
    audioTracks.forEach((track) => {
      track.enabled = true;
      console.log(`[CallContext] Pista de audio [${track.id}]: enabled=${track.enabled}, readyState=${track.readyState}, muted=${track.muted}`);
      track.onmute = () => console.log(`[CallContext] Pista ${track.id} esperando paquetes RTP...`);
      track.onunmute = () => console.log(`[CallContext] 🔊 PISTA ${track.id} RECIBIENDO VOZ EN TIEMPO REAL (RTP fluyendo)`);
    });

    const targetVolume = isSpeakerOnRef.current ? 1.0 : 0.4;

    // 1. Elemento del DOM
    const audioEl = remoteAudioRef.current;
    if (audioEl) {
      audioEl.srcObject = stream;
      audioEl.volume = targetVolume;
      audioEl.defaultMuted = false;
      audioEl.muted = false;

      audioEl.play().then(() => {
        console.log('[CallContext] DOM Audio reproduciendo voz exitosamente');
      }).catch((err) => {
        console.warn('[CallContext] DOM Audio bloqueado por política de autoplay, reintentando con clic:', err);
        const retryPlay = () => {
          audioEl.play().catch(() => {});
          window.removeEventListener('click', retryPlay);
        };
        window.addEventListener('click', retryPlay, { once: true });
      });
    }

    // 2. Respaldo directo en memoria (Audio() nativo, inmune a restricciones de DOM y tabs secundarias)
    try {
      if (!window._ruwajayAudio) {
        window._ruwajayAudio = new Audio();
        window._ruwajayAudio.autoplay = true;
      }
      window._ruwajayAudio.srcObject = stream;
      window._ruwajayAudio.volume = targetVolume;
      window._ruwajayAudio.defaultMuted = false;
      window._ruwajayAudio.muted = false;
      window._ruwajayAudio.play().then(() => {
        console.log('[CallContext] Objeto Audio nativo de respaldo reproduciendo correctamente');
      }).catch(() => {});
    } catch (e) {
      console.warn('[CallContext] Error en audio nativo secundario:', e);
    }
  }, []);

  /**
   * Flush any ICE candidates that were buffered before remoteDescription was set.
   */
  const flushPendingCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;

    const pending = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];

    for (const cand of pending) {
      const key = JSON.stringify(cand);
      if (!handledCandidatesRef.current.has(key)) {
        handledCandidatesRef.current.add(key);
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (err) {
          console.warn('[CallContext] Error adding buffered ICE candidate:', err);
        }
      }
    }
  }, []);

  /**
   * Process incoming ICE candidates - buffer if no remote desc, add directly otherwise.
   */
  const processRemoteCandidates = useCallback(async (candidates) => {
    const pc = pcRef.current;
    if (!pc || !Array.isArray(candidates) || candidates.length === 0) return;

    for (const cand of candidates) {
      if (!cand || !cand.candidate) continue;
      const key = JSON.stringify(cand);
      if (handledCandidatesRef.current.has(key)) continue;

      if (pc.remoteDescription) {
        handledCandidatesRef.current.add(key);
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (err) {
          console.warn('[CallContext] Error adding ICE candidate:', err);
        }
      } else {
        // Buffer until remote description is set
        pendingCandidatesRef.current.push(cand);
      }
    }
  }, []);

  /**
   * Setup WebRTC connection state monitoring.
   */
  const setupConnectionMonitoring = useCallback((pc) => {
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log('[CallContext] ICE connection state:', state);

      switch (state) {
        case 'connected':
        case 'completed':
          setConnectionQuality('good');
          break;
        case 'checking':
          setConnectionQuality('good');
          break;
        case 'disconnected':
          setConnectionQuality('poor');
          // Give it a chance to reconnect (ICE restart)
          setTimeout(() => {
            if (pc.iceConnectionState === 'disconnected') {
              setConnectionQuality('disconnected');
            }
          }, 5000);
          break;
        case 'failed':
          setConnectionQuality('disconnected');
          console.warn('[CallContext] ICE connection failed');
          break;
        case 'closed':
          setConnectionQuality('disconnected');
          break;
        default:
          break;
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('[CallContext] Connection state:', state);

      if (state === 'failed') {
        console.error('[CallContext] Peer connection failed');
        setConnectionQuality('disconnected');
      }
    };
  }, []);

  // Limpiar conexión WebRTC y pistas de audio
  const cleanupMediaAndPeer = useCallback(() => {
    stopAllTones();

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (unsubCallDocRef.current) {
      unsubCallDocRef.current();
      unsubCallDocRef.current = null;
    }

    if (incomingCallUnsubRef.current) {
      incomingCallUnsubRef.current();
      incomingCallUnsubRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      try {
        pcRef.current.ontrack = null;
        pcRef.current.onicecandidate = null;
        pcRef.current.oniceconnectionstatechange = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.close();
      } catch { /* ignore */ }
      pcRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }

    if (window._ruwajayAudio) {
      try {
        window._ruwajayAudio.pause();
        window._ruwajayAudio.srcObject = null;
      } catch {}
    }

    handledCandidatesRef.current.clear();
    pendingCandidatesRef.current = [];
    setIsMuted(false);
    setIsHeld(false);
    setDialedDigits('');
    setIsMinimized(false);
    setRemoteMuted(false);
    setConnectionQuality('good');
  }, []);

  // Escuchar llamadas entrantes dirigidas a este usuario en segundo plano (Firestore + Local)
  useEffect(() => {
    return subscribeToIncomingCalls({
      userIds: allUserIds,
      userEmails: allUserEmails,
      userName: user?.name || '',
    }, (incomingData) => {
      // Ignorar únicamente si esta ventana ya está activamente en llamada (calling o connected)
      if (activeCallRef.current && (activeCallRef.current.status === 'calling' || activeCallRef.current.status === 'connected')) {
        return;
      }
      if (incomingData.callerWindowId && incomingData.callerWindowId === CLIENT_WINDOW_ID) return;

      setActiveCall({
        ...incomingData,
        isCaller: false, // La persona que recibe NO es el emisor
      });
      setCallStatus('incoming');
      playIncomingRingTone();

      // Escuchar si la otra parte cancela o cuelga mientras aún está sonando
      if (incomingCallUnsubRef.current) {
        incomingCallUnsubRef.current();
      }
      incomingCallUnsubRef.current = subscribeToCallSession(incomingData.id, (callUpdate) => {
        if (callUpdate && (callUpdate.status === 'ended' || callUpdate.status === 'rejected')) {
          if (incomingCallUnsubRef.current) {
            incomingCallUnsubRef.current();
            incomingCallUnsubRef.current = null;
          }
          cleanupMediaAndPeer();
          setActiveCall(null);
          setCallStatus('idle');
        }
      }, incomingData.roomId);

      // Alerta visual parpadeante en la pestaña del navegador
      try {
        const origTitle = document.title;
        document.title = '📞 ¡LLAMADA ENTRANTE! - RuwaJay';
        const interval = setInterval(() => {
          document.title = document.title.includes('LLAMADA') ? origTitle : '📞 ¡LLAMADA ENTRANTE! - RuwaJay';
        }, 1100);

        const stopTitleAlert = () => {
          clearInterval(interval);
          document.title = origTitle;
          window.removeEventListener('focus', stopTitleAlert);
        };
        window.addEventListener('focus', stopTitleAlert);
      } catch { /* ignore */ }

      // Notificación del sistema si está habilitada
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('📞 Llamada entrante en RuwaJay', {
            body: `${incomingData.callerName || 'Contacto'} te está llamando...`,
            icon: incomingData.callerAvatar || '/Casas/cat-familiar.jpg',
            tag: 'ruwajay-call-ring',
          });
        } catch { /* ignore */ }
      }
    });
  }, [allUserIds.join(','), allUserEmails.join(','), user?.name, cleanupMediaAndPeer]);

  // Formato mm:ss para el resumen en el chat
  const formatDurationString = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // INICIAR LLAMADA (Cliente -> Propietario o Propietario -> Cliente)
  const startCall = useCallback(async ({
    recipientId,
    recipientName,
    recipientAvatar = '',
    recipientPhone = '',
    recipientEmail = '',
    propertyTitle = 'Propiedad RuwaJay',
    propertyImage = '',
    roomId = null,
    conversation = null,
  }) => {
    if (!recipientId && !recipientEmail && !recipientName) {
      window.alert('No se pudo identificar al contacto para iniciar la llamada.');
      return;
    }

    cleanupMediaAndPeer();
    isCallerRef.current = true;

    try {
      // 1. Obtener micrófono del usuario
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;

      // 2. Crear conexión PeerConnection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Setup connection monitoring
      setupConnectionMonitoring(pc);

      // Agregar pistas locales
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Escuchar pista remota de audio - CRITICAL: must handle ontrack
      pc.ontrack = (event) => {
        console.log('[CallContext] Caller received remote track:', event.track.kind);
        if (event.streams && event.streams[0]) {
          attachRemoteStream(event.streams[0]);
        } else if (event.track) {
          // Fallback: create stream from track
          const remoteStream = new MediaStream([event.track]);
          attachRemoteStream(remoteStream);
        }
      };

      // Buffer para candidatos que se generen antes de tener el ID de sesión
      let createdSessionId = null;
      const bufferedEarlyCandidates = [];

      // 3. REGISTRAR onicecandidate ANTES de setLocalDescription para no perder ningún candidato host
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[CallContext] Llamante generó candidato ICE:', event.candidate.candidate?.slice(0, 45));
          if (createdSessionId) {
            addIceCandidate(createdSessionId, event.candidate, true, roomId || conversation?.id || null);
          } else {
            bufferedEarlyCandidates.push(event.candidate);
          }
        }
      };

      // 4. Crear SDP Offer
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);

      // Esperar brevemente a que se recopilen los candidatos locales y se incluyan en el SDP
      await waitForIceGathering(pc, 700);

      playCallingRingbackTone();

      // Recopilar todos los posibles emails e IDs para matching sin fallos
      const allRecipientEmails = [
        recipientEmail,
        conversation?.ownerEmail,
        conversation?.seekerEmail,
        conversation?.participantEmail,
      ].filter(Boolean).map((e) => String(e).toLowerCase().trim());

      const allRecipientIds = [
        recipientId,
        conversation?.ownerId,
        conversation?.seekerId,
        conversation?.participantId,
      ].filter(Boolean).map(String);

      // 5. Registrar sesión de llamada con el SDP completo (que ya incluye candidatos host)
      const callData = {
        callerId: chatUserId,
        callerIds: allUserIds,
        callerName: user?.name || 'Cliente',
        callerAvatar: user?.avatarImage || user?.photoURL || user?.avatar || '',
        callerEmail: chatUserEmail,
        callerEmails: allUserEmails,
        receiverId: recipientId,
        receiverIds: allRecipientIds,
        receiverName: recipientName || 'Propietario',
        receiverAvatar: recipientAvatar,
        receiverPhone: recipientPhone,
        receiverEmail: recipientEmail,
        receiverEmails: allRecipientEmails,
        ownerId: conversation?.ownerId || (recipientId !== chatUserId ? recipientId : null),
        seekerId: conversation?.seekerId || chatUserId,
        ownerEmail: conversation?.ownerEmail || (recipientEmail !== chatUserEmail ? recipientEmail : null),
        seekerEmail: conversation?.seekerEmail || chatUserEmail,
        participantEmails: [
          ...allUserEmails,
          ...allRecipientEmails,
        ].filter(Boolean),
        participants: [
          ...allUserIds,
          ...allRecipientIds,
        ].filter(Boolean),
        propertyTitle,
        propertyImage,
        roomId: roomId || conversation?.id || null,
        callerWindowId: CLIENT_WINDOW_ID,
        isCaller: true,
        offer: { sdp: pc.localDescription?.sdp || offer.sdp, type: pc.localDescription?.type || offer.type },
        callerMuted: false,
        receiverMuted: false,
      };

      const session = await createCallSession(callData);
      createdSessionId = session.id;
      setActiveCall({ ...callData, id: session.id });
      setCallStatus('calling');
      setCallDuration(0);

      // Despachar cualquier candidato que se haya generado mientras se guardaba la sesión
      for (const cand of bufferedEarlyCandidates) {
        addIceCandidate(session.id, cand, true, callData.roomId);
      }

      // 6. Escuchar la respuesta del receptor
      unsubCallDocRef.current = subscribeToCallSession(session.id, async (updatedData) => {
        if (!updatedData) return;

        // Track remote mute state
        if (updatedData.receiverMuted !== undefined) {
          setRemoteMuted(updatedData.receiverMuted);
        }

        // Si el receptor contestó
        if (updatedData.status === 'connected' && updatedData.answer) {
          stopAllTones();
          setCallStatus('connected');

          if (!pc.currentRemoteDescription && updatedData.answer?.sdp) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(updatedData.answer));
              console.log('[CallContext] Caller: Remote description set, flushing candidates');
              // Flush any buffered candidates now that remote desc is set
              await flushPendingCandidates();
            } catch (err) {
              console.warn('Error aplicando SDP Answer:', err);
            }
          }

          // Iniciar contador de duración
          if (!durationTimerRef.current) {
            durationTimerRef.current = setInterval(() => {
              setCallDuration((prev) => prev + 1);
            }, 1000);
          }
        }

        // Incorporar candidatos ICE del receptor
        if (Array.isArray(updatedData.receiverCandidates)) {
          await processRemoteCandidates(updatedData.receiverCandidates);
        }

        // Si la llamada fue rechazada o finalizada por la otra parte
        if (updatedData.status === 'ended' || updatedData.status === 'rejected') {
          playEndCallTone();
          setCallStatus('ended');
          setTimeout(() => {
            cleanupMediaAndPeer();
            setActiveCall(null);
            setCallStatus('idle');
          }, 1500);
        }
      });
    } catch (err) {
      console.warn('Error al iniciar llamada WebRTC:', err);
      stopAllTones();
      cleanupMediaAndPeer();
      window.alert('No se pudo acceder al micrófono para la llamada. Por favor permite el acceso al micrófono en tu navegador.');
    }
  }, [chatUserId, chatUserEmail, allUserIds, allUserEmails, user, cleanupMediaAndPeer, attachRemoteStream, setupConnectionMonitoring, flushPendingCandidates, processRemoteCandidates]);

  // ACEPTAR LLAMADA ENTRANTE (Receptor)
  const acceptCall = useCallback(async () => {
    if (!activeCall?.id || !activeCall?.offer) return;
    stopAllTones();
    isCallerRef.current = false;

    try {
      // 1. Micrófono del receptor
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;

      // 2. PeerConnection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Setup connection monitoring
      setupConnectionMonitoring(pc);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Listen for remote audio track - CRITICAL
      pc.ontrack = (event) => {
        console.log('[CallContext] Receiver got remote track:', event.track.kind);
        if (event.streams && event.streams[0]) {
          attachRemoteStream(event.streams[0]);
        } else if (event.track) {
          const remoteStream = new MediaStream([event.track]);
          attachRemoteStream(remoteStream);
        }
      };

      // 3. Aplicar Offer del llamante
      await pc.setRemoteDescription(new RTCSessionDescription(activeCall.offer));
      console.log('[CallContext] Receiver: Remote description (offer) set');

      // Agregar candidatos ICE del llamante que ya llegaron
      if (Array.isArray(activeCall.callerCandidates)) {
        for (const cand of activeCall.callerCandidates) {
          if (!cand || !cand.candidate) continue;
          const key = JSON.stringify(cand);
          if (!handledCandidatesRef.current.has(key)) {
            handledCandidatesRef.current.add(key);
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (err) {
              console.warn('[CallContext] Error adding caller candidate:', err);
            }
          }
        }
      }

      // REGISTRAR onicecandidate ANTES de setLocalDescription en el receptor
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[CallContext] Receptor generó candidato ICE:', event.candidate.candidate?.slice(0, 45));
          addIceCandidate(activeCall.id, event.candidate, false, activeCall.roomId);
        }
      };

      // 4. Crear Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Esperar brevemente a recopilar candidatos host del receptor
      await waitForIceGathering(pc, 700);

      // 5. Enviar Answer al llamante con el SDP completo
      const finalAnswerSdp = pc.localDescription?.sdp || answer.sdp;
      await answerCallSession(activeCall.id, { sdp: finalAnswerSdp, type: answer.type }, activeCall.roomId);

      setCallStatus('connected');
      setCallDuration(0);

      // Iniciar cronómetro
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      // 6. Escuchar actualizaciones (fin de llamada + candidatos adicionales + mute state)
      unsubCallDocRef.current = subscribeToCallSession(activeCall.id, async (updatedData) => {
        if (!updatedData) return;

        // Track remote mute state (caller's mute state)
        if (updatedData.callerMuted !== undefined) {
          setRemoteMuted(updatedData.callerMuted);
        }

        // Incorporar candidatos ICE adicionales del llamante
        if (Array.isArray(updatedData.callerCandidates)) {
          await processRemoteCandidates(updatedData.callerCandidates);
        }

        if (updatedData.status === 'ended' || updatedData.status === 'rejected') {
          playEndCallTone();
          setCallStatus('ended');
          setTimeout(() => {
            cleanupMediaAndPeer();
            setActiveCall(null);
            setCallStatus('idle');
          }, 1500);
        }
      });
    } catch (err) {
      console.warn('Error contestando llamada:', err);
      cleanupMediaAndPeer();
      window.alert('No se pudo acceder al micrófono para contestar la llamada.');
    }
  }, [activeCall, cleanupMediaAndPeer, attachRemoteStream, setupConnectionMonitoring, processRemoteCandidates]);

  // RECHAZAR LLAMADA
  const rejectCall = useCallback(async () => {
    stopAllTones();
    const callToReject = activeCall;
    setCallStatus('ended');

    if (callToReject?.id) {
      await endCallSession(callToReject.id, 'rejected', callToReject.roomId);
      if (callToReject.roomId) {
        sendMessage(callToReject.roomId, '📞 Llamada rechazada');
      }
    }

    cleanupMediaAndPeer();
    setActiveCall(null);
    setCallStatus('idle');
  }, [activeCall, cleanupMediaAndPeer, sendMessage]);

  // FINALIZAR / COLGAR LLAMADA ACTIVA
  const endCall = useCallback(async () => {
    playEndCallTone();
    const currentCallSnapshot = activeCall;
    const finalDuration = callDuration;

    setCallStatus('ended');

    if (currentCallSnapshot?.id) {
      await endCallSession(currentCallSnapshot.id, 'ended', currentCallSnapshot.roomId);
      if (currentCallSnapshot.roomId) {
        const durText = finalDuration > 0 ? ` (${formatDurationString(finalDuration)})` : '';
        sendMessage(currentCallSnapshot.roomId, `📞 Llamada de voz finalizada${durText}`);
      }
    }

    setTimeout(() => {
      cleanupMediaAndPeer();
      setActiveCall(null);
      setCallStatus('idle');
      setCallDuration(0);
    }, 1200);
  }, [activeCall, callDuration, cleanupMediaAndPeer, sendMessage]);

  // Silenciar / Activar micrófono + notify the other party via Firestore
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMuted = !audioTrack.enabled;
        setIsMuted(newMuted);

        // Notify the other party of mute state via Firestore
        const currentCall = activeCallRef.current;
        if (currentCall?.id) {
          updateCallMuteState(
            currentCall.id,
            isCallerRef.current,
            newMuted,
            currentCall.roomId
          );
        }
      }
    }
  }, []);

  // Altavoz: Alterna entre altavoz al 100% y modo auricular/discreto al 40%
  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => {
      const next = !prev;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.volume = next ? 1.0 : 0.4;
      }
      return next;
    });
  }, []);

  // Poner llamada en espera (Hold)
  const toggleHold = useCallback(() => {
    setIsHeld((prev) => {
      const next = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !next && !isMuted;
        });
      }
      return next;
    });
  }, [isMuted]);

  // Minimizar a widget flotante / Expandir modal completo
  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  // Marcar número en teclado DTMF
  const sendDtmfTone = useCallback((digit) => {
    setDialedDigits((prev) => (prev + digit).slice(-18));
    playDtmfTone(digit);
  }, []);

  // Borrar dígitos marcados
  const clearDialedDigits = useCallback(() => {
    setDialedDigits('');
  }, []);

  const value = {
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
    remoteAudioRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    toggleHold,
    toggleMinimize,
    sendDtmfTone,
    clearDialedDigits,
  };

  return (
    <CallContext.Provider value={value}>
      {children}
      {/* Elemento de audio global invisible pero presente en el DOM layout (no display:none para evitar throttle de Chromium) */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0.01,
          pointerEvents: 'none',
        }}
      />
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall debe usarse dentro de CallProvider');
  }
  return context;
}
