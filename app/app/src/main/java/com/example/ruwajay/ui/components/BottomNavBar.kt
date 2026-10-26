package com.example.ruwajay.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Message
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import androidx.navigation.compose.currentBackStackEntryAsState
import com.example.ruwajay.ui.navigation.Screen
import com.example.ruwajay.ui.theme.*

data class RuwaNavItem(
    val label: String,
    val icon: ImageVector,
    val route: String,
    val isMapTab: Boolean = false
)

/**
 * Barra de navegación inferior idéntica a MobileNav.jsx de la web:
 * Pestañas: Inicio, Mapa, Mensajes, Perfil.
 * Indicador activo: píldora de gradiente terracota-naranja inferior debajo del texto y cambio inmediato de color.
 */
@Composable
fun BottomNavBar(
    navController: NavController,
    unreadCount: Int = 0,
    onMapClick: (() -> Unit)? = null,
    onFavoritesClick: (() -> Unit)? = null,
    showPublishButton: Boolean = true,
    onPublishClick: () -> Unit = { navController.navigate(Screen.Publish.route) { launchSingleTop = true } }
) {
    val items = remember {
        listOf(
            RuwaNavItem("Inicio", Icons.Default.Home, Screen.Home.route),
            RuwaNavItem("Mapa", Icons.Default.Map, Screen.Explore.route, isMapTab = true),
            RuwaNavItem("Mensajes", Icons.Default.Message, Screen.Inbox.route),
            RuwaNavItem("Perfil", Icons.Default.Person, Screen.Profile.route)
        )
    }

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    // Estado reactivo inmediato para feedback instantáneo al tocar cualquier opción
    var optimisticRoute by remember(currentRoute) { mutableStateOf<String?>(currentRoute) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(BrandSurfaceElevated)
    ) {
        // Línea superior con gradiente tricolor de marca (idéntica a MobileNav.jsx)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(3.dp)
                .background(BrandGradientAccent)
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .height(60.dp)
                .padding(horizontal = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceAround
        ) {
            val activeRoute = optimisticRoute ?: currentRoute

            items.forEachIndexed { index, item ->
                if (index == 2 && showPublishButton) {
                    Column(
                        modifier = Modifier.weight(1f),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        FilledIconButton(
                            onClick = onPublishClick,
                            modifier = Modifier.size(48.dp),
                            shape = CircleShape,
                            colors = IconButtonDefaults.filledIconButtonColors(containerColor = BrandTerracota)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Publicar vivienda", tint = Color.White, modifier = Modifier.size(30.dp))
                        }
                        Text("Publicar", color = BrandTerracota, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }
                val selected = when (item.route) {
                    Screen.Home.route -> activeRoute == Screen.Home.route
                    Screen.Explore.route -> activeRoute == Screen.Explore.route
                    Screen.Inbox.route -> activeRoute == Screen.Inbox.route || activeRoute?.startsWith("chat/") == true
                    Screen.Profile.route -> activeRoute == Screen.Profile.route || activeRoute == Screen.Verification.route
                    else -> activeRoute == item.route
                }

                val interactionSource = remember { MutableInteractionSource() }

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clickable(
                            interactionSource = interactionSource,
                            indication = androidx.compose.material3.ripple(
                                bounded = false,
                                radius = 28.dp,
                                color = BrandForest
                            )
                        ) {
                            optimisticRoute = item.route
                            when {
                                item.isMapTab -> {
                                    if (onMapClick != null) {
                                        onMapClick()
                                    } else {
                                        navController.navigate(Screen.Explore.route) {
                                            popUpTo(Screen.Home.route) { saveState = true }
                                            launchSingleTop = true
                                            restoreState = true
                                        }
                                    }
                                }
                                else -> {
                                    if (currentRoute != item.route) {
                                        navController.navigate(item.route) {
                                            popUpTo(Screen.Home.route) { saveState = true }
                                            launchSingleTop = true
                                            restoreState = true
                                        }
                                    }
                                }
                            }
                        }
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .width(48.dp)
                            .height(30.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (selected) BrandForest.copy(alpha = 0.12f) else Color.Transparent)
                    ) {
                        Icon(
                            imageVector = item.icon,
                            contentDescription = item.label,
                            tint = if (selected) BrandForest else BrandTextMuted,
                            modifier = Modifier.size(22.dp)
                        )

                        // Badge de mensajes no leídos
                        if (item.route == Screen.Inbox.route && unreadCount > 0) {
                            Box(
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .offset(x = 6.dp, y = (-2).dp)
                                    .size(16.dp)
                                    .clip(CircleShape)
                                    .background(BrandTerracota),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = if (unreadCount > 99) "99+" else unreadCount.toString(),
                                    color = Color.White,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Black
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(2.dp))

                    Text(
                        text = item.label,
                        fontSize = 11.sp,
                        fontWeight = if (selected) FontWeight.ExtraBold else FontWeight.SemiBold,
                        color = if (selected) BrandForest else BrandTextMuted,
                        maxLines = 1
                    )

                    Spacer(modifier = Modifier.height(2.dp))

                    // Indicador inferior activo con gradiente terracota a naranja
                    Box(
                        modifier = Modifier
                            .width(26.dp)
                            .height(3.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(
                                if (selected) BrandGradientIndicator else androidx.compose.ui.graphics.Brush.horizontalGradient(
                                    listOf(Color.Transparent, Color.Transparent)
                                )
                            )
                    )
                }
            }
        }
    }
}
