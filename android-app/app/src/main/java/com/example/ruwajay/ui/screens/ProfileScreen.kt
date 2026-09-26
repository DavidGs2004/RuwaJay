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
import com.example.ruwajay.data.repository.rememberProperties
import com.example.ruwajay.ui.components.PropertyCard
import com.example.ruwajay.ui.theme.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration

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
    
    // Real user state from Firebase
    var currentUser by remember { mutableStateOf(auth.currentUser) }
    var userData by remember { mutableStateOf<Map<String, Any>?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var favoriteIds by remember { mutableStateOf<List<String>>(emptyList()) }
    var chatsCount by remember { mutableStateOf(0) }

    // Listen for Auth changes (Login/Logout)
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

    // Real-time listener for user profile data in Firestore
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

            chatListener = firestore.collection("conversations")
                .whereArrayContains("participants", uid)
                .addSnapshotListener { snapshot, _ ->
                    if (snapshot != null) {
                        chatsCount = snapshot.size()
                    }
                }
        }
        onDispose {
            listener?.remove()
            favListener?.remove()
            chatListener?.remove()
        }
    }

    // Derived values
    val userName = userData?.get("name") as? String ?: currentUser?.displayName ?: "Usuario"
    val userEmail = currentUser?.email ?: ""
    val userPhone = userData?.get("phone") as? String ?: "Sin teléfono"
    val userRole = when(userData?.get("role") as? String) {
        "owner" -> "Propietario"
        else -> "Inquilino"
    }
    val isVerified = userData?.get("verified") as? Boolean ?: false

    // Tabs
    var activeTab by remember { mutableStateOf("favoritos") }
    var showEditDialog by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandCrema)
            .verticalScroll(rememberScrollState())
    ) {
        if (currentUser == null) {
            NotLoggedInView(onLoginClick = onLoginClick, onExploreClick = onExploreClick)
        } else {
            // Profile Header Card
            ProfileHeader(
                userName = userName,
                userEmail = userEmail,
                userRole = userRole,
                isVerified = isVerified,
                onEditClick = { showEditDialog = true },
                onLogoutClick = { auth.signOut() }
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Stats Row
            StatsRow(
                likesCount = favoriteIds.size.toString(),
                visitasCount = "0",
                chatsCount = chatsCount.toString()
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Tab Selection
            TabSelector(activeTab = activeTab, onTabChange = { activeTab = it })

            // Tab Content
            when (activeTab) {
                "favoritos" -> FavoritosTab(
                    favoriteIds = favoriteIds,
                    onExploreClick = onExploreClick,
                    onPropertyClick = onPropertyClick
                )
                "visitas" -> VisitasTab()
                "configuracion" -> ConfiguracionTab(
                    userName = userName,
                    userEmail = userEmail,
                    userPhone = userPhone,
                    userRole = userRole,
                    isVerified = isVerified,
                    onInboxClick = onInboxClick
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "RuwaJay v1.1.0 • Guatemala 🇬🇹",
                color = BrandTextMuted,
                fontSize = 12.sp,
                modifier = Modifier.align(Alignment.CenterHorizontally).padding(bottom = 16.dp)
            )
        }
    }

    if (showEditDialog && currentUser != null) {
        EditProfileDialog(
            initialName = userName,
            initialPhone = userPhone,
            onDismiss = { showEditDialog = false },
            onSave = { newName, newPhone ->
                firestore.collection("users").document(currentUser!!.uid)
                    .update(mapOf("name" to newName, "phone" to newPhone))
                showEditDialog = false
            }
        )
    }
}

@Composable
private fun EditProfileDialog(
    initialName: String,
    initialPhone: String,
    onDismiss: () -> Unit,
    onSave: (String, String) -> Unit
) {
    var name by remember { mutableStateOf(initialName) }
    var phone by remember { mutableStateOf(initialPhone) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color.White,
        title = { Text("Editar Perfil", fontWeight = FontWeight.Black) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Nombre") })
                OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Teléfono") })
            }
        },
        confirmButton = {
            Button(onClick = { onSave(name, phone) }, colors = ButtonDefaults.buttonColors(containerColor = BrandForest)) {
                Text("Guardar")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        }
    )
}

@Composable
private fun NotLoggedInView(onLoginClick: () -> Unit, onExploreClick: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Spacer(modifier = Modifier.height(60.dp))
        Surface(modifier = Modifier.size(100.dp), shape = CircleShape, color = BrandCafe) {
            Box(contentAlignment = Alignment.Center) {
                Icon(Icons.Default.Person, null, tint = BrandForest, modifier = Modifier.size(52.dp))
            }
        }
        Spacer(modifier = Modifier.height(24.dp))
        Text("Bienvenido a RuwaJay", fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, color = BrandCafe)
        Text("Inicia sesión para gestionar tus favoritos y mensajes", color = BrandTextSecondary, fontSize = 14.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        Spacer(modifier = Modifier.height(32.dp))
        Button(onClick = onLoginClick, modifier = Modifier.fillMaxWidth().height(54.dp), shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = BrandForest)) {
            Text("Iniciar Sesión", fontWeight = FontWeight.Bold)
        }
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedButton(onClick = onExploreClick, modifier = Modifier.fillMaxWidth().height(54.dp), shape = RoundedCornerShape(14.dp)) {
            Text("Explorar Propiedades", color = BrandCafe)
        }
    }
}

@Composable
private fun ProfileHeader(
    userName: String,
    userEmail: String,
    userRole: String,
    isVerified: Boolean,
    onEditClick: () -> Unit,
    onLogoutClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(16.dp),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(4.dp)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(modifier = Modifier.size(72.dp).clip(CircleShape).background(BrandForest), contentAlignment = Alignment.Center) {
                    Text(text = userName.firstOrNull()?.toString() ?: "U", color = Color.White, fontWeight = FontWeight.Black, fontSize = 28.sp)
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(userName, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = BrandCafe, maxLines = 1)
                    Text(userEmail, color = BrandTextSecondary, fontSize = 13.sp, maxLines = 1)
                    if (isVerified) {
                        Surface(color = BrandJade.copy(alpha = 0.1f), shape = RoundedCornerShape(8.dp), modifier = Modifier.padding(top = 4.dp)) {
                            Text("✓ Verificado", color = BrandForest, fontSize = 10.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(4.dp))
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(20.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onEditClick, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = BrandCrema)) {
                    Text("Editar", color = BrandCafe)
                }
                Button(onClick = onLogoutClick, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFEF2F2))) {
                    Text("Cerrar Sesión", color = BrandTerracota)
                }
            }
        }
    }
}

@Composable
private fun StatsRow(likesCount: String, visitasCount: String, chatsCount: String) {
    Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        StatCard(likesCount, "Favoritos", BrandGold, modifier = Modifier.weight(1f))
        StatCard(visitasCount, "Citas", BrandForest, modifier = Modifier.weight(1f))
        StatCard(chatsCount, "Chats", BrandCafe, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun StatCard(value: String, label: String, color: Color, modifier: Modifier = Modifier) {
    Card(modifier = modifier, shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = color)) {
        Column(modifier = Modifier.padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(value, color = Color.White, fontWeight = FontWeight.Black, fontSize = 22.sp)
            Text(label, color = Color.White.copy(0.8f), fontSize = 11.sp)
        }
    }
}

@Composable
private fun TabSelector(activeTab: String, onTabChange: (String) -> Unit) {
    val tabs = listOf("favoritos" to "Favoritos", "visitas" to "Citas", "configuracion" to "Ajustes")
    TabRow(selectedTabIndex = tabs.indexOfFirst { it.first == activeTab }, containerColor = Color.Transparent, contentColor = BrandTerracota, divider = {}) {
        tabs.forEach { (key, label) ->
            Tab(selected = activeTab == key, onClick = { onTabChange(key) }) {
                Text(label, modifier = Modifier.padding(12.dp), fontWeight = if (activeTab == key) FontWeight.Black else FontWeight.Bold, fontSize = 13.sp)
            }
        }
    }
}

@Composable
fun FavoritosTab(
    favoriteIds: List<String>,
    onExploreClick: () -> Unit,
    onPropertyClick: (String) -> Unit = {}
) {
    val allProperties = rememberProperties()
    val favoritedProperties = remember(favoriteIds, allProperties) {
        allProperties.filter { favoriteIds.contains(it.id) }
    }

    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (favoritedProperties.isEmpty()) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(vertical = 32.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(Icons.Default.FavoriteBorder, null, modifier = Modifier.size(48.dp), tint = BrandTextMuted)
                Spacer(modifier = Modifier.height(12.dp))
                Text("Aún no tienes propiedades favoritas", fontWeight = FontWeight.Bold, color = BrandCafe)
                Text("Toca el corazón en cualquier propiedad para guardarla aquí", fontSize = 12.sp, color = BrandTextMuted)
                Spacer(modifier = Modifier.height(16.dp))
                Button(onClick = onExploreClick, colors = ButtonDefaults.buttonColors(containerColor = BrandForest)) {
                    Text("Explorar Propiedades")
                }
            }
        } else {
            favoritedProperties.forEach { property ->
                PropertyCard(
                    property = property,
                    onClick = { onPropertyClick(property.id) }
                )
            }
        }
    }
}

@Composable
fun VisitasTab() {
    Column(
        modifier = Modifier.fillMaxWidth().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(Icons.Default.DateRange, null, modifier = Modifier.size(48.dp), tint = BrandForest)
        Spacer(modifier = Modifier.height(12.dp))
        Text("No tienes visitas programadas", fontWeight = FontWeight.Bold, color = BrandCafe)
        Text("Contacta al propietario de una vivienda para agendar una cita", fontSize = 12.sp, color = BrandTextMuted)
    }
}

@Composable
fun ConfiguracionTab(userName: String, userEmail: String, userPhone: String, userRole: String, isVerified: Boolean, onInboxClick: () -> Unit) {
    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        InfoItem(Icons.Default.Person, "Nombre", userName)
        InfoItem(Icons.Default.Email, "Email", userEmail)
        InfoItem(Icons.Default.Phone, "Teléfono", userPhone)
        InfoItem(Icons.Default.Home, "Rol", userRole)
        Button(onClick = onInboxClick, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = BrandForest)) {
            Text("Ver Mensajes")
        }
    }
}

@Composable
fun InfoItem(icon: ImageVector, label: String, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = BrandForest, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(12.dp))
        Column {
            Text(label, fontSize = 11.sp, color = BrandTextMuted)
            Text(value, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BrandCafe)
        }
    }
}
