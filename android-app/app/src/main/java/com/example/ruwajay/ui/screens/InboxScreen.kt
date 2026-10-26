package com.example.ruwajay.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.ruwajay.data.model.Conversation
import com.example.ruwajay.data.repository.ChatRepository
import com.example.ruwajay.ui.theme.*
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InboxScreen(
    onNavigateBack: () -> Unit,
    onConversationClick: (String) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var activeTab by remember { mutableStateOf("all") } // "all" | "unread"
    val chatRepo = remember { ChatRepository() }
    val currentUser = FirebaseAuth.getInstance().currentUser
    var firestoreConversations by remember { mutableStateOf<List<Conversation>>(emptyList()) }
    var profilePhotos by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var loadError by remember { mutableStateOf<String?>(null) }

    val configuration = LocalConfiguration.current
    val isTablet = configuration.screenWidthDp >= 600

    DisposableEffect(currentUser?.uid) {
        if (currentUser == null) return@DisposableEffect onDispose {}

        val listener = chatRepo.observeConversations(currentUser.uid, onError = { error ->
            loadError = "Error: ${error.message}"
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
                        val otherId = (map["participants"] as? List<*>)?.firstOrNull { it != currentUser.uid }?.toString().orEmpty()
                        profilePhotos[otherId]
                            ?: ((if (map["ownerId"] == currentUser.uid) map["seekerAvatar"] else map["ownerAvatar"]) as? String)
                            ?: (map["participantAvatar"] as? String)
                            ?: ""
                    },
                    participantOnline = false,
                    participantPhone = "",
                    participantRole = "Contacto",
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
                        }
                    }
            }
        }
        onDispose { listener.remove() }
    }

    val totalUnreadCount = remember(firestoreConversations) {
        firestoreConversations.count { it.unreadCount > 0 }
    }

    val filteredConversations = remember(firestoreConversations, searchQuery, activeTab) {
        firestoreConversations.filter { conv ->
            val matchesSearch = searchQuery.isBlank() ||
                    conv.participantName.contains(searchQuery, ignoreCase = true) ||
                    conv.lastMessage.contains(searchQuery, ignoreCase = true)
            val matchesTab = if (activeTab == "unread") conv.unreadCount > 0 else true
            matchesSearch && matchesTab
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Mensajes", color = BrandTextPrimary, fontWeight = FontWeight.Black, fontSize = 20.sp)
                        Spacer(Modifier.width(8.dp))
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = BrandForest.copy(alpha = 0.12f)
                        ) {
                            Text(
                                text = "RuwaJay Chat",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = BrandForest,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Regresar", tint = BrandForest)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BrandSurfaceElevated)
            )
        },
        containerColor = BrandSurfaceBackground
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 840.dp)
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                // Barra de búsqueda de mensajes
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = BrandSurfaceElevated,
                    border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Buscar en conversaciones...", fontSize = 13.sp, color = BrandTextMuted) },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = BrandForest) },
                        shape = RoundedCornerShape(14.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color.Transparent,
                            unfocusedBorderColor = Color.Transparent,
                            focusedContainerColor = Color.Transparent,
                            unfocusedContainerColor = Color.Transparent
                        ),
                        singleLine = true
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                // ── PESTAÑAS: TODAS Y NO LEÍDOS (CON BADGE COUNT) ──────
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Tab Todas
                    FilterChip(
                        selected = activeTab == "all",
                        onClick = { activeTab = "all" },
                        label = {
                            Text("Todas (${firestoreConversations.size})", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = BrandForest,
                            selectedLabelColor = Color.White
                        ),
                        shape = RoundedCornerShape(10.dp)
                    )

                    // Tab No leídos
                    FilterChip(
                        selected = activeTab == "unread",
                        onClick = { activeTab = "unread" },
                        label = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("No leídos", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                if (totalUnreadCount > 0) {
                                    Spacer(Modifier.width(6.dp))
                                    Surface(
                                        shape = CircleShape,
                                        color = if (activeTab == "unread") Color.White else BrandTerracota,
                                        modifier = Modifier.size(18.dp)
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text(
                                                text = "$totalUnreadCount",
                                                color = if (activeTab == "unread") BrandForest else Color.White,
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Black
                                            )
                                        }
                                    }
                                }
                            }
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = BrandForest,
                            selectedLabelColor = Color.White
                        ),
                        shape = RoundedCornerShape(10.dp)
                    )
                }
            }

            // Lista de conversaciones
            if (filteredConversations.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Surface(
                            shape = CircleShape,
                            color = BrandForest.copy(alpha = 0.12f),
                            modifier = Modifier.size(72.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.Chat, null, tint = BrandForest, modifier = Modifier.size(36.dp))
                            }
                        }
                        Spacer(modifier = Modifier.height(14.dp))
                        Text(
                            text = if (activeTab == "unread") "No tienes mensajes pendientes por leer" else "Aún no tienes conversaciones",
                            fontWeight = FontWeight.Bold,
                            color = BrandTextPrimary,
                            fontSize = 15.sp
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Cuando contactes a un casero o recibas una solicitud de visita, aparecerá aquí.",
                            color = BrandTextSecondary,
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .widthIn(max = 840.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp)
                ) {
                    items(filteredConversations) { conv ->
                        ConversationItemCard(
                            conversation = conv,
                            onClick = { onConversationClick(conv.id) }
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun ConversationItemCard(
    conversation: Conversation,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = if (conversation.unreadCount > 0) BrandSurfaceElevated else BrandSurfaceElevated.copy(alpha = 0.85f),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (conversation.unreadCount > 0) BrandForest.copy(alpha = 0.4f) else BrandBorder
        ),
        shadowElevation = if (conversation.unreadCount > 0) 2.dp else 1.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Avatar con indicador
            Box {
                if (conversation.participantAvatar.isNotBlank()) {
                    AsyncImage(
                        model = conversation.participantAvatar,
                        contentDescription = conversation.participantName,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(50.dp)
                            .clip(CircleShape)
                            .border(1.5.dp, BrandForest.copy(alpha = 0.3f), CircleShape)
                    )
                } else {
                    Surface(
                        shape = CircleShape,
                        color = BrandForest,
                        modifier = Modifier.size(50.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                text = conversation.participantName.take(1).uppercase(),
                                color = Color.White,
                                fontWeight = FontWeight.Black,
                                fontSize = 18.sp
                            )
                        }
                    }
                }

                // Punto en línea
                Surface(
                    shape = CircleShape,
                    color = Color(0xFF22C55E),
                    border = androidx.compose.foundation.BorderStroke(1.5.dp, Color.White),
                    modifier = Modifier
                        .size(12.dp)
                        .align(Alignment.BottomEnd)
                ) {}
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = conversation.participantName,
                        fontWeight = if (conversation.unreadCount > 0) FontWeight.Black else FontWeight.Bold,
                        fontSize = 15.sp,
                        color = BrandTextPrimary,
                        maxLines = 1
                    )
                    Text(
                        text = conversation.lastMessageTimestamp,
                        fontSize = 11.sp,
                        color = if (conversation.unreadCount > 0) BrandForest else BrandTextMuted,
                        fontWeight = if (conversation.unreadCount > 0) FontWeight.Bold else FontWeight.Normal
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = conversation.lastMessage.ifBlank { "Imagen o archivo adjunto" },
                        fontSize = 13.sp,
                        color = if (conversation.unreadCount > 0) BrandTextPrimary else BrandTextSecondary,
                        fontWeight = if (conversation.unreadCount > 0) FontWeight.SemiBold else FontWeight.Normal,
                        maxLines = 1,
                        modifier = Modifier.weight(1f)
                    )

                    if (conversation.unreadCount > 0) {
                        Surface(
                            shape = CircleShape,
                            color = BrandTerracota,
                            modifier = Modifier
                                .size(22.dp)
                                .padding(start = 4.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = "${conversation.unreadCount}",
                                    color = Color.White,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
