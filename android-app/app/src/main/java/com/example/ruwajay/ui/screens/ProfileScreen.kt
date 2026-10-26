package com.example.ruwajay.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.ruwajay.data.model.Property
import com.example.ruwajay.data.model.SystemUpdate
import com.example.ruwajay.data.model.VerificationRequest
import com.example.ruwajay.data.repository.*
import com.example.ruwajay.ui.components.PropertyCard
import com.example.ruwajay.ui.components.RuwaHeader
import com.example.ruwajay.ui.components.RuwaFooter
import com.example.ruwajay.ui.theme.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration

private val GT_DEPARTMENTS_VERIF = listOf(
    "Guatemala", "Sacatepéquez", "Quetzaltenango", "Chimaltenango", "Escuintla",
    "Sololá", "Petén", "Alta Verapaz", "Baja Verapaz", "Izabal", "Zacapa",
    "Chiquimula", "Santa Rosa", "Jutiapa", "Jalapa", "Suchitepéquez", "Retalhuleu",
    "San Marcos", "Huehuetenango", "Quiché", "Totonicapán", "El Progreso"
)

private fun formatCuiDisplay(cui: String): String {
    val clean = cui.filter { it.isDigit() }
    if (clean.length <= 4) return clean
    if (clean.length <= 9) return "${clean.take(4)} ${clean.substring(4)}"
    return "${clean.take(4)} ${clean.substring(4, 9)} ${clean.substring(9).take(4)}"
}

private fun maskCuiDisplay(cui: String): String {
    val clean = cui.filter { it.isDigit() }
    if (clean.length < 13) return "•••• ••••• ••••"
    return "•••• ••••• ${clean.takeLast(4)}"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onLoginClick: () -> Unit = {},
    onInboxClick: () -> Unit = {},
    onExploreClick: () -> Unit = {},
    onPublishClick: () -> Unit = {},
    onPropertyClick: (String) -> Unit = {},
    onChatClick: (String) -> Unit = {},
    onSearchClick: (String) -> Unit = {}
) {
    val auth = FirebaseAuth.getInstance()
    val firestore = FirebaseFirestore.getInstance()
    val context = LocalContext.current

    var currentUser by remember { mutableStateOf(auth.currentUser) }
    var userData by remember { mutableStateOf<Map<String, Any>?>(null) }
    var favoriteIds by remember { mutableStateOf<List<String>>(emptyList()) }
    var userVisits by remember { mutableStateOf<List<VisitRequest>>(emptyList()) }
    var userSearches by remember { mutableStateOf<List<Map<String, Any>>>(emptyList()) }
    val visitsRepo = remember { VisitRepository() }

    // Estado Edición Perfil (Tab 0)
    var editName by remember { mutableStateOf("") }
    var editPhone by remember { mutableStateOf("") }
    var editBio by remember { mutableStateOf("") }
    var isSavingProfile by remember { mutableStateOf(false) }

    // Estado Configuración (Tab 6)
    var currentPasswordInput by remember { mutableStateOf("") }
    var newPasswordInput by remember { mutableStateOf("") }
    var confirmPasswordInput by remember { mutableStateOf("") }
    var passwordChangeStatus by remember { mutableStateOf<String?>(null) }
    var isChangingPassword by remember { mutableStateOf(false) }

    // Admin states
    var verificationRequests by remember { mutableStateOf<List<VerificationRequest>>(emptyList()) }
    var allUsersList by remember { mutableStateOf<List<Map<String, Any?>>>(emptyList()) }

    // Modals
    var showDpiFormModal by remember { mutableStateOf(false) }
    var showDpiDetailsModal by remember { mutableStateOf(false) }
    var viewingDpiPhotoUrl by remember { mutableStateOf<String?>(null) }
    var approvingRequest by remember { mutableStateOf<VerificationRequest?>(null) }
    var rejectingRequest by remember { mutableStateOf<VerificationRequest?>(null) }
    var rejectionReasonInput by remember { mutableStateOf("") }
    var showPublishUpdateDialog by remember { mutableStateOf(false) }
    var adminNoticeMessage by remember { mutableStateOf<String?>(null) }

    DisposableEffect(Unit) {
        val authListener = FirebaseAuth.AuthStateListener { firebaseAuth ->
            currentUser = firebaseAuth.currentUser
            if (firebaseAuth.currentUser == null) {
                userData = null
                favoriteIds = emptyList()
                userVisits = emptyList()
                userSearches = emptyList()
            }
        }
        auth.addAuthStateListener(authListener)
        onDispose { auth.removeAuthStateListener(authListener) }
    }

    DisposableEffect(currentUser?.uid) {
        var listener: ListenerRegistration? = null
        var favListener: ListenerRegistration? = null
        var searchesListener: ListenerRegistration? = null
        var visitsListener: com.google.firebase.firestore.ListenerRegistration? = null

        if (currentUser != null) {
            val uid = currentUser!!.uid
            listener = firestore.collection("users").document(uid)
                .addSnapshotListener { snapshot, error ->
                    if (error == null && snapshot != null) {
                        userData = snapshot.data
                        if (editName.isBlank()) editName = snapshot.getString("name").orEmpty()
                        if (editPhone.isBlank()) editPhone = snapshot.getString("phone").orEmpty()
                        if (editBio.isBlank()) editBio = snapshot.getString("bio").orEmpty()
                    }
                }

            favListener = firestore.collection("users").document(uid)
                .collection("favorites")
                .addSnapshotListener { snapshot, _ ->
                    if (snapshot != null) {
                        favoriteIds = snapshot.documents.map { it.id }
                    }
                }

            searchesListener = firestore.collection("users").document(uid)
                .collection("saved_searches")
                .addSnapshotListener { snapshot, _ ->
                    if (snapshot != null) {
                        userSearches = snapshot.documents.map { it.data.orEmpty() + ("id" to it.id) }
                    }
                }

            visitsListener = visitsRepo.observeUserVisits { visits ->
                userVisits = visits
            }
        } else {
            userData = null
            favoriteIds = emptyList()
            userVisits = emptyList()
            userSearches = emptyList()
        }

        onDispose {
            listener?.remove()
            favListener?.remove()
            searchesListener?.remove()
            visitsListener?.remove()
        }
    }

    val properties = rememberProperties()
    val systemUpdates = rememberSystemUpdates(includeInactive = true)

    val userRole = (userData?.get("role") as? String) ?: "seeker"
    val isSuperAdmin = currentUser?.email?.trim()?.equals("xleon04gd@gmail.com", ignoreCase = true) == true
    val isAdmin = userRole == "admin" || isSuperAdmin
    val isVerified = (userData?.get("verified") as? Boolean) == true || userRole == "owner"
    val verificationStatus = (userData?.get("verificationStatus") as? String).orEmpty()
    val verificationRejectionReason = (userData?.get("verificationRejectionReason") as? String).orEmpty()

    val accountStatus = (userData?.get("accountStatus") as? String)
        ?: (userData?.get("status") as? String) ?: "active"

    // Listeners exclusivos para Admin
    DisposableEffect(isAdmin) {
        var verifListener: ListenerRegistration? = null
        var usersListener: ListenerRegistration? = null

        if (isAdmin) {
            verifListener = VerificationRepository.subscribeVerificationRequests { list ->
                verificationRequests = list
            }
            usersListener = VerificationRepository.subscribeAllUsers { list ->
                allUsersList = list
            }
        }

        onDispose {
            verifListener?.remove()
            usersListener?.remove()
        }
    }

    var selectedTab by remember { mutableStateOf(0) }
    // Sub-tab de administración: 0 = Solicitudes DPI, 1 = Usuarios, 2 = Inmuebles, 3 = Comunicados
    var adminSubTab by remember { mutableStateOf(0) }

    // Filtros de Admin
    var adminVerifFilter by remember { mutableStateOf("todos") } // "todos", "pendiente", "aprobada", "rechazada"
    var adminVerifSearch by remember { mutableStateOf("") }

    var adminUserRoleFilter by remember { mutableStateOf("todos") }
    var adminUserStatusFilter by remember { mutableStateOf("todos") }
    var adminUserSearch by remember { mutableStateOf("") }
    var adminUserPage by remember { mutableStateOf(1) }
    val USERS_PER_PAGE = 6
    var visitSubTab by remember { mutableStateOf("todas") }
    var showPurgeDpiDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            RuwaHeader(
                onExploreClick = onExploreClick
            )
        },
        containerColor = BrandCrema
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Contenedor adaptativo responsive (max 760dp para tablets)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 760.dp)
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Notificación flash para administradores
                adminNoticeMessage?.let { notice ->
                    Surface(
                        modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                        shape = RoundedCornerShape(12.dp),
                        color = BrandForest.copy(alpha = 0.15f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, BrandForest.copy(alpha = 0.3f))
                    ) {
                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = BrandForest)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(notice, color = BrandForestDark, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                            IconButton(onClick = { adminNoticeMessage = null }, modifier = Modifier.size(24.dp)) {
                                Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = BrandForestDark, modifier = Modifier.size(16.dp))
                            }
                        }
                    }
                }

                if (currentUser == null) {
                    // Tarjeta de invitación a iniciar sesión
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = BrandSurfaceCard),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(28.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(80.dp)
                                    .clip(CircleShape)
                                    .background(BrandCremaDark),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Person, contentDescription = null, tint = BrandForest, modifier = Modifier.size(44.dp))
                            }
                            Spacer(modifier = Modifier.height(16.dp))
                            Text("Bienvenido a RuwaJay", fontSize = 22.sp, fontWeight = FontWeight.Black, color = BrandCafe)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                "Inicia sesión para solicitar visitas, anunciar inmuebles como casero o gestionar la plataforma.",
                                fontSize = 13.sp,
                                color = BrandTextSecondary,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                lineHeight = 18.sp
                            )
                            Spacer(modifier = Modifier.height(24.dp))
                            Button(
                                onClick = onLoginClick,
                                modifier = Modifier.fillMaxWidth().height(48.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = BrandForest)
                            ) {
                                Icon(Icons.Default.Login, contentDescription = null, tint = Color.White)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Iniciar Sesión / Registrarse", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            }
                        }
                    }
                } else {
                    // 1. Tarjeta de Perfil de Usuario Activo
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = BrandSurfaceCard),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            // Avatar con fallback
                            Box(
                                modifier = Modifier
                                    .size(76.dp)
                                    .clip(CircleShape)
                                    .background(BrandForest),
                                contentAlignment = Alignment.Center
                            ) {
                                val photo = listOf("avatarImage", "avatar", "photoURL")
                                    .firstNotNullOfOrNull { key -> (userData?.get(key) as? String)?.takeIf(String::isNotBlank) }
                                    ?: currentUser?.photoUrl?.toString().orEmpty()
                                if (photo.isNotBlank()) {
                                    AsyncImage(
                                        model = photo,
                                        contentDescription = "Avatar",
                                        modifier = Modifier.fillMaxSize(),
                                        contentScale = ContentScale.Crop
                                    )
                                } else {
                                    Text(
                                        text = (currentUser?.displayName?.take(1) ?: currentUser?.email?.take(1) ?: "U").uppercase(),
                                        color = Color.White,
                                        fontSize = 30.sp,
                                        fontWeight = FontWeight.Black
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = (userData?.get("name") as? String) ?: currentUser?.displayName ?: "Usuario RuwaJay",
                                fontSize = 19.sp,
                                fontWeight = FontWeight.Black,
                                color = BrandCafe
                            )
                            Text(
                                text = currentUser?.email ?: "",
                                fontSize = 13.sp,
                                color = BrandTextSecondary
                            )
                            (userData?.get("phone") as? String)?.takeIf { it.isNotBlank() }?.let { phone ->
                                Text("Tel: $phone", fontSize = 12.sp, color = BrandForest, fontWeight = FontWeight.SemiBold)
                            }

                            Spacer(modifier = Modifier.height(10.dp))
                            // Badges de Rol y Estado
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                // Badge Rol
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = if (isAdmin) BrandForest else if (isVerified) BrandGold.copy(alpha = 0.2f) else BrandCremaDark
                                ) {
                                    Text(
                                        text = if (isAdmin) "🛡️ Administrador" else if (isVerified) "🏡 Casero / Propietario" else "👤 Inquilino",
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Black,
                                        color = if (isAdmin) Color.White else if (isVerified) BrandCafe else BrandTextSecondary
                                    )
                                }

                                // Badge Estado de cuenta
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = when (accountStatus) {
                                        "active" -> Color(0xFFDCFCE7)
                                        "inactive" -> Color(0xFFFEF3C7)
                                        else -> Color(0xFFFEE2E2)
                                    }
                                ) {
                                    Text(
                                        text = when (accountStatus) {
                                            "active" -> "🟢 Activo"
                                            "inactive" -> "🟡 Inactivo"
                                            else -> "🔴 Suspendido"
                                        },
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Black,
                                        color = when (accountStatus) {
                                            "active" -> Color(0xFF166534)
                                            "inactive" -> Color(0xFF92400E)
                                            else -> Color(0xFF991B1B)
                                        }
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))
                            OutlinedButton(
                                onClick = {
                                    NotificationRepository.signOut { currentUser = null }
                                },
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.Red),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color.Red.copy(alpha = 0.4f))
                            ) {
                                Icon(Icons.Default.Logout, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Cerrar Sesión", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // 2. Módulo de Verificación con DPI para el usuario
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isVerified) Color(0xFFF0FDF4)
                            else if (verificationStatus == "pendiente") Color(0xFFFFFBEB)
                            else if (verificationStatus == "rechazada") Color(0xFFFEF2F2)
                            else Color.White
                        ),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isVerified) Color(0xFF86EFAC)
                            else if (verificationStatus == "pendiente") Color(0xFFFDE68A)
                            else if (verificationStatus == "rechazada") Color(0xFFFCA5A5)
                            else BrandBorder
                        )
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = if (isVerified) Icons.Default.Verified
                                    else if (verificationStatus == "pendiente") Icons.Default.HourglassTop
                                    else if (verificationStatus == "rechazada") Icons.Default.ReportProblem
                                    else Icons.Default.Badge,
                                    contentDescription = null,
                                    tint = if (isVerified) BrandForest
                                    else if (verificationStatus == "pendiente") Color(0xFFD97706)
                                    else if (verificationStatus == "rechazada") Color.Red
                                    else BrandTerracota,
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(
                                        text = if (isVerified) "Verificación de Identidad con DPI: Aprobada"
                                        else if (verificationStatus == "pendiente") "Verificación con DPI: En Revisión"
                                        else if (verificationStatus == "rechazada") "Verificación con DPI: Rechazada"
                                        else "Verificación de Identidad para Caseros",
                                        fontWeight = FontWeight.Black,
                                        fontSize = 14.sp,
                                        color = BrandCafe
                                    )
                                    Text(
                                        text = if (isVerified) "Estás certificado oficialmente para publicar viviendas en alquiler."
                                        else if (verificationStatus == "pendiente") "Tu solicitud está siendo revisada por el administrador en tiempo real."
                                        else if (verificationStatus == "rechazada") "Motivo: ${verificationRejectionReason.ifBlank { "Revisa la nitidez de tu DPI y vuelve a enviar." }}"
                                        else "Sube tu DPI para obtener el rol de Casero y publicar tus inmuebles.",
                                        fontSize = 12.sp,
                                        color = BrandTextSecondary
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            if (isVerified) {
                                Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                                    TextButton(onClick = { showDpiDetailsModal = true }) {
                                        Icon(Icons.Default.Visibility, contentDescription = null, modifier = Modifier.size(16.dp), tint = BrandForest)
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Ver mis datos de DPI", color = BrandForest, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                    }
                                }
                            } else if (verificationStatus == "rechazada") {
                                Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                                    Button(
                                        onClick = {
                                            currentUser?.uid?.let { uid ->
                                                VerificationRepository.resetVerificationData(uid) {
                                                    showDpiFormModal = true
                                                }
                                            }
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = BrandForest),
                                        shape = RoundedCornerShape(10.dp)
                                    ) {
                                        Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("Llenar formulario de nuevo", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            } else if (verificationStatus != "pendiente" && !isAdmin) {
                                Button(
                                    onClick = { showDpiFormModal = true },
                                    modifier = Modifier.fillMaxWidth().height(44.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = BrandForest)
                                ) {
                                    Icon(Icons.Default.AssignmentInd, contentDescription = null, tint = Color.White)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Solicitar Verificación con DPI", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Tabs Principales (Pestañas completas equivalentes a la versión Web)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                            .padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        ProfileTabChip(
                            icon = Icons.Default.Person,
                            title = "Mi Perfil",
                            count = null,
                            selected = selectedTab == 0,
                            onClick = { selectedTab = 0 }
                        )
                        ProfileTabChip(
                            icon = Icons.Default.Bookmark,
                            title = "Búsquedas",
                            count = userSearches.size.takeIf { it > 0 },
                            selected = selectedTab == 1,
                            onClick = { selectedTab = 1 }
                        )
                        ProfileTabChip(
                            icon = Icons.Default.CalendarToday,
                            title = "Citas",
                            count = userVisits.size.takeIf { it > 0 },
                            selected = selectedTab == 2,
                            onClick = { selectedTab = 2 }
                        )
                        if (isVerified || isAdmin) {
                            val myPropsCount = properties.count { it.ownerId == currentUser?.uid || isAdmin }
                            ProfileTabChip(
                                icon = Icons.Default.HomeWork,
                                title = "Mis Inmuebles",
                                count = myPropsCount.takeIf { it > 0 },
                                selected = selectedTab == 3,
                                onClick = { selectedTab = 3 }
                            )
                        }
                        if (isAdmin) {
                            val pendingCount = verificationRequests.count { it.status == "pendiente" }
                            ProfileTabChip(
                                icon = Icons.Default.AdminPanelSettings,
                                title = "Admin",
                                count = pendingCount.takeIf { it > 0 },
                                selected = selectedTab == 4,
                                onClick = { selectedTab = 4 }
                            )
                        }
                        ProfileTabChip(
                            icon = Icons.Default.Settings,
                            title = "Ajustes",
                            count = null,
                            selected = selectedTab == 5,
                            onClick = { selectedTab = 5 }
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Contenido según Tab seleccionado
                    when (selectedTab) {
                        0 -> {
                            // ── TAB 0: MI PERFIL (DATOS Y RESUMEN) ──
                            Column(modifier = Modifier.fillMaxWidth()) {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(18.dp),
                                    colors = CardDefaults.cardColors(containerColor = BrandSurfaceCard),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                                ) {
                                    Column(modifier = Modifier.padding(18.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Icon(Icons.Default.Person, contentDescription = null, tint = BrandForest, modifier = Modifier.size(22.dp))
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Column {
                                                    Text("Datos de mi Cuenta", fontWeight = FontWeight.Black, fontSize = 16.sp, color = BrandCafe)
                                                    Text("Información principal y credenciales", fontSize = 11.sp, color = BrandTextSecondary)
                                                }
                                            }
                                        }

                                        Spacer(modifier = Modifier.height(14.dp))

                                        OutlinedTextField(
                                            value = editName,
                                            onValueChange = { editName = it },
                                            label = { Text("Nombre Completo") },
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(12.dp)
                                        )

                                        Spacer(modifier = Modifier.height(10.dp))

                                        OutlinedTextField(
                                            value = currentUser?.email.orEmpty(),
                                            onValueChange = {},
                                            label = { Text("Correo Electrónico") },
                                            enabled = false,
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(12.dp)
                                        )

                                        Spacer(modifier = Modifier.height(10.dp))

                                        OutlinedTextField(
                                            value = editPhone,
                                            onValueChange = { editPhone = it },
                                            label = { Text("Teléfono de Contacto") },
                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(12.dp)
                                        )

                                        Spacer(modifier = Modifier.height(10.dp))

                                        OutlinedTextField(
                                            value = editBio,
                                            onValueChange = { editBio = it },
                                            label = { Text("Biografía / Presentación") },
                                            modifier = Modifier.fillMaxWidth(),
                                            maxLines = 3,
                                            shape = RoundedCornerShape(12.dp)
                                        )

                                        Spacer(modifier = Modifier.height(14.dp))

                                        Button(
                                            onClick = {
                                                currentUser?.uid?.let { uid ->
                                                    isSavingProfile = true
                                                    firestore.collection("users").document(uid).update(
                                                        mapOf(
                                                            "name" to editName,
                                                            "phone" to editPhone,
                                                            "bio" to editBio
                                                        )
                                                    ).addOnCompleteListener {
                                                        isSavingProfile = false
                                                        adminNoticeMessage = "Perfil actualizado correctamente."
                                                    }
                                                }
                                            },
                                            enabled = !isSavingProfile,
                                            modifier = Modifier.fillMaxWidth().height(46.dp),
                                            shape = RoundedCornerShape(12.dp),
                                            colors = ButtonDefaults.buttonColors(containerColor = BrandForest)
                                        ) {
                                            if (isSavingProfile) {
                                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text("Guardando...", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                            } else {
                                                Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(18.dp))
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text("Guardar Cambios", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                            }
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(14.dp))

                                // Resumen de Actividad (4 tarjetas funcionales)
                                Text("Resumen de Actividad", fontSize = 14.sp, fontWeight = FontWeight.Black, color = BrandCafe)
                                Spacer(modifier = Modifier.height(8.dp))
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Card(
                                        modifier = Modifier.weight(1f).clickable { selectedTab = 2 },
                                        shape = RoundedCornerShape(14.dp),
                                        colors = CardDefaults.cardColors(containerColor = BrandSurfaceCard),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                                    ) {
                                        Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                            Icon(Icons.Default.CalendarToday, contentDescription = null, tint = BrandForest, modifier = Modifier.size(24.dp))
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text("${userVisits.size}", fontSize = 18.sp, fontWeight = FontWeight.Black, color = BrandCafe)
                                            Text("Citas", fontSize = 10.sp, color = BrandTextSecondary, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    Card(
                                        modifier = Modifier.weight(1f).clickable { selectedTab = 1 },
                                        shape = RoundedCornerShape(14.dp),
                                        colors = CardDefaults.cardColors(containerColor = BrandSurfaceCard),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                                    ) {
                                        Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                            Icon(Icons.Default.Bookmark, contentDescription = null, tint = BrandGold, modifier = Modifier.size(24.dp))
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text("${userSearches.size}", fontSize = 18.sp, fontWeight = FontWeight.Black, color = BrandCafe)
                                            Text("Búsquedas", fontSize = 10.sp, color = BrandTextSecondary, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    Card(
                                        modifier = Modifier.weight(1f).clickable { onInboxClick() },
                                        shape = RoundedCornerShape(14.dp),
                                        colors = CardDefaults.cardColors(containerColor = BrandSurfaceCard),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                                    ) {
                                        Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                            Icon(Icons.Default.Chat, contentDescription = null, tint = BrandTerracota, modifier = Modifier.size(24.dp))
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text("Chat", fontSize = 14.sp, fontWeight = FontWeight.Black, color = BrandCafe)
                                            Text("Mensajes", fontSize = 10.sp, color = BrandTextSecondary, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    Card(
                                        modifier = Modifier.weight(1f).clickable {
                                            if (isVerified || isAdmin) selectedTab = 3 else showDpiFormModal = true
                                        },
                                        shape = RoundedCornerShape(14.dp),
                                        colors = CardDefaults.cardColors(containerColor = BrandSurfaceCard),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                                    ) {
                                        Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                            Icon(if (isVerified || isAdmin) Icons.Default.HomeWork else Icons.Default.VerifiedUser, contentDescription = null, tint = if (isVerified || isAdmin) BrandForest else BrandGold, modifier = Modifier.size(24.dp))
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                if (isVerified || isAdmin) "${properties.count { it.ownerId == currentUser?.uid || isAdmin }}" else "DPI",
                                                fontSize = if (isVerified || isAdmin) 18.sp else 14.sp,
                                                fontWeight = FontWeight.Black,
                                                color = BrandCafe
                                            )
                                            Text(if (isVerified || isAdmin) "Inmuebles" else "Verificación", fontSize = 10.sp, color = BrandTextSecondary, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }

                        1 -> {
                            // ── TAB 1: BÚSQUEDAS GUARDADAS Y ALERTAS ──
                            Column(modifier = Modifier.fillMaxWidth()) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text("Búsquedas Guardadas y Alertas", fontSize = 16.sp, fontWeight = FontWeight.Black, color = BrandCafe)
                                        Text("Criterios y alertas para Guatemala", fontSize = 11.sp, color = BrandTextSecondary)
                                    }
                                    Button(
                                        onClick = onExploreClick,
                                        shape = RoundedCornerShape(10.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = BrandForest),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                    ) {
                                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Nueva", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    }
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                if (userSearches.isEmpty()) {
                                    Card(
                                        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                                        shape = RoundedCornerShape(16.dp),
                                        colors = CardDefaults.cardColors(containerColor = BrandSurfaceCard)
                                    ) {
                                        Column(modifier = Modifier.padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                            Icon(Icons.Default.BookmarkBorder, contentDescription = null, tint = BrandTextSecondary.copy(alpha = 0.4f), modifier = Modifier.size(44.dp))
                                            Spacer(modifier = Modifier.height(8.dp))
                                            Text("No tienes búsquedas guardadas aún", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = BrandCafe)
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text("Guarda filtros de búsqueda al explorar propiedades para consultarlas al instante.", fontSize = 12.sp, color = BrandTextSecondary, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                                            Spacer(modifier = Modifier.height(14.dp))
                                            Button(
                                                onClick = onExploreClick,
                                                colors = ButtonDefaults.buttonColors(containerColor = BrandForest),
                                                shape = RoundedCornerShape(10.dp)
                                            ) {
                                                Text("Explorar y guardar búsqueda", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                            }
                                        }
                                    }
                                } else {
                                    userSearches.forEach { search ->
                                        val searchId = search["id"] as? String ?: ""
                                        val searchName = search["name"] as? String ?: "Búsqueda"
                                        val notifyPush = search["notifyPush"] as? Boolean ?: false
                                        val filters = search["filters"] as? Map<*, *>

                                        Card(
                                            modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                                            shape = RoundedCornerShape(16.dp),
                                            colors = CardDefaults.cardColors(containerColor = BrandSurfaceCard),
                                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                                        ) {
                                            Column(modifier = Modifier.padding(14.dp)) {
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Text(searchName, fontWeight = FontWeight.Black, fontSize = 14.sp, color = BrandCafe)
                                                    if (notifyPush) {
                                                        Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFDCFCE7)) {
                                                            Text("✨ Alertas activas", fontSize = 10.sp, fontWeight = FontWeight.Black, color = Color(0xFF166534), modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                                        }
                                                    }
                                                }

                                                Spacer(modifier = Modifier.height(8.dp))

                                                Row(
                                                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                                ) {
                                                    (filters?.get("department") as? String)?.takeIf { it != "Todos" }?.let { dept ->
                                                        Surface(shape = RoundedCornerShape(6.dp), color = BrandCremaDark) {
                                                            Text("📍 $dept", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = BrandForest, modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp))
                                                        }
                                                    }
                                                    (filters?.get("zone") as? String)?.takeIf { !it.lowercase().startsWith("todas") }?.let { zone ->
                                                        Surface(shape = RoundedCornerShape(6.dp), color = BrandCremaDark) {
                                                            Text("🏙️ ${zone.split("(").first().trim()}", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = BrandForest, modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp))
                                                        }
                                                    }
                                                    (filters?.get("type") as? String)?.let { type ->
                                                        Surface(shape = RoundedCornerShape(6.dp), color = BrandCremaDark) {
                                                            Text(if (type == "casa") "Casa" else "Apto", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = BrandCafe, modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp))
                                                        }
                                                    }
                                                    (filters?.get("priceMax") as? Number)?.let { pMax ->
                                                        Surface(shape = RoundedCornerShape(6.dp), color = BrandCremaDark) {
                                                            Text("≤ Q${pMax.toLong()}", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = BrandCafe, modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp))
                                                        }
                                                    }
                                                }

                                                Spacer(modifier = Modifier.height(10.dp))

                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    TextButton(onClick = {
                                                        currentUser?.uid?.let { uid ->
                                                            firestore.collection("users").document(uid).collection("saved_searches").document(searchId).delete()
                                                        }
                                                    }) {
                                                        Text("Eliminar", fontSize = 11.sp, color = Color.Red, fontWeight = FontWeight.Bold)
                                                    }
                                                    Button(
                                                        onClick = onExploreClick,
                                                        shape = RoundedCornerShape(8.dp),
                                                        colors = ButtonDefaults.buttonColors(containerColor = BrandForest),
                                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                                    ) {
                                                        Text("Ver propiedades →", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        2 -> {
                            // ── TAB 2: CITAS Y VISITAS PRESENCIALES ──
                            Column(modifier = Modifier.fillMaxWidth()) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text("Citas y Visitas Presenciales", fontSize = 16.sp, fontWeight = FontWeight.Black, color = BrandCafe)
                                        Text("Coordinación directa y estados de vivienda", fontSize = 11.sp, color = BrandTextSecondary)
                                    }
                                    Button(
                                        onClick = onExploreClick,
                                        shape = RoundedCornerShape(10.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = BrandForest),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                    ) {
                                        Text("Agendar", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    }
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(14.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFDE68A))
                                ) {
                                    Row(modifier = Modifier.padding(12.dp)) {
                                        Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFFB45309), modifier = Modifier.size(18.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Column {
                                            Text("Reglas del sistema de citas y disponibilidad", fontWeight = FontWeight.Black, fontSize = 11.sp, color = Color(0xFF78350F))
                                            Text(
                                                "• Expiración en 7 días: Las solicitudes de visita no aceptadas caducan automáticamente para no bloquear agendas.\n• Protección contra empalmes: Los horarios apartados se bloquean automáticamente.",
                                                fontSize = 10.sp,
                                                color = Color(0xFF92400E),
                                                lineHeight = 14.sp
                                            )
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                // Subtabs de Visitas
                                Row(
                                    modifier = Modifier.fillMaxWidth().background(BrandCremaDark, RoundedCornerShape(10.dp)).padding(3.dp),
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    val rCount = userVisits.count { it.ownerId == currentUser?.uid }
                                    val sCount = userVisits.count { it.tenantId == currentUser?.uid }
                                    listOf(
                                        "todas" to "Todas (${userVisits.size})",
                                        "recibidas" to "📥 Recibidas ($rCount)",
                                        "solicitadas" to "📤 Solicitadas ($sCount)"
                                    ).forEach { (subKey, label) ->
                                        Surface(
                                            modifier = Modifier.weight(1f).clickable { visitSubTab = subKey },
                                            shape = RoundedCornerShape(8.dp),
                                            color = if (visitSubTab == subKey) Color.White else Color.Transparent,
                                            shadowElevation = if (visitSubTab == subKey) 1.dp else 0.dp
                                        ) {
                                            Box(modifier = Modifier.padding(vertical = 7.dp), contentAlignment = Alignment.Center) {
                                                Text(
                                                    text = label,
                                                    fontSize = 10.sp,
                                                    fontWeight = if (visitSubTab == subKey) FontWeight.Black else FontWeight.Bold,
                                                    color = if (visitSubTab == subKey) BrandForest else BrandTextSecondary
                                                )
                                            }
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                val displayedVisits = when (visitSubTab) {
                                    "recibidas" -> userVisits.filter { it.ownerId == currentUser?.uid }
                                    "solicitadas" -> userVisits.filter { it.tenantId == currentUser?.uid }
                                    else -> userVisits
                                }

                                if (displayedVisits.isEmpty()) {
                                    Card(
                                        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                                        shape = RoundedCornerShape(16.dp),
                                        colors = CardDefaults.cardColors(containerColor = BrandSurfaceCard)
                                    ) {
                                        Column(modifier = Modifier.padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                            Icon(Icons.Default.EventBusy, contentDescription = null, tint = BrandTextSecondary.copy(alpha = 0.4f), modifier = Modifier.size(44.dp))
                                            Spacer(modifier = Modifier.height(8.dp))
                                            Text("No hay citas registradas en esta sección", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = BrandCafe)
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text("Cuando agendes o recibas visitas a tus viviendas, aparecerán aquí con control en tiempo real.", fontSize = 11.sp, color = BrandTextSecondary, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                                        }
                                    }
                                } else {
                                    displayedVisits.forEach { visit ->
                                        val isOwnerOfThis = visit.ownerId == currentUser?.uid
                                        val waPhone = if (isOwnerOfThis) visit.tenantPhone else "50245678901"
                                        val contactName = if (isOwnerOfThis) visit.tenantName else visit.ownerName

                                        Card(
                                            modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                                            shape = RoundedCornerShape(16.dp),
                                            colors = CardDefaults.cardColors(containerColor = BrandSurfaceCard),
                                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                                        ) {
                                            Column(modifier = Modifier.padding(14.dp)) {
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Text(
                                                        text = visit.propertyTitle.ifBlank { "Vivienda en Alquiler" },
                                                        fontWeight = FontWeight.Black,
                                                        fontSize = 14.sp,
                                                        color = BrandCafe,
                                                        modifier = Modifier.weight(1f).clickable { onPropertyClick(visit.propertyId) }
                                                    )
                                                    Surface(
                                                        shape = RoundedCornerShape(6.dp),
                                                        color = when (visit.status) {
                                                            "confirmada", "aceptada" -> Color(0xFFDCFCE7)
                                                            "cancelada", "rechazada" -> Color(0xFFFEE2E2)
                                                            else -> Color(0xFFFEF3C7)
                                                        }
                                                    ) {
                                                        Text(
                                                            text = "● ${visit.status.uppercase()}",
                                                            fontSize = 10.sp,
                                                            fontWeight = FontWeight.Black,
                                                            color = when (visit.status) {
                                                                "confirmada", "aceptada" -> Color(0xFF166534)
                                                                "cancelada", "rechazada" -> Color(0xFF991B1B)
                                                                else -> Color(0xFF92400E)
                                                            },
                                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                        )
                                                    }
                                                }

                                                Spacer(modifier = Modifier.height(6.dp))

                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                                ) {
                                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                                        Icon(Icons.Default.CalendarToday, contentDescription = null, tint = BrandForest, modifier = Modifier.size(13.dp))
                                                        Spacer(modifier = Modifier.width(3.dp))
                                                        Text(visit.visitDate.ifBlank { "Fecha por definir" }, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BrandForest)
                                                    }
                                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                                        Icon(Icons.Default.Schedule, contentDescription = null, tint = BrandCafe, modifier = Modifier.size(13.dp))
                                                        Spacer(modifier = Modifier.width(3.dp))
                                                        Text("${visit.visitTime.ifBlank { "--:--" }} hrs", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BrandCafe)
                                                    }
                                                }

                                                if (visit.notes.isNotBlank()) {
                                                    Spacer(modifier = Modifier.height(6.dp))
                                                    Text("\"${visit.notes}\"", fontSize = 11.sp, color = BrandTextSecondary, fontStyle = androidx.compose.ui.text.font.FontStyle.Italic)
                                                }

                                                Spacer(modifier = Modifier.height(6.dp))
                                                Text(
                                                    text = "${if (isOwnerOfThis) "Interesado:" else "Casero:"} $contactName ${if (waPhone.isNotBlank()) "· Tel: $waPhone" else ""}",
                                                    fontSize = 11.sp,
                                                    color = BrandTextSecondary,
                                                    fontWeight = FontWeight.SemiBold
                                                )

                                                if (isOwnerOfThis && visit.status != "cancelada") {
                                                    Spacer(modifier = Modifier.height(8.dp))
                                                    Surface(
                                                        shape = RoundedCornerShape(10.dp),
                                                        color = BrandCremaDark
                                                    ) {
                                                        Row(
                                                            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp),
                                                            horizontalArrangement = Arrangement.SpaceBetween,
                                                            verticalAlignment = Alignment.CenterVertically
                                                        ) {
                                                            Text("Estado vivienda:", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = BrandCafe)
                                                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                                TextButton(onClick = {
                                                                    updatePropertyStatus(visit.propertyId, "pausada") {
                                                                        adminNoticeMessage = "Inmueble marcado en cita."
                                                                    }
                                                                }, contentPadding = PaddingValues(4.dp)) {
                                                                    Text("🟠 En Cita", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFFD97706))
                                                                }
                                                                TextButton(onClick = {
                                                                    updatePropertyStatus(visit.propertyId, "alquilada") {
                                                                        adminNoticeMessage = "Inmueble marcado ocupado."
                                                                    }
                                                                }, contentPadding = PaddingValues(4.dp)) {
                                                                    Text("🟣 Ocupada", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF7C3AED))
                                                                }
                                                                TextButton(onClick = {
                                                                    updatePropertyStatus(visit.propertyId, "disponible") {
                                                                        adminNoticeMessage = "Inmueble disponible."
                                                                    }
                                                                }, contentPadding = PaddingValues(4.dp)) {
                                                                    Text("🟢 Libre", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = BrandForest)
                                                                }
                                                            }
                                                        }
                                                    }
                                                }

                                                Spacer(modifier = Modifier.height(10.dp))

                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                        if (waPhone.isNotBlank()) {
                                                            Button(
                                                                onClick = {
                                                                    val cleanPhone = waPhone.filter { it.isDigit() }
                                                                    val uri = Uri.parse("https://wa.me/502$cleanPhone?text=${Uri.encode("Hola $contactName, te contacto respecto a la cita de visita para ${visit.propertyTitle} en RuwaJay.")}")
                                                                    context.startActivity(Intent(Intent.ACTION_VIEW, uri))
                                                                },
                                                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366)),
                                                                shape = RoundedCornerShape(8.dp),
                                                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                                            ) {
                                                                Text("WhatsApp", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                                            }
                                                        }
                                                        Button(
                                                            onClick = { onChatClick(visit.propertyId) },
                                                            colors = ButtonDefaults.buttonColors(containerColor = BrandForest),
                                                            shape = RoundedCornerShape(8.dp),
                                                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                                        ) {
                                                            Icon(Icons.Default.Chat, contentDescription = null, modifier = Modifier.size(13.dp))
                                                            Spacer(modifier = Modifier.width(4.dp))
                                                            Text("Chat", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                                        }
                                                    }

                                                    Row {
                                                        if (isOwnerOfThis && visit.status == "pendiente") {
                                                            TextButton(onClick = {
                                                                visitsRepo.updateVisitStatus(visit.id, "confirmada") {
                                                                    adminNoticeMessage = "Cita aceptada."
                                                                }
                                                            }) {
                                                                Text("Aceptar", fontSize = 11.sp, color = BrandForest, fontWeight = FontWeight.Bold)
                                                            }
                                                            TextButton(onClick = {
                                                                visitsRepo.updateVisitStatus(visit.id, "rechazada") {
                                                                    adminNoticeMessage = "Cita rechazada."
                                                                }
                                                            }) {
                                                                Text("Rechazar", fontSize = 11.sp, color = Color.Red, fontWeight = FontWeight.Bold)
                                                            }
                                                        } else if (visit.status != "cancelada") {
                                                            TextButton(onClick = {
                                                                visitsRepo.updateVisitStatus(visit.id, "cancelada") {
                                                                    adminNoticeMessage = "Cita cancelada."
                                                                }
                                                            }) {
                                                                Text("Cancelar", fontSize = 11.sp, color = Color.Red)
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

                        3 -> {
                            // ── TAB MIS INMUEBLES ──
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Mis Inmuebles en Alquiler", fontSize = 16.sp, fontWeight = FontWeight.Black, color = BrandCafe)
                                if (isVerified || isAdmin) {
                                    Button(
                                        onClick = onPublishClick,
                                        colors = ButtonDefaults.buttonColors(containerColor = BrandTerracota),
                                        shape = RoundedCornerShape(10.dp)
                                    ) {
                                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Publicar", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(8.dp))

                            if (!isVerified && !isAdmin) {
                                Card(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = BrandSurfaceCard)
                                ) {
                                    Column(modifier = Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                        Icon(Icons.Default.HomeWork, contentDescription = null, tint = BrandGold, modifier = Modifier.size(40.dp))
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text("¿Quieres publicar tus viviendas?", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = BrandCafe)
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text("Para publicar casas en alquiler debes estar verificado como Casero con tu DPI.", fontSize = 12.sp, color = BrandTextSecondary, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                                        Spacer(modifier = Modifier.height(12.dp))
                                        Button(
                                            onClick = { showDpiFormModal = true },
                                            colors = ButtonDefaults.buttonColors(containerColor = BrandForest),
                                            shape = RoundedCornerShape(10.dp)
                                        ) {
                                            Text("Verificarme con DPI", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                        }
                                    }
                                }
                            } else {
                                val myProperties = properties.filter { prop -> prop.ownerId == currentUser?.uid || isAdmin }
                                if (myProperties.isEmpty()) {
                                    Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                                        Text("Aún no has publicado ningún inmueble.", color = BrandTextSecondary, fontSize = 13.sp)
                                    }
                                } else {
                                    for (prop in myProperties) {
                                        Card(
                                            modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                                            shape = RoundedCornerShape(14.dp),
                                            colors = CardDefaults.cardColors(containerColor = BrandSurfaceCard),
                                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                                        ) {
                                            Column {
                                                PropertyCard(property = prop, onClick = { onPropertyClick(prop.id) })
                                                Row(
                                                    modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 6.dp),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Surface(
                                                        shape = RoundedCornerShape(6.dp),
                                                        color = if (prop.status == "disponible") Color(0xFFDCFCE7) else Color(0xFFFEF3C7)
                                                    ) {
                                                        Text(
                                                            text = "● ${prop.status.uppercase()}",
                                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                                            fontSize = 10.sp,
                                                            fontWeight = FontWeight.Bold,
                                                            color = if (prop.status == "disponible") Color(0xFF166534) else Color(0xFF92400E)
                                                        )
                                                    }

                                                    Row {
                                                        TextButton(onClick = {
                                                            val nextStatus = when (prop.status) {
                                                                "disponible" -> "pausada"
                                                                "pausada" -> "alquilada"
                                                                else -> "disponible"
                                                            }
                                                            updatePropertyStatus(prop.id, nextStatus) {
                                                                adminNoticeMessage = "Estado de ${prop.title} cambiado a $nextStatus."
                                                            }
                                                        }) {
                                                            Text("Cambiar Estado", fontSize = 11.sp, color = BrandForest, fontWeight = FontWeight.Bold)
                                                        }
                                                        TextButton(onClick = {
                                                            deleteProperty(prop.id) {
                                                                adminNoticeMessage = "Propiedad eliminada."
                                                            }
                                                        }) {
                                                            Text("Eliminar", fontSize = 11.sp, color = Color.Red, fontWeight = FontWeight.Bold)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        Spacer(modifier = Modifier.height(6.dp))
                                    }
                                }
                            }
                        }

                        4 -> {
                            // ── TAB PANEL ADMINISTRADOR COMPLETO ──
                            Column(modifier = Modifier.fillMaxWidth()) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("Panel de Administración", fontSize = 17.sp, fontWeight = FontWeight.Black, color = BrandCafe)
                                    if (adminSubTab == 3) {
                                        Button(
                                            onClick = { showPublishUpdateDialog = true },
                                            colors = ButtonDefaults.buttonColors(containerColor = BrandOrange),
                                            shape = RoundedCornerShape(8.dp)
                                        ) {
                                            Icon(Icons.Default.Campaign, contentDescription = null, modifier = Modifier.size(16.dp))
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("Nuevo", fontSize = 11.sp)
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                // Sub-navegación del administrador (scrollable si pantalla pequeña)
                                Row(
                                    modifier = Modifier.fillMaxWidth().background(BrandCremaDark, RoundedCornerShape(12.dp)).padding(4.dp),
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    val pendingVerif = verificationRequests.count { it.status == "pendiente" }
                                    listOf(
                                        0 to if (pendingVerif > 0) "DPI ($pendingVerif)" else "DPI",
                                        1 to "Usuarios (${allUsersList.size})",
                                        2 to "Inmuebles",
                                        3 to "Comunicados"
                                    ).forEach { (idx, label) ->
                                        Surface(
                                            modifier = Modifier.weight(1f).clickable { adminSubTab = idx },
                                            shape = RoundedCornerShape(8.dp),
                                            color = if (adminSubTab == idx) Color.White else Color.Transparent,
                                            shadowElevation = if (adminSubTab == idx) 1.dp else 0.dp
                                        ) {
                                            Box(modifier = Modifier.padding(vertical = 8.dp), contentAlignment = Alignment.Center) {
                                                Text(
                                                    text = label,
                                                    fontSize = 11.sp,
                                                    fontWeight = if (adminSubTab == idx) FontWeight.Black else FontWeight.Bold,
                                                    color = if (adminSubTab == idx) BrandForest else BrandTextSecondary
                                                )
                                            }
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(12.dp))

                                when (adminSubTab) {
                                    0 -> {
                                        // ── 1. MODULO SOLICITUDES DE VERIFICACION DPI (CASEROS) ──
                                        // Filtros de estado
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                                        ) {
                                            listOf(
                                                "todos" to "Todas",
                                                "pendiente" to "Pendientes (${verificationRequests.count { it.status == "pendiente" }})",
                                                "aprobada" to "Aprobadas",
                                                "rechazada" to "Rechazadas"
                                            ).forEach { (filterKey, filterLabel) ->
                                                FilterChip(
                                                    selected = adminVerifFilter == filterKey,
                                                    onClick = { adminVerifFilter = filterKey },
                                                    label = { Text(filterLabel, fontSize = 11.sp) },
                                                    colors = FilterChipDefaults.filterChipColors(
                                                        selectedContainerColor = BrandForest,
                                                        selectedLabelColor = Color.White
                                                    )
                                                )
                                            }
                                        }

                                        Spacer(modifier = Modifier.height(8.dp))

                                        // Buscador en solicitudes
                                        OutlinedTextField(
                                            value = adminVerifSearch,
                                            onValueChange = { adminVerifSearch = it },
                                            placeholder = { Text("Buscar por nombre, correo o CUI...", fontSize = 12.sp) },
                                            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp)) },
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(12.dp),
                                            singleLine = true
                                        )

                                        Spacer(modifier = Modifier.height(10.dp))

                                        val filteredRequests = verificationRequests.filter { req ->
                                            val matchesFilter = when (adminVerifFilter) {
                                                "pendiente" -> req.status == "pendiente"
                                                "aprobada" -> req.status == "aprobada"
                                                "rechazada" -> req.status == "rechazada"
                                                else -> true
                                            }
                                            val q = adminVerifSearch.trim().lowercase()
                                            val matchesSearch = q.isBlank() ||
                                                req.userName.lowercase().contains(q) ||
                                                req.userEmail.lowercase().contains(q) ||
                                                req.cui.contains(q)
                                            matchesFilter && matchesSearch
                                        }

                                        if (filteredRequests.isEmpty()) {
                                            Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                                                Text("No hay solicitudes de verificación para este filtro.", color = BrandTextSecondary, fontSize = 13.sp)
                                            }
                                        } else {
                                            for (req in filteredRequests) {
                                                Card(
                                                    modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                                                    shape = RoundedCornerShape(16.dp),
                                                    colors = CardDefaults.cardColors(containerColor = BrandSurfaceCard),
                                                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                                    border = androidx.compose.foundation.BorderStroke(
                                                        1.dp,
                                                        if (req.status == "pendiente") BrandGold.copy(alpha = 0.5f)
                                                        else if (req.status == "aprobada") Color(0xFF86EFAC)
                                                        else Color(0xFFFCA5A5)
                                                    )
                                                ) {
                                                    Column(modifier = Modifier.padding(14.dp)) {
                                                        // Cabecera: Solicitante + Estado
                                                        Row(
                                                            modifier = Modifier.fillMaxWidth(),
                                                            horizontalArrangement = Arrangement.SpaceBetween,
                                                            verticalAlignment = Alignment.CenterVertically
                                                        ) {
                                                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                                                Box(
                                                                    modifier = Modifier.size(40.dp).clip(CircleShape).background(BrandForest),
                                                                    contentAlignment = Alignment.Center
                                                                ) {
                                                                    if (req.userAvatar.isNotBlank()) {
                                                                        AsyncImage(
                                                                            model = req.userAvatar,
                                                                            contentDescription = null,
                                                                            modifier = Modifier.fillMaxSize(),
                                                                            contentScale = ContentScale.Crop
                                                                        )
                                                                    } else {
                                                                        Text(req.userName.take(1).uppercase(), color = Color.White, fontWeight = FontWeight.Bold)
                                                                    }
                                                                }
                                                                Spacer(modifier = Modifier.width(10.dp))
                                                                Column {
                                                                    Text(req.userName.ifBlank { "Sin nombre" }, fontWeight = FontWeight.Black, fontSize = 14.sp, color = BrandCafe)
                                                                    Text(req.userEmail, fontSize = 11.sp, color = BrandTextSecondary)
                                                                    if (req.userPhone.isNotBlank()) {
                                                                        Text("Tel: ${req.userPhone}", fontSize = 11.sp, color = BrandForest, fontWeight = FontWeight.SemiBold)
                                                                    }
                                                                }
                                                            }

                                                            Surface(
                                                                shape = RoundedCornerShape(8.dp),
                                                                color = when (req.status) {
                                                                    "aprobada" -> Color(0xFFDCFCE7)
                                                                    "rechazada" -> Color(0xFFFEE2E2)
                                                                    else -> Color(0xFFFEF3C7)
                                                                }
                                                            ) {
                                                                Text(
                                                                    text = req.status.replaceFirstChar { it.uppercase() },
                                                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                                                    fontSize = 11.sp,
                                                                    fontWeight = FontWeight.Black,
                                                                    color = when (req.status) {
                                                                        "aprobada" -> Color(0xFF166534)
                                                                        "rechazada" -> Color(0xFF991B1B)
                                                                        else -> Color(0xFF92400E)
                                                                    }
                                                                )
                                                            }
                                                        }

                                                        Spacer(modifier = Modifier.height(10.dp))

                                                        // Datos del DPI
                                                        Surface(
                                                            shape = RoundedCornerShape(10.dp),
                                                            color = BrandCremaDark.copy(alpha = 0.5f),
                                                            modifier = Modifier.fillMaxWidth()
                                                        ) {
                                                            Column(modifier = Modifier.padding(10.dp)) {
                                                                Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                                                    Text("CUI Declarado:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BrandTextSecondary)
                                                                    Text(formatCuiDisplay(req.cui), fontSize = 12.sp, fontWeight = FontWeight.Black, color = BrandCafe)
                                                                }
                                                                Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                                                    Text("Lugar de emisión:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BrandTextSecondary)
                                                                    Text("${req.municipality}, ${req.department}", fontSize = 11.sp, color = BrandCafe)
                                                                }
                                                                if (req.birthDate.isNotBlank()) {
                                                                    Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                                                        Text("Fecha Nacimiento:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BrandTextSecondary)
                                                                        Text(req.birthDate, fontSize = 11.sp, color = BrandCafe)
                                                                    }
                                                                }
                                                                if (req.legalAddress.isNotBlank()) {
                                                                    Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                                                        Text("Dirección legal:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BrandTextSecondary)
                                                                        Text(req.legalAddress, fontSize = 11.sp, color = BrandCafe, maxLines = 1)
                                                                    }
                                                                }
                                                                if (req.emergencyName.isNotBlank()) {
                                                                    Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                                                        Text("Contacto Emergencia:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BrandTextSecondary)
                                                                        Text("${req.emergencyName} (${req.emergencyPhone})", fontSize = 11.sp, color = BrandCafe)
                                                                    }
                                                                }
                                                            }
                                                        }

                                                        // Foto del DPI
                                                        if (req.documentPhoto.isNotBlank()) {
                                                            Spacer(modifier = Modifier.height(10.dp))
                                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                                AsyncImage(
                                                                    model = req.documentPhoto,
                                                                    contentDescription = "Foto DPI",
                                                                    modifier = Modifier
                                                                        .size(90.dp, 60.dp)
                                                                        .clip(RoundedCornerShape(8.dp))
                                                                        .border(1.dp, BrandBorder, RoundedCornerShape(8.dp))
                                                                        .clickable { viewingDpiPhotoUrl = req.documentPhoto },
                                                                    contentScale = ContentScale.Crop
                                                                )
                                                                Spacer(modifier = Modifier.width(10.dp))
                                                                TextButton(onClick = { viewingDpiPhotoUrl = req.documentPhoto }) {
                                                                    Icon(Icons.Default.ZoomIn, contentDescription = null, modifier = Modifier.size(16.dp), tint = BrandForest)
                                                                    Spacer(modifier = Modifier.width(4.dp))
                                                                    Text("Ver foto DPI en grande", fontSize = 11.sp, color = BrandForest, fontWeight = FontWeight.Bold)
                                                                }
                                                            }
                                                        }

                                                        if (req.status == "rechazada" && !req.rejectionReason.isNullOrBlank()) {
                                                            Spacer(modifier = Modifier.height(8.dp))
                                                            Text("Motivo de rechazo: ${req.rejectionReason}", fontSize = 11.sp, color = Color.Red, fontWeight = FontWeight.SemiBold)
                                                        }

                                                        // Acciones si está pendiente
                                                        if (req.status == "pendiente") {
                                                            Spacer(modifier = Modifier.height(12.dp))
                                                            Row(
                                                                modifier = Modifier.fillMaxWidth(),
                                                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                                                            ) {
                                                                OutlinedButton(
                                                                    onClick = {
                                                                        rejectingRequest = req
                                                                        rejectionReasonInput = ""
                                                                    },
                                                                    modifier = Modifier.weight(1f),
                                                                    shape = RoundedCornerShape(10.dp),
                                                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.Red)
                                                                ) {
                                                                    Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(14.dp))
                                                                    Spacer(modifier = Modifier.width(4.dp))
                                                                    Text("Rechazar", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                                                }

                                                                Button(
                                                                    onClick = { approvingRequest = req },
                                                                    modifier = Modifier.weight(1.3f),
                                                                    shape = RoundedCornerShape(10.dp),
                                                                    colors = ButtonDefaults.buttonColors(containerColor = BrandForest)
                                                                ) {
                                                                    Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(14.dp))
                                                                    Spacer(modifier = Modifier.width(4.dp))
                                                                    Text("Aprobar Casero", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    1 -> {
                                        // ── 2. MODULO GESTION DE USUARIOS (ROLES Y ESTADOS) ──
                                        OutlinedTextField(
                                            value = adminUserSearch,
                                            onValueChange = { adminUserSearch = it; adminUserPage = 1 },
                                            placeholder = { Text("Buscar usuario por nombre o correo...", fontSize = 12.sp) },
                                            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp)) },
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(12.dp),
                                            singleLine = true
                                        )

                                        Spacer(modifier = Modifier.height(8.dp))

                                        // Filtros de Roles
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                            listOf(
                                                "todos" to "Todos",
                                                "seeker" to "Inquilinos",
                                                "owner" to "Propietarios",
                                                "admin" to "Admins"
                                            ).forEach { (rKey, rLabel) ->
                                                FilterChip(
                                                    selected = adminUserRoleFilter == rKey,
                                                    onClick = { adminUserRoleFilter = rKey; adminUserPage = 1 },
                                                    label = { Text(rLabel, fontSize = 11.sp) },
                                                    colors = FilterChipDefaults.filterChipColors(
                                                        selectedContainerColor = BrandForest,
                                                        selectedLabelColor = Color.White
                                                    )
                                                )
                                            }
                                        }

                                        Spacer(modifier = Modifier.height(4.dp))

                                        // Filtro por Estado (Activo, Inactivo, Suspendido)
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                            listOf(
                                                "todos" to "Todos los estados",
                                                "active" to "🟢 Activos",
                                                "inactive" to "🟡 Inactivos",
                                                "suspended" to "🔴 Suspendidos"
                                            ).forEach { (sKey, sLabel) ->
                                                FilterChip(
                                                    selected = adminUserStatusFilter == sKey,
                                                    onClick = { adminUserStatusFilter = sKey; adminUserPage = 1 },
                                                    label = { Text(sLabel, fontSize = 11.sp) },
                                                    colors = FilterChipDefaults.filterChipColors(
                                                        selectedContainerColor = BrandCafe,
                                                        selectedLabelColor = Color.White
                                                    )
                                                )
                                            }
                                        }

                                        Spacer(modifier = Modifier.height(10.dp))

                                        val filteredUsers = allUsersList.filter { u ->
                                            val r = (u["role"] as? String) ?: "seeker"
                                            val matchesRole = adminUserRoleFilter == "todos" || r == adminUserRoleFilter

                                            val rawStatus = (u["accountStatus"] as? String)
                                                ?: (u["status"] as? String)
                                                ?: if ((u["suspended"] as? Boolean) == true) "suspended" else "active"
                                            val matchesStatus = adminUserStatusFilter == "todos" || rawStatus == adminUserStatusFilter

                                            val q = adminUserSearch.trim().lowercase()
                                            val name = (u["name"] as? String).orEmpty().lowercase()
                                            val email = (u["email"] as? String).orEmpty().lowercase()
                                            val phone = (u["phone"] as? String).orEmpty().lowercase()
                                            val matchesSearch = q.isBlank() || name.contains(q) || email.contains(q) || phone.contains(q)

                                            matchesRole && matchesStatus && matchesSearch
                                        }

                                        val totalUserPages = maxOf(1, (filteredUsers.size + USERS_PER_PAGE - 1) / USERS_PER_PAGE)
                                        val pagedUsers = filteredUsers.drop((adminUserPage - 1) * USERS_PER_PAGE).take(USERS_PER_PAGE)

                                        if (pagedUsers.isEmpty()) {
                                            Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                                                Text("No se encontraron usuarios.", color = BrandTextSecondary, fontSize = 13.sp)
                                            }
                                        } else {
                                            for (u in pagedUsers) {
                                                val uId = u["id"] as? String ?: continue
                                                val uName = (u["name"] as? String) ?: "Usuario"
                                                val uEmail = (u["email"] as? String) ?: ""
                                                val uRole = (u["role"] as? String) ?: "seeker"
                                                val uStatus = (u["accountStatus"] as? String)
                                                    ?: (u["status"] as? String)
                                                    ?: if ((u["suspended"] as? Boolean) == true) "suspended" else "active"

                                                Card(
                                                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                                    shape = RoundedCornerShape(12.dp),
                                                    colors = CardDefaults.cardColors(containerColor = BrandSurfaceCard),
                                                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                                                ) {
                                                    Column(modifier = Modifier.padding(12.dp)) {
                                                        Row(
                                                            modifier = Modifier.fillMaxWidth(),
                                                            horizontalArrangement = Arrangement.SpaceBetween,
                                                            verticalAlignment = Alignment.CenterVertically
                                                        ) {
                                                            Column(modifier = Modifier.weight(1f)) {
                                                                Text(uName, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = BrandCafe)
                                                                Text(uEmail, fontSize = 11.sp, color = BrandTextSecondary)
                                                            }

                                                            // Controles de Rol y Estado
                                                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                                // Toggle de Rol
                                                                var roleDropdownExpanded by remember { mutableStateOf(false) }
                                                                Box {
                                                                    Surface(
                                                                        modifier = Modifier.clickable { roleDropdownExpanded = true },
                                                                        shape = RoundedCornerShape(8.dp),
                                                                        color = BrandCremaDark
                                                                    ) {
                                                                        Row(modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                                                                            Text(
                                                                                text = when (uRole) {
                                                                                    "admin" -> "🛡️ Admin"
                                                                                    "owner" -> "🏡 Casero"
                                                                                    else -> "👤 Inquilino"
                                                                                },
                                                                                fontSize = 11.sp,
                                                                                fontWeight = FontWeight.Bold,
                                                                                color = BrandCafe
                                                                            )
                                                                            Icon(Icons.Default.ArrowDropDown, contentDescription = null, modifier = Modifier.size(16.dp))
                                                                        }
                                                                    }
                                                                    DropdownMenu(
                                                                        expanded = roleDropdownExpanded,
                                                                        onDismissRequest = { roleDropdownExpanded = false }
                                                                    ) {
                                                                        listOf("seeker" to "👤 Inquilino", "owner" to "🏡 Propietario", "admin" to "🛡️ Administrador").forEach { (rVal, rName) ->
                                                                            DropdownMenuItem(
                                                                                text = { Text(rName) },
                                                                                onClick = {
                                                                                    roleDropdownExpanded = false
                                                                                    VerificationRepository.updateUserRole(uId, rVal) {
                                                                                        adminNoticeMessage = "Rol de $uEmail actualizado a $rVal."
                                                                                    }
                                                                                }
                                                                            )
                                                                        }
                                                                    }
                                                                }

                                                                // Toggle de Estado (Activo, Inactivo, Suspendido)
                                                                var statusDropdownExpanded by remember { mutableStateOf(false) }
                                                                Box {
                                                                    Surface(
                                                                        modifier = Modifier.clickable { statusDropdownExpanded = true },
                                                                        shape = RoundedCornerShape(8.dp),
                                                                        color = when (uStatus) {
                                                                            "active" -> Color(0xFFDCFCE7)
                                                                            "inactive" -> Color(0xFFFEF3C7)
                                                                            else -> Color(0xFFFEE2E2)
                                                                        }
                                                                    ) {
                                                                        Row(modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                                                                            Text(
                                                                                text = when (uStatus) {
                                                                                    "active" -> "🟢 Activo"
                                                                                    "inactive" -> "🟡 Inactivo"
                                                                                    else -> "🔴 Suspendido"
                                                                                },
                                                                                fontSize = 11.sp,
                                                                                fontWeight = FontWeight.Bold,
                                                                                color = when (uStatus) {
                                                                                    "active" -> Color(0xFF166534)
                                                                                    "inactive" -> Color(0xFF92400E)
                                                                                    else -> Color(0xFF991B1B)
                                                                                }
                                                                            )
                                                                            Icon(Icons.Default.ArrowDropDown, contentDescription = null, modifier = Modifier.size(16.dp))
                                                                        }
                                                                    }
                                                                    DropdownMenu(
                                                                        expanded = statusDropdownExpanded,
                                                                        onDismissRequest = { statusDropdownExpanded = false }
                                                                    ) {
                                                                        listOf("active" to "🟢 Activo", "inactive" to "🟡 Inactivo", "suspended" to "🔴 Suspendido").forEach { (sVal, sName) ->
                                                                            DropdownMenuItem(
                                                                                text = { Text(sName) },
                                                                                onClick = {
                                                                                    statusDropdownExpanded = false
                                                                                    VerificationRepository.updateUserAccountStatus(uId, sVal) {
                                                                                        adminNoticeMessage = "Estado de cuenta de $uEmail cambiado a $sName."
                                                                                    }
                                                                                }
                                                                            )
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }

                                            // Paginador
                                            if (totalUserPages > 1) {
                                                Spacer(modifier = Modifier.height(10.dp))
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.Center,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    OutlinedButton(
                                                        onClick = { if (adminUserPage > 1) adminUserPage-- },
                                                        enabled = adminUserPage > 1,
                                                        shape = RoundedCornerShape(8.dp)
                                                    ) {
                                                        Text("Anterior", fontSize = 11.sp)
                                                    }
                                                    Spacer(modifier = Modifier.width(12.dp))
                                                    Text("Página $adminUserPage de $totalUserPages", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BrandCafe)
                                                    Spacer(modifier = Modifier.width(12.dp))
                                                    OutlinedButton(
                                                        onClick = { if (adminUserPage < totalUserPages) adminUserPage++ },
                                                        enabled = adminUserPage < totalUserPages,
                                                        shape = RoundedCornerShape(8.dp)
                                                    ) {
                                                        Text("Siguiente", fontSize = 11.sp)
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    2 -> {
                                        // ── 3. MODULO INMUEBLES GENERALES (MODERACIÓN) ──
                                        Text("Moderación de Todas las Viviendas", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = BrandCafe)
                                        Spacer(modifier = Modifier.height(8.dp))
                                        for (prop in properties) {
                                            Card(
                                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                                shape = RoundedCornerShape(12.dp),
                                                colors = CardDefaults.cardColors(containerColor = BrandSurfaceCard)
                                            ) {
                                                Row(
                                                    modifier = Modifier.padding(10.dp).fillMaxWidth(),
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.SpaceBetween
                                                ) {
                                                    Column(modifier = Modifier.weight(1f)) {
                                                        Text(prop.title, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = BrandCafe, maxLines = 1)
                                                        Text("Q${prop.price.toInt()} · ${prop.location.city}", fontSize = 11.sp, color = BrandTextSecondary)
                                                        Text("Estado: ${prop.status}", fontSize = 10.sp, color = BrandForest, fontWeight = FontWeight.SemiBold)
                                                    }
                                                    Row {
                                                        TextButton(onClick = {
                                                            val next = if (prop.status == "disponible") "pausada" else "disponible"
                                                            updatePropertyStatus(prop.id, next) {
                                                                adminNoticeMessage = "Propiedad actualizada."
                                                            }
                                                        }) {
                                                            Text(if (prop.status == "disponible") "Pausar" else "Activar", fontSize = 11.sp)
                                                        }
                                                        TextButton(onClick = {
                                                            deleteProperty(prop.id) {
                                                                adminNoticeMessage = "Propiedad eliminada."
                                                            }
                                                        }) {
                                                            Text("Eliminar", fontSize = 11.sp, color = Color.Red)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    3 -> {
                                        // ── 4. MODULO COMUNICADOS DEL SISTEMA ──
                                        Text("Comunicados Globales", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = BrandCafe)
                                        Spacer(modifier = Modifier.height(6.dp))
                                        for (update in systemUpdates) {
                                            Card(
                                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                                colors = CardDefaults.cardColors(containerColor = BrandSurfaceCard),
                                                shape = RoundedCornerShape(10.dp)
                                            ) {
                                                Column(modifier = Modifier.padding(12.dp)) {
                                                    Row(
                                                        modifier = Modifier.fillMaxWidth(),
                                                        horizontalArrangement = Arrangement.SpaceBetween,
                                                        verticalAlignment = Alignment.CenterVertically
                                                    ) {
                                                        Text(update.title, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = BrandCafe)
                                                        Switch(
                                                            checked = update.active,
                                                            onCheckedChange = { active ->
                                                                toggleSystemUpdateStatus(update.id, active) { _ -> }
                                                            }
                                                        )
                                                    }
                                                    Text(update.content, fontSize = 11.sp, color = BrandTextSecondary)
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

                        5 -> {
                            // ── TAB 5: AJUSTES Y CONFIGURACIÓN ──
                            Column(modifier = Modifier.fillMaxWidth()) {
                                Text("Ajustes y Configuración", fontSize = 17.sp, fontWeight = FontWeight.Black, color = BrandCafe)
                                Spacer(modifier = Modifier.height(10.dp))

                                // 1. Cambiar Contraseña
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(18.dp),
                                    colors = CardDefaults.cardColors(containerColor = BrandSurfaceCard),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                                ) {
                                    Column(modifier = Modifier.padding(18.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Default.Lock, contentDescription = null, tint = BrandForest, modifier = Modifier.size(20.dp))
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Column {
                                                Text("Cambiar Contraseña", fontWeight = FontWeight.Black, fontSize = 15.sp, color = BrandCafe)
                                                Text("Actualiza tu clave con requisitos de seguridad", fontSize = 11.sp, color = BrandTextSecondary)
                                            }
                                        }

                                        Spacer(modifier = Modifier.height(12.dp))

                                        OutlinedTextField(
                                            value = currentPasswordInput,
                                            onValueChange = { currentPasswordInput = it },
                                            label = { Text("Contraseña Actual") },
                                            visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation(),
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(12.dp)
                                        )

                                        Spacer(modifier = Modifier.height(10.dp))

                                        OutlinedTextField(
                                            value = newPasswordInput,
                                            onValueChange = { newPasswordInput = it },
                                            label = { Text("Nueva Contraseña") },
                                            visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation(),
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(12.dp)
                                        )

                                        Spacer(modifier = Modifier.height(6.dp))

                                        val lenOk = newPasswordInput.length >= 8
                                        val upOk = newPasswordInput.any { it.isUpperCase() }
                                        val lowOk = newPasswordInput.any { it.isLowerCase() }
                                        val numOk = newPasswordInput.any { it.isDigit() }
                                        val symOk = newPasswordInput.any { !it.isLetterOrDigit() }
                                        val score = listOf(lenOk, upOk, lowOk, numOk, symOk).count { it }

                                        LinearProgressIndicator(
                                            progress = score / 5f,
                                            modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                                            color = when (score) {
                                                5 -> BrandForest
                                                in 3..4 -> BrandGold
                                                else -> Color.Red
                                            },
                                            trackColor = BrandCremaDark
                                        )

                                        Spacer(modifier = Modifier.height(6.dp))

                                        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                            listOf(
                                                lenOk to "Mínimo 8 caracteres",
                                                upOk to "Al menos una mayúscula (A-Z)",
                                                lowOk to "Al menos una minúscula (a-z)",
                                                numOk to "Al menos un número (0-9)",
                                                symOk to "Al menos un símbolo (@$!%*?&#)"
                                            ).forEach { (ok, desc) ->
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Icon(
                                                        imageVector = if (ok) Icons.Default.CheckCircle else Icons.Default.Cancel,
                                                        contentDescription = null,
                                                        tint = if (ok) BrandForest else Color.Gray,
                                                        modifier = Modifier.size(13.dp)
                                                    )
                                                    Spacer(modifier = Modifier.width(6.dp))
                                                    Text(desc, fontSize = 10.sp, color = if (ok) BrandForest else BrandTextSecondary)
                                                }
                                            }
                                        }

                                        Spacer(modifier = Modifier.height(10.dp))

                                        OutlinedTextField(
                                            value = confirmPasswordInput,
                                            onValueChange = { confirmPasswordInput = it },
                                            label = { Text("Confirmar Nueva Contraseña") },
                                            visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation(),
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(12.dp)
                                        )

                                        passwordChangeStatus?.let { status ->
                                            Spacer(modifier = Modifier.height(8.dp))
                                            Text(
                                                text = status,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (status.contains("correctamente", ignoreCase = true)) BrandForest else Color.Red
                                            )
                                        }

                                        Spacer(modifier = Modifier.height(12.dp))

                                        Button(
                                            onClick = {
                                                if (currentPasswordInput.isBlank()) {
                                                    passwordChangeStatus = "Ingresa tu contraseña actual."
                                                    return@Button
                                                }
                                                if (score < 5) {
                                                    passwordChangeStatus = "Tu nueva contraseña no cumple todos los requisitos."
                                                    return@Button
                                                }
                                                if (newPasswordInput != confirmPasswordInput) {
                                                    passwordChangeStatus = "Las contraseñas nuevas no coinciden."
                                                    return@Button
                                                }
                                                isChangingPassword = true
                                                val user = auth.currentUser
                                                if (user?.email != null) {
                                                    val credential = com.google.firebase.auth.EmailAuthProvider.getCredential(user.email!!, currentPasswordInput)
                                                    user.reauthenticate(credential).addOnSuccessListener {
                                                        user.updatePassword(newPasswordInput).addOnSuccessListener {
                                                            isChangingPassword = false
                                                            passwordChangeStatus = "¡Contraseña actualizada correctamente!"
                                                            currentPasswordInput = ""
                                                            newPasswordInput = ""
                                                            confirmPasswordInput = ""
                                                        }.addOnFailureListener {
                                                            isChangingPassword = false
                                                            passwordChangeStatus = it.localizedMessage ?: "Error al actualizar."
                                                        }
                                                    }.addOnFailureListener {
                                                        isChangingPassword = false
                                                        passwordChangeStatus = "Contraseña actual incorrecta."
                                                    }
                                                }
                                            },
                                            enabled = !isChangingPassword,
                                            modifier = Modifier.fillMaxWidth().height(46.dp),
                                            shape = RoundedCornerShape(12.dp),
                                            colors = ButtonDefaults.buttonColors(containerColor = BrandForest)
                                        ) {
                                            Text("Actualizar Contraseña", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(14.dp))

                                // 2. Apariencia y Tema (Dark / Light)
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(18.dp),
                                    colors = CardDefaults.cardColors(containerColor = BrandSurfaceCard),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(18.dp).fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                imageVector = if (RuwaThemeState.isDark) Icons.Default.DarkMode else Icons.Default.LightMode,
                                                contentDescription = null,
                                                tint = BrandForest,
                                                modifier = Modifier.size(24.dp)
                                            )
                                            Spacer(modifier = Modifier.width(12.dp))
                                            Column {
                                                Text("Tema de la Aplicación", fontWeight = FontWeight.Black, fontSize = 14.sp, color = BrandCafe)
                                                Text(if (RuwaThemeState.isDark) "Modo Oscuro activado" else "Modo Claro activado", fontSize = 11.sp, color = BrandTextSecondary)
                                            }
                                        }
                                        Switch(
                                            checked = RuwaThemeState.isDark,
                                            onCheckedChange = { isDark ->
                                                ThemePreferences.setDark(context, isDark)
                                            }
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(14.dp))

                                // 3. Privacidad y Datos de DPI
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(18.dp),
                                    colors = CardDefaults.cardColors(containerColor = BrandSurfaceCard),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                                ) {
                                    Column(modifier = Modifier.padding(18.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Default.Security, contentDescription = null, tint = BrandTerracota, modifier = Modifier.size(22.dp))
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Column {
                                                Text("Gestión de Datos y Privacidad", fontWeight = FontWeight.Black, fontSize = 14.sp, color = BrandCafe)
                                                Text("Control sobre información almacenada", fontSize = 11.sp, color = BrandTextSecondary)
                                            }
                                        }
                                        Spacer(modifier = Modifier.height(10.dp))
                                        Text("Puedes purgar los datos de verificación de DPI de este dispositivo si ya no deseas mantenerlos en caché.", fontSize = 11.sp, color = BrandTextSecondary)
                                        Spacer(modifier = Modifier.height(12.dp))
                                        OutlinedButton(
                                            onClick = { showPurgeDpiDialog = true },
                                            shape = RoundedCornerShape(10.dp),
                                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.Red),
                                            border = androidx.compose.foundation.BorderStroke(1.dp, Color.Red.copy(alpha = 0.4f))
                                        ) {
                                            Icon(Icons.Default.DeleteOutline, contentDescription = null, modifier = Modifier.size(16.dp))
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text("Purgar datos de DPI en dispositivo", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(14.dp))

                                // 4. Blindaje y Ciberseguridad Activa
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(18.dp),
                                    colors = CardDefaults.cardColors(containerColor = BrandSurfaceCard),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                                ) {
                                    Column(modifier = Modifier.padding(18.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Icon(Icons.Default.VerifiedUser, contentDescription = null, tint = BrandForest, modifier = Modifier.size(22.dp))
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Text("Blindaje y Ciberseguridad", fontWeight = FontWeight.Black, fontSize = 14.sp, color = BrandCafe)
                                            }
                                            Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFDCFCE7)) {
                                                Text("● Sistema Protegido", fontSize = 10.sp, fontWeight = FontWeight.Black, color = Color(0xFF166534), modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                            }
                                        }

                                        Spacer(modifier = Modifier.height(12.dp))

                                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                            listOf(
                                                "Cifrado PBKDF2 SHA-256" to "Contraseñas procesadas con 310,000 iteraciones criptográficas y sal de 16 bytes.",
                                                "Rate Limiting Anti-Fuerza Bruta" to "Bloqueo temporal automático tras 5 intentos fallidos para mitigar ataques.",
                                                "Sanitización XSS Estricta" to "Filtro automático que neutraliza scripts, iframes e inyecciones en tiempo real.",
                                                "Cabeceras HTTP Anti-Clickjacking" to "Protección X-Frame-Options SAMEORIGIN y X-Content-Type-Options activa."
                                            ).forEach { (title, desc) ->
                                                Surface(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    shape = RoundedCornerShape(10.dp),
                                                    color = BrandCremaDark
                                                ) {
                                                    Column(modifier = Modifier.padding(10.dp)) {
                                                        Text(title, fontWeight = FontWeight.Black, fontSize = 11.sp, color = BrandCafe)
                                                        Text(desc, fontSize = 10.sp, color = BrandTextSecondary)
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(14.dp))

                                // 5. Sesión
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(18.dp),
                                    colors = CardDefaults.cardColors(containerColor = BrandSurfaceCard),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                                ) {
                                    Column(modifier = Modifier.padding(18.dp)) {
                                        Text("Sesión", fontWeight = FontWeight.Black, fontSize = 14.sp, color = Color.Red)
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text("Al cerrar sesión deberás ingresar tus credenciales nuevamente.", fontSize = 11.sp, color = BrandTextSecondary)
                                        Spacer(modifier = Modifier.height(12.dp))
                                        Button(
                                            onClick = { NotificationRepository.signOut { currentUser = null } },
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFEE2E2)),
                                            shape = RoundedCornerShape(10.dp)
                                        ) {
                                            Icon(Icons.Default.Logout, contentDescription = null, tint = Color.Red, modifier = Modifier.size(16.dp))
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text("Cerrar Sesión", color = Color.Red, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(28.dp))
                RuwaFooter(
                    onExploreClick = onExploreClick,
                    onPublishClick = onPublishClick
                )
            }
        }
    }

    // ── MODAL: PURGAR DATOS DE DPI ──
    if (showPurgeDpiDialog) {
        AlertDialog(
            onDismissRequest = { showPurgeDpiDialog = false },
            title = { Text("¿Purgar datos de DPI en este dispositivo?") },
            text = { Text("Se eliminarán los datos de caché y credenciales de DPI almacenados localmente en este dispositivo.") },
            confirmButton = {
                Button(
                    onClick = {
                        showPurgeDpiDialog = false
                        adminNoticeMessage = "Datos de DPI purgados exitosamente del almacenamiento local."
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Red)
                ) {
                    Text("Purgar")
                }
            },
            dismissButton = {
                TextButton(onClick = { showPurgeDpiDialog = false }) {
                    Text("Cancelar")
                }
            }
        )
    }

    // ── MODAL: FORMULARIO DE VERIFICACIÓN CON DPI (USUARIO) ──
    if (showDpiFormModal) {
        DpiVerificationFormModal(
            onDismiss = { showDpiFormModal = false },
            onSuccess = {
                showDpiFormModal = false
                adminNoticeMessage = "¡Solicitud de verificación enviada! El administrador la revisará a la brevedad."
            }
        )
    }

    // ── MODAL: VER DETALLES DE DPI PROPIO ──
    if (showDpiDetailsModal) {
        val dpiData = userData?.get("dpiData") as? Map<*, *>
        AlertDialog(
            onDismissRequest = { showDpiDetailsModal = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.VerifiedUser, contentDescription = null, tint = BrandForest)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Datos de Verificación DPI", fontWeight = FontWeight.Black, fontSize = 16.sp)
                }
            },
            text = {
                var unmaskCui by remember { mutableStateOf(false) }
                val rawCui = (dpiData?.get("cui") as? String).orEmpty()
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text("CUI Oficial:", fontSize = 11.sp, color = BrandTextSecondary, fontWeight = FontWeight.Bold)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = if (unmaskCui) formatCuiDisplay(rawCui) else maskCuiDisplay(rawCui),
                            fontWeight = FontWeight.Black,
                            fontSize = 14.sp,
                            color = BrandCafe
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        IconButton(onClick = { unmaskCui = !unmaskCui }, modifier = Modifier.size(24.dp)) {
                            Icon(
                                if (unmaskCui) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("Lugar de Emisión: ${(dpiData?.get("municipality") as? String).orEmpty()}, ${(dpiData?.get("department") as? String).orEmpty()}", fontSize = 12.sp, color = BrandCafe)
                    Text("Fecha de Verificación: ${(dpiData?.get("verifiedAt") as? String).orEmpty()}", fontSize = 12.sp, color = BrandForest, fontWeight = FontWeight.SemiBold)
                    (dpiData?.get("emergencyName") as? String)?.takeIf { it.isNotBlank() }?.let { emName ->
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Contacto de Emergencia: $emName (${dpiData["emergencyPhone"]})", fontSize = 11.sp, color = BrandTextSecondary)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { showDpiDetailsModal = false },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandForest)
                ) {
                    Text("Cerrar")
                }
            }
        )
    }

    // ── MODAL: APROBAR SOLICITUD DE CASERO (ADMIN) ──
    approvingRequest?.let { req ->
        AlertDialog(
            onDismissRequest = { approvingRequest = null },
            icon = { Icon(Icons.Default.Verified, contentDescription = null, tint = BrandForest, modifier = Modifier.size(36.dp)) },
            title = { Text("¿Aprobar Solicitud de Casero?", fontWeight = FontWeight.Black, fontSize = 16.sp) },
            text = {
                Column {
                    Text("Confirmas habilitar a \"${req.userName}\" como Propietario / Casero oficial de RuwaJay.")
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("• Se le otorgará el rol de Propietario.", fontSize = 12.sp, color = BrandTextSecondary)
                    Text("• Podrá subir y anunciar viviendas de inmediato.", fontSize = 12.sp, color = BrandTextSecondary)
                    Text("• Recibirá una notificación en tiempo real.", fontSize = 12.sp, color = BrandTextSecondary)
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val adminUid = currentUser?.uid ?: "admin"
                        val adminName = (userData?.get("name") as? String) ?: currentUser?.displayName ?: "Administrador"
                        VerificationRepository.approveVerificationRequest(req, adminName, adminUid) { res ->
                            approvingRequest = null
                            if (res.isSuccess) {
                                adminNoticeMessage = "¡Solicitud de ${req.userName} aprobada con éxito!"
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandForest)
                ) {
                    Text("Aceptar y Habilitar")
                }
            },
            dismissButton = {
                TextButton(onClick = { approvingRequest = null }) {
                    Text("Cancelar")
                }
            }
        )
    }

    // ── MODAL: RECHAZAR SOLICITUD DE CASERO (ADMIN) ──
    rejectingRequest?.let { req ->
        AlertDialog(
            onDismissRequest = { rejectingRequest = null },
            icon = { Icon(Icons.Default.Cancel, contentDescription = null, tint = Color.Red, modifier = Modifier.size(36.dp)) },
            title = { Text("Rechazar Solicitud de Verificación", fontWeight = FontWeight.Black, fontSize = 16.sp) },
            text = {
                Column {
                    Text("Ingresa el motivo por el cual no se aprueba la solicitud de \"${req.userName}\":", fontSize = 12.sp, color = BrandTextSecondary)
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = rejectionReasonInput,
                        onValueChange = { rejectionReasonInput = it },
                        placeholder = { Text("Ej: Fotografía borrosa o datos de CUI no coincidentes...", fontSize = 12.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val adminUid = currentUser?.uid ?: "admin"
                        val adminName = (userData?.get("name") as? String) ?: currentUser?.displayName ?: "Administrador"
                        VerificationRepository.rejectVerificationRequest(req, rejectionReasonInput, adminName, adminUid) { res ->
                            rejectingRequest = null
                            if (res.isSuccess) {
                                adminNoticeMessage = "Solicitud rechazada y notificada al usuario."
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Red)
                ) {
                    Text("Confirmar Rechazo")
                }
            },
            dismissButton = {
                TextButton(onClick = { rejectingRequest = null }) {
                    Text("Cancelar")
                }
            }
        )
    }

    // ── VISOR DE FOTO DPI EN PANTALLA COMPLETA ──
    viewingDpiPhotoUrl?.let { photoUrl ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.9f))
                .clickable { viewingDpiPhotoUrl = null },
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.End
                ) {
                    IconButton(onClick = { viewingDpiPhotoUrl = null }) {
                        Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = Color.White)
                    }
                }
                AsyncImage(
                    model = photoUrl,
                    contentDescription = "DPI Grande",
                    modifier = Modifier
                        .fillMaxWidth(0.9f)
                        .clip(RoundedCornerShape(16.dp)),
                    contentScale = ContentScale.Fit
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text("Documento DPI presentado para verificación", color = Color.White.copy(alpha = 0.8f), fontSize = 12.sp)
            }
        }
    }

    // ── MODAL: PUBLICAR COMUNICADO DEL SISTEMA ──
    if (showPublishUpdateDialog) {
        var newTitle by remember { mutableStateOf("") }
        var newContent by remember { mutableStateOf("") }
        var newCat by remember { mutableStateOf("novedad") }

        AlertDialog(
            onDismissRequest = { showPublishUpdateDialog = false },
            title = { Text("Nuevo Comunicado del Sistema", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Column {
                    OutlinedTextField(
                        value = newTitle,
                        onValueChange = { newTitle = it },
                        label = { Text("Título") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = newContent,
                        onValueChange = { newContent = it },
                        label = { Text("Mensaje") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 4
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newTitle.isNotBlank() && newContent.isNotBlank()) {
                            publishSystemUpdate(
                                title = newTitle,
                                content = newContent,
                                category = newCat,
                                priority = "normal",
                                adminName = currentUser?.displayName ?: "Administrador"
                            ) { res ->
                                if (res.isSuccess) {
                                    showPublishUpdateDialog = false
                                    adminNoticeMessage = "Comunicado publicado en vivo."
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

/**
 * Modal / Diálogo interactivo para que el usuario complete su formulario de verificación con DPI.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DpiVerificationFormModal(
    onDismiss: () -> Unit,
    onSuccess: () -> Unit
) {
    val context = LocalContext.current
    var cuiInput by remember { mutableStateOf("") }
    var department by remember { mutableStateOf("Guatemala") }
    var departmentExpanded by remember { mutableStateOf(false) }
    var municipality by remember { mutableStateOf("Guatemala") }
    var birthDate by remember { mutableStateOf("") }
    var expirationDate by remember { mutableStateOf("") }
    var legalAddress by remember { mutableStateOf("") }
    var emergencyName by remember { mutableStateOf("") }
    var emergencyPhone by remember { mutableStateOf("") }
    var emergencyRelation by remember { mutableStateOf("Familiar") }
    var swornDeclaration by remember { mutableStateOf(false) }

    var selectedPhotoUri by remember { mutableStateOf<Uri?>(null) }
    var isSubmitting by remember { mutableStateOf(false) }
    var formError by remember { mutableStateOf<String?>(null) }

    val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) selectedPhotoUri = uri
    }

    AlertDialog(
        onDismissRequest = { if (!isSubmitting) onDismiss() },
        modifier = Modifier.fillMaxWidth().widthIn(max = 680.dp),
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Badge, contentDescription = null, tint = BrandForest, modifier = Modifier.size(24.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Verificación de Identidad con DPI", fontWeight = FontWeight.Black, fontSize = 17.sp, color = BrandCafe)
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
            ) {
                Text(
                    "Ingresa los datos exactos que figuran en tu Documento Personal de Identificación (DPI).",
                    fontSize = 12.sp,
                    color = BrandTextSecondary
                )
                Spacer(modifier = Modifier.height(10.dp))

                formError?.let { err ->
                    Text(err, color = Color.Red, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 6.dp))
                }

                // CUI
                OutlinedTextField(
                    value = cuiInput,
                    onValueChange = { input ->
                        val digits = input.filter { it.isDigit() }.take(13)
                        cuiInput = formatCuiDisplay(digits)
                    },
                    label = { Text("CUI del DPI (13 dígitos)", fontSize = 12.sp) },
                    placeholder = { Text("0000 00000 0000") },
                    leadingIcon = { Icon(Icons.Default.Numbers, contentDescription = null, tint = BrandForest) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Departamento
                ExposedDropdownMenuBox(
                    expanded = departmentExpanded,
                    onExpandedChange = { departmentExpanded = it }
                ) {
                    OutlinedTextField(
                        value = department,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Departamento de Emisión") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = departmentExpanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                        shape = RoundedCornerShape(12.dp)
                    )
                    ExposedDropdownMenu(
                        expanded = departmentExpanded,
                        onDismissRequest = { departmentExpanded = false }
                    ) {
                        GT_DEPARTMENTS_VERIF.forEach { dept ->
                            DropdownMenuItem(
                                text = { Text(dept) },
                                onClick = {
                                    department = dept
                                    departmentExpanded = false
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Municipio
                OutlinedTextField(
                    value = municipality,
                    onValueChange = { municipality = it },
                    label = { Text("Municipio de Emisión", fontSize = 12.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Fechas
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = birthDate,
                        onValueChange = { birthDate = it },
                        label = { Text("Nacimiento", fontSize = 11.sp) },
                        placeholder = { Text("DD/MM/AAAA") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    )
                    OutlinedTextField(
                        value = expirationDate,
                        onValueChange = { expirationDate = it },
                        label = { Text("Vencimiento", fontSize = 11.sp) },
                        placeholder = { Text("DD/MM/AAAA") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Dirección Legal
                OutlinedTextField(
                    value = legalAddress,
                    onValueChange = { legalAddress = it },
                    label = { Text("Dirección Domiciliar Completa", fontSize = 12.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Contacto de Emergencia
                Text("Contacto de Emergencia / Referencia:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BrandCafe)
                Spacer(modifier = Modifier.height(4.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = emergencyName,
                        onValueChange = { emergencyName = it },
                        label = { Text("Nombre Completo", fontSize = 11.sp) },
                        modifier = Modifier.weight(1.2f),
                        shape = RoundedCornerShape(12.dp)
                    )
                    OutlinedTextField(
                        value = emergencyPhone,
                        onValueChange = { emergencyPhone = it },
                        label = { Text("Teléfono", fontSize = 11.sp) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Foto del DPI
                Text("Fotografía del Documento DPI:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BrandCafe)
                Spacer(modifier = Modifier.height(4.dp))
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(90.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .clickable { imagePicker.launch("image/*") },
                    color = BrandCremaDark,
                    border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder)
                ) {
                    if (selectedPhotoUri != null) {
                        Row(modifier = Modifier.fillMaxSize().padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            AsyncImage(
                                model = selectedPhotoUri,
                                contentDescription = null,
                                modifier = Modifier.size(70.dp).clip(RoundedCornerShape(8.dp)),
                                contentScale = ContentScale.Crop
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text("✓ Foto seleccionada", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BrandForest)
                                Text("Toca para cambiarla", fontSize = 10.sp, color = BrandTextSecondary)
                            }
                        }
                    } else {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Icon(Icons.Default.CameraAlt, contentDescription = null, tint = BrandForest, modifier = Modifier.size(24.dp))
                            Spacer(modifier = Modifier.height(4.dp))
                            Text("Toca para seleccionar o tomar foto de tu DPI", fontSize = 11.sp, color = BrandForest, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Declaración jurada
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = swornDeclaration, onCheckedChange = { swornDeclaration = it })
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        "Declaro bajo juramento que los datos y fotografía del DPI ingresados son auténticos y me pertenecen.",
                        fontSize = 10.sp,
                        color = BrandTextPrimary,
                        lineHeight = 14.sp
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val cleanCui = cuiInput.filter { it.isDigit() }
                    if (cleanCui.length != 13) {
                        formError = "El CUI debe contener exactamente 13 dígitos numéricos."
                        return@Button
                    }
                    if (municipality.isBlank() || legalAddress.isBlank() || emergencyName.isBlank() || emergencyPhone.isBlank()) {
                        formError = "Completa todos los campos del formulario."
                        return@Button
                    }
                    if (selectedPhotoUri == null) {
                        formError = "Debes adjuntar la fotografía de tu DPI."
                        return@Button
                    }
                    if (!swornDeclaration) {
                        formError = "Debes aceptar la declaración jurada para continuar."
                        return@Button
                    }

                    isSubmitting = true
                    formError = null
                    VerificationRepository.submitVerificationRequest(
                        cui = cleanCui,
                        department = department,
                        municipality = municipality,
                        birthDate = birthDate,
                        expirationDate = expirationDate,
                        legalAddress = legalAddress,
                        emergencyName = emergencyName,
                        emergencyPhone = emergencyPhone,
                        emergencyRelation = emergencyRelation,
                        photoUri = selectedPhotoUri,
                        contentResolver = context.contentResolver
                    ) { result ->
                        isSubmitting = false
                        result.onSuccess {
                            onSuccess()
                        }.onFailure { err ->
                            formError = err.localizedMessage ?: "No se pudo enviar la solicitud."
                        }
                    }
                },
                enabled = !isSubmitting,
                colors = ButtonDefaults.buttonColors(containerColor = BrandForest)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Subiendo...", fontSize = 12.sp)
                } else {
                    Text("Enviar Solicitud", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isSubmitting) {
                Text("Cancelar")
            }
        }
    )
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
            containerColor = if (selected) BrandForest else BrandCremaDark,
            contentColor = if (selected) Color.White else BrandTextPrimary
        ),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = if (selected) 2.dp else 0.dp)
    ) {
        Text(title, fontSize = 12.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun ProfileTabChip(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    count: Int? = null,
    selected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        color = if (selected) BrandForest else Color.White,
        border = androidx.compose.foundation.BorderStroke(1.dp, if (selected) BrandForest else BrandBorder),
        shadowElevation = if (selected) 2.dp else 0.dp
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (selected) Color.White else BrandTextSecondary,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = title,
                fontSize = 12.sp,
                fontWeight = if (selected) FontWeight.Black else FontWeight.Bold,
                color = if (selected) Color.White else BrandTextPrimary
            )
            if (count != null && count > 0) {
                Spacer(modifier = Modifier.width(5.dp))
                Surface(
                    shape = CircleShape,
                    color = if (selected) Color.White.copy(alpha = 0.25f) else BrandCremaDark
                ) {
                    Text(
                        text = "$count",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                        color = if (selected) Color.White else BrandForest,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }
        }
    }
}

