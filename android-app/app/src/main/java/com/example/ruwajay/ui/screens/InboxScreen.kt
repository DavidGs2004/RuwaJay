package com.example.ruwajay.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ruwajay.data.model.Conversation
import com.example.ruwajay.data.repository.ChatRepository
import com.example.ruwajay.ui.theme.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import coil.compose.AsyncImage
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InboxScreen(
    onNavigateBack: () -> Unit,
    onConversationClick: (String) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    val chatRepo = remember { ChatRepository() }
    val currentUser = FirebaseAuth.getInstance().currentUser
    var firestoreConversations by remember { mutableStateOf<List<Conversation>>(emptyList()) }
    var profilePhotos by remember { mutableStateOf<Map<String, String>>(emptyMap()) }

    var loadError by remember { mutableStateOf<String?>(null) }

    DisposableEffect(currentUser?.uid) {
        if (currentUser == null) return@DisposableEffect onDispose {}
        
        val listener = chatRepo.observeConversations(currentUser.uid, onError = { error ->
            loadError = "Error: ${error.message} (UID: ${currentUser.uid})"
        }) { maps ->
            loadError = null
            val conversations = maps.map { map ->
                val ts = map["lastMessageTimestamp"] as? Timestamp
                val dateStr = ts?.let {
                    SimpleDateFormat("HH:mm", Locale.getDefault()).format(it.toDate())
                } ?: ""
                
                Conversation(
                    id = map["id"] as? String ?: "",
                    propertyId = map["propertyId"] as? String ?: "",
                    ownerId = map["ownerId"] as? String ?: "",
                    participantName = ((if (map["ownerId"] == currentUser.uid) map["seekerName"] else map["ownerName"]) as? String)
                        ?: (map["participantName"] as? String)
                        ?: (map["otherUserName"] as? String)
                        ?: "Usuario",
                    participantId = (map["participants"] as? List<*>)?.firstOrNull { it != currentUser.uid }?.toString().orEmpty(),
                    participantAvatar = run {
                        val otherId=(map["participants"] as? List<*>)?.firstOrNull { it != currentUser.uid }?.toString().orEmpty()
                        profilePhotos[otherId]
                            ?: ((if (map["ownerId"] == currentUser.uid) map["seekerAvatar"] else map["ownerAvatar"]) as? String)
                            ?: (map["participantAvatar"] as? String)
                            ?: ""
                    },
                    participantOnline = false,
                    participantPhone = "",
                    participantRole = "Vendedor",
                    unreadCount = run {
                        val unreadMap = map["unreadCount"] as? Map<*, *>
                        val countInMap = (unreadMap?.get(currentUser.uid) as? Number)?.toInt()
                        val unreadCountsMap = map["unreadCounts"] as? Map<*, *>
                        val countInCountsMap = (unreadCountsMap?.get(currentUser.uid) as? Number)?.toInt()
                        val directCount = (map["unreadCount"] as? Number)?.toInt()

                        val isFromOther = map["lastSenderId"] != null && map["lastSenderId"] != currentUser.uid
                        val lastMsgTime = (map["lastMessageTimestamp"] as? Timestamp)?.toDate()?.time ?: 0L
                        val readAtMap = map["readAt"] as? Map<*, *>
                        val readAtTime = (readAtMap?.get(currentUser.uid) as? Timestamp)?.toDate()?.time ?: 0L
                        val isTimestampUnread = isFromOther && lastMsgTime > readAtTime

                        val rawCount = countInMap ?: countInCountsMap ?: directCount ?: 0
                        if (rawCount > 0) rawCount else if (isTimestampUnread) 1 else 0
                    },
                    lastMessage = map["lastMessage"] as? String ?: "",
                    lastMessageTimestamp = dateStr,
                    messages = emptyList()
                )
            }
            // Una persona puede tener varias conversaciones por diferentes
            // propiedades. La bandeja muestra solamente la mas reciente.
            firestoreConversations = conversations
                .groupBy { it.participantId.ifBlank { it.participantName.trim().lowercase() } }
                .values
                .mapNotNull { group ->
                    val latest = group.maxByOrNull { conversation ->
                        maps.firstOrNull { it["id"] == conversation.id }
                            ?.get("lastMessageTimestamp")
                            .let { it as? Timestamp }
                            ?.toDate()?.time ?: 0L
                    }
                    latest?.copy(unreadCount = group.sumOf { it.unreadCount })
                }
                .sortedByDescending { conversation ->
                    maps.firstOrNull { it["id"] == conversation.id }
                        ?.get("lastMessageTimestamp")
                        .let { it as? Timestamp }
                        ?.toDate()?.time ?: 0L
                }
            val otherIds = maps.mapNotNull { map ->
                (map["participants"] as? List<*>)?.firstOrNull { it != currentUser.uid }?.toString()
            }.distinct()
            otherIds.forEach { otherId ->
                FirebaseFirestore.getInstance().collection("users").document(otherId).get()
                    .addOnSuccessListener { doc ->
                        val photo = listOf("avatarImage", "avatar", "photoURL")
                            .firstNotNullOfOrNull { key -> doc.getString(key)?.takeIf(String::isNotBlank) }
                            .orEmpty()
                        if (photo.isNotBlank()) {
                            profilePhotos = profilePhotos + (otherId to photo)
                            firestoreConversations = firestoreConversations.map { conversation ->
                                if (conversation.participantId == otherId) conversation.copy(participantAvatar = photo) else conversation
                            }
                        }
                    }
            }
        }
        onDispose { listener.remove() }
    }

    val filteredConversations = firestoreConversations.filter {
        it.participantName.contains(searchQuery, ignoreCase = true) ||
        it.lastMessage.contains(searchQuery, ignoreCase = true)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Mensajes Privados", color = BrandTextPrimary, fontWeight = FontWeight.Black) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Regresar", tint = BrandTextPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        },
        containerColor = BrandCrema
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                placeholder = { Text("Buscar mensajes...", fontSize = 14.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = BrandTextMuted) },
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BrandForest,
                    unfocusedBorderColor = BrandCremaDark,
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color.White
                ),
                singleLine = true
            )

            if (firestoreConversations.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("No tienes conversaciones aún", color = BrandTextMuted)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Sesión: ${currentUser?.email ?: "sin email"}",
                            fontSize = 11.sp, color = BrandTextMuted
                        )
                        Text(
                            "UID: ${currentUser?.uid ?: "null"}",
                            fontSize = 10.sp, color = BrandTextMuted
                        )
                        loadError?.let {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(it, color = Color.Red, fontSize = 11.sp)
                        }
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 16.dp)
                ) {
                    items(filteredConversations) { conv ->
                        ConversationItem(
                            conversation = conv,
                            onClick = { onConversationClick(conv.id) }
                        )
                        HorizontalDivider(color = BrandCremaDark, thickness = 1.dp)
                    }
                }
            }
        }
    }
}

@Composable
fun ConversationItem(
    conversation: Conversation,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .background(if (conversation.unreadCount > 0) Color.White else Color.Transparent)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Avatar
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(BrandForest),
            contentAlignment = Alignment.Center
        ) {
            if (conversation.participantAvatar.isNotBlank()) {
                AsyncImage(
                    model = conversation.participantAvatar,
                    contentDescription = "Foto de ${conversation.participantName}",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            } else Text(
                text = conversation.participantName.firstOrNull()?.toString()?.uppercase() ?: "U",
                color = Color.White,
                fontWeight = FontWeight.Black,
                fontSize = 20.sp
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        // Content
        Column(modifier = Modifier.weight(1f)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = conversation.participantName,
                    fontWeight = FontWeight.Black,
                    fontSize = 14.sp,
                    color = BrandCafe,
                    maxLines = 1
                )
                Text(
                    text = conversation.lastMessageTimestamp,
                    fontSize = 11.sp,
                    color = BrandTextMuted
                )
            }
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = conversation.lastMessage,
                    fontSize = 13.sp,
                    color = if (conversation.unreadCount > 0) BrandCafe else BrandTextMuted,
                    fontWeight = if (conversation.unreadCount > 0) FontWeight.Bold else FontWeight.Normal,
                    maxLines = 1,
                    modifier = Modifier.weight(1f).padding(end = 8.dp)
                )
                
                if (conversation.unreadCount > 0) {
                    Box(
                        modifier = Modifier
                            .defaultMinSize(minWidth = 22.dp, minHeight = 22.dp)
                            .clip(CircleShape)
                            .background(BrandTerracota)
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = if (conversation.unreadCount > 99) "99+" else conversation.unreadCount.toString(),
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}
