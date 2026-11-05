package com.example.ruwajay.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ruwajay.R
import com.example.ruwajay.data.repository.AppNotification
import com.example.ruwajay.data.repository.NotificationRepository
import com.example.ruwajay.data.repository.rememberSystemUpdates
import com.example.ruwajay.ui.theme.*
import com.google.firebase.auth.FirebaseAuth

/**
 * Header oficial de RuwaJay (idéntico al Header.jsx de la web).
 * Totalmente responsive para teléfonos y tablets.
 */
@Composable
fun RuwaHeader(
    onExploreClick: (() -> Unit)? = null,
    onSystemUpdatesClick: (() -> Unit)? = null,
    onNotificationsClick: (() -> Unit)? = null,
    onNavigateByPath: ((String) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val systemUpdates = rememberSystemUpdates(includeInactive = false)
    val hasUrgent = remember(systemUpdates) { systemUpdates.any { it.priority == "urgente" } }

    val uid = FirebaseAuth.getInstance().currentUser?.uid
    var notifications by remember(uid) { mutableStateOf<List<AppNotification>>(emptyList()) }
    var showNotificationsDialog by remember { mutableStateOf(false) }

    DisposableEffect(uid) {
        if (uid == null) {
            notifications = emptyList()
            return@DisposableEffect onDispose {}
        }
        val reg = NotificationRepository.observeNotifications(uid) { list ->
            notifications = list
        }
        onDispose { reg.remove() }
    }

    val unreadNoticesCount = remember(notifications) { notifications.count { !it.isRead } }

    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(900, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseAlpha"
    )

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(BrandSurfaceCard)
    ) {
        // Línea tricolor de marca idéntica a la web (forest - dorado - terracota)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(3.dp)
                .background(BrandGradientAccent)
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // Logotipo + Marca + Lema
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f, fill = false)
            ) {
                Image(
                    painter = painterResource(id = R.drawable.ic_logo),
                    contentDescription = "RuwaJay Logo",
                    modifier = Modifier
                        .size(42.dp)
                        .clip(CircleShape)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "Ruwa",
                            color = BrandForest,
                            fontWeight = FontWeight.Black,
                            fontSize = 21.sp,
                            letterSpacing = (-0.5).sp
                        )
                        Text(
                            text = "Jay",
                            color = BrandTerracota,
                            fontWeight = FontWeight.Black,
                            fontSize = 21.sp,
                            letterSpacing = (-0.5).sp
                        )
                    }
                    Text(
                        text = "TU HOGAR, TU CAMINO",
                        color = BrandGold,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 9.sp,
                        letterSpacing = 1.2.sp
                    )
                }
            }

            // Acciones: Buscador, Avisos, Novedades
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (onExploreClick != null) {
                    IconButton(
                        onClick = onExploreClick,
                        modifier = Modifier
                            .size(38.dp)
                            .clip(CircleShape)
                            .background(BrandForest.copy(alpha = 0.08f))
                    ) {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = "Buscar viviendas",
                            tint = BrandForest,
                            modifier = Modifier.size(19.dp)
                        )
                    }
                }

                // Botón Centro de Avisos (Campana con badge y modal idéntico a la web)
                if (uid != null) {
                    Box {
                        IconButton(
                            onClick = {
                                if (onNotificationsClick != null) onNotificationsClick()
                                else showNotificationsDialog = true
                            },
                            modifier = Modifier
                                .size(38.dp)
                                .clip(CircleShape)
                                .background(BrandForest.copy(alpha = 0.08f))
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Notifications,
                                contentDescription = "Avisos y notificaciones",
                                tint = BrandForest,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        if (unreadNoticesCount > 0) {
                            Box(
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .offset(x = 4.dp, y = (-2).dp)
                                    .clip(CircleShape)
                                    .background(BrandTerracota)
                                    .padding(horizontal = 4.dp, vertical = 1.dp)
                            ) {
                                Text(
                                    text = if (unreadNoticesCount > 99) "99+" else unreadNoticesCount.toString(),
                                    color = Color.White,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Black
                                )
                            }
                        }
                    }
                }

                // Botón Novedades / Comunicados oficiales (Megáfono con badge)
                if (onSystemUpdatesClick != null) {
                    Box {
                        IconButton(
                            onClick = onSystemUpdatesClick,
                            modifier = Modifier
                                .size(38.dp)
                                .clip(CircleShape)
                                .background(
                                    if (hasUrgent) BrandTerracota.copy(alpha = 0.12f)
                                    else BrandForest.copy(alpha = 0.08f)
                                )
                        ) {
                            Icon(
                                imageVector = Icons.Default.Campaign,
                                contentDescription = "Novedades del sistema",
                                tint = if (hasUrgent) BrandTerracota else BrandForest,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        if (systemUpdates.isNotEmpty()) {
                            Box(
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .offset(x = 2.dp, y = (-2).dp)
                                    .size(10.dp)
                                    .clip(CircleShape)
                                    .background(
                                        if (hasUrgent) BrandTerracota.copy(alpha = pulseAlpha)
                                        else BrandGold
                                    )
                            )
                        }
                    }
                }
            }
        }

        // Borde inferior sutil
        HorizontalDivider(
            color = BrandBorder.copy(alpha = 0.5f),
            thickness = 1.dp
        )
    }

    // Modal de Centro de Avisos
    if (showNotificationsDialog) {
        NotificationCenterDialog(
            notifications = notifications,
            onDismiss = { showNotificationsDialog = false },
            onNotificationClick = { item ->
                showNotificationsDialog = false
                if (uid != null) NotificationRepository.markAsRead(uid, item.id)
                if (onNavigateByPath != null) onNavigateByPath(item.path)
            },
            onMarkAllAsRead = {
                if (uid != null) {
                    val unreadIds = notifications.filter { !it.isRead }.map { it.id }
                    NotificationRepository.markAllAsRead(uid, unreadIds)
                }
            }
        )
    }
}
