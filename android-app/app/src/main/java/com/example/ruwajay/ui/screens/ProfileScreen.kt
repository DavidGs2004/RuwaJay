package com.example.ruwajay.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ruwajay.data.model.SystemUpdate
import com.example.ruwajay.data.repository.rememberProperties
import com.example.ruwajay.data.repository.updatePropertyStatus
import com.example.ruwajay.data.repository.deleteProperty
import com.example.ruwajay.data.repository.updateUserRole
import com.example.ruwajay.data.repository.toggleUserSuspension
import com.example.ruwajay.data.repository.rememberSystemUpdates
import com.example.ruwajay.data.repository.publishSystemUpdate
import com.example.ruwajay.data.repository.toggleSystemUpdateStatus
import com.example.ruwajay.data.repository.deleteSystemUpdate
import com.example.ruwajay.ui.components.PropertyCard
import com.example.ruwajay.ui.theme.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onLoginClick: () -> Unit = {},
    onInboxClick: () -> Unit = {},
    onExploreClick: () -> Unit = {},
    onPublishClick: () -> Unit = {},
    onPropertyClick: (String) -> Unit = {}
) {
    val auth = FirebaseAuth.getInstance()
    val firestore = FirebaseFirestore.getInstance()
    
    var currentUser by remember { mutableStateOf(auth.currentUser) }
    var userData by remember { mutableStateOf<Map<String, Any>?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var favoriteIds by remember { mutableStateOf<List<String>>(emptyList()) }
    var chatsCount by remember { mutableStateOf(0) }

    DisposableEffect(Unit) {
        val authListener = FirebaseAuth.AuthStateListener { firebaseAuth ->
            currentUser = firebaseAuth.currentUser
            if (firebaseAuth.currentUser == null) {
                userData = null
                favoriteIds = emptyList()
                chatsCount = 0
                isLoading = false
            }
        }
        auth.addAuthStateListener(authListener)
        onDispose { auth.removeAuthStateListener(authListener) }
    }

    DisposableEffect(currentUser?.uid) {
        var listener: ListenerRegistration? = null
        var favListener: ListenerRegistration? = null
        var chatListener: ListenerRegistration? = null

        if (currentUser != null) {
            isLoading = true
            val uid = currentUser!!.uid
            
            listener = firestore.collection("users").document(uid)
                .addSnapshotListener { snapshot, error ->
                    isLoading = false
                    if (error == null && snapshot != null) {
                        userData = snapshot.data
                    }
                }

            favListener = firestore.collection("users").document(uid)
                .collection("favorites")
                .addSnapshotListener { snapshot, _ ->
                    if (snapshot != null) {
                        favoriteIds = snapshot.documents.map { it.id }
                    }
                }

            chatListener = firestore.collection("chats")
                .whereArrayContains("participants", uid)
                .addSnapshotListener { snapshot, _ ->
                    if (snapshot != null) {
                        chatsCount = snapshot.size()
                    }
                }
        } else {
            isLoading = false
            userData = null
            favoriteIds = emptyList()
            chatsCount = 0
        }

        onDispose {
            listener?.remove()
            favListener?.remove()
            chatListener?.remove()
        }
    }

    val properties = rememberProperties()
    val systemUpdates = rememberSystemUpdates(includeInactive = true)
    
    var selectedTab by remember { mutableStateOf(0) }
    val userRole = (userData?.get("role") as? String) ?: "inquilino"
    val isAdmin = userRole == "admin" || currentUser?.email?.lowercase()?.contains("admin") == true || currentUser?.email == "admin@ruwajay.com"

    var showPublishUpdateDialog by remember { mutableStateOf(false) }
    var newUpdateTitle by remember { mutableStateOf("") }
    var newUpdateContent by remember { mutableStateOf("") }
    val newUpdateCategory by remember { mutableStateOf("novedad") }
    val newUpdatePriority by remember { mutableStateOf("normal") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Mi Cuenta - RuwaJay", color = BrandTextPrimary, fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = onInboxClick) {
                        BadgeBox(count = chatsCount) {
                            Icon(Icons.Default.Chat, contentDescription = "Mensajes", tint = BrandForest)
                        }
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
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (currentUser == null) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(80.dp)
                                .clip(CircleShape)
                                .background(BrandCrema),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Person, contentDescription = null, tint = BrandForest, modifier = Modifier.size(40.dp))
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Bienvenido a RuwaJay", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = BrandTextPrimary)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Inicia sesión para guardar favoritos, chatear con propietarios y publicar inmuebles.",
                            fontSize = 14.sp,
                            color = BrandTextSecondary,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(20.dp))
                        Button(
                            onClick = onLoginClick,
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = BrandForest)
                        ) {
                            Icon(Icons.Default.Login, contentDescription = null, tint = Color.White)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Iniciar Sesión / Registrarse", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            } else {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(72.dp)
                                .clip(CircleShape)
                                .background(BrandForest),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = (currentUser?.displayName?.take(1) ?: currentUser?.email?.take(1) ?: "U").uppercase(),
                                color = Color.White,
                                fontSize = 28.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = currentUser?.displayName ?: (userData?.get("name") as? String) ?: "Usuario RuwaJay",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = BrandTextPrimary
                        )
                        Text(
                            text = currentUser?.email ?: "",
                            fontSize = 13.sp,
                            color = BrandTextSecondary
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = if (isAdmin) BrandOrange.copy(alpha = 0.2f) else BrandForest.copy(alpha = 0.1f)
                        ) {
                            Text(
                                text = "Rol: ${userRole.uppercase()}",
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isAdmin) BrandOrange else BrandForest
                            )
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        OutlinedButton(
                            onClick = {
                                auth.signOut()
                                currentUser = null
                            },
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.Red)
                        ) {
                            Icon(Icons.Default.Logout, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Cerrar Sesión")
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    TabButton(
                        title = "Favoritos",
                        selected = selectedTab == 0,
                        modifier = Modifier.weight(1f)
                    ) { selectedTab = 0 }
                    
                    TabButton(
                        title = "Mis Inmuebles",
                        selected = selectedTab == 1,
                        modifier = Modifier.weight(1f)
                    ) { selectedTab = 1 }

                    if (isAdmin) {
                        TabButton(
                            title = "Admin",
                            selected = selectedTab == 2,
                            modifier = Modifier.weight(1f)
                        ) { selectedTab = 2 }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                when (selectedTab) {
                    0 -> {
                        Text("Mis Propiedades Favoritas", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = BrandTextPrimary, modifier = Modifier.align(Alignment.Start))
                        Spacer(modifier = Modifier.height(8.dp))
                        val favProperties = properties.filter { prop -> favoriteIds.contains(prop.id) }
                        if (favProperties.isEmpty()) {
                            Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                                Text("No tienes favoritos guardados.", color = BrandTextSecondary, fontSize = 14.sp)
                            }
                        } else {
                            val favList = favProperties.toList()
                            for (prop in favList) {
                                PropertyCard(property = prop, onClick = { onPropertyClick(prop.id) })
                                Spacer(modifier = Modifier.height(10.dp))
                            }
                        }
                    }
                    1 -> {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Mis Inmuebles Publicados", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = BrandTextPrimary)
                            Button(
                                onClick = onPublishClick,
                                colors = ButtonDefaults.buttonColors(containerColor = BrandForest),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Publicar", fontSize = 12.sp)
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        val myProperties = properties.filter { prop -> prop.ownerId == currentUser?.uid || isAdmin }
                        if (myProperties.isEmpty()) {
                            Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                                Text("No has publicado ningún inmueble.", color = BrandTextSecondary, fontSize = 14.sp)
                            }
                        } else {
                            val myList = myProperties.toList()
                            for (prop in myList) {
                                Column {
                                    PropertyCard(property = prop, onClick = { onPropertyClick(prop.id) })
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 4.dp),
                                        horizontalArrangement = Arrangement.End
                                    ) {
                                        TextButton(onClick = {
                                            val newStatus = if (prop.status == "disponible") "alquilado" else "disponible"
                                            updatePropertyStatus(prop.id, newStatus)
                                        }) {
                                            Text("Cambiar estado (${prop.status})", fontSize = 11.sp, color = BrandForest)
                                        }
                                        TextButton(onClick = {
                                            deleteProperty(prop.id)
                                        }) {
                                            Text("Eliminar", fontSize = 11.sp, color = Color.Red)
                                        }
                                    }
                                }
                                Spacer(modifier = Modifier.height(10.dp))
                            }
                        }
                    }
                    2 -> {
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Panel de Administración", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = BrandTextPrimary)
                                Button(
                                    onClick = { showPublishUpdateDialog = true },
                                    colors = ButtonDefaults.buttonColors(containerColor = BrandOrange),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Icon(Icons.Default.Campaign, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Nuevo Comunicado", fontSize = 12.sp)
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            Text("Comunicados del Sistema", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BrandCafe)
                            Spacer(modifier = Modifier.height(6.dp))
                            
                            val updatesList = systemUpdates.toList()
                            for (update in updatesList) {
                                Card(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(update.title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = BrandTextPrimary)
                                            Switch(
                                                checked = update.active,
                                                onCheckedChange = { active ->
                                                    toggleSystemUpdateStatus(update.id, active) { _ -> }
                                                }
                                            )
                                        }
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(update.content, fontSize = 12.sp, color = BrandTextSecondary)
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text("Categoría: ${update.category}", fontSize = 10.sp, color = BrandForest)
                                            TextButton(onClick = { deleteSystemUpdate(update.id) { _ -> } }) {
                                                Text("Eliminar", fontSize = 10.sp, color = Color.Red)
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

    if (showPublishUpdateDialog) {
        AlertDialog(
            onDismissRequest = { showPublishUpdateDialog = false },
            title = { Text("Publicar Comunicado del Sistema") },
            text = {
                Column {
                    OutlinedTextField(
                        value = newUpdateTitle,
                        onValueChange = { newUpdateTitle = it },
                        label = { Text("Título") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = newUpdateContent,
                        onValueChange = { newUpdateContent = it },
                        label = { Text("Contenido") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 4
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newUpdateTitle.isNotBlank() && newUpdateContent.isNotBlank()) {
                            publishSystemUpdate(
                                title = newUpdateTitle,
                                content = newUpdateContent,
                                category = newUpdateCategory,
                                priority = newUpdatePriority,
                                adminName = currentUser?.displayName ?: "Administrador"
                            ) { result ->
                                if (result.isSuccess) {
                                    newUpdateTitle = ""
                                    newUpdateContent = ""
                                    showPublishUpdateDialog = false
                                }
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandForest)
                ) {
                    Text("Publicar")
                }
            },
            dismissButton = {
                TextButton(onClick = { showPublishUpdateDialog = false }) {
                    Text("Cancelar")
                }
            }
        )
    }
}

@Composable
private fun TabButton(
    title: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = modifier.height(40.dp),
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (selected) BrandForest else BrandCrema,
            contentColor = if (selected) Color.White else BrandTextPrimary
        ),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = if (selected) 2.dp else 0.dp)
    ) {
        Text(title, fontSize = 13.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun BadgeBox(
    count: Int,
    content: @Composable () -> Unit
) {
    Box(contentAlignment = Alignment.TopEnd) {
        content()
        if (count > 0) {
            Box(
                modifier = Modifier
                    .size(16.dp)
                    .clip(CircleShape)
                    .background(Color.Red),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = count.toString(),
                    color = Color.White,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
