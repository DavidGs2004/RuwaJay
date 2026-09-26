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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ruwajay.data.model.Conversation
import com.example.ruwajay.data.repository.ChatRepository
import com.example.ruwajay.data.repository.MockDataRepository
import com.example.ruwajay.ui.theme.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.Timestamp
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

    DisposableEffect(currentUser?.uid) {
        if (currentUser == null) return@DisposableEffect onDispose {}
        
        val listener = chatRepo.observeConversations(currentUser.uid) { maps ->
            firestoreConversations = maps.map { map ->
                val ts = map["lastMessageTimestamp"] as? Timestamp
                val dateStr = ts?.let {
                    SimpleDateFormat("HH:mm", Locale.getDefault()).format(it.toDate())
                } ?: ""
                
                Conversation(
                    id = map["id"] as? String ?: "",
                    propertyId = map["propertyId"] as? String ?: "",
                    ownerId = map["ownerId"] as? String ?: "",
                    participantName = map["propertyTitle"] as? String ?: "Propietario",
                    participantOnline = false,
                    participantPhone = "",
                    participantRole = "Vendedor",
                    unreadCount = if (map["lastSenderId"] != currentUser.uid) 1 else 0,
                    lastMessage = map["lastMessage"] as? String ?: "",
                    lastMessageTimestamp = dateStr,
                    messages = emptyList()
                )
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
                    Text("No tienes conversaciones aún", color = BrandTextMuted)
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
            Text(
                text = conversation.participantName.first().toString(),
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
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(BrandTerracota)
                    )
                }
            }
        }
    }
}
