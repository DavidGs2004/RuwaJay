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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ruwajay.data.repository.MockDataRepository
import com.example.ruwajay.ui.theme.*

@Composable
fun ProfileScreen(
    onLoginClick: () -> Unit = {},
    onInboxClick: () -> Unit = {},
    onExploreClick: () -> Unit = {},
    onPublishClick: () -> Unit = {}
) {
    // Simulated user state
    var isLoggedIn by remember { mutableStateOf(false) }
    var userName by remember { mutableStateOf("Miguel Cotzojay") }
    var userEmail by remember { mutableStateOf("miguel@ruwajay.gt") }
    var userPhone by remember { mutableStateOf("+502 5555 1234") }
    var userBio by remember { mutableStateOf("Buscando mi hogar ideal en Guatemala 🇬🇹") }
    var userRole by remember { mutableStateOf("Inquilino") }
    var isVerified by remember { mutableStateOf(false) }

    // Tab state
    var activeTab by remember { mutableStateOf("favoritos") }

    // Edit profile dialog
    var showEditDialog by remember { mutableStateOf(false) }
    var editName by remember { mutableStateOf(userName) }
    var editPhone by remember { mutableStateOf(userPhone) }
    var editBio by remember { mutableStateOf(userBio) }

    // Change password dialog
    var showPasswordDialog by remember { mutableStateOf(false) }

    // Profile saved toast
    var showSavedToast by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandCrema)
            .verticalScroll(rememberScrollState())
    ) {
        if (!isLoggedIn) {
            // ═══════ Not Logged In State ═══════
            NotLoggedInView(
                onLoginClick = {
                    isLoggedIn = true // For demo, auto log in
                },
                onExploreClick = onExploreClick
            )
        } else {
            // ═══════ Logged In: Full Profile ═══════

            // Profile Header Card
            ProfileHeader(
                userName = userName,
                userEmail = userEmail,
                userBio = userBio,
                userRole = userRole,
                isVerified = isVerified,
                onEditClick = {
                    editName = userName
                    editPhone = userPhone
                    editBio = userBio
                    showEditDialog = true
                },
                onLogoutClick = { isLoggedIn = false },
                onVerifyClick = { isVerified = true }
            )

            // Saved toast
            AnimatedVisibility(visible = showSavedToast) {
                Surface(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    color = BrandJade.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Check, null, tint = BrandForest, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Perfil actualizado correctamente.", color = BrandForest, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Stats Row
            StatsRow()

            Spacer(modifier = Modifier.height(8.dp))

            // Tab Selection
            TabSelector(
                activeTab = activeTab,
                onTabChange = { activeTab = it }
            )

            // Tab Content
            when (activeTab) {
                "favoritos" -> FavoritosTab(onExploreClick = onExploreClick)
                "visitas" -> VisitasTab()
                "configuracion" -> ConfiguracionTab(
                    userName = userName,
                    userEmail = userEmail,
                    userPhone = userPhone,
                    userRole = userRole,
                    isVerified = isVerified,
                    onChangePassword = { showPasswordDialog = true },
                    onInboxClick = onInboxClick
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // App version footer
            Text(
                text = "RuwaJay v1.0.0 • Guatemala 🇬🇹",
                color = BrandTextMuted,
                fontSize = 12.sp,
                modifier = Modifier.align(Alignment.CenterHorizontally).padding(bottom = 16.dp)
            )
        }
    }

    // ═══════ Edit Profile Dialog ═══════
    if (showEditDialog) {
        AlertDialog(
            onDismissRequest = { showEditDialog = false },
            containerColor = Color.White,
            shape = RoundedCornerShape(24.dp),
            title = {
                Text("Editar mi perfil", fontWeight = FontWeight.ExtraBold, color = BrandCafe)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = editName,
                        onValueChange = { editName = it },
                        label = { Text("Nombre completo") },
                        leadingIcon = { Icon(Icons.Default.Person, null, tint = BrandForest) },
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = editPhone,
                        onValueChange = { editPhone = it },
                        label = { Text("Teléfono") },
                        leadingIcon = { Icon(Icons.Default.Phone, null, tint = BrandForest) },
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = editBio,
                        onValueChange = { if (it.length <= 200) editBio = it },
                        label = { Text("Biografía / Presentación") },
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3,
                        supportingText = { Text("${editBio.length}/200") }
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        userName = editName
                        userPhone = editPhone
                        userBio = editBio
                        showEditDialog = false
                        showSavedToast = true
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandForest),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Icon(Icons.Default.Check, null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Guardar", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showEditDialog = false }) {
                    Text("Cancelar", color = BrandCafe)
                }
            }
        )
    }

    // ═══════ Change Password Dialog ═══════
    if (showPasswordDialog) {
        ChangePasswordDialog(onDismiss = { showPasswordDialog = false })
    }
}

// ═══════════════ NOT LOGGED IN VIEW ═══════════════
@Composable
private fun NotLoggedInView(onLoginClick: () -> Unit, onExploreClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Spacer(modifier = Modifier.height(40.dp))
        
        Surface(
            modifier = Modifier.size(96.dp),
            shape = CircleShape,
            color = BrandCafe
        ) {
            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                Icon(Icons.Default.Person, null, tint = BrandForest, modifier = Modifier.size(52.dp))
            }
        }
        
        Spacer(modifier = Modifier.height(20.dp))
        Text("Bienvenido a RuwaJay", fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = BrandCafe)
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            "Inicia sesión para gestionar tu cuenta, guardar favoritos y agendar visitas",
            color = BrandTextSecondary,
            fontSize = 13.sp,
            modifier = Modifier.padding(horizontal = 16.dp),
            lineHeight = 18.sp
        )
        
        Spacer(modifier = Modifier.height(28.dp))
        
        Button(
            onClick = onLoginClick,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = BrandForest)
        ) {
            Icon(Icons.Default.Login, null, tint = Color.White)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Iniciar Sesión", fontWeight = FontWeight.Bold, fontSize = 16.sp)
        }

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedButton(
            onClick = onExploreClick,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(14.dp)
        ) {
            Icon(Icons.Default.Search, null, tint = BrandForest)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Explorar propiedades", color = BrandCafe, fontWeight = FontWeight.Bold)
        }
    }
}

// ═══════════════ PROFILE HEADER ═══════════════
@Composable
private fun ProfileHeader(
    userName: String,
    userEmail: String,
    userBio: String,
    userRole: String,
    isVerified: Boolean,
    onEditClick: () -> Unit,
    onLogoutClick: () -> Unit,
    onVerifyClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        shape = RoundedCornerShape(24.dp),
        elevation = CardDefaults.cardElevation(4.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Avatar
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(BrandForest),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = userName.first().toString(),
                        color = Color.White,
                        fontWeight = FontWeight.Black,
                        fontSize = 28.sp
                    )
                }

                Spacer(modifier = Modifier.width(16.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            userName,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 20.sp,
                            color = BrandCafe,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f, fill = false)
                        )
                        if (isVerified) {
                            Spacer(modifier = Modifier.width(6.dp))
                            Surface(
                                color = BrandGold.copy(alpha = 0.15f),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.Verified, null, tint = BrandGold, modifier = Modifier.size(12.dp))
                                    Spacer(modifier = Modifier.width(2.dp))
                                    Text("Verificado", fontSize = 10.sp, fontWeight = FontWeight.Black, color = BrandGold)
                                }
                            }
                        }
                    }
                    Text(userEmail, color = BrandTextSecondary, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    if (userBio.isNotBlank()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("\"$userBio\"", color = BrandTextMuted, fontSize = 12.sp, fontStyle = FontStyle.Italic, maxLines = 2)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Role & verify badges
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Surface(
                    color = BrandCrema,
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = userRole,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = BrandCafe
                    )
                }

                Surface(
                    color = if (isVerified) BrandJade.copy(alpha = 0.1f) else BrandGold.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.clickable { if (!isVerified) onVerifyClick() }
                ) {
                    Text(
                        text = if (isVerified) "✓ Identidad verificada" else "🛡️ Verificar identidad",
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isVerified) BrandForest else BrandCafe
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Action buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = onEditClick,
                    modifier = Modifier.weight(1f).height(44.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BrandCrema)
                ) {
                    Icon(Icons.Default.Edit, null, tint = BrandCafe, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Editar perfil", color = BrandCafe, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }

                Button(
                    onClick = onLogoutClick,
                    modifier = Modifier.weight(1f).height(44.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFEF2F2))
                ) {
                    Icon(Icons.Default.ExitToApp, null, tint = BrandTerracota, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Cerrar sesión", color = BrandTerracota, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }
        }
    }
}

// ═══════════════ STATS ROW ═══════════════
@Composable
private fun StatsRow() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        StatCard("0", "Favoritos", BrandGold, modifier = Modifier.weight(1f))
        StatCard("1", "Visitas", BrandForest, modifier = Modifier.weight(1f))
        StatCard("3", "Mensajes", BrandCafe, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun StatCard(value: String, label: String, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = color)
    ) {
        Column(
            modifier = Modifier.padding(vertical = 14.dp, horizontal = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(value, color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 24.sp)
            Text(label, color = Color.White.copy(0.85f), fontSize = 11.sp, fontWeight = FontWeight.Medium)
        }
    }
}

// ═══════════════ TAB SELECTOR ═══════════════
@Composable
private fun TabSelector(activeTab: String, onTabChange: (String) -> Unit) {
    val tabs = listOf(
        Triple("favoritos", "Favoritos", Icons.Default.FavoriteBorder),
        Triple("visitas", "Visitas", Icons.Default.CalendarMonth),
        Triple("configuracion", "Ajustes", Icons.Default.Settings)
    )
    
    ScrollableTabRow(
        selectedTabIndex = tabs.indexOfFirst { it.first == activeTab },
        modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
        containerColor = Color.Transparent,
        edgePadding = 8.dp,
        divider = { HorizontalDivider(color = BrandCremaDark) }
    ) {
        tabs.forEach { (key, label, icon) ->
            Tab(
                selected = activeTab == key,
                onClick = { onTabChange(key) },
                selectedContentColor = BrandTerracota,
                unselectedContentColor = BrandTextMuted
            ) {
                Row(
                    modifier = Modifier.padding(vertical = 14.dp, horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(icon, null, modifier = Modifier.size(18.dp))
                    Text(
                        label,
                        fontWeight = if (activeTab == key) FontWeight.ExtraBold else FontWeight.Bold,
                        fontSize = 13.sp
                    )
                }
            }
        }
    }
}

// ═══════════════ FAVORITOS TAB ═══════════════
@Composable
private fun FavoritosTab(onExploreClick: () -> Unit) {
    // For now, show empty state since favorites aren't persisted on Android yet
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(2.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    Icons.Default.FavoriteBorder,
                    null,
                    tint = BrandTextMuted.copy(alpha = 0.3f),
                    modifier = Modifier.size(48.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "Aún no tienes favoritos",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 18.sp,
                    color = BrandCafe
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Guarda casas y apartamentos para verlos más tarde.",
                    color = BrandTextMuted,
                    fontSize = 13.sp
                )
                Spacer(modifier = Modifier.height(20.dp))
                Button(
                    onClick = onExploreClick,
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BrandForest)
                ) {
                    Text("Explorar propiedades", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                }
            }
        }
    }
}

// ═══════════════ VISITAS TAB ═══════════════
@Composable
private fun VisitasTab() {
    Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
        // Header
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(2.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    modifier = Modifier.size(44.dp),
                    shape = RoundedCornerShape(14.dp),
                    color = BrandForest.copy(alpha = 0.1f)
                ) {
                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                        Icon(Icons.Default.CalendarMonth, null, tint = BrandForest, modifier = Modifier.size(22.dp))
                    }
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("Citas y Visitas", fontWeight = FontWeight.Black, fontSize = 16.sp, color = BrandCafe)
                    Text("Gestiona tus solicitudes de visita", color = BrandTextMuted, fontSize = 12.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Demo visit card
        val demoProperty = MockDataRepository.properties.first()

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(2.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        demoProperty.title,
                        fontWeight = FontWeight.Black,
                        fontSize = 14.sp,
                        color = BrandCafe,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    Surface(
                        color = Color(0xFFFEF3C7),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Schedule, null, tint = Color(0xFF92400E), modifier = Modifier.size(12.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Pendiente", fontSize = 11.sp, fontWeight = FontWeight.Black, color = Color(0xFF92400E))
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.LocationOn, null, tint = BrandTerracota, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(2.dp))
                        Text("${demoProperty.location.zone}, ${demoProperty.location.city}", fontSize = 12.sp, color = BrandTextSecondary)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CalendarMonth, null, tint = BrandForest, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(2.dp))
                        Text("22 Sep 2026", fontSize = 12.sp, color = BrandForest, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Surface(
                    color = Color(0xFFFAF5EE),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        "\"Me interesa conocer las áreas verdes y el estado de la garita de seguridad.\"",
                        modifier = Modifier.padding(10.dp),
                        fontSize = 12.sp,
                        color = BrandTextSecondary,
                        fontStyle = FontStyle.Italic
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = {},
                        modifier = Modifier.weight(1f).height(40.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366))
                    ) {
                        Icon(Icons.Default.Phone, null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("WhatsApp", fontWeight = FontWeight.ExtraBold, fontSize = 12.sp)
                    }
                    OutlinedButton(
                        onClick = {},
                        modifier = Modifier.weight(1f).height(40.dp),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Cancelar visita", color = BrandTextMuted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

// ═══════════════ CONFIGURACION TAB ═══════════════
@Composable
private fun ConfiguracionTab(
    userName: String,
    userEmail: String,
    userPhone: String,
    userRole: String,
    isVerified: Boolean,
    onChangePassword: () -> Unit,
    onInboxClick: () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // Account Information
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(2.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Person, null, tint = BrandForest, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Información de la cuenta", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = BrandCafe)
                }
                Spacer(modifier = Modifier.height(16.dp))

                InfoRow(icon = Icons.Default.Person, label = "Nombre", value = userName)
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = BrandCremaDark)
                InfoRow(icon = Icons.Default.Email, label = "Correo", value = userEmail)
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = BrandCremaDark)
                InfoRow(icon = Icons.Default.Phone, label = "Teléfono", value = userPhone)
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = BrandCremaDark)
                InfoRow(icon = Icons.Default.Home, label = "Rol", value = userRole)
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = BrandCremaDark)
                InfoRow(
                    icon = Icons.Default.Verified,
                    label = "Estado",
                    value = if (isVerified) "Verificado con DPI" else "Sin verificar"
                )
            }
        }

        // Quick actions
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(2.dp)
        ) {
            Column {
                ProfileMenuItem(
                    icon = Icons.Default.Notifications,
                    title = "Notificaciones y mensajes",
                    subtitle = "Bandeja de entrada",
                    onClick = onInboxClick
                )
                HorizontalDivider(color = BrandCremaDark, thickness = 1.dp)
                ProfileMenuItem(
                    icon = Icons.Default.Lock,
                    title = "Cambiar contraseña",
                    subtitle = "Actualizar credenciales de acceso",
                    onClick = onChangePassword
                )
                HorizontalDivider(color = BrandCremaDark, thickness = 1.dp)
                ProfileMenuItem(
                    icon = Icons.Default.CheckCircle,
                    title = "Verificar cuenta",
                    subtitle = "Sube tus documentos DPI"
                )
                HorizontalDivider(color = BrandCremaDark, thickness = 1.dp)
                ProfileMenuItem(
                    icon = Icons.Default.Settings,
                    title = "Configuración",
                    subtitle = "Preferencias de la app"
                )
            }
        }
    }
}

@Composable
private fun InfoRow(icon: ImageVector, label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, null, tint = BrandForest.copy(alpha = 0.7f), modifier = Modifier.size(18.dp))
        Spacer(modifier = Modifier.width(10.dp))
        Column {
            Text(label, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BrandTextMuted)
            Text(value, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = BrandCafe)
        }
    }
}

@Composable
private fun ProfileMenuItem(icon: ImageVector, title: String, subtitle: String, onClick: () -> Unit = {}) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(shape = RoundedCornerShape(10.dp), color = BrandCremaDark, modifier = Modifier.size(40.dp)) {
            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                Icon(icon, contentDescription = null, tint = BrandForest, modifier = Modifier.size(20.dp))
            }
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(title, color = BrandTextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Text(subtitle, color = BrandTextSecondary, fontSize = 12.sp)
        }
        Icon(Icons.Default.ChevronRight, null, tint = BrandTextMuted, modifier = Modifier.size(20.dp))
    }
}

// ═══════════════ CHANGE PASSWORD DIALOG ═══════════════
@Composable
private fun ChangePasswordDialog(onDismiss: () -> Unit) {
    var currentPw by remember { mutableStateOf("") }
    var newPw by remember { mutableStateOf("") }
    var confirmPw by remember { mutableStateOf("") }
    var showCurrentPw by remember { mutableStateOf(false) }
    var showNewPw by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }
    var isError by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color.White,
        shape = RoundedCornerShape(24.dp),
        title = {
            Text("Cambiar contraseña", fontWeight = FontWeight.ExtraBold, color = BrandCafe)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = currentPw,
                    onValueChange = { currentPw = it },
                    label = { Text("Contraseña actual") },
                    leadingIcon = { Icon(Icons.Default.Lock, null, tint = BrandForest) },
                    trailingIcon = {
                        IconButton(onClick = { showCurrentPw = !showCurrentPw }) {
                            Icon(
                                if (showCurrentPw) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                null,
                                tint = BrandTextMuted
                            )
                        }
                    },
                    visualTransformation = if (showCurrentPw) VisualTransformation.None else PasswordVisualTransformation(),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                OutlinedTextField(
                    value = newPw,
                    onValueChange = { newPw = it },
                    label = { Text("Nueva contraseña") },
                    leadingIcon = { Icon(Icons.Default.Lock, null, tint = BrandForest) },
                    trailingIcon = {
                        IconButton(onClick = { showNewPw = !showNewPw }) {
                            Icon(
                                if (showNewPw) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                null,
                                tint = BrandTextMuted
                            )
                        }
                    },
                    visualTransformation = if (showNewPw) VisualTransformation.None else PasswordVisualTransformation(),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                OutlinedTextField(
                    value = confirmPw,
                    onValueChange = { confirmPw = it },
                    label = { Text("Confirmar nueva contraseña") },
                    leadingIcon = { Icon(Icons.Default.Lock, null, tint = BrandForest) },
                    visualTransformation = PasswordVisualTransformation(),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                // Password strength indicator
                if (newPw.isNotEmpty()) {
                    val checks = listOf(
                        "8+ caracteres" to (newPw.length >= 8),
                        "Mayúscula" to newPw.any { it.isUpperCase() },
                        "Minúscula" to newPw.any { it.isLowerCase() },
                        "Número" to newPw.any { it.isDigit() },
                        "Símbolo" to newPw.any { !it.isLetterOrDigit() }
                    )
                    val score = checks.count { it.second }
                    val strengthColor = when {
                        score <= 2 -> Color(0xFFDC2626)
                        score < 5 -> Color(0xFFD97706)
                        else -> BrandForest
                    }

                    LinearProgressIndicator(
                        progress = { score / 5f },
                        modifier = Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)),
                        color = strengthColor,
                        trackColor = BrandCremaDark
                    )

                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        checks.forEach { (label, met) ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    if (met) Icons.Default.Check else Icons.Default.Close,
                                    null,
                                    tint = if (met) BrandForest else BrandTextMuted,
                                    modifier = Modifier.size(12.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(label, fontSize = 11.sp, color = if (met) BrandForest else BrandTextMuted)
                            }
                        }
                    }
                }

                if (message.isNotBlank()) {
                    Text(message, color = if (isError) BrandTerracota else BrandForest, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    when {
                        currentPw.isBlank() -> { message = "Ingresa tu contraseña actual."; isError = true }
                        newPw.length < 8 -> { message = "La contraseña debe tener al menos 8 caracteres."; isError = true }
                        newPw != confirmPw -> { message = "Las contraseñas no coinciden."; isError = true }
                        else -> {
                            message = "¡Contraseña actualizada correctamente!"
                            isError = false
                        }
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = BrandForest),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text("Actualizar", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar", color = BrandCafe)
            }
        }
    )
}
