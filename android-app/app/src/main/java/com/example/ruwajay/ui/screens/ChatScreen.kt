package com.example.ruwajay.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import com.example.ruwajay.data.model.Conversation
import com.example.ruwajay.data.model.Message
import com.example.ruwajay.data.repository.MockDataRepository
import com.example.ruwajay.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    conversationId: String,
    onNavigateBack: () -> Unit
) {
    // In a real app, this would be managed by a ViewModel and observe state.
    // For demo parity, we use mutable state seeded from the mock repository.
    var conversation by remember { 
        mutableStateOf(
            MockDataRepository.conversations.find { it.id == conversationId } 
            ?: MockDataRepository.conversations.first()
        )
    }
    
    var draftText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    
    // Auto-scroll to bottom on new messages
    LaunchedEffect(conversation.messages.size) {
        if (conversation.messages.isNotEmpty()) {
            listState.animateScrollToItem(conversation.messages.size - 1)
        }
    }

    val quickQuestions = listOf(
        "¿Aceptan mascotas en la vivienda?",
        "¿Cuánto solicitan de depósito en garantía?",
        "¿Cuándo podríamos agendar una visita en persona?"
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(BrandForest),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = conversation.participantName.first().toString(),
                                color = Color.White,
                                fontWeight = FontWeight.Black,
                                fontSize = 16.sp
                            )
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(conversation.participantName, fontWeight = FontWeight.Black, fontSize = 15.sp)
                            if (conversation.participantOnline) {
                                Text("En línea ahora", color = BrandForest, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                            }
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Regresar")
                    }
                },
                actions = {
                    IconButton(onClick = { /* Simulated Call */ }) {
                        Icon(Icons.Default.Phone, contentDescription = "Llamar", tint = BrandCafe)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        },
        bottomBar = {
            Column {
                // Quick Questions
                LazyRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(BrandCrema)
                        .padding(horizontal = 12.dp, vertical = 8.dp),
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
                Surface(
                    color = Color.White,
                    shadowElevation = 8.dp
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = { /* Attach photo */ }) {
                            Icon(Icons.Default.Image, contentDescription = "Adjuntar foto", tint = BrandTextMuted)
                        }
                        IconButton(onClick = { /* Send Voice Note */ }) {
                            Icon(Icons.Default.Mic, contentDescription = "Nota de voz", tint = BrandTextMuted)
                        }
                        
                        OutlinedTextField(
                            value = draftText,
                            onValueChange = { draftText = it },
                            modifier = Modifier.weight(1f).padding(horizontal = 4.dp),
                            placeholder = { Text("Escribe un mensaje...", fontSize = 14.sp) },
                            shape = RoundedCornerShape(20.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = BrandForest,
                                unfocusedBorderColor = BrandCremaDark,
                                focusedContainerColor = Color(0xFFFDFBF7),
                                unfocusedContainerColor = Color(0xFFFDFBF7)
                            ),
                            maxLines = 3
                        )
                        
                        IconButton(
                            onClick = {
                                if (draftText.isNotBlank()) {
                                    val newMessage = Message(
                                        id = "msg-${System.currentTimeMillis()}",
                                        senderId = "user-demo",
                                        isUser = true,
                                        senderName = "Tú",
                                        text = draftText,
                                        timestamp = "Ahora",
                                        status = "sent"
                                    )
                                    conversation = conversation.copy(
                                        messages = conversation.messages + newMessage,
                                        lastMessage = draftText,
                                        lastMessageTimestamp = "Ahora"
                                    )
                                    draftText = ""
                                }
                            },
                            enabled = draftText.isNotBlank(),
                            colors = IconButtonDefaults.iconButtonColors(
                                containerColor = if (draftText.isNotBlank()) BrandForest else BrandCremaDark,
                                contentColor = Color.White
                            ),
                            modifier = Modifier.clip(CircleShape)
                        ) {
                            Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Enviar", modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }
        },
        containerColor = Color(0xFFEFEAE2)
    ) { paddingValues ->
        LazyColumn(
            state = listState,
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp),
            contentPadding = PaddingValues(vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Safety Banner
            item {
                Surface(
                    color = Color(0xFFFFF3CD),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Warning, contentDescription = null, tint = BrandTerracota, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Consejo de seguridad: No realices depósitos antes de visitar el inmueble.",
                            color = Color(0xFF856404),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }

            items(conversation.messages) { message ->
                MessageBubble(message = message)
            }
        }
    }
}

@Composable
fun MessageBubble(message: Message) {
    val isUser = message.isUser
    
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        Surface(
            color = if (isUser) Color(0xFFD9FDD3) else Color.White,
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = if (isUser) 16.dp else 2.dp,
                bottomEnd = if (isUser) 2.dp else 16.dp
            ),
            shadowElevation = 1.dp,
            modifier = Modifier.widthIn(max = 280.dp)
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    text = if (isUser) "Tú (Inquilino)" else message.senderName,
                    color = BrandForest,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Black,
                    modifier = Modifier.padding(bottom = 4.dp)
                )
                
                Text(
                    text = message.text,
                    color = BrandCafe,
                    fontSize = 14.sp
                )
                
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = message.timestamp,
                        color = BrandTextMuted,
                        fontSize = 10.sp
                    )
                    if (isUser) {
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            imageVector = Icons.Default.Check, // Simplified check marks
                            contentDescription = null,
                            tint = if (message.status == "read") Color(0xFF53BDEB) else BrandTextMuted,
                            modifier = Modifier.size(12.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun LazyRow(modifier: Modifier = Modifier, horizontalArrangement: Arrangement.Horizontal = Arrangement.Start, content: androidx.compose.foundation.lazy.LazyListScope.() -> Unit) {
    androidx.compose.foundation.lazy.LazyRow(
        modifier = modifier,
        horizontalArrangement = horizontalArrangement,
        content = content
    )
}
