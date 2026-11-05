package com.example.ruwajay.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Message
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
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
import androidx.navigation.NavGraph.Companion.findStartDestination
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
 * Barra de navegación inferior oficial de RuwaJay (idéntica a MobileNav.jsx de la web):
 * Pestañas: Inicio, Mapa, Mensajes, Perfil.
 * Botón central "+" para publicar: Oculto por defecto, visible únicamente para propietarios/administradores activos.
 */
@Composable
fun BottomNavBar(
    navController: NavController,
    unreadCount: Int = 0,
    onMapClick: (() -> Unit)? = null,
    onFavoritesClick: (() -> Unit)? = null,
    showPublishButton: Boolean = false,
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

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(BrandSurfaceElevated)
            .navigationBarsPadding()
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
                .height(68.dp)
                .padding(horizontal = 4.dp, vertical = 2.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceAround
        ) {
            items.forEachIndexed { index, item ->
                if (index == 2 && showPublishButton) {
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        FilledIconButton(
                            onClick = onPublishClick,
                            modifier = Modifier.size(42.dp),
                            shape = CircleShape,
                            colors = IconButtonDefaults.filledIconButtonColors(containerColor = BrandTerracota)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Publicar vivienda", tint = Color.White, modifier = Modifier.size(26.dp))
                        }
                        Spacer(modifier = Modifier.height(2.dp))
                        Text("Publicar", color = BrandTerracota, fontSize = 10.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                    }
                }

                val selected = when (item.route) {
                    Screen.Home.route -> currentRoute == Screen.Home.route
                    Screen.Explore.route -> currentRoute == Screen.Explore.route
                    Screen.Inbox.route -> currentRoute == Screen.Inbox.route || currentRoute?.startsWith("chat/") == true
                    Screen.Profile.route -> currentRoute?.startsWith(Screen.Profile.route) == true || currentRoute == Screen.Verification.route
                    else -> currentRoute == item.route
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
                            if (!selected) {
                                if (item.isMapTab && onMapClick != null) {
                                    onMapClick()
                                } else {
                                    navController.navigate(item.route) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }
                            }
                        }
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .width(52.dp)
                            .height(32.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .width(46.dp)
                                .height(30.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(if (selected) BrandForest.copy(alpha = 0.12f) else Color.Transparent)
                        )

                        Icon(
                            imageVector = item.icon,
                            contentDescription = item.label,
                            tint = if (selected) BrandForest else BrandTextMuted,
                            modifier = Modifier.size(22.dp)
                        )

                        if (item.route == Screen.Inbox.route && unreadCount > 0) {
                            Box(
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .offset(x = 2.dp, y = (-2).dp)
                                    .size(17.dp)
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
