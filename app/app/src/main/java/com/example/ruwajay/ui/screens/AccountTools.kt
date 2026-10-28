package com.example.ruwajay.ui.screens

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.ruwajay.data.repository.VisitRepository
import com.example.ruwajay.data.repository.VisitRequest
import com.example.ruwajay.data.repository.RuwaBackend
import com.example.ruwajay.data.repository.NotificationRepository
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FieldValue

@Composable
fun AccountTools(
    onPropertyClick: (String) -> Unit,
    onChatClick: (String) -> Unit,
    onSearchClick: (String) -> Unit,
    initialSection: String = "",
    showNavigation: Boolean = true,
    onVisitsClick: (() -> Unit)? = null
) {
    val uid = FirebaseAuth.getInstance().currentUser?.uid ?: return
    val context = androidx.compose.ui.platform.LocalContext.current
    val db = remember { FirebaseFirestore.getInstance() }
    val visitsRepo = remember { VisitRepository() }
    var visits by remember(uid) { mutableStateOf<List<VisitRequest>>(emptyList()) }
    var searches by remember(uid) { mutableStateOf<List<Map<String, Any>>>(emptyList()) }
    var notifications by remember(uid) { mutableStateOf<List<Map<String, Any>>>(emptyList()) }
    var section by remember(uid, initialSection) { mutableStateOf(initialSection) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var bio by remember { mutableStateOf("") }
    val profilePhoto = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if(uri!=null) {
            busy=true
            RuwaBackend.upload("profile",uri,context.contentResolver,expectedUid=uid)
                .continueWithTask { upload ->
                    if(!upload.isSuccessful) throw upload.exception ?: Exception("No se pudo subir la foto.")
                    RuwaBackend.invoke("updateProfile",mapOf("profile" to mapOf("avatarImage" to upload.result)),uid)
                }.addOnSuccessListener { busy=false }.addOnFailureListener { busy=false;error=it.message }
        }
    }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if(granted) NotificationRepository.register { it.onFailure {failure -> error=failure.message} } else error="Permiso de notificaciones denegado."
    }
    DisposableEffect(uid) {
        val a = visitsRepo.observeUserVisits(onError={error=it.message}) { visits=it }
        val b = db.collection("users").document(uid).collection("saved_searches").addSnapshotListener { snapshot,failure ->
            if(failure!=null) error=failure.message else searches=snapshot?.documents?.map {it.data.orEmpty()+("id" to it.id)}.orEmpty()
        }
        val c = db.collection("users").document(uid).collection("notifications").addSnapshotListener { snapshot,failure ->
            if(failure!=null) error=failure.message else notifications=snapshot?.documents?.map {it.data.orEmpty()+("id" to it.id)}.orEmpty()
        }
        val d = db.collection("users").document(uid).addSnapshotListener {snapshot,_ ->
            if(section!="perfil") {name=snapshot?.getString("name") ?: "";phone=snapshot?.getString("phone") ?: "";bio=snapshot?.getString("bio") ?: ""}
        }
        onDispose {a?.remove();b.remove();c.remove();d.remove()}
    }
    Column(Modifier.fillMaxWidth().padding(vertical=8.dp),verticalArrangement=Arrangement.spacedBy(8.dp)) {
        if (showNavigation) Row { listOf("visitas","avisos","busquedas","perfil").forEach { item ->
            TextButton(onClick={section=if(section==item) "" else item}) { Text(item.replaceFirstChar{it.uppercase()}) }
        } }
        error?.let { Text(it,color=MaterialTheme.colorScheme.error) }
        when(section) {
            "visitas" -> {
                if(visits.isEmpty()) Text("No tienes visitas.")
                visits.forEach {visit->
                    Card(Modifier.fillMaxWidth()) {Column(Modifier.padding(12.dp)) {
                        Text(visit.propertyTitle);Text("${visit.visitDate} ${visit.visitTime} - ${visit.status}")
                        TextButton(onClick={onPropertyClick(visit.propertyId)}) {Text("Ver vivienda")}
                        if(visit.conversationId.isNotBlank()) TextButton(onClick={onChatClick(visit.conversationId)}) {Text("Abrir chat")}
                        fun change(status:String) {busy=true;visitsRepo.updateVisitStatus(visit.id,status){result->busy=false;result.onFailure{error=it.message}}}
                        if(visit.status=="pendiente"&&visit.ownerId==uid) Row {
                            TextButton(enabled=!busy,onClick={change("confirmada")}){Text("Aceptar")}
                            TextButton(enabled=!busy,onClick={change("rechazada")}){Text("Rechazar")}
                        }
                        if(visit.status in listOf("pendiente","confirmada","aceptada")) TextButton(enabled=!busy,onClick={change("cancelada")}){Text("Cancelar visita")}
                    }}
                }
            }
            "avisos" -> {
                Button(onClick={if(Build.VERSION.SDK_INT>=33)permission.launch(Manifest.permission.POST_NOTIFICATIONS)else NotificationRepository.register {it.onFailure{failure->error=failure.message}}}) {Text("Activar notificaciones")}
                TextButton(onClick={
                    val shown = com.example.ruwajay.RuwaNotifications.show(context, "Prueba de RuwaJay",
                        "Las notificaciones están activadas en este teléfono.", "/perfil", "test_${System.currentTimeMillis()}")
                    error = if (shown) "Prueba enviada. Si no suena, revisa el sonido del canal y el volumen de notificaciones." else "Las notificaciones están bloqueadas. Actívalas en Ajustes."
                }) { Text("Probar sonido y aviso") }
                TextButton(onClick={
                    com.example.ruwajay.RuwaMessagingService.ensureNotificationChannel(context)
                    val settingsIntent = if (Build.VERSION.SDK_INT >= 26) android.content.Intent(android.provider.Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
                        .putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, context.packageName)
                        .putExtra(android.provider.Settings.EXTRA_CHANNEL_ID, com.example.ruwajay.RuwaMessagingService.CHANNEL_ID)
                    else android.content.Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                        android.net.Uri.parse("package:${context.packageName}"))
                    context.startActivity(settingsIntent)
                }) { Text("Ajustes de notificaciones") }
                if(notifications.isEmpty())Text("No tienes avisos.")
                notifications.sortedByDescending{(it["createdAt"] as? com.google.firebase.Timestamp)?.toDate()?.time ?: 0L}.take(50).forEach { notice ->
                    TextButton(onClick={
                        db.collection("users").document(uid).collection("notifications").document(notice["id"].toString()).update("readAt",FieldValue.serverTimestamp())
                            .addOnFailureListener { error = "No se pudo marcar el aviso como leído. Inténtalo de nuevo." }
                        val path=notice["path"] as? String ?: ""
                        val conversation=android.net.Uri.parse(path).getQueryParameter("conversation")
                        if(!conversation.isNullOrBlank() && !conversation.contains('/')) onChatClick(conversation)
                        else if(path.startsWith("/propiedad/")) onPropertyClick(android.net.Uri.parse(path).lastPathSegment ?: "")
                        else if (onVisitsClick != null) onVisitsClick() else section="visitas"
                    }) {Text("${notice["title"]}: ${notice["body"]}")}
                }
            }
            "busquedas" -> {
                if(searches.isEmpty())Text("No tienes busquedas guardadas.")
                searches.forEach {search->Row {TextButton(onClick={onSearchClick(search["id"].toString())},modifier=Modifier.weight(1f)){Text(search["name"].toString())};TextButton(onClick={
                    db.collection("users").document(uid).collection("saved_searches").document(search["id"].toString()).delete().addOnFailureListener{error=it.message}
                }){Text("Eliminar")}} }
            }
            "perfil" -> {
                TextButton(enabled=!busy,onClick={profilePhoto.launch("image/*")}){Text("Cambiar fotografia de perfil")}
                OutlinedTextField(value=name,onValueChange={name=it},label={Text("Nombre")})
                OutlinedTextField(value=phone,onValueChange={phone=it},label={Text("Telefono")})
                OutlinedTextField(value=bio,onValueChange={bio=it},label={Text("Biografia")})
                Button(enabled=!busy,onClick={busy=true;RuwaBackend.invoke("updateProfile",mapOf("profile" to mapOf("name" to name.trim(),"phone" to phone.trim(),"bio" to bio.trim())),uid)
                    .addOnSuccessListener{busy=false;section=""}.addOnFailureListener{busy=false;error=it.message}}){Text("Guardar perfil")}
            }
        }
    }
}
