package com.example.ruwajay.ui.components

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import androidx.navigation.compose.currentBackStackEntryAsState
import com.example.ruwajay.ui.navigation.Screen
import com.example.ruwajay.ui.theme.BrandCafe
import com.example.ruwajay.ui.theme.BrandCrema
import com.example.ruwajay.ui.theme.BrandForest
import com.example.ruwajay.ui.theme.BrandGoldMuted

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

    NavigationBar(
        containerColor = BrandCafe,
        tonalElevation = androidx.compose.ui.unit.Dp(0f)
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
                        fontSize = 10.sp,
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = BrandGoldMuted,
                    selectedTextColor = BrandGoldMuted,
                    unselectedIconColor = BrandCrema.copy(alpha = 0.6f),
                    unselectedTextColor = BrandCrema.copy(alpha = 0.6f),
                    indicatorColor = BrandForest
                )
            )
        }
    }
}
