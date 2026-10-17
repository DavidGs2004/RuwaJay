import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { firestore, firebaseWebEnabled, firebaseAuth } from './firebase';
import { publishRealtimeEvent, subscribeRealtimeEvents } from './realtimeService';

const optionalTurnServer = import.meta.env.VITE_TURN_URL ? {
  urls: import.meta.env.VITE_TURN_URL.split(',').map((url) => url.trim()).filter(Boolean),
  username: import.meta.env.VITE_TURN_USERNAME || '',
  credential: import.meta.env.VITE_TURN_CREDENTIAL || '',
} : null;

export const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Free TURN relay servers for NAT traversal (needed when direct peer-to-peer fails)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    ...(optionalTurnServer ? [optionalTurnServer] : []),
  ],
  iceCandidatePoolSize: 10,
};

const CALL_SIGNAL_KEY = 'ruwajay_active_call_signal';
const CALL_EVENT = 'ruwajay:call-signal';

export function getClientWindowId() {
  if (typeof window === 'undefined') return 'server';
  try {
    let wid = sessionStorage.getItem('ruwajay_window_id');
    if (!wid) {
      wid = `win_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem('ruwajay_window_id', wid);
    }
    return wid;
  } catch {
    return `win_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

export const CLIENT_WINDOW_ID = getClientWindowId();

/**
 * Elimina recursivamente campos undefined de un objeto para evitar que Firestore falle.
 */
export function stripUndefined(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  const clean = {};
  Object.entries(obj).forEach(([key, val]) => {
    if (val !== undefined) {
      clean[key] = (val && typeof val === 'object' && !(val instanceof Date))
        ? stripUndefined(val)
        : val;
    }
  });
  return clean;
}

// ========================================================================
// WEB AUDIO API SOUND GENERATOR (RINGTONES & DISCONNECT CHIMES)
// Zero external files, works across Chrome, Safari iOS, Edge, and Android
// ========================================================================
let audioCtx = null;
let ringInterval = null;
let callingInterval = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playIncomingRingTone() {
  stopAllTones();
  const ctx = getAudioContext();
  if (!ctx) return;

  const playRingBurst = () => {
    try {
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      // Dual-frequency classic telephone ring (440Hz + 480Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      gain.gain.setValueAtTime(0.18, now + 1.6);
      gain.gain.linearRampToValueAtTime(0, now + 1.8);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.8);
      osc2.stop(now + 1.8);
    } catch { /* ignore */ }
  };

  playRingBurst();
  ringInterval = setInterval(playRingBurst, 3000);
}

export function playCallingRingbackTone() {
  stopAllTones();
  const ctx = getAudioContext();
  if (!ctx) return;

  const playTone = () => {
    try {
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(425, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
      gain.gain.setValueAtTime(0.12, now + 1.0);
      gain.gain.linearRampToValueAtTime(0, now + 1.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.1);
    } catch { /* ignore */ }
  };

  playTone();
  callingInterval = setInterval(playTone, 3200);
}

export function playEndCallTone() {
  stopAllTones();
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.25);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch { /* ignore */ }
}

export function stopAllTones() {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
  if (callingInterval) {
    clearInterval(callingInterval);
    callingInterval = null;
  }
}

const DTMF_FREQS = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
};

/**
 * Reproduce el tono telefónico DTMF real para una tecla marcada (0-9, *, #).
 */
export function playDtmfTone(digit) {
  const freqs = DTMF_FREQS[digit];
  if (!freqs) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(freqs[0], now);
    osc2.frequency.setValueAtTime(freqs[1], now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.16);
    osc2.stop(now + 0.16);
  } catch { /* ignore */ }
}

// ========================================================================
// CALL SIGNALING DISPATCH & STORAGE (FIRESTORE + REALTIME BROADCAST)
// ========================================================================

function readLocalCallSignal() {
  try {
    return JSON.parse(localStorage.getItem(CALL_SIGNAL_KEY) || 'null');
  } catch {
    return null;
  }
}

function notifyLocalCallSignal(signalData) {
  if (signalData) {
    localStorage.setItem(CALL_SIGNAL_KEY, JSON.stringify(signalData));
  } else {
    localStorage.removeItem(CALL_SIGNAL_KEY);
  }
  window.dispatchEvent(new CustomEvent(CALL_EVENT, { detail: signalData }));
  publishRealtimeEvent('CALL_SIGNAL', signalData);
}

function timestampToMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Sanitiza candidatos ICE eliminando campos undefined que harían fallar a Firestore.
 */
function sanitizeCandidate(candidate) {
  if (!candidate) return null;
  const raw = candidate.toJSON ? candidate.toJSON() : candidate;
  if (!raw || !raw.candidate) return null;
  const clean = {
    candidate: String(raw.candidate),
  };
  if (raw.sdpMid !== undefined && raw.sdpMid !== null) {
    clean.sdpMid = String(raw.sdpMid);
  }
  if (raw.sdpMLineIndex !== undefined && raw.sdpMLineIndex !== null) {
    clean.sdpMLineIndex = Number(raw.sdpMLineIndex);
  }
  if (raw.usernameFragment) {
    clean.usernameFragment = String(raw.usernameFragment);
  }
  return clean;
}

/**
 * Escucha llamadas entrantes para el usuario actual (tanto en Firestore como localmente).
 * Admite tanto (userId, userEmail, callback) como ({ userIds, userEmails, userName }, callback).
 * Usa query de status == 'calling' en Firestore para entrega garantizada sin index compuesto.
 */
export function subscribeToIncomingCalls(userArg, emailArg, callbackArg) {
  let userIds = [];
  let userEmails = [];
  let userName = '';
  let onIncomingCall = null;

  if (typeof userArg === 'object' && userArg !== null && typeof emailArg === 'function') {
    userIds = Array.isArray(userArg.userIds) ? userArg.userIds : [userArg.userId || userArg.id].filter(Boolean);
    userEmails = Array.isArray(userArg.userEmails) ? userArg.userEmails : [userArg.userEmail || userArg.email].filter(Boolean);
    userName = userArg.userName || userArg.name || '';
    onIncomingCall = emailArg;
  } else {
    userIds = Array.isArray(userArg) ? userArg : [userArg].filter(Boolean);
    userEmails = Array.isArray(emailArg) ? emailArg : [emailArg].filter(Boolean);
    onIncomingCall = callbackArg;
  }

  if (typeof onIncomingCall !== 'function') return () => {};

  const idSet = new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean));
  const emailSet = new Set(userEmails.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean));
  const handledCallIds = new Set();

  if (idSet.size === 0 && emailSet.size === 0) return () => {};

  const isTargetCall = (data) => {
    if (!data || data.status !== 'calling') return false;

    // 0. Si la llamada fue creada hace más de 45 segundos, ignorar (llamada expirada)
    if (data.createdAt) {
      const callTime = timestampToMillis(data.createdAt);
      if (callTime && Date.now() - callTime > 45000) {
        return false;
      }
    }

    // 1. NUNCA timbrar en la ventana exacta que originó la llamada
    if (data.callerWindowId && data.callerWindowId === CLIENT_WINDOW_ID) {
      return false;
    }

    // 2. La llamada sólo puede timbrar al receptor explícito.
    const matchesReceiver = (
      (data.receiverId && idSet.has(String(data.receiverId).trim())) ||
      (Array.isArray(data.receiverIds) && data.receiverIds.some((id) => idSet.has(String(id).trim()))) ||
      (data.receiverEmail && emailSet.has(String(data.receiverEmail).trim().toLowerCase())) ||
      (Array.isArray(data.receiverEmails) && data.receiverEmails.some((e) => emailSet.has(String(e).trim().toLowerCase())))
    );

    return Boolean(matchesReceiver);
  };

  const emitOnce = (data) => {
    if (!data?.id) return;
    if (handledCallIds.has(data.id)) return;
    handledCallIds.add(data.id);
    if (handledCallIds.size > 50) {
      const arr = [...handledCallIds];
      arr.slice(0, arr.length - 20).forEach((id) => handledCallIds.delete(id));
    }
    onIncomingCall(data);
  };

  // 1. Escuchar eventos locales (CustomEvent / storage entre ventanas/pestañas)
  const handleLocal = (e) => {
    let data = null;
    if (e && e.detail) {
      data = e.detail;
    } else if (e && e.key) {
      if (e.key !== CALL_SIGNAL_KEY) return;
      try {
        data = e.newValue ? JSON.parse(e.newValue) : null;
      } catch {
        data = null;
      }
    } else {
      data = readLocalCallSignal();
    }
    if (isTargetCall(data)) emitOnce(data);
  };

  // 2. BroadcastChannel vía subscribeRealtimeEvents
  const unsubRealtime = subscribeRealtimeEvents((event) => {
    if (event?.type === 'CALL_SIGNAL' && isTargetCall(event.payload)) {
      emitOnce(event.payload);
    }
  });

  window.addEventListener(CALL_EVENT, handleLocal);
  window.addEventListener('ruwajay:call_signal', handleLocal);
  window.addEventListener('storage', handleLocal);

  // 3. Escuchar sólo documentos dirigidos al usuario autenticado.
  const firestoreUnsubscribers = [];
  if (firebaseWebEnabled && firestore && firebaseAuth?.currentUser) {
    const listenTo = (targetQuery) => {
      const unsubscribe = onSnapshot(targetQuery, (snapshot) => {
        snapshot.docs.forEach((docSnap) => {
          const callData = { id: docSnap.id, ...docSnap.data() };
          if (isTargetCall(callData)) emitOnce(callData);
        });
      }, (err) => console.warn('Error escuchando llamadas entrantes en Firestore:', err));
      firestoreUnsubscribers.push(unsubscribe);
    };

    idSet.forEach((userId) => {
      listenTo(query(collection(firestore, 'active_calls'), where('receiverIds', 'array-contains', userId)));
    });
    emailSet.forEach((email) => {
      listenTo(query(collection(firestore, 'active_calls'), where('receiverEmails', 'array-contains', email)));
    });
  }

  // Chequeo inicial: leer señal local por si ya hay una llamada en curso
  const initialSignal = readLocalCallSignal();
  if (isTargetCall(initialSignal)) emitOnce(initialSignal);

  return () => {
    unsubRealtime();
    window.removeEventListener(CALL_EVENT, handleLocal);
    window.removeEventListener('ruwajay:call_signal', handleLocal);
    window.removeEventListener('storage', handleLocal);
    firestoreUnsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

/**
 * Crea una sesión de llamada e inicia el timbrado.
 */
export async function createCallSession(callData) {
  if (firebaseWebEnabled && firestore && !firebaseAuth?.currentUser) {
    throw new Error('CALL_REQUIRES_FIREBASE_AUTH');
  }

  const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const fullCall = {
    ...callData,
    callerWindowId: CLIENT_WINDOW_ID,
    id: callId,
    status: 'calling', // 'calling' | 'connected' | 'ended' | 'rejected'
    callerCandidates: [],
    receiverCandidates: [],
    createdAt: new Date().toISOString(),
  };

  // Notificar en Firestore si está conectado
  if (firebaseWebEnabled && firestore && firebaseAuth?.currentUser) {
    const cleanCall = stripUndefined(fullCall);
    await setDoc(doc(firestore, 'active_calls', callId), {
      ...cleanCall,
      createdAt: serverTimestamp(),
    });

    if (cleanCall.roomId) {
      try {
        await setDoc(doc(firestore, 'conversations', cleanCall.roomId), {
          activeCall: {
            ...cleanCall,
            updatedAt: serverTimestamp(),
          },
        }, { merge: true });
      } catch (convErr) {
        console.warn('Error guardando llamada en conversations:', convErr);
      }
    }
  }

  // Notificar localmente sólo después de que la sesión compartida exista.
  notifyLocalCallSignal(fullCall);

  return fullCall;
}

/**
 * Escucha las actualizaciones de una llamada específica (SDP offer, answer, candidates, status).
 */
export function subscribeToCallSession(callId, onUpdate, roomId = null) {
  if (!callId) return () => {};

  const handleLocal = (e) => {
    let data = null;
    if (e && e.detail) {
      data = e.detail;
    } else if (e && e.key) {
      if (e.key !== CALL_SIGNAL_KEY) return;
      try {
        data = e.newValue ? JSON.parse(e.newValue) : null;
      } catch {
        data = null;
      }
    } else {
      data = readLocalCallSignal();
    }
    if (data && data.id === callId) {
      onUpdate(data);
    }
  };

  const unsubRealtime = subscribeRealtimeEvents((event) => {
    if (event?.type === 'CALL_SIGNAL' && event.payload && event.payload.id === callId) {
      onUpdate(event.payload);
    }
  });

  window.addEventListener(CALL_EVENT, handleLocal);
  window.addEventListener('ruwajay:call_signal', handleLocal);
  window.addEventListener('storage', handleLocal);

  let unsubscribeFirestore = () => {};
  let unsubscribeConvDoc = () => {};

  if (firebaseWebEnabled && firestore && firebaseAuth?.currentUser) {
    unsubscribeFirestore = onSnapshot(
      doc(firestore, 'active_calls', callId),
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate({ id: snapshot.id, ...snapshot.data() });
        }
      },
      (err) => console.warn('Nota active_calls:', err)
    );

    if (roomId) {
      unsubscribeConvDoc = onSnapshot(
        doc(firestore, 'conversations', roomId),
        (snapshot) => {
          if (snapshot.exists()) {
            const cData = snapshot.data();
            if (cData?.activeCall && cData.activeCall.id === callId) {
              onUpdate(cData.activeCall);
            }
          }
        },
        (err) => console.warn('Nota conversations activeCall:', err)
      );
    }
  }

  return () => {
    unsubRealtime();
    window.removeEventListener(CALL_EVENT, handleLocal);
    window.removeEventListener('ruwajay:call_signal', handleLocal);
    window.removeEventListener('storage', handleLocal);
    unsubscribeFirestore();
    unsubscribeConvDoc();
  };
}

/**
 * El receptor acepta la llamada y envía su SDP Answer.
 */
export async function answerCallSession(callId, answerSdp, roomId = null) {
  const localCall = readLocalCallSignal();
  const updatedCall = {
    ...(localCall || {}),
    id: callId,
    status: 'connected',
    answer: answerSdp,
    connectedAt: new Date().toISOString(),
  };
  notifyLocalCallSignal(updatedCall);

  if (firebaseWebEnabled && firestore) {
    try {
      await setDoc(doc(firestore, 'active_calls', callId), {
        status: 'connected',
        answer: answerSdp,
        connectedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn('Error respondiendo en active_calls:', err);
    }

    const targetRoom = roomId || localCall?.roomId;
    if (targetRoom) {
      try {
        await setDoc(doc(firestore, 'conversations', targetRoom), {
          'activeCall.status': 'connected',
          'activeCall.answer': answerSdp,
        }, { merge: true });
      } catch (err) {
        console.warn('Error respondiendo en conversations:', err);
      }
    }
  }
}

/**
 * Agrega un candidato ICE (del llamante o del receptor).
 */
export async function addIceCandidate(callId, candidate, isCaller, roomId = null) {
  if (!callId || !candidate) return;
  const fieldName = isCaller ? 'callerCandidates' : 'receiverCandidates';
  const clean = sanitizeCandidate(candidate);
  if (!clean) return;

  const localCall = readLocalCallSignal();
  if (localCall && localCall.id === callId) {
    const candidates = Array.isArray(localCall[fieldName]) ? localCall[fieldName] : [];
    localCall[fieldName] = [...candidates, clean];
    notifyLocalCallSignal(localCall);
  }

  if (firebaseWebEnabled && firestore) {
    try {
      await updateDoc(doc(firestore, 'active_calls', callId), {
        [fieldName]: arrayUnion(clean),
      });
    } catch {
      try {
        await setDoc(doc(firestore, 'active_calls', callId), {
          [fieldName]: arrayUnion(clean),
        }, { merge: true });
      } catch { /* ignore */ }
    }

    const targetRoom = roomId || localCall?.roomId;
    if (targetRoom) {
      try {
        await updateDoc(doc(firestore, 'conversations', targetRoom), {
          [`activeCall.${fieldName}`]: arrayUnion(clean),
        });
      } catch { /* ignore */ }
    }
  }
}

/**
 * Finaliza o rechaza una llamada.
 */
export async function endCallSession(callId, reason = 'ended', roomId = null) {
  const localCall = readLocalCallSignal();
  const updatedCall = {
    ...(localCall || {}),
    id: callId,
    status: reason, // 'ended' | 'rejected' | 'missed'
    endedAt: new Date().toISOString(),
  };
  notifyLocalCallSignal(updatedCall);

  // Limpiar señal local tras breve lapso
  setTimeout(() => {
    notifyLocalCallSignal(null);
  }, 1200);

  if (firebaseWebEnabled && firestore) {
    try {
      await setDoc(doc(firestore, 'active_calls', callId), {
        status: reason,
        endedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) { /* ignore */ }

    const targetRoom = roomId || localCall?.roomId;
    if (targetRoom) {
      try {
        await setDoc(doc(firestore, 'conversations', targetRoom), {
          'activeCall.status': reason,
        }, { merge: true });
      } catch (err) { /* ignore */ }
    }
  }
}

/**
 * Actualiza el estado de silencio/mute del participante en la llamada.
 * Permite que la otra persona vea si estamos en mute o no.
 */
export async function updateCallMuteState(callId, isCaller, isMuted, roomId = null) {
  if (!callId) return;
  const fieldName = isCaller ? 'callerMuted' : 'receiverMuted';

  // Update locally
  const localCall = readLocalCallSignal();
  if (localCall && localCall.id === callId) {
    localCall[fieldName] = isMuted;
    notifyLocalCallSignal(localCall);
  }

  // Update Firestore
  if (firebaseWebEnabled && firestore) {
    try {
      await setDoc(doc(firestore, 'active_calls', callId), {
        [fieldName]: isMuted,
      }, { merge: true });
    } catch (err) {
      console.warn('Error actualizando estado de mute:', err);
    }

    const targetRoom = roomId || localCall?.roomId;
    if (targetRoom) {
      try {
        await setDoc(doc(firestore, 'conversations', targetRoom), {
          [`activeCall.${fieldName}`]: isMuted,
        }, { merge: true });
      } catch { /* ignore */ }
    }
  }
}
