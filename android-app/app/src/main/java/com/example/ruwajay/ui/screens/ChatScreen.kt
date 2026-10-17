package com.example.ruwajay.ui.screens

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.animation.core.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Reply
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Wallpaper
import androidx.compose.foundation.clickable
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.example.ruwajay.data.repository.ChatRepository
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.Timestamp
import java.io.File
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import com.example.ruwajay.data.repository.CallRequestBus
import com.example.ruwajay.ui.theme.*
import com.example.ruwajay.util.SoundManager

// Global media cache to guarantee instant loading without flickering
object AndroidMediaCache {
    val cache = ConcurrentHashMap<String, String>()
}

// Categorized emojis for full picker
val fullEmojiList = listOf(
    // Reacciones populares
    "👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "👏", "🎉", "😍", "🥳", "💯",
    // Caritas y expresiones
    "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😊", "😇", "🙂", "🙃", "😉",
    "😌", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨",
    "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕",
    "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡",
    "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔",
    "🫣", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧",
    "😮‍💨", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷",
    // Gestos y manos
    "👋", "🤚", "🖐️", "✋", "🖖", "🫱", "🫲", "🫳", "🫴", "👌", "🤌", "🤏",
    "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️",
    "🫵", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "🫶", "👐", "🤲",
    "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻",
    // Corazones y símbolos
    "❤️", "🩷", "🧡", "💛", "💚", "💙", "🩵", "💜", "🤎", "🖤", "🩶", "🤍",
    "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "✨",
    "⭐", "🌟", "💫", "💥", "💨", "💤", "💭", "💬", "👁️‍🗨️", "🗨️", "💡", "💰",
    // Celebración y objetos
    "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🎯", "🎲", "🧩", "🎸", "🎵", "🎶",
    "☕", "🍻", "🥂", "🍕", "🍔", "🌮", "🏡", "🏠", "🏢", "🔑", "🚗", "🚀"
)

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun ChatScreen(conversationId: String, onNavigateBack: () -> Unit) {
    val context = LocalContext.current
    val lifecycleOwner = androidx.lifecycle.compose.LocalLifecycleOwner.current
    val repo = remember { ChatRepository() }
    val uid = FirebaseAuth.getInstance().currentUser?.uid
    var messages by remember(conversationId) { mutableStateOf<List<Map<String,Any>>>(emptyList()) }
    var room by remember(conversationId) { mutableStateOf<Map<String,Any>>(emptyMap()) }
    var draft by remember(conversationId) { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var sending by remember { mutableStateOf(false) }
    var previousLastMessageId by remember(conversationId) { mutableStateOf<String?>(null) }

    // Voice recording states: Record -> Stop (Red) -> Review & Preview -> Send (Green Arrow)
    var recording by remember { mutableStateOf(false) }
    var recorder by remember { mutableStateOf<MediaRecorder?>(null) }
    var recordingFile by remember { mutableStateOf<File?>(null) }
    var recordingSeconds by remember { mutableIntStateOf(0) }
    var recordedAudioUri by remember { mutableStateOf<Uri?>(null) }
    var recordedAudioFile by remember { mutableStateOf<File?>(null) }
    var isAudioReviewing by remember { mutableStateOf(false) }

    var pendingMediaUri by remember { mutableStateOf<Uri?>(null) }
    var pendingMediaType by remember { mutableStateOf("image") }
    var pendingMediaCaption by remember { mutableStateOf("") }
    var viewingImageUrl by remember { mutableStateOf<String?>(null) }
    var viewingImageSender by remember { mutableStateOf("") }
    var viewingImageTime by remember { mutableStateOf("") }
    var editingMessageId by remember { mutableStateOf<String?>(null) }
    var replyingToMessage by remember { mutableStateOf<Map<String, Any>?>(null) }
    var selectedMessageForMenu by remember { mutableStateOf<Map<String, Any>?>(null) }
    var showFullEmojiPickerForMessageId by remember { mutableStateOf<String?>(null) }
    var showClearChatDialog by remember { mutableStateOf(false) }
    var showDeleteMessageDialog by remember { mutableStateOf<String?>(null) }
    var showTopMenu by remember { mutableStateOf(false) }
    var showWallpaperDialog by remember { mutableStateOf(false) }

    // Local Wallpaper personalization (Private per-user, never affects other user)
    val prefs = remember { context.getSharedPreferences("ruwajay_chat_prefs", Context.MODE_PRIVATE) }
    var customBgType by remember(conversationId) {
        mutableStateOf(prefs.getString("bg_type_$conversationId", prefs.getString("bg_type_global", "default")) ?: "default")
    }
    var customBgValue by remember(conversationId) {
        mutableStateOf(prefs.getString("bg_val_$conversationId", prefs.getString("bg_val_global", "")) ?: "")
    }

    val wallpaperPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            customBgType = "image"
            customBgValue = uri.toString()
            prefs.edit()
                .putString("bg_type_$conversationId", "image")
                .putString("bg_val_$conversationId", uri.toString())
                .apply()
        }
    }

    val messageFocusRequester = remember { FocusRequester() }
    val list = rememberLazyListState()

    LaunchedEffect(recording) {
        recordingSeconds = 0
        while (recording) { kotlinx.coroutines.delay(1000); recordingSeconds++ }
    }
    DisposableEffect(conversationId, uid) {
        val a = repo.observeMessages(conversationId, onError = { error = it.message }) {
            val lastMsg = it.lastOrNull()
            val lastId = lastMsg?.get("id")?.toString()
            if (previousLastMessageId != null && lastId != null && lastId != previousLastMessageId) {
                val senderId = lastMsg["senderId"]?.toString()
                if (senderId != null && senderId != uid) {
                    SoundManager.playReceiveSound(context)
                }
            }
            previousLastMessageId = lastId
            messages = it
            if (lifecycleOwner.lifecycle.currentState.isAtLeast(androidx.lifecycle.Lifecycle.State.RESUMED)) repo.markAsRead(conversationId)
        }
        val b = FirebaseFirestore.getInstance().collection("conversations").document(conversationId).addSnapshotListener { snap, failure ->
            if (failure != null) error = failure.message else room = snap?.data.orEmpty()
        }
        onDispose { a.remove(); b.remove() }
    }
    DisposableEffect(lifecycleOwner, conversationId) {
        val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
            if (event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) repo.markAsRead(conversationId)
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    // Filter messages for current user if clearedAt exists (Per-user clear chat)
    val myClearedTimestamp = (room["clearedAt"] as? Map<*, *>)?.get(uid) as? Timestamp
    val myClearedTime = myClearedTimestamp?.toDate()?.time ?: 0L
    val visibleMessages = remember(messages, myClearedTime) {
        if (myClearedTime == 0L) messages
        else messages.filter { msg ->
            val msgTime = (msg["createdAt"] as? Timestamp)?.toDate()?.time ?: Long.MAX_VALUE
            msgTime > myClearedTime
        }
    }

    // Scroll Anchoring: Immediately position at bottom on frame 0, never jumping or flashing top
    var isInitialScrollDone by remember(conversationId) { mutableStateOf(false) }
    LaunchedEffect(conversationId) {
        isInitialScrollDone = false
    }
    LaunchedEffect(visibleMessages.size) {
        if (visibleMessages.isNotEmpty()) {
            if (!isInitialScrollDone) {
                list.scrollToItem(visibleMessages.lastIndex)
                isInitialScrollDone = true
            } else {
                val lastVisible = list.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
                if (lastVisible >= visibleMessages.size - 3) {
                    list.scrollToItem(visibleMessages.lastIndex)
                }
            }
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            try { recorder?.release() } catch (_: Exception) {}
            recordingFile?.delete()
            recordedAudioFile?.delete()
        }
    }

    fun upload(uri: Uri, type: String, caption: String? = null, replyTo: Map<String, Any>? = null) {
        sending = true
        error = null
        repo.uploadMedia(conversationId, uri, context.contentResolver, type, caption, replyTo) { result ->
            sending = false
            result.onSuccess {
                error = null
                replyingToMessage = null
                SoundManager.playSendSound(context)
            }.onFailure {
                error = "No se pudo enviar el archivo. Revisa tu conexión e inténtalo nuevamente."
            }
            if (type == "audio") {
                recordedAudioFile?.delete()
                recordedAudioFile = null
                recordedAudioUri = null
                isAudioReviewing = false
            }
        }
    }

    fun deleteMessage(messageId: String) {
        repo.deleteMessage(conversationId, messageId) { result ->
            result.onFailure { error = "No se pudo eliminar el mensaje: ${it.localizedMessage ?: it.message}" }
        }
    }

    // Per-user clear chat (Only clears for me, other user retains all messages)
    fun clearChat() {
        repo.clearChat(conversationId) { result ->
            result.onSuccess {
                showClearChatDialog = false
            }.onFailure {
                error = "No se pudo vaciar el chat: ${it.localizedMessage ?: it.message}"
            }
        }
    }

    fun toggleReaction(messageId: String, emoji: String, currentEmoji: String?) {
        repo.toggleReaction(conversationId, messageId, emoji, currentEmoji) { result ->
            result.onFailure { error = "No se pudo registrar la reacción: ${it.localizedMessage ?: it.message}" }
        }
    }

    // Flow: Record -> Stop (Red Icon) -> Review -> Send (Green Arrow)
    fun stopRecording() {
        val activeRecorder = recorder
        val completedFile = recordingFile
        recorder = null
        recording = false
        try {
            activeRecorder?.stop()
            activeRecorder?.release()
            if (completedFile != null && completedFile.length() > 0) {
                recordedAudioFile = completedFile
                recordedAudioUri = Uri.fromFile(completedFile)
                isAudioReviewing = true
            } else {
                error = "El audio quedó vacío. Intenta grabarlo nuevamente."
                completedFile?.delete()
                recordingFile = null
            }
        } catch (_: Exception) {
            try { activeRecorder?.reset(); activeRecorder?.release() } catch (_: Exception) {}
            completedFile?.delete()
            recordingFile = null
            error = "No se pudo completar la grabación. Intenta nuevamente."
        }
    }

    fun discardRecordedAudio() {
        recordedAudioFile?.delete()
        recordedAudioFile = null
        recordedAudioUri = null
        isAudioReviewing = false
    }

    fun startRecording() {
        discardRecordedAudio()
        try {
            val file = File.createTempFile("voice-", ".m4a", context.cacheDir)
            recordingFile = file
            val recorderContext = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S)
                context.createAttributionContext("microphone") else context
            @Suppress("DEPRECATION")
            val audio = (if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) MediaRecorder(recorderContext) else MediaRecorder()).apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setOutputFile(file.absolutePath)
                setMaxDuration(60000)
                setOnInfoListener { _, what, _ -> if (what == MediaRecorder.MEDIA_RECORDER_INFO_MAX_DURATION_REACHED) stopRecording() }
                setOnErrorListener { _, _, _ ->
                    recorder = null
                    recording = false
                    try { release() } catch (_: Exception) {}
                    recordingFile?.delete()
                    recordingFile = null
                    error = "La grabadora se detuvo inesperadamente. Intenta nuevamente."
                }
                prepare()
                start()
            }
            recorder = audio
            recording = true
        } catch (_: Exception) {
            error = "No se pudo acceder al micrófono."
            recorder?.release()
            recorder = null
        }
    }

    val mic = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) startRecording() else error = "Permiso de micrófono denegado."
    }
    val images = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            pendingMediaUri = uri
            pendingMediaType = "image"
            pendingMediaCaption = ""
        }
    }

    // High-Resolution Camera Capture with FileProvider
    var photoOutputUri by remember { mutableStateOf<Uri?>(null) }
    val cameraLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        if (success && photoOutputUri != null) {
            pendingMediaUri = photoOutputUri
            pendingMediaType = "image"
            pendingMediaCaption = ""
        }
    }
    val cameraPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) {
            photoOutputUri?.let { cameraLauncher.launch(it) }
        } else {
            error = "Activa el permiso de cámara para tomar fotografías en alta resolución."
        }
    }
    fun takePhoto() {
        try {
            val file = File.createTempFile("chat-photo-", ".jpg", context.cacheDir)
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
            photoOutputUri = uri
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                cameraLauncher.launch(uri)
            } else {
                cameraPermission.launch(Manifest.permission.CAMERA)
            }
        } catch (e: Exception) {
            error = "No se pudo iniciar la cámara: ${e.localizedMessage}"
        }
    }

    val other = (room["participants"] as? List<*>)?.firstOrNull { it != uid } as? String
    val otherName = (if (room["ownerId"] == uid) room["seekerName"] else room["ownerName"]) as? String
        ?: (room["participantName"] as? String)
        ?: (room["otherUserName"] as? String)
        ?: "Contacto"
    var otherAvatar by remember(other) { mutableStateOf("") }
    var otherEmail by remember(other) { mutableStateOf("") }
    DisposableEffect(other) {
        if (other.isNullOrBlank()) return@DisposableEffect onDispose {}
        val registration = FirebaseFirestore.getInstance().collection("users").document(other)
            .addSnapshotListener { document, _ ->
                otherAvatar = listOf("avatarImage", "avatar", "photoURL")
                    .firstNotNullOfOrNull { key -> document?.getString(key)?.takeIf(String::isNotBlank) }
                    .orEmpty()
                otherEmail = document?.getString("email")?.trim()?.lowercase().orEmpty()
            }
        onDispose { registration.remove() }
    }
    fun initiateCall() {
        if (other.isNullOrBlank()) {
            error = "No se pudo identificar al contacto."
            return
        }
        val user = FirebaseAuth.getInstance().currentUser ?: return
        val callData = mapOf(
            "callerId" to user.uid,
            "callerName" to (user.displayName ?: "Usuario Móvil"),
            "callerAvatar" to (user.photoUrl?.toString() ?: ""),
            "callerEmail" to (user.email ?: ""),
            "callerIds" to listOf(user.uid),
            "callerEmails" to listOfNotNull(user.email?.trim()?.lowercase()).filter(String::isNotBlank),
            "receiverId" to other,
            "receiverIds" to listOf(other),
            "receiverName" to otherName,
            "receiverAvatar" to otherAvatar,
            "receiverEmail" to otherEmail,
            "receiverEmails" to listOf(otherEmail).filter(String::isNotBlank),
            "propertyTitle" to (room["propertyTitle"] as? String ?: "Propiedad RuwaJay"),
            "roomId" to conversationId,
            "participants" to listOf(user.uid, other),
            "callerMuted" to false,
            "receiverMuted" to false
        )
        if (!CallRequestBus.start(callData)) error = "No se pudo iniciar la llamada. Intenta de nuevo."
    }

    val callPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) initiateCall() else error = "Activa el permiso de micrófono para realizar llamadas."
    }
    fun requestCall() {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) initiateCall()
        else callPermission.launch(Manifest.permission.RECORD_AUDIO)
    }

    val readAt = ((room["readAt"] as? Map<*, *>)?.get(other) as? Timestamp)?.toDate()?.time ?: 0L

    Scaffold(
        containerColor = Color.Transparent,
        topBar = {
            Surface(
                color = Color.White,
                shadowElevation = 3.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .statusBarsPadding()
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onNavigateBack,
                        modifier = Modifier.size(38.dp)
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Volver",
                            tint = BrandForest
                        )
                    }

                    Spacer(Modifier.width(4.dp))

                    // Contact Avatar with ring border
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .clip(CircleShape)
                            .background(BrandForest.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        if (otherAvatar.isNotBlank()) {
                            AsyncImage(
                                model = otherAvatar,
                                contentDescription = "Foto de $otherName",
                                modifier = Modifier.fillMaxSize().clip(CircleShape),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            Text(
                                otherName.take(1).uppercase(),
                                color = BrandForest,
                                fontWeight = androidx.compose.ui.text.font.FontWeight.Black,
                                fontSize = 16.sp
                            )
                        }
                    }

                    Spacer(Modifier.width(10.dp))

                    // Contact Name & Status
                    Column(Modifier.weight(1f)) {
                        Text(
                            text = otherName,
                            style = MaterialTheme.typography.titleMedium.copy(fontSize = 15.sp),
                            fontWeight = androidx.compose.ui.text.font.FontWeight.ExtraBold,
                            color = BrandTextPrimary,
                            maxLines = 1
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(7.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFF22C55E))
                            )
                            Spacer(Modifier.width(5.dp))
                            Text(
                                text = (room["propertyTitle"] as? String)?.takeIf { it.isNotBlank() } ?: "En línea",
                                style = MaterialTheme.typography.bodySmall.copy(fontSize = 11.sp),
                                color = BrandForest,
                                maxLines = 1
                            )
                        }
                    }

                    // Call Button
                    IconButton(
                        onClick = { requestCall() },
                        modifier = Modifier
                            .size(38.dp)
                            .clip(CircleShape)
                            .background(BrandForest.copy(alpha = 0.08f))
                    ) {
                        Icon(
                            Icons.Default.Call,
                            contentDescription = "Llamar",
                            tint = BrandForest,
                            modifier = Modifier.size(19.dp)
                        )
                    }

                    Spacer(Modifier.width(6.dp))

                    // Top Menu
                    Box {
                        IconButton(
                            onClick = { showTopMenu = true },
                            modifier = Modifier.size(38.dp)
                        ) {
                            Icon(
                                Icons.Default.MoreVert,
                                contentDescription = "Opciones",
                                tint = BrandForest,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        DropdownMenu(
                            expanded = showTopMenu,
                            onDismissRequest = { showTopMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("Fondo de pantalla", color = BrandTextPrimary, fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold) },
                                leadingIcon = { Icon(Icons.Default.Wallpaper, contentDescription = null, tint = BrandForest) },
                                onClick = {
                                    showTopMenu = false
                                    showWallpaperDialog = true
                                }
                            )
                            HorizontalDivider(color = BrandBorder.copy(alpha = 0.5f))
                            DropdownMenuItem(
                                text = { Text("Vaciar chat para mí", color = BrandTerracota, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold) },
                                leadingIcon = { Icon(Icons.Default.Delete, contentDescription = null, tint = BrandTerracota) },
                                onClick = {
                                    showTopMenu = false
                                    showClearChatDialog = true
                                }
                            )
                        }
                    }
                }
            }
        },
        bottomBar = {
            Surface(
                color = Color.White,
                shadowElevation = 12.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    Modifier
                        .navigationBarsPadding()
                        .imePadding()
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    error?.let {
                        Text(
                            it,
                            color = BrandTerracota,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    // Replying message indicator banner (Swipe to reply)
                    if (replyingToMessage != null) {
                        val replyAuthor = if (replyingToMessage!!["senderId"] == uid) "Tú" else otherName
                        val replyText = replyingToMessage!!["text"]?.toString()?.takeIf { it.isNotBlank() } ?: "Archivo adjunto"
                        Surface(
                            color = BrandForest.copy(alpha = 0.08f),
                            shape = RoundedCornerShape(12.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, BrandForest.copy(alpha = 0.2f)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 6.dp)
                        ) {
                            Row(
                                Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .width(3.dp)
                                        .height(28.dp)
                                        .clip(RoundedCornerShape(2.dp))
                                        .background(BrandForest)
                                )
                                Spacer(Modifier.width(8.dp))
                                Column(Modifier.weight(1f)) {
                                    Text("Respondiendo a $replyAuthor", style = MaterialTheme.typography.labelSmall, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold, color = BrandForest)
                                    Text(replyText, style = MaterialTheme.typography.bodySmall, color = BrandTextSecondary, maxLines = 1)
                                }
                                IconButton(onClick = { replyingToMessage = null }, modifier = Modifier.size(24.dp)) {
                                    Icon(Icons.Default.Close, contentDescription = "Cancelar respuesta", tint = BrandForest, modifier = Modifier.size(16.dp))
                                }
                            }
                        }
                    }

                    // Editing message indicator banner
                    if (editingMessageId != null) {
                        Surface(
                            color = BrandForest.copy(alpha = 0.10f),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 6.dp)
                        ) {
                            Row(
                                Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.Edit, contentDescription = null, tint = BrandForest, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Editando mensaje", style = MaterialTheme.typography.labelMedium, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold, color = BrandForest)
                                Spacer(Modifier.weight(1f))
                                IconButton(onClick = { editingMessageId = null; draft = "" }, modifier = Modifier.size(24.dp)) {
                                    Icon(Icons.Default.Close, contentDescription = "Cancelar edición", tint = BrandForest, modifier = Modifier.size(16.dp))
                                }
                            }
                        }
                    }

                    // WhatsApp Flow: Audio Reviewing Mode (Stop -> Listen/Review -> Send with Green Arrow)
                    if (isAudioReviewing && recordedAudioUri != null) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                        ) {
                            // Discard / Trash button
                            IconButton(
                                onClick = { discardRecordedAudio() },
                                modifier = Modifier
                                    .size(42.dp)
                                    .clip(CircleShape)
                                    .background(BrandTerracota.copy(alpha = 0.12f))
                            ) {
                                Icon(Icons.Default.Delete, contentDescription = "Descartar audio", tint = BrandTerracota, modifier = Modifier.size(20.dp))
                            }

                            // Review audio player
                            Box(modifier = Modifier.weight(1f)) {
                                AudioAttachment(recordedAudioUri.toString(), mine = false)
                            }

                            // Send button (Vibrant GREEN Arrow, enabled)
                            FloatingActionButton(
                                onClick = {
                                    val uriToSend = recordedAudioUri!!
                                    val replyPayload = replyingToMessage?.let {
                                        mapOf(
                                            "id" to it["id"].toString(),
                                            "senderName" to (if (it["senderId"] == uid) "Tú" else otherName),
                                            "text" to (it["text"]?.toString() ?: ""),
                                            "type" to (it["type"]?.toString() ?: "audio")
                                        )
                                    }
                                    upload(uriToSend, "audio", replyTo = replyPayload)
                                },
                                modifier = Modifier.size(46.dp),
                                shape = CircleShape,
                                containerColor = Color(0xFF22C55E), // WhatsApp vibrant green
                                contentColor = Color.White,
                                elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 3.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.AutoMirrored.Filled.Send,
                                    contentDescription = "Enviar nota de voz",
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    } else {
                        // Standard Input Bar
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            // Gallery Button
                            IconButton(
                                onClick = { images.launch("image/*") },
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(CircleShape)
                                    .background(BrandCrema.copy(alpha = 0.7f))
                            ) {
                                Icon(Icons.Default.Image, "Elegir imagen", tint = BrandForest, modifier = Modifier.size(19.dp))
                            }

                            // High-Res Camera Button
                            IconButton(
                                onClick = { takePhoto() },
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(CircleShape)
                                    .background(BrandCrema.copy(alpha = 0.7f))
                            ) {
                                Icon(Icons.Default.PhotoCamera, "Tomar foto", tint = BrandForest, modifier = Modifier.size(19.dp))
                            }

                            // Mic / Stop Button: Record on mic -> Stop on RED square
                            IconButton(
                                onClick = {
                                    if (recording) {
                                        stopRecording()
                                    } else if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                                        startRecording()
                                    } else {
                                        mic.launch(Manifest.permission.RECORD_AUDIO)
                                    }
                                },
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(CircleShape)
                                    .background(if (recording) BrandTerracota.copy(alpha = 0.18f) else BrandCrema.copy(alpha = 0.7f))
                            ) {
                                Icon(
                                    imageVector = if (recording) Icons.Default.Stop else Icons.Default.Mic,
                                    contentDescription = if (recording) "Detener grabación" else "Grabar audio",
                                    tint = if (recording) BrandTerracota else BrandForest,
                                    modifier = Modifier.size(20.dp)
                                )
                            }

                            // Text input field or Live Recording Wave
                            if (recording) {
                                RecordingIndicator(recordingSeconds, Modifier.weight(1f))
                            } else {
                                OutlinedTextField(
                                    value = draft,
                                    onValueChange = { draft = it; error = null },
                                    modifier = Modifier
                                        .weight(1f)
                                        .heightIn(min = 46.dp, max = 110.dp)
                                        .focusRequester(messageFocusRequester),
                                    placeholder = { Text("Escribe un mensaje...", color = BrandTextMuted, fontSize = 14.sp) },
                                    maxLines = 4,
                                    shape = RoundedCornerShape(22.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = BrandForest,
                                        unfocusedBorderColor = BrandBorder.copy(alpha = 0.7f),
                                        focusedContainerColor = Color(0xFFFAF7F2),
                                        unfocusedContainerColor = Color(0xFFFAF7F2)
                                    )
                                )
                            }

                            // Send / Confirm Edit Button
                            val canSend = draft.isNotBlank() && !sending && !recording
                            FloatingActionButton(
                                onClick = {
                                    val text = draft
                                    sending = true
                                    error = null
                                    if (editingMessageId != null) {
                                        val msgId = editingMessageId!!
                                        repo.editMessage(conversationId, msgId, text) { result ->
                                            sending = false
                                            result.onSuccess {
                                                draft = ""
                                                editingMessageId = null
                                                error = null
                                            }.onFailure {
                                                error = "No se pudo editar el mensaje: ${it.localizedMessage ?: it.message}"
                                            }
                                        }
                                    } else {
                                        val replyPayload = replyingToMessage?.let {
                                            mapOf(
                                                "id" to it["id"].toString(),
                                                "senderName" to (if (it["senderId"] == uid) "Tú" else otherName),
                                                "text" to (it["text"]?.toString() ?: ""),
                                                "type" to (it["type"]?.toString() ?: "text")
                                            )
                                        }
                                        repo.sendText(conversationId, text, replyPayload) { result ->
                                            sending = false
                                            result.onSuccess {
                                                draft = ""
                                                error = null
                                                replyingToMessage = null
                                                SoundManager.playSendSound(context)
                                            }.onFailure {
                                                error = "No se pudo enviar el mensaje: ${it.localizedMessage ?: it.message}"
                                            }
                                        }
                                    }
                                },
                                modifier = Modifier.size(44.dp),
                                shape = CircleShape,
                                containerColor = if (canSend) BrandForest else BrandBorder.copy(alpha = 0.6f),
                                contentColor = Color.White,
                                elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 2.dp)
                            ) {
                                Icon(
                                    imageVector = if (editingMessageId != null) Icons.Default.Check else Icons.AutoMirrored.Filled.Send,
                                    contentDescription = if (editingMessageId != null) "Actualizar" else "Enviar",
                                    modifier = Modifier.size(19.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    ) { padding ->
        // Custom Wallpaper Background (Personalized for this user only)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when (customBgType) {
                "image" -> {
                    if (customBgValue.isNotBlank()) {
                        AsyncImage(
                            model = customBgValue,
                            contentDescription = "Fondo de chat",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                        Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.15f)))
                    } else {
                        Box(Modifier.fillMaxSize().background(Color(0xFFF7F4EE)))
                    }
                }
                "color" -> {
                    val colorHex = customBgValue.toLongOrNull(16) ?: 0xFFF7F4EEL
                    Box(Modifier.fillMaxSize().background(Color(colorHex)))
                }
                else -> {
                    // Default warm artisan linen
                    Box(Modifier.fillMaxSize().background(Color(0xFFF7F4EE)))
                }
            }

            LazyColumn(
                state = list,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 10.dp)
                    .alpha(if (isInitialScrollDone || visibleMessages.isEmpty()) 1f else 0f),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(vertical = 12.dp)
            ) {
                // Floating Date Pill
                item(key = "header_today") {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color.White.copy(alpha = 0.90f),
                            shadowElevation = 1.dp
                        ) {
                            Text(
                                text = "Hoy",
                                style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp),
                                fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                                color = BrandTextSecondary,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                            )
                        }
                    }
                }

                items(visibleMessages, key = { it["id"].toString() }) { message ->
                    val msgId = message["id"]?.toString().orEmpty()
                    val mine = message["senderId"] == uid
                    val isDeleted = message["isDeleted"] == true
                    val isEdited = message["isEdited"] == true
                    val type = message["type"] as? String ?: "text"
                    val media = message["mediaUrl"] as? String ?: message["image"] as? String
                    val textContent = message["text"] as? String ?: ""
                    val time = message["createdAt"] as? Timestamp
                    val timeFormatted = time?.let { SimpleDateFormat("HH:mm", Locale.getDefault()).format(it.toDate()) } ?: ""
                    val replyTo = message["replyTo"] as? Map<*, *>
                    val reactions = (message["reactions"] as? Map<*, *>)?.mapNotNull { (k, v) ->
                        val kStr = k?.toString()
                        val vStr = v?.toString()
                        if (kStr != null && vStr != null) kStr to vStr else null
                    }?.toMap().orEmpty()
                    val myReaction = uid?.let { reactions[it] }

                    // Swipe to reply gesture offset
                    var swipeOffsetX by remember { mutableFloatStateOf(0f) }
                    val animatedSwipeX by animateFloatAsState(targetValue = swipeOffsetX, label = "swipe")

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .pointerInput(msgId) {
                                detectHorizontalDragGestures(
                                    onDragEnd = {
                                        if (swipeOffsetX > 60f) {
                                            replyingToMessage = message
                                        }
                                        swipeOffsetX = 0f
                                    },
                                    onDragCancel = { swipeOffsetX = 0f },
                                    onHorizontalDrag = { _, dragAmount ->
                                        if (dragAmount > 0 || swipeOffsetX > 0f) {
                                            swipeOffsetX = (swipeOffsetX + dragAmount).coerceIn(0f, 90f)
                                        }
                                    }
                                )
                            }
                    ) {
                        // Background Reply Arrow when swiped
                        if (animatedSwipeX > 8f) {
                            Box(
                                modifier = Modifier
                                    .align(Alignment.CenterStart)
                                    .padding(start = 12.dp)
                                    .size(34.dp)
                                    .clip(CircleShape)
                                    .background(BrandForest.copy(alpha = 0.2f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.AutoMirrored.Filled.Reply,
                                    contentDescription = "Responder",
                                    tint = BrandForest,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }

                        Row(
                            Modifier
                                .fillMaxWidth()
                                .graphicsLayer { translationX = animatedSwipeX },
                            horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start
                        ) {
                            Surface(
                                shape = if (mine) {
                                    RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp, bottomStart = 18.dp, bottomEnd = 4.dp)
                                } else {
                                    RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp, bottomStart = 4.dp, bottomEnd = 18.dp)
                                },
                                color = if (mine) BrandForest else Color.White,
                                shadowElevation = if (mine) 1.5.dp else 1.dp,
                                border = if (mine) null else androidx.compose.foundation.BorderStroke(1.dp, BrandBorder.copy(alpha = 0.5f)),
                                modifier = Modifier
                                    .padding(horizontal = 4.dp)
                                    .widthIn(min = 84.dp, max = 310.dp)
                                    .combinedClickable(
                                        onClick = { if (!isDeleted) selectedMessageForMenu = message },
                                        onLongClick = { if (!isDeleted) selectedMessageForMenu = message }
                                    )
                            ) {
                                Column(
                                    Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                                ) {
                                    // Quoted reply header if this message is a reply
                                    if (replyTo != null && !isDeleted) {
                                        val replyAuthor = replyTo["senderName"]?.toString() ?: "Mensaje"
                                        val replySnippet = replyTo["text"]?.toString()?.takeIf { it.isNotBlank() } ?: "Archivo adjunto"
                                        Surface(
                                            shape = RoundedCornerShape(8.dp),
                                            color = if (mine) Color.White.copy(alpha = 0.16f) else Color(0xFFF3ECE0),
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(bottom = 6.dp)
                                        ) {
                                            Row(Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                                                Box(
                                                    Modifier
                                                        .width(3.dp)
                                                        .height(26.dp)
                                                        .clip(RoundedCornerShape(2.dp))
                                                        .background(if (mine) Color(0xFFF59E0B) else BrandForest)
                                                )
                                                Spacer(Modifier.width(6.dp))
                                                Column {
                                                    Text(replyAuthor, style = MaterialTheme.typography.labelSmall, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold, color = if (mine) Color(0xFFF59E0B) else BrandForest)
                                                    Text(replySnippet, style = MaterialTheme.typography.bodySmall, color = if (mine) Color.White.copy(alpha = 0.85f) else BrandTextSecondary, maxLines = 1)
                                                }
                                            }
                                        }
                                    }

                                    if (isDeleted) {
                                        Text(
                                            "🚫 Este mensaje fue eliminado",
                                            style = MaterialTheme.typography.bodySmall,
                                            fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                                            color = if (mine) Color.White.copy(alpha = 0.7f) else BrandTextMuted
                                        )
                                    } else {
                                        if ((type == "image" || message["image"] != null) && media != null) {
                                            PrivateAttachment(
                                                reference = media,
                                                type = "image",
                                                uid = uid,
                                                mine = mine,
                                                onImageClick = { resolvedUrl ->
                                                    viewingImageUrl = resolvedUrl
                                                    viewingImageSender = if (mine) "Tú" else otherName
                                                    viewingImageTime = timeFormatted
                                                }
                                            )
                                            if (textContent.isNotBlank() && textContent != "Foto" && textContent != "Archivo enviado") {
                                                Spacer(Modifier.height(4.dp))
                                                Text(
                                                    textContent,
                                                    color = if (mine) Color.White else BrandTextPrimary,
                                                    style = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.5.sp, lineHeight = 19.sp)
                                                )
                                            }
                                        } else if (type == "audio" && media != null) {
                                            PrivateAttachment(media, "audio", uid, mine)
                                        } else {
                                            Text(
                                                textContent,
                                                color = if (mine) Color.White else BrandTextPrimary,
                                                style = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.5.sp, lineHeight = 20.sp)
                                            )
                                        }

                                        if (type == "location") {
                                            TextButton(onClick = {
                                                val uri = Uri.parse("https://www.google.com/maps/search/?api=1&query=${message["latitude"]},${message["longitude"]}")
                                                context.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, uri))
                                            }) { Text("Ver ubicación") }
                                        }
                                    }

                                    // Timestamp and Two Checkmarks status (Double-check)
                                    Row(
                                        modifier = Modifier
                                            .align(Alignment.End)
                                            .padding(top = 3.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(3.dp)
                                    ) {
                                        if (isEdited && !isDeleted) {
                                            Text(
                                                "editado",
                                                style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.5.sp),
                                                fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                                                color = if (mine) Color.White.copy(alpha = 0.7f) else BrandTextMuted
                                            )
                                        }
                                        Text(
                                            timeFormatted,
                                            style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                                            color = if (mine) Color.White.copy(alpha = 0.75f) else BrandTextMuted
                                        )
                                        // TWO CHECKMARKS (Double Check) for user messages
                                        if (mine && !isDeleted) {
                                            val isRead = time != null && readAt >= time.toDate().time
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy((-6).dp)
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.Check,
                                                    contentDescription = null,
                                                    tint = if (isRead) Color(0xFF22C55E) else Color.White.copy(alpha = 0.65f),
                                                    modifier = Modifier.size(13.dp)
                                                )
                                                Icon(
                                                    imageVector = Icons.Default.Check,
                                                    contentDescription = if (isRead) "Leído" else "Enviado",
                                                    tint = if (isRead) Color(0xFF22C55E) else Color.White.copy(alpha = 0.65f),
                                                    modifier = Modifier.size(13.dp)
                                                )
                                            }
                                        }
                                    }

                                    // Reaction badges - pinned at the bottom of the bubble
                                    if (reactions.isNotEmpty() && !isDeleted) {
                                        val reactionCounts = reactions.values.groupingBy { it }.eachCount()
                                        Row(
                                            modifier = Modifier.padding(top = 4.dp),
                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            reactionCounts.forEach { (emoji, count) ->
                                                val userHasThis = myReaction == emoji
                                                Surface(
                                                    shape = RoundedCornerShape(12.dp),
                                                    color = if (userHasThis) (if (mine) Color.White.copy(alpha = 0.28f) else BrandForest.copy(alpha = 0.14f))
                                                            else (if (mine) Color.Black.copy(alpha = 0.18f) else Color(0xFFF3ECE0)),
                                                    border = if (userHasThis) androidx.compose.foundation.BorderStroke(1.dp, if (mine) Color.White.copy(alpha = 0.5f) else BrandForest.copy(alpha = 0.3f)) else null,
                                                    modifier = Modifier.clickable { toggleReaction(msgId, emoji, myReaction) }
                                                ) {
                                                    Row(
                                                        modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.5.dp),
                                                        verticalAlignment = Alignment.CenterVertically,
                                                        horizontalArrangement = Arrangement.spacedBy(3.dp)
                                                    ) {
                                                        Text(emoji, fontSize = 12.sp)
                                                        if (count > 1) {
                                                            Text(
                                                                count.toString(),
                                                                style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                                                                color = if (mine) Color.White else BrandForest,
                                                                fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                                                            )
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Modal menu for selected message: Emojis + Full Emoji (+) + Reply + Edit + Delete
    if (selectedMessageForMenu != null) {
        val targetMsg = selectedMessageForMenu!!
        val targetMsgId = targetMsg["id"]?.toString().orEmpty()
        val isMine = targetMsg["senderId"] == uid
        val isDeleted = targetMsg["isDeleted"] == true
        val targetType = targetMsg["type"] as? String ?: "text"
        val targetText = targetMsg["text"] as? String ?: ""
        val targetReactions = (targetMsg["reactions"] as? Map<*, *>)?.mapNotNull { (k, v) ->
            if (k != null && v != null) k.toString() to v.toString() else null
        }?.toMap().orEmpty()
        val currentMyReaction = uid?.let { targetReactions[it] }

        Dialog(onDismissRequest = { selectedMessageForMenu = null }) {
            Surface(
                shape = RoundedCornerShape(24.dp),
                color = Color.White,
                shadowElevation = 10.dp,
                modifier = Modifier.fillMaxWidth().padding(16.dp)
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Emoji reaction bar dock with + button for ALL emojis
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFFFAF7F2), RoundedCornerShape(20.dp))
                            .padding(horizontal = 6.dp, vertical = 6.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        listOf("👍", "❤️", "😂", "😮", "😢", "🙏").forEach { emoji ->
                            val selected = currentMyReaction == emoji
                            Box(
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(CircleShape)
                                    .background(if (selected) BrandForest.copy(alpha = 0.2f) else Color.Transparent)
                                    .clickable {
                                        toggleReaction(targetMsgId, emoji, currentMyReaction)
                                        selectedMessageForMenu = null
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Text(emoji, fontSize = 18.sp)
                            }
                        }

                        // PLUS (+) button to access ALL emojis
                        Box(
                            modifier = Modifier
                                .size(38.dp)
                                .clip(CircleShape)
                                .background(BrandForest.copy(alpha = 0.1f))
                                .clickable {
                                    val id = targetMsgId
                                    selectedMessageForMenu = null
                                    showFullEmojiPickerForMessageId = id
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Más emojis", tint = BrandForest, modifier = Modifier.size(20.dp))
                        }
                    }

                    // Action buttons
                    HorizontalDivider(color = BrandBorder.copy(alpha = 0.6f))

                    // Responder (Reply)
                    TextButton(
                        onClick = {
                            replyingToMessage = targetMsg
                            selectedMessageForMenu = null
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Reply, contentDescription = null, tint = BrandForest)
                        Spacer(Modifier.width(8.dp))
                        Text("Responder", color = BrandForest, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                    }

                    if (isMine && !isDeleted) {
                        if (targetType == "text" && targetMsg["image"] == null) {
                            TextButton(
                                onClick = {
                                    editingMessageId = targetMsgId
                                    draft = targetText
                                    selectedMessageForMenu = null
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(Icons.Default.Edit, contentDescription = null, tint = BrandForest)
                                Spacer(Modifier.width(8.dp))
                                Text("Editar mensaje", color = BrandForest, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                            }
                        }

                        TextButton(
                            onClick = {
                                selectedMessageForMenu = null
                                showDeleteMessageDialog = targetMsgId
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Delete, contentDescription = null, tint = BrandTerracota)
                            Spacer(Modifier.width(8.dp))
                            Text("Eliminar para todos", color = BrandTerracota, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                        }
                    }

                    TextButton(
                        onClick = { selectedMessageForMenu = null },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Cerrar", color = BrandTextMuted)
                    }
                }
            }
        }
    }

    // Full Emoji Keyboard Picker Dialog (Hundreds of categorized emojis)
    if (showFullEmojiPickerForMessageId != null) {
        val targetMsgId = showFullEmojiPickerForMessageId!!
        val currentMsg = visibleMessages.find { it["id"] == targetMsgId }
        val targetReactions = (currentMsg?.get("reactions") as? Map<*, *>)?.mapNotNull { (k, v) ->
            if (k != null && v != null) k.toString() to v.toString() else null
        }?.toMap().orEmpty()
        val currentMyReaction = uid?.let { targetReactions[it] }

        Dialog(onDismissRequest = { showFullEmojiPickerForMessageId = null }) {
            Surface(
                shape = RoundedCornerShape(24.dp),
                color = Color.White,
                shadowElevation = 12.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(440.dp)
                    .padding(8.dp)
            ) {
                Column(Modifier.fillMaxSize().padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            "Reaccionar con emoji",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                            color = BrandTextPrimary
                        )
                        IconButton(onClick = { showFullEmojiPickerForMessageId = null }, modifier = Modifier.size(28.dp)) {
                            Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = BrandTextMuted)
                        }
                    }

                    Spacer(Modifier.height(8.dp))

                    LazyVerticalGrid(
                        columns = GridCells.Fixed(6),
                        modifier = Modifier.fillMaxSize(),
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        items(fullEmojiList) { emoji ->
                            val selected = currentMyReaction == emoji
                            Box(
                                modifier = Modifier
                                    .size(46.dp)
                                    .clip(CircleShape)
                                    .background(if (selected) BrandForest.copy(alpha = 0.2f) else Color.Transparent)
                                    .clickable {
                                        toggleReaction(targetMsgId, emoji, currentMyReaction)
                                        showFullEmojiPickerForMessageId = null
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Text(emoji, fontSize = 24.sp)
                            }
                        }
                    }
                }
            }
        }
    }

    // Wallpaper Customization Dialog (Only for this user, local visualization)
    if (showWallpaperDialog) {
        Dialog(onDismissRequest = { showWallpaperDialog = false }) {
            Surface(
                shape = RoundedCornerShape(24.dp),
                color = Color.White,
                shadowElevation = 12.dp,
                modifier = Modifier.fillMaxWidth().padding(12.dp)
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Text(
                        "Personalizar fondo de chat",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                        color = BrandTextPrimary
                    )
                    Text(
                        "Este fondo solo lo verás tú en tu teléfono. El otro usuario mantendrá su propia vista.",
                        style = MaterialTheme.typography.bodySmall,
                        color = BrandTextSecondary
                    )

                    // Color presets grid
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        listOf(
                            Triple("Lino", "default", 0xFFF7F4EEL),
                            Triple("Verde", "color", 0xFF0B3B26L),
                            Triple("Noche", "color", 0xFF0F172AL),
                            Triple("Arena", "color", 0xFFFAF0E4L),
                            Triple("Blanco", "color", 0xFFFFFFFFL)
                        ).forEach { (name, type, hex) ->
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier.clickable {
                                    customBgType = type
                                    customBgValue = if (type == "color") hex.toString(16) else ""
                                    prefs.edit()
                                        .putString("bg_type_$conversationId", type)
                                        .putString("bg_val_$conversationId", customBgValue)
                                        .apply()
                                    showWallpaperDialog = false
                                }
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(44.dp)
                                        .clip(CircleShape)
                                        .background(Color(hex))
                                        .border(2.dp, BrandForest.copy(alpha = 0.3f), CircleShape)
                                )
                                Spacer(Modifier.height(4.dp))
                                Text(name, fontSize = 11.sp, color = BrandTextSecondary)
                            }
                        }
                    }

                    HorizontalDivider(color = BrandBorder.copy(alpha = 0.5f))

                    // Choose image from gallery
                    Button(
                        onClick = {
                            showWallpaperDialog = false
                            wallpaperPicker.launch("image/*")
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = BrandForest),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Image, contentDescription = null, tint = Color.White)
                        Spacer(Modifier.width(8.dp))
                        Text("Elegir foto de mi galería", color = Color.White, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                    }

                    // Reset to default
                    TextButton(
                        onClick = {
                            customBgType = "default"
                            customBgValue = ""
                            prefs.edit()
                                .remove("bg_type_$conversationId")
                                .remove("bg_val_$conversationId")
                                .apply()
                            showWallpaperDialog = false
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Restablecer predeterminado", color = BrandTextMuted)
                    }
                }
            }
        }
    }

    // Confirmation Dialog for Clearing Chat (Only for me)
    if (showClearChatDialog) {
        AlertDialog(
            onDismissRequest = { showClearChatDialog = false },
            title = { Text("¿Vaciar chat para mí?", fontWeight = androidx.compose.ui.text.font.FontWeight.Bold) },
            text = { Text("Se ocultarán los mensajes de esta conversación únicamente en tu cuenta. El otro usuario aún podrá conservar su historial de chat.") },
            confirmButton = {
                TextButton(onClick = { clearChat() }) {
                    Text("Vaciar para mí", color = BrandTerracota, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearChatDialog = false }) {
                    Text("Cancelar")
                }
            }
        )
    }

    // Confirmation Dialog for Deleting Message
    if (showDeleteMessageDialog != null) {
        AlertDialog(
            onDismissRequest = { showDeleteMessageDialog = null },
            title = { Text("¿Eliminar mensaje?", fontWeight = androidx.compose.ui.text.font.FontWeight.Bold) },
            text = { Text("El mensaje se marcará como eliminado para todos los participantes.") },
            confirmButton = {
                TextButton(onClick = {
                    val idToDelete = showDeleteMessageDialog!!
                    showDeleteMessageDialog = null
                    deleteMessage(idToDelete)
                }) {
                    Text("Eliminar", color = BrandTerracota, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteMessageDialog = null }) {
                    Text("Cancelar")
                }
            }
        )
    }

    // High-Resolution Preview Dialog before Sending
    if (pendingMediaUri != null) {
        MediaSendPreviewDialog(
            uri = pendingMediaUri!!,
            type = pendingMediaType,
            caption = pendingMediaCaption,
            onCaptionChange = { pendingMediaCaption = it },
            onCancel = {
                pendingMediaUri = null
                pendingMediaCaption = ""
            },
            onSend = {
                val uriToSend = pendingMediaUri!!
                val typeToSend = pendingMediaType
                val captionToSend = pendingMediaCaption
                val replyPayload = replyingToMessage?.let {
                    mapOf(
                        "id" to it["id"].toString(),
                        "senderName" to (if (it["senderId"] == uid) "Tú" else otherName),
                        "text" to (it["text"]?.toString() ?: ""),
                        "type" to (it["type"]?.toString() ?: "image")
                    )
                }
                pendingMediaUri = null
                pendingMediaCaption = ""
                upload(uriToSend, typeToSend, captionToSend, replyPayload)
            }
        )
    }

    // WhatsApp-style Fullscreen Pinch-to-zoom Viewer
    if (viewingImageUrl != null) {
        FullScreenImageViewer(
            imageUrl = viewingImageUrl!!,
            senderName = viewingImageSender,
            time = viewingImageTime,
            onDismiss = { viewingImageUrl = null }
        )
    }
}

@Composable
private fun RecordingIndicator(seconds: Int, modifier: Modifier = Modifier) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulse by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(600, easing = LinearEasing), RepeatMode.Reverse),
        label = "pulseAlpha"
    )
    Surface(
        modifier = modifier.height(46.dp),
        shape = RoundedCornerShape(22.dp),
        color = BrandTerracota.copy(alpha = 0.12f)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Box(
                Modifier
                    .size(10.dp)
                    .clip(CircleShape)
                    .background(BrandTerracota.copy(alpha = pulse))
            )
            Text(
                "%02d:%02d".format(seconds / 60, seconds % 60),
                color = BrandTerracota,
                fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                fontSize = 14.sp
            )
            Text("Grabando audio...", style = MaterialTheme.typography.labelSmall, color = BrandTextSecondary)
        }
    }
}

@Composable
private fun AudioAttachment(url: String, mine: Boolean) {
    var player by remember(url) { mutableStateOf<MediaPlayer?>(null) }
    var playing by remember(url) { mutableStateOf(false) }
    var error by remember(url) { mutableStateOf(false) }
    var duration by remember(url) { mutableIntStateOf(0) }
    var position by remember(url) { mutableIntStateOf(0) }
    DisposableEffect(url) { onDispose { player?.release() } }
    LaunchedEffect(playing) {
        while (playing) {
            position = player?.currentPosition ?: 0
            kotlinx.coroutines.delay(250)
        }
    }
    val foreground = if (mine) Color.White else BrandForest
    if (error) {
        Text("Audio no disponible", color = foreground, style = MaterialTheme.typography.labelSmall)
    } else {
        Row(
            Modifier.widthIn(min = 210.dp, max = 270.dp).padding(vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = {
                    if (playing) { player?.pause(); playing = false }
                    else if (player != null) { player?.start(); playing = true }
                    else try {
                        player = MediaPlayer().apply {
                            setDataSource(url)
                            setOnPreparedListener { duration = it.duration; it.start(); playing = true }
                            setOnCompletionListener { playing = false; position = duration }
                            setOnErrorListener { _, _, _ -> error = true; playing = false; true }
                            prepareAsync()
                        }
                    } catch (_: Exception) { error = true }
                },
                modifier = Modifier
                    .size(38.dp)
                    .clip(CircleShape)
                    .background(if (mine) Color.White.copy(alpha = 0.2f) else BrandForest.copy(alpha = 0.12f))
            ) {
                Icon(
                    imageVector = if (playing) Icons.Default.Pause else Icons.Default.PlayArrow,
                    contentDescription = if (playing) "Pausar" else "Reproducir",
                    tint = foreground,
                    modifier = Modifier.size(20.dp)
                )
            }
            Spacer(Modifier.width(8.dp))
            Column(Modifier.weight(1f)) {
                LinearProgressIndicator(
                    progress = { if (duration > 0) position.toFloat() / duration else 0f },
                    modifier = Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)),
                    color = foreground,
                    trackColor = foreground.copy(alpha = 0.25f)
                )
                Spacer(Modifier.height(3.dp))
                Text(
                    "%d:%02d / %d:%02d".format(position / 60000, (position / 1000) % 60, duration / 60000, (duration / 1000) % 60),
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                    color = foreground.copy(alpha = 0.85f)
                )
            }
        }
    }
}

@Composable
private fun PrivateAttachment(
    reference: String,
    type: String,
    uid: String?,
    mine: Boolean = false,
    onImageClick: ((String) -> Unit)? = null
) {
    val initial = remember(reference) {
        if (!reference.startsWith("supabase://")) reference
        else AndroidMediaCache.cache[reference]
    }
    var url by remember(reference, uid) { mutableStateOf(initial) }
    var error by remember(reference, uid) { mutableStateOf(false) }

    LaunchedEffect(reference, uid) {
        if (!reference.startsWith("supabase://")) {
            url = reference
            return@LaunchedEffect
        }
        val cached = AndroidMediaCache.cache[reference]
        if (cached != null) {
            url = cached
        }
        while (true) {
            try {
                val resolved = kotlinx.coroutines.suspendCancellableCoroutine<String> { continuation ->
                    com.example.ruwajay.data.repository.RuwaBackend.resolve(reference, uid)
                        .addOnSuccessListener { if (continuation.isActive) continuation.resumeWith(Result.success(it)) }
                        .addOnFailureListener { if (continuation.isActive) continuation.resumeWith(Result.failure(it)) }
                }
                AndroidMediaCache.cache[reference] = resolved
                url = resolved
                error = false
            } catch (cancelled: kotlinx.coroutines.CancellationException) { throw cancelled }
              catch (_: Exception) {
                  if (url == null) error = true
              }
            kotlinx.coroutines.delay(240000)
        }
    }

    val resolved = url
    if (resolved != null) {
        if (type == "audio") {
            AudioAttachment(resolved, mine)
        } else {
            AsyncImage(
                model = resolved,
                contentDescription = "Foto",
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .clickable { onImageClick?.invoke(resolved) },
                contentScale = ContentScale.Crop
            )
        }
    } else {
        if (error) {
            Text("Archivo no disponible", color = if (mine) Color.White.copy(alpha = 0.7f) else BrandTerracota, style = MaterialTheme.typography.labelSmall)
        } else {
            if (type == "audio") {
                Box(
                    modifier = Modifier
                        .width(220.dp)
                        .height(44.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (mine) Color.White.copy(alpha = 0.15f) else BrandForest.copy(alpha = 0.08f)),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = if (mine) Color.White else BrandForest,
                        strokeWidth = 2.dp
                    )
                }
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(if (mine) Color.White.copy(alpha = 0.15f) else BrandForest.copy(alpha = 0.08f)),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(28.dp),
                        color = if (mine) Color.White else BrandForest,
                        strokeWidth = 2.5.dp
                    )
                }
            }
        }
    }
}

@Composable
private fun MediaSendPreviewDialog(
    uri: Uri,
    type: String,
    caption: String,
    onCaptionChange: (String) -> Unit,
    onCancel: () -> Unit,
    onSend: () -> Unit
) {
    Dialog(
        onDismissRequest = onCancel,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF0F172A))
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Top bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF1E293B))
                        .statusBarsPadding()
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onCancel) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Cancelar",
                            tint = Color.White
                        )
                    }
                    Text(
                        text = "Vista previa",
                        color = Color.White,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                        modifier = Modifier.padding(start = 8.dp)
                    )
                }

                // Full-resolution image preview
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(14.dp),
                    contentAlignment = Alignment.Center
                ) {
                    AsyncImage(
                        model = uri,
                        contentDescription = "Vista previa",
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(RoundedCornerShape(14.dp)),
                        contentScale = ContentScale.Fit
                    )
                }

                // Bottom bar with caption & RuwaJay styled send button
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF1E293B))
                        .navigationBarsPadding()
                        .imePadding()
                        .padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = caption,
                        onValueChange = onCaptionChange,
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("Añadir un comentario...", color = Color.LightGray, fontSize = 14.sp) },
                        maxLines = 3,
                        shape = RoundedCornerShape(24.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedContainerColor = Color(0xFF334155),
                            unfocusedContainerColor = Color(0xFF334155),
                            focusedBorderColor = BrandForest,
                            unfocusedBorderColor = Color.Transparent
                        )
                    )

                    FloatingActionButton(
                        onClick = onSend,
                        modifier = Modifier.size(50.dp),
                        shape = CircleShape,
                        containerColor = BrandForest,
                        contentColor = Color.White,
                        elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.Send,
                            contentDescription = "Enviar",
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun FullScreenImageViewer(
    imageUrl: String,
    senderName: String,
    time: String,
    onDismiss: () -> Unit
) {
    var scale by remember { mutableFloatStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .pointerInput(Unit) {
                        detectTapGestures(
                            onDoubleTap = {
                                if (scale > 1f) {
                                    scale = 1f
                                    offset = Offset.Zero
                                } else {
                                    scale = 2.5f
                                }
                            }
                        )
                    }
                    .pointerInput(Unit) {
                        detectTransformGestures { _, pan, zoom, _ ->
                            val newScale = (scale * zoom).coerceIn(1f, 5f)
                            if (newScale <= 1.05f) {
                                scale = 1f
                                offset = Offset.Zero
                            } else {
                                scale = newScale
                                offset += pan * scale
                            }
                        }
                    },
                contentAlignment = Alignment.Center
            ) {
                AsyncImage(
                    model = imageUrl,
                    contentDescription = "Foto ampliada",
                    modifier = Modifier
                        .fillMaxSize()
                        .graphicsLayer {
                            scaleX = scale
                            scaleY = scale
                            translationX = offset.x
                            translationY = offset.y
                        },
                    contentScale = ContentScale.Fit
                )
            }

            // Top Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.Black.copy(alpha = 0.65f))
                    .statusBarsPadding()
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onDismiss) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Cerrar visor",
                        tint = Color.White
                    )
                }
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .padding(start = 4.dp)
                ) {
                    Text(
                        text = if (senderName.isNotBlank()) senderName else "Foto",
                        color = Color.White,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                        maxLines = 1
                    )
                    if (time.isNotBlank()) {
                        Text(
                            text = time,
                            color = Color.White.copy(alpha = 0.7f),
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }

                if (scale > 1.05f) {
                    IconButton(onClick = { scale = 1f; offset = Offset.Zero }) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Restablecer zoom",
                            tint = Color.White
                        )
                    }
                }
            }

            // Floating hint for pinch or double tap
            if (scale == 1f) {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Color.Black.copy(alpha = 0.65f),
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .navigationBarsPadding()
                        .padding(bottom = 24.dp)
                ) {
                    Text(
                        text = "Doble toque o pellizca para hacer zoom",
                        color = Color.White.copy(alpha = 0.9f),
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                    )
                }
            }
        }
    }
}
