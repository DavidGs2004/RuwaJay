package com.example.ruwajay

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.ruwajay.ui.components.BottomNavBar
import com.example.ruwajay.ui.navigation.AppNavigation
import com.example.ruwajay.ui.navigation.Screen
import com.example.ruwajay.ui.theme.RuwaJayTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            RuwaJayTheme {
                val navController = rememberNavController()
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route

                // Rutas donde NO mostramos la barra inferior
                val hiddenNavRoutes = listOf(
                    Screen.PropertyDetail.route,
                    Screen.Login.route,
                    Screen.Chat.route,
                    Screen.Route.route
                )
                val showBottomNav = hiddenNavRoutes.none { currentRoute?.startsWith(it.split("/")[0]) == true }

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    bottomBar = {
                        if (showBottomNav) {
                            BottomNavBar(navController = navController)
                        }
                    }
                ) { innerPadding ->
                    AppNavigation(
                        navController = navController,
                        modifier = Modifier.padding(innerPadding)
                    )
                }
            }
        }
    }
}