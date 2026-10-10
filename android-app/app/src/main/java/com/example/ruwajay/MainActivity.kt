package com.example.ruwajay

import android.content.Context
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
import org.osmdroid.config.Configuration
import java.io.File

import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.imePadding

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Limpiar caché de disco para purgar cualquier imagen de error 403 guardada previamente
        try {
            val osmCacheDir = File(cacheDir, "osmdroid")
            if (osmCacheDir.exists()) {
                osmCacheDir.deleteRecursively()
            }
            val osmFilesDir = File(filesDir, "osmdroid")
            if (osmFilesDir.exists()) {
                osmFilesDir.deleteRecursively()
            }
        } catch (_: Exception) {}

        // Configurar User-Agent autorizado y nueva carpeta de caché
        Configuration.getInstance().apply {
            load(applicationContext, applicationContext.getSharedPreferences("osmdroid", Context.MODE_PRIVATE))
            userAgentValue = "RuwaJay-GT-App/3.0 (info@ruwajay.com)"
            
            val basePath = File(filesDir, "osmdroid")
            basePath.mkdirs()
            osmdroidBasePath = basePath
            
            val tileCache = File(cacheDir, "osmdroid_tiles_v4")
            tileCache.mkdirs()
            osmdroidTileCache = tileCache
        }

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
                    modifier = Modifier.fillMaxSize().imePadding(),
                    bottomBar = {
                        if (showBottomNav) {
                            BottomNavBar(navController = navController)
                        }
                    }
                ) { innerPadding ->
                    AppNavigation(
                        navController = navController,
                        modifier = Modifier.padding(innerPadding).consumeWindowInsets(innerPadding)
                    )
                }
            }
        }
    }
}
