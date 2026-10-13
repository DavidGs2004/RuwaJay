package com.example.ruwajay.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import androidx.navigation.compose.currentBackStackEntryAsState
import com.example.ruwajay.ui.navigation.Screen
import com.example.ruwajay.ui.theme.BrandForest
import com.example.ruwajay.ui.theme.BrandGradientAccent
import com.example.ruwajay.ui.theme.BrandSurfaceElevated
import com.example.ruwajay.ui.theme.BrandTextMuted
import com.example.ruwajay.ui.theme.BrandTextPrimary

data class NavItem(
    val label: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
    val screen: Screen
)

@Composable
fun BottomNavBar(navController: NavController) {
    val items = listOf(
        NavItem("Inicio", Icons.Default.Home, Screen.Home),
        NavItem("Explorar", Icons.Default.Explore, Screen.Explore),
        NavItem("Publicar", Icons.Default.Add, Screen.Publish),
        NavItem("Chat", Icons.Default.Chat, Screen.Chat),
        NavItem("Perfil", Icons.Default.Person, Screen.Profile),
    )

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    Column(modifier = Modifier.fillMaxWidth().background(BrandSurfaceElevated)) {
        // Línea superior con gradiente de marca idéntica a la web MobileNav.jsx
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(3.dp)
                .background(BrandGradientAccent)
        )

        NavigationBar(
            containerColor = BrandSurfaceElevated,
            tonalElevation = 0.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            items.forEach { item ->
                val selected = currentRoute == item.screen.route
                NavigationBarItem(
                    selected = selected,
                    onClick = {
                        navController.navigate(item.screen.route) {
                            popUpTo(Screen.Home.route) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    icon = {
                        Icon(
                            imageVector = item.icon,
                            contentDescription = item.label
                        )
                    },
                    label = {
                        Text(
                            text = item.label,
                            fontSize = 11.sp,
                            fontWeight = if (selected) FontWeight.ExtraBold else FontWeight.Medium
                        )
                    },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = BrandForest,
                        selectedTextColor = BrandForest,
                        unselectedIconColor = BrandTextMuted,
                        unselectedTextColor = BrandTextMuted,
                        indicatorColor = BrandForest.copy(alpha = 0.12f)
                    )
                )
            }
        }
    }
}
