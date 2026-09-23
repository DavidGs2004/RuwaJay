package com.example.ruwajay.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ruwajay.data.model.Message
import com.example.ruwajay.data.repository.ChatRepository
import com.example.ruwajay.ui.theme.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.Timestamp
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    conversationId: String,
    onNavigateBack: () -> Unit
) {
    val chatRepo = remember { ChatRepository() }
    val currentUser = FirebaseAuth.getInstance().currentUser
    var messages by remember { mutableStateOf<List<Message>>(emptyList()) }
    var draftText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    DisposableEffect(conversationId) {
        val listener = chatRepo.observeMessages(conversationId) { maps ->
            messages = maps.map { map ->
                val ts = map["createdAt"] as? Timestamp
                val dateStr = ts?.let {
                    SimpleDateFormat("HH:mm", Locale.getDefault()).format(it.toDate())
                } ?: ""
                
                Message(
                    id = map["id"] as? String ?: "",
                    senderId = map["senderId"] as? String ?: "",
                    isUser = map["senderId"] == currentUser?.uid,
                    senderName = map["senderName"] as? String ?: "Usuario",
                    text = map["text"] as? String ?: "",
                    timestamp = dateStr,
                    status = map["status"] as? String ?: "sent"
                )
            }
        }
        onDispose { listener.remove() }
    }
    
    // Auto-scroll to bottom on new messages
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    val quickQuestions = listOf(
        "¿Sigue disponible?",
        "¿Aceptan mascotas?",
        "¿Cuándo puedo ir a verla?"
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Text("Chat Privado", fontWeight = FontWeight.Black, fontSize = 16.sp)
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Regresar")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        },
        bottomBar = {
            Column {
                // Quick Questions
                LazyRow(
                    modifier = Modifier.fillMaxWidth().background(BrandCrema).padding(12.dp, 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(quickQuestions) { question ->
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = Color.White,
                            border = androidx.compose.foundation.BorderStroke(1.dp, BrandCremaDark),
                            onClick = { draftText = question }
                        ) {
                            Text(
                                text = question,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = BrandCafe
                            )
                        }
                    }
                }
                
                // Input Area
                Surface(color = Color.White, shadowElevation = 8.dp) {
                    Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        OutlinedTextField(
                            value = draftText,
                            onValueChange = { draftText = it },
                            modifier = Modifier.weight(1f),
                            placeholder = { Text("Mensaje...", fontSize = 14.sp, color = BrandTextMuted) },
                            shape = RoundedCornerShape(20.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = BrandCafe,
                                unfocusedTextColor = BrandCafe,
                                focusedBorderColor = BrandForest,
                                unfocusedBorderColor = BrandCremaDark,
                                focusedContainerColor = Color.White,
                                unfocusedContainerColor = Color.White
                            ),
                            maxLines = 3
                        )
                        Spacer(Modifier.width(8.dp))
                        IconButton(
                            onClick = {
                                if (draftText.isNotBlank()) {
                                    chatRepo.sendText(conversationId, draftText) { }
                                    draftText = ""
                                }
                            },
                            enabled = draftText.isNotBlank(),
                            colors = IconButtonDefaults.iconButtonColors(
                                containerColor = BrandForest, 
                                contentColor = Color.White,
                                disabledContainerColor = BrandForest.copy(alpha = 0.3f),
                                disabledContentColor = Color.White.copy(alpha = 0.6f)
                            )
                        ) {
                            Icon(Icons.AutoMirrored.Filled.Send, null, Modifier.size(18.dp))
                        }
                    }
                }
            }
        },
        containerColor = Color(0xFFEFEAE2)
    ) { paddingValues ->
        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxSize().padding(paddingValues).padding(horizontal = 16.dp),
            contentPadding = PaddingValues(vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(messages) { message ->
                MessageBubble(message = message)
            }
        }
    }
}

@Composable
fun MessageBubble(message: Message) {
    val isUser = message.isUser
    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start) {
        Surface(
            color = if (isUser) Color(0xFFD9FDD3) else Color.White,
            shape = RoundedCornerShape(12.dp),
            shadowElevation = 1.dp
        ) {
            Column(Modifier.padding(10.dp)) {
                if (!isUser) {
                    Text(message.senderName, color = BrandForest, fontSize = 10.sp, fontWeight = FontWeight.Black)
                }
                Text(message.text, color = BrandCafe, fontSize = 14.sp)
                Text(message.timestamp, modifier = Modifier.align(Alignment.End), color = BrandTextMuted, fontSize = 9.sp)
            }
        }
    }
}
