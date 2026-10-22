package com.example.ruwajay.ui.components

import android.content.Context
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CallEnd
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material.icons.filled.VolumeOff
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.ruwajay.data.repository.CallRepository
import com.example.ruwajay.data.repository.CallRequestBus
import com.example.ruwajay.data.repository.CallSession
import com.example.ruwajay.data.repository.RuwaBackend
import com.example.ruwajay.RuwaNotifications
import com.example.ruwajay.data.webrtc.WebRtcManager
import kotlinx.coroutines.delay
import org.webrtc.IceCandidate
import android.util.Log

private fun IceCandidate.toMap(): Map<String, Any> = mapOf(
    "candidate" to sdp,
    "sdpMid" to (sdpMid ?: "0"),
    "sdpMLineIndex" to sdpMLineIndex
)

@Composable
fun GlobalCallOverlay(
    currentUserId: String?,
    currentUserEmail: String?,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val callRepo = remember { CallRepository() }
    val webrtcManager = remember { WebRtcManager(context) }

    var activeSession by remember { mutableStateOf<CallSession?>(null) }
    var callStatus by remember { mutableStateOf("idle") } // idle, incoming, calling, connected, ended
    var callDuration by remember { mutableIntStateOf(0) }
    var isMuted by remember { mutableStateOf(false) }
    var isSpeakerOn by remember { mutableStateOf(true) }
    var remoteMuted by remember { mutableStateOf(false) }

    // Ringtone & Vibrator
    var ringtone by remember { mutableStateOf<Ringtone?>(null) }
    var vibrator by remember { mutableStateOf<Vibrator?>(null) }

    fun stopRinging() {
        try {
            ringtone?.stop()
            ringtone = null
            vibrator?.cancel()
            vibrator = null
        } catch (_: Exception) {}
    }

    fun startRinging() {
        try {
            stopRinging()
            val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            val r = RingtoneManager.getRingtone(context, uri)
            r?.play()
            ringtone = r

            vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vm?.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 800, 1000), 0))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(longArrayOf(0, 800, 1000), 0)
            }
        } catch (_: Exception) {}
    }

    // Todas las llamadas salientes pasan por esta capa para conservar viva la sesión WebRTC
    // aunque el usuario cambie de pantalla durante la llamada.
    LaunchedEffect(currentUserId) {
        CallRequestBus.events.collect { data ->
            if (currentUserId == null || callStatus != "idle") return@collect
            Log.i("RuwaCall", "Iniciando llamada móvil hacia ${data["receiverId"]}")
            callStatus = "calling"
            isMuted = false
            isSpeakerOn = true
            webrtcManager.createPeerConnection()
            val queuedCandidates = mutableListOf<IceCandidate>()
            var callId: String? = null
            webrtcManager.onIceCandidateGenerated = { candidate ->
                val id = callId
                if (id == null) queuedCandidates += candidate
                else callRepo.addIceCandidate(id, candidate.toMap(), isCaller = true)
            }
            webrtcManager.createOffer { offer ->
                Log.i("RuwaCall", "Oferta WebRTC creada; publicando señalización")
                callRepo.startCall(data + ("offer" to mapOf("sdp" to offer.description, "type" to "offer"))) { result ->
                    result.onSuccess { id ->
                        callId = id
                        activeSession = CallSession(
                            id = id,
                            callerId = data["callerId"] as? String ?: currentUserId,
                            callerName = data["callerName"] as? String ?: "Usuario",
                            callerAvatar = data["callerAvatar"] as? String ?: "",
                            callerEmail = data["callerEmail"] as? String ?: "",
                            receiverId = data["receiverId"] as? String ?: "",
                            receiverName = data["receiverName"] as? String ?: "Contacto",
                            receiverAvatar = data["receiverAvatar"] as? String ?: "",
                            receiverEmail = data["receiverEmail"] as? String ?: "",
                            propertyTitle = data["propertyTitle"] as? String ?: "Propiedad RuwaJay",
                            roomId = data["roomId"] as? String,
                            status = "calling",
                            offer = mapOf("sdp" to offer.description, "type" to "offer"),
                            isCaller = true
                        )
                        queuedCandidates.forEach { callRepo.addIceCandidate(id, it.toMap(), isCaller = true) }
                        queuedCandidates.clear()

                        // Enviar notificación Push de alta prioridad para despertar el móvil receptor aunque esté cerrado
                        val receiverId = data["receiverId"] as? String
                        if (!receiverId.isNullOrBlank() && currentUserId != null) {
                            RuwaBackend.invoke(
                                "notifyCall",
                                mapOf(
                                    "receiverId" to receiverId,
                                    "callId" to id,
                                    "callerName" to (data["callerName"] as? String ?: "Usuario"),
                                    "propertyTitle" to (data["propertyTitle"] as? String ?: "Propiedad RuwaJay"),
                                    "roomId" to (data["roomId"] as? String ?: "")
                                ),
                                currentUserId
                            )
                        }
                    }.onFailure {
                        Log.e("RuwaCall", "No se pudo publicar la llamada", it)
                        callStatus = "idle"
                        webrtcManager.close()
                    }
                }
            }
        }
    }

    // Escuchar llamadas entrantes provenientes de Notificaciones Push cuando la app se abrió desde una alerta
    LaunchedEffect(currentUserId) {
        CallRequestBus.incomingPushEvents.collect { pushCallId ->
            if (currentUserId != null && pushCallId.isNotBlank() && callStatus == "idle") {
                callRepo.observeCall(pushCallId, currentUserId) { incoming ->
                    if (incoming.status == "calling" && callStatus == "idle") {
                        activeSession = incoming
                        callStatus = "incoming"
                        startRinging()
                    }
                }
            }
        }
    }

    // Escuchar llamadas entrantes de Firestore
    DisposableEffect(currentUserId, currentUserEmail) {
        if (currentUserId == null) return@DisposableEffect onDispose {}

        val incomingListener = callRepo.observeIncomingCalls(
            userId = currentUserId,
            userEmail = currentUserEmail ?: ""
        ) { incoming ->
            if (callStatus == "idle") {
                activeSession = incoming
                callStatus = "incoming"
                startRinging()
            }
        }

        onDispose {
            incomingListener.remove()
            stopRinging()
            webrtcManager.close()
        }
    }

    // Escuchar cambios de la llamada activa
    DisposableEffect(activeSession?.id) {
        val sessionId = activeSession?.id ?: return@DisposableEffect onDispose {}

        val callListener = callRepo.observeCall(sessionId, currentUserId.orEmpty()) { updated ->
            activeSession = updated
            remoteMuted = if (updated.isCaller) updated.receiverMuted else updated.callerMuted

            // Si la otra persona cuelga o rechaza
            if (updated.status in setOf("ended", "rejected", "missed", "cancelled", "failed")) {
                stopRinging()
                callStatus = "ended"
                webrtcManager.close()
            }

            // Si somos el llamante y contestaron
            if (callStatus == "calling" && updated.status == "connected" && updated.answer != null) {
                val sdp = updated.answer["sdp"] as? String
                if (sdp != null) {
                    webrtcManager.setRemoteAnswer(sdp)
                    callStatus = "connected"
                    callDuration = 0
                }
            }

            // Aplicar candidatos remotos
            val remoteCandidates = if (updated.isCaller) updated.receiverCandidates else updated.callerCandidates
            for (c in remoteCandidates) {
                val sdp = c["candidate"] as? String ?: continue
                val sdpMid = c["sdpMid"] as? String ?: "0"
                val sdpMLineIndex = (c["sdpMLineIndex"] as? Number)?.toInt() ?: 0
                webrtcManager.addRemoteIceCandidate(IceCandidate(sdpMid, sdpMLineIndex, sdp))
            }
        }

        onDispose { callListener.remove() }
    }

    // Cronómetro de llamada
    LaunchedEffect(callStatus) {
        if (callStatus == "connected") {
            callDuration = 0
            while (callStatus == "connected") {
                delay(1000)
                callDuration++
            }
        } else if (callStatus == "calling") {
            delay(45_000)
            if (callStatus == "calling") {
                activeSession?.let { callRepo.endCall(it.id, "missed") }
                stopRinging()
                webrtcManager.close()
                callStatus = "ended"
            }
        } else if (callStatus == "ended") {
            delay(1500)
            callStatus = "idle"
            activeSession = null
            callDuration = 0
            isMuted = false
        }
    }

    fun answerIncomingCall() {
        val session = activeSession ?: return
        val offerSdp = (session.offer?.get("sdp") as? String) ?: return
        stopRinging()

        webrtcManager.createPeerConnection()
        webrtcManager.onIceCandidateGenerated = { cand ->
            callRepo.addIceCandidate(
                callId = session.id,
                candidateMap = mapOf(
                    "candidate" to cand.sdp,
                    "sdpMid" to cand.sdpMid,
                    "sdpMLineIndex" to cand.sdpMLineIndex
                ),
                isCaller = false
            )
        }

        webrtcManager.answerCall(offerSdp) { answerDesc ->
            callRepo.answerCall(session.id, answerDesc.description) {
                callStatus = "connected"
            }
        }
    }

    val answerMicPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) answerIncomingCall()
        else {
            stopRinging()
            activeSession?.let { callRepo.endCall(it.id, "rejected") }
            callStatus = "idle"
            activeSession = null
        }
    }

    fun rejectIncomingCall() {
        val session = activeSession ?: return
        stopRinging()
        callRepo.endCall(session.id, "rejected")
        callStatus = "idle"
        activeSession = null
        webrtcManager.close()
    }

    fun hangUpCall() {
        val session = activeSession ?: return
        stopRinging()
        callRepo.endCall(session.id, "ended")
        callStatus = "ended"
        webrtcManager.close()
    }

    fun toggleMute() {
        isMuted = !isMuted
        webrtcManager.setMicrophoneMuted(isMuted)
        activeSession?.let {
            callRepo.updateMuteState(it.id, isCaller = it.isCaller, isMuted = isMuted)
        }
    }

    fun toggleSpeaker() {
        isSpeakerOn = !isSpeakerOn
        webrtcManager.toggleSpeakerphone(isSpeakerOn)
    }

    fun formatDuration(seconds: Int): String {
        val m = seconds / 60
        val s = seconds % 60
        return "%02d:%02d".format(m, s)
    }

    // Modal UI
    AnimatedVisibility(
        visible = callStatus != "idle",
        enter = fadeIn(),
        exit = fadeOut(),
        modifier = modifier
    ) {
        val otherName = activeSession?.let {
            if (it.isCaller) it.receiverName else it.callerName
        } ?: "Contacto"

        val otherAvatar = activeSession?.let {
            if (it.isCaller) it.receiverAvatar else it.callerAvatar
        } ?: ""

        val propertyTitle = activeSession?.propertyTitle ?: "Propiedad RuwaJay"

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xE60A0E17)),
            contentAlignment = Alignment.Center
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth(0.9f)
                    .clip(RoundedCornerShape(28.dp))
                    .background(Color(0xFF131B2E))
                    .padding(28.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header badge
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = when (callStatus) {
                        "incoming" -> Color(0xFFF59E0B)
                        "connected" -> Color(0xFF10B981)
                        "calling" -> Color(0xFF3B82F6)
                        else -> Color.Gray
                    }
                ) {
                    Text(
                        text = when (callStatus) {
                            "incoming" -> "📞 LLAMADA ENTRANTE"
                            "connected" -> "● EN LLAMADA"
                            "calling" -> "LLAMANDO..."
                            "ended" -> "LLAMADA FINALIZADA"
                            else -> ""
                        },
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Avatar
                Box(
                    modifier = Modifier
                        .size(110.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF1E293B)),
                    contentAlignment = Alignment.Center
                ) {
                    if (otherAvatar.isNotBlank()) {
                        AsyncImage(
                            model = otherAvatar,
                            contentDescription = otherName,
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        Text(
                            text = otherName.take(1).uppercase(),
                            color = Color(0xFF10B981),
                            fontSize = 42.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Name & Property
                Text(
                    text = otherName,
                    color = Color.White,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )

                Text(
                    text = propertyTitle,
                    color = Color(0xFF94A3B8),
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 4.dp)
                )

                // Call status / duration
                if (callStatus == "connected") {
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Wifi,
                            contentDescription = "Conexión",
                            tint = Color(0xFF10B981),
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "Buena conexión • ${formatDuration(callDuration)}",
                            color = Color(0xFF10B981),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    if (remoteMuted) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "El otro usuario silenciÓ su micrófono",
                            color = Color(0xFFFBBF24),
                            fontSize = 12.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))

                // Action Buttons
                when (callStatus) {
                    "incoming" -> {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Reject Button
                            IconButton(
                                onClick = { rejectIncomingCall() },
                                modifier = Modifier
                                    .size(64.dp)
                                    .background(Color(0xFFEF4444), CircleShape)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CallEnd,
                                    contentDescription = "Rechazar",
                                    tint = Color.White,
                                    modifier = Modifier.size(28.dp)
                                )
                            }

                            // Accept Button
                            IconButton(
                                onClick = {
                                    if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                                        answerIncomingCall()
                                    } else {
                                        answerMicPermission.launch(Manifest.permission.RECORD_AUDIO)
                                    }
                                },
                                modifier = Modifier
                                    .size(64.dp)
                                    .background(Color(0xFF10B981), CircleShape)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Call,
                                    contentDescription = "Contestar",
                                    tint = Color.White,
                                    modifier = Modifier.size(28.dp)
                                )
                            }
                        }
                    }

                    "connected" -> {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Mute Button
                            IconButton(
                                onClick = { toggleMute() },
                                modifier = Modifier
                                    .size(54.dp)
                                    .background(
                                        if (isMuted) Color(0xFFEF4444) else Color(0xFF334155),
                                        CircleShape
                                    )
                            ) {
                                Icon(
                                    imageVector = if (isMuted) Icons.Default.MicOff else Icons.Default.Mic,
                                    contentDescription = if (isMuted) "Desmutear" else "Mutear",
                                    tint = Color.White
                                )
                            }

                            // Hang up Button
                            IconButton(
                                onClick = { hangUpCall() },
                                modifier = Modifier
                                    .size(64.dp)
                                    .background(Color(0xFFEF4444), CircleShape)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CallEnd,
                                    contentDescription = "Colgar",
                                    tint = Color.White,
                                    modifier = Modifier.size(32.dp)
                                )
                            }

                            // Speaker Button
                            IconButton(
                                onClick = { toggleSpeaker() },
                                modifier = Modifier
                                    .size(54.dp)
                                    .background(
                                        if (isSpeakerOn) Color(0xFF10B981) else Color(0xFF334155),
                                        CircleShape
                                    )
                            ) {
                                Icon(
                                    imageVector = if (isSpeakerOn) Icons.Default.VolumeUp else Icons.Default.VolumeOff,
                                    contentDescription = "Altavoz",
                                    tint = Color.White
                                )
                            }
                        }
                    }

                    "calling" -> {
                        IconButton(
                            onClick = { hangUpCall() },
                            modifier = Modifier
                                .size(64.dp)
                                .background(Color(0xFFEF4444), CircleShape)
                        ) {
                            Icon(
                                imageVector = Icons.Default.CallEnd,
                                contentDescription = "Cancelar llamada",
                                tint = Color.White,
                                modifier = Modifier.size(32.dp)
                            )
                        }
                    }

                    else -> {}
                }
            }
        }
    }
}
