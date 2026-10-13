package com.example.ruwajay.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.example.ruwajay.data.repository.ChatRepository
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.Timestamp
import java.io.File
import java.text.SimpleDateFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
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
    var recording by remember { mutableStateOf(false) }
    var recorder by remember { mutableStateOf<MediaRecorder?>(null) }
    var recordingFile by remember { mutableStateOf<File?>(null) }
    val list = rememberLazyListState()
    DisposableEffect(conversationId,uid) {
        val a = repo.observeMessages(conversationId,onError={error=it.message}) { messages=it;if(lifecycleOwner.lifecycle.currentState.isAtLeast(androidx.lifecycle.Lifecycle.State.RESUMED))repo.markAsRead(conversationId) }
        val b = FirebaseFirestore.getInstance().collection("conversations").document(conversationId).addSnapshotListener { snap, failure ->
            if(failure!=null) error=failure.message else room=snap?.data.orEmpty()
        }
        onDispose { a.remove();b.remove() }
    }
    DisposableEffect(lifecycleOwner,conversationId) {
        val observer=androidx.lifecycle.LifecycleEventObserver { _,event->if(event==androidx.lifecycle.Lifecycle.Event.ON_RESUME)repo.markAsRead(conversationId) }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose{lifecycleOwner.lifecycle.removeObserver(observer)}
    }
    LaunchedEffect(messages.size) { if(messages.isNotEmpty()) list.animateScrollToItem(messages.lastIndex) }
    DisposableEffect(Unit) { onDispose { try { recorder?.release() } catch (_:Exception){}; recordingFile?.delete() } }
    fun upload(uri: Uri,type: String) {
        sending=true;error=null
        repo.uploadMedia(conversationId,uri,context.contentResolver,type) { result ->
            sending=false;result.onFailure {error=it.message}
            if(type=="audio") {recordingFile?.delete();recordingFile=null}
        }
    }
    fun stopRecording() {
        try { recorder?.stop();recorder?.release();recorder=null;recording=false;recordingFile?.let { upload(Uri.fromFile(it),"audio") } }
        catch (_:Exception) { recorder?.release();recorder=null;recording=false;recordingFile?.delete();error="No se pudo grabar el audio." }
    }
    fun startRecording() {
        try {
            val file=File.createTempFile("voice-",".m4a",context.cacheDir)
            recordingFile=file
            val audio=MediaRecorder().apply {
                setAudioSource(MediaRecorder.AudioSource.MIC);setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC);setOutputFile(file.absolutePath);setMaxDuration(60000)
                setOnInfoListener { _,what,_ -> if(what==MediaRecorder.MEDIA_RECORDER_INFO_MAX_DURATION_REACHED) stopRecording() }
                prepare();start()
            }
            recorder=audio;recording=true
        } catch (_:Exception) { error="No se pudo acceder al microfono.";recorder?.release();recorder=null }
    }
    val mic = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if(granted) startRecording() else error="Permiso de microfono denegado."
    }
    val images = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri -> uri?.let { upload(it,"image") } }
    val other=(room["participants"] as? List<*>)?.firstOrNull {it!=uid}
    val readAt=((room["readAt"] as? Map<*, *>)?.get(other) as? Timestamp)?.toDate()?.time ?: 0L
    Scaffold(topBar={TopAppBar(title={Text("Chat privado")},navigationIcon={TextButton(onClick=onNavigateBack){Text("Volver")}})},
        bottomBar={Column(Modifier.padding(12.dp)) {
            error?.let {Text(it,color=MaterialTheme.colorScheme.error)}
            Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                TextButton(onClick={images.launch("image/*")},enabled=!sending&&!recording){Text("Foto")}
                TextButton(onClick={
                    if(recording) stopRecording()
                    else if(ContextCompat.checkSelfPermission(context,Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED) startRecording()
                    else mic.launch(Manifest.permission.RECORD_AUDIO)
                },enabled=!sending){Text(if(recording) "Enviar audio" else "Grabar audio")}
            }
            Row(verticalAlignment=Alignment.CenterVertically) {
                OutlinedTextField(value=draft,onValueChange={draft=it},modifier=Modifier.weight(1f),placeholder={Text("Mensaje")},maxLines=3)
                TextButton(enabled=draft.isNotBlank()&&!sending&&!recording,onClick={
                    val text=draft;sending=true;error=null
                    repo.sendText(conversationId,text) {result->sending=false;result.onSuccess{draft=""}.onFailure{error=it.message}}
                }) {Text(if(sending) "Enviando..." else "Enviar")}
            }
        }}
    ) { padding ->
        LazyColumn(state=list,modifier=Modifier.fillMaxSize().padding(padding).padding(12.dp),verticalArrangement=Arrangement.spacedBy(8.dp)) {
            items(messages,key={it["id"].toString()}) { message ->
                val mine=message["senderId"]==uid
                Row(Modifier.fillMaxWidth(),horizontalArrangement=if(mine)Arrangement.End else Arrangement.Start) {
                    Surface(shape=RoundedCornerShape(12.dp),color=if(mine)Color(0xFFD9FDD3)else Color.White) {
                        Column(Modifier.padding(12.dp).widthIn(max=300.dp)) {
                            val type=message["type"] as? String ?: "text"
                            val media=message["mediaUrl"] as? String ?: message["image"] as? String
                            if((type=="image"||message["image"]!=null)&&media!=null) PrivateAttachment(media,"image",uid)
                            if(type=="audio"&&media!=null) PrivateAttachment(media,"audio",uid) else Text(message["text"] as? String ?: "")
                            if(type=="location") TextButton(onClick={
                                val uri=Uri.parse("https://www.google.com/maps/search/?api=1&query=${message["latitude"]},${message["longitude"]}")
                                context.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW,uri))
                            }) {Text("Ver ubicacion")}
                            val time=message["createdAt"] as? Timestamp
                            Text((time?.let{SimpleDateFormat("HH:mm",Locale.getDefault()).format(it.toDate())}?:"") +
                                if(mine) if(time!=null&&readAt>=time.toDate().time) " - Leido" else " - Enviado" else "",
                                style=MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }
        }
    }
}
@Composable
private fun AudioAttachment(url: String) {
    var player by remember(url) { mutableStateOf<MediaPlayer?>(null) }
    var playing by remember(url) { mutableStateOf(false) }
    var error by remember(url) { mutableStateOf(false) }
    DisposableEffect(url) {onDispose{player?.release()}}
    TextButton(onClick={
        if(playing){player?.pause();playing=false}
        else if(player!=null){player?.start();playing=true}
        else try {
            player=MediaPlayer().apply {
                setDataSource(url);setOnPreparedListener{it.start();playing=true}
                setOnCompletionListener{playing=false};setOnErrorListener{_,_,_->error=true;playing=false;true};prepareAsync()
            }
        } catch (_:Exception){error=true}
    }) {Text(if(error) "Audio no disponible" else if(playing) "Pausar audio" else "Reproducir audio")}
}

@Composable
private fun PrivateAttachment(reference: String,type: String,uid: String?) {
    var url by remember(reference,uid) { mutableStateOf<String?>(null) }
    var error by remember(reference,uid) { mutableStateOf(false) }
    LaunchedEffect(reference,uid) {
        while (true) {
            try {
                url=kotlinx.coroutines.suspendCancellableCoroutine<String> { continuation ->
                    com.example.ruwajay.data.repository.RuwaBackend.resolve(reference,uid)
                        .addOnSuccessListener { if(continuation.isActive) continuation.resumeWith(Result.success(it)) }
                        .addOnFailureListener { if(continuation.isActive) continuation.resumeWith(Result.failure(it)) }
                }
                error=false
            } catch(cancelled:kotlinx.coroutines.CancellationException) { throw cancelled }
              catch(_:Exception) { url=null;error=true }
            if(!reference.startsWith("supabase://")) break
            kotlinx.coroutines.delay(240000)
        }
    }
    val resolved=url
    if(resolved!=null) {
        if(type=="audio") AudioAttachment(resolved)
        else AsyncImage(model=resolved,contentDescription="Foto",modifier=Modifier.fillMaxWidth().height(180.dp))
    } else Text(if(error) "Archivo no disponible" else "Cargando archivo…",style=MaterialTheme.typography.labelSmall)
}
