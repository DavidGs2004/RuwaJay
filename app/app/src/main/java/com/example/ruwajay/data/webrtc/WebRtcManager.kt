package com.example.ruwajay.data.webrtc

import android.content.Context
import android.media.AudioManager
import android.util.Log
import org.webrtc.*
import java.util.concurrent.Executors

private const val TAG = "WebRtcManager"

class WebRtcManager(baseContext: Context) {

    private val context: Context = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S)
        baseContext.createAttributionContext("microphone") else baseContext

    private val executor = Executors.newSingleThreadExecutor()
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    private var factory: PeerConnectionFactory? = null
    private var peerConnection: PeerConnection? = null
    private var audioSource: AudioSource? = null
    private var localAudioTrack: AudioTrack? = null

    var onIceCandidateGenerated: ((IceCandidate) -> Unit)? = null
    var onRemoteTrackReceived: (() -> Unit)? = null
    var onConnectionStateChanged: ((PeerConnection.PeerConnectionState) -> Unit)? = null

    private fun initializeFactory() {
        if (factory != null) return
        PeerConnectionFactory.initialize(
            PeerConnectionFactory.InitializationOptions.builder(context)
                .setEnableInternalTracer(false)
                .createInitializationOptions()
        )

        val options = PeerConnectionFactory.Options()
        factory = PeerConnectionFactory.builder()
            .setOptions(options)
            .createPeerConnectionFactory()
    }

    private val iceServers: List<PeerConnection.IceServer> = listOf(
        PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer(),
        PeerConnection.IceServer.builder("stun:stun1.l.google.com:19302").createIceServer(),
        PeerConnection.IceServer.builder("stun:stun2.l.google.com:19302").createIceServer(),
        PeerConnection.IceServer.builder("turn:openrelay.metered.ca:80")
            .setUsername("openrelayproject")
            .setPassword("openrelayproject")
            .createIceServer(),
        PeerConnection.IceServer.builder("turn:openrelay.metered.ca:443")
            .setUsername("openrelayproject")
            .setPassword("openrelayproject")
            .createIceServer(),
        PeerConnection.IceServer.builder("turn:openrelay.metered.ca:443?transport=tcp")
            .setUsername("openrelayproject")
            .setPassword("openrelayproject")
            .createIceServer()
    )

    fun createPeerConnection() {
        initializeFactory()
        val f = factory ?: return
        val rtcConfig = PeerConnection.RTCConfiguration(iceServers).apply {
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
            continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
        }

        val observer = object : PeerConnection.Observer {
            override fun onIceCandidate(candidate: IceCandidate?) {
                if (candidate != null) {
                    Log.d(TAG, "Candidato ICE generado: ${candidate.sdp.take(40)}")
                    onIceCandidateGenerated?.invoke(candidate)
                }
            }

            override fun onTrack(transceiver: RtpTransceiver?) {
                Log.d(TAG, "Pista remota recibida: ${transceiver?.receiver?.track()?.kind()}")
                onRemoteTrackReceived?.invoke()
            }

            override fun onConnectionChange(newState: PeerConnection.PeerConnectionState?) {
                Log.d(TAG, "Estado de conexión: $newState")
                if (newState != null) {
                    onConnectionStateChanged?.invoke(newState)
                }
            }

            override fun onSignalingChange(state: PeerConnection.SignalingState?) {}
            override fun onIceConnectionChange(state: PeerConnection.IceConnectionState?) {}
            override fun onIceConnectionReceivingChange(receiving: Boolean) {}
            override fun onIceGatheringChange(state: PeerConnection.IceGatheringState?) {}
            override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>?) {}
            override fun onAddStream(stream: MediaStream?) {}
            override fun onRemoveStream(stream: MediaStream?) {}
            override fun onDataChannel(channel: DataChannel?) {}
            override fun onRenegotiationNeeded() {}
            override fun onAddTrack(receiver: RtpReceiver?, mediaStreams: Array<out MediaStream>?) {}
        }

        peerConnection = f.createPeerConnection(rtcConfig, observer)

        // Configurar audio local con cancelación de eco y supresión de ruido
        val audioConstraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("googEchoCancellation", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("googAutoGainControl", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("googNoiseSuppression", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("googHighpassFilter", "true"))
        }

        audioSource = f.createAudioSource(audioConstraints)
        localAudioTrack = f.createAudioTrack("ARDAMSa0", audioSource)
        localAudioTrack?.setEnabled(true)

        peerConnection?.addTrack(localAudioTrack, listOf("ARDAMS"))

        // Configurar enrutamiento de audio del dispositivo
        configureAudioMode(true)
    }

    fun createOffer(callback: (SessionDescription) -> Unit) {
        val pc = peerConnection ?: return
        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
        }

        pc.createOffer(object : SdpObserver {
            override fun onCreateSuccess(desc: SessionDescription?) {
                if (desc != null) {
                    pc.setLocalDescription(object : SdpObserver {
                        override fun onCreateSuccess(p0: SessionDescription?) {}
                        override fun onSetSuccess() {
                            callback(desc)
                        }
                        override fun onCreateFailure(err: String?) {}
                        override fun onSetFailure(err: String?) {}
                    }, desc)
                }
            }
            override fun onSetSuccess() {}
            override fun onCreateFailure(err: String?) {
                Log.e(TAG, "Error creando SDP offer: $err")
            }
            override fun onSetFailure(err: String?) {}
        }, constraints)
    }

    fun answerCall(remoteOfferSdp: String, callback: (SessionDescription) -> Unit) {
        val pc = peerConnection ?: return
        val remoteDesc = SessionDescription(SessionDescription.Type.OFFER, remoteOfferSdp)

        pc.setRemoteDescription(object : SdpObserver {
            override fun onCreateSuccess(p0: SessionDescription?) {}
            override fun onSetSuccess() {
                Log.d(TAG, "Oferta remota aplicada con éxito")
                val constraints = MediaConstraints().apply {
                    mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
                }
                pc.createAnswer(object : SdpObserver {
                    override fun onCreateSuccess(answerDesc: SessionDescription?) {
                        if (answerDesc != null) {
                            pc.setLocalDescription(object : SdpObserver {
                                override fun onCreateSuccess(p0: SessionDescription?) {}
                                override fun onSetSuccess() {
                                    callback(answerDesc)
                                }
                                override fun onCreateFailure(err: String?) {}
                                override fun onSetFailure(err: String?) {}
                            }, answerDesc)
                        }
                    }
                    override fun onSetSuccess() {}
                    override fun onCreateFailure(err: String?) {
                        Log.e(TAG, "Error creando SDP answer: $err")
                    }
                    override fun onSetFailure(err: String?) {}
                }, constraints)
            }
            override fun onCreateFailure(err: String?) {}
            override fun onSetFailure(err: String?) {
                Log.e(TAG, "Error aplicando oferta remota: $err")
            }
        }, remoteDesc)
    }

    fun setRemoteAnswer(remoteAnswerSdp: String) {
        val pc = peerConnection ?: return
        val desc = SessionDescription(SessionDescription.Type.ANSWER, remoteAnswerSdp)
        pc.setRemoteDescription(object : SdpObserver {
            override fun onCreateSuccess(p0: SessionDescription?) {}
            override fun onSetSuccess() {
                Log.d(TAG, "SDP Answer remoto aplicado exitosamente")
            }
            override fun onCreateFailure(err: String?) {}
            override fun onSetFailure(err: String?) {
                Log.e(TAG, "Error aplicando respuesta remota: $err")
            }
        }, desc)
    }

    fun addRemoteIceCandidate(candidate: IceCandidate) {
        peerConnection?.addIceCandidate(candidate)
    }

    fun setMicrophoneMuted(muted: Boolean) {
        localAudioTrack?.setEnabled(!muted)
    }

    fun toggleSpeakerphone(speakerOn: Boolean) {
        try {
            audioManager.isSpeakerphoneOn = speakerOn
        } catch (_: Exception) {}
    }

    private fun configureAudioMode(inCall: Boolean) {
        try {
            if (inCall) {
                audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
                audioManager.isSpeakerphoneOn = true
            } else {
                audioManager.mode = AudioManager.MODE_NORMAL
                audioManager.isSpeakerphoneOn = false
            }
        } catch (_: Exception) {}
    }

    fun close() {
        try {
            configureAudioMode(false)
            localAudioTrack?.setEnabled(false)
            localAudioTrack?.dispose()
            localAudioTrack = null

            audioSource?.dispose()
            audioSource = null

            peerConnection?.close()
            peerConnection = null
        } catch (e: Exception) {
            Log.w(TAG, "Error limpiando WebRTC:", e)
        }
    }
}
