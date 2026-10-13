package com.example.ruwajay

import android.content.Context
import android.os.Bundle
import android.content.Intent
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import com.example.ruwajay.data.repository.NotificationRepository
import com.google.firebase.auth.FirebaseAuth
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
    private var notificationPath by mutableStateOf<String?>(null)
    override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); setIntent(intent); notificationPath = intent.getStringExtra("path") }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        notificationPath = intent.getStringExtra("path")
        if (android.os.Build.VERSION.SDK_INT >= 26) {
            val manager = getSystemService(NOTIFICATION_SERVICE) as android.app.NotificationManager
            manager.createNotificationChannel(android.app.NotificationChannel("ruwajay_messages","Mensajes y visitas",android.app.NotificationManager.IMPORTANCE_DEFAULT))
        }
        if (android.os.Build.VERSION.SDK_INT < 33 || androidx.core.content.ContextCompat.checkSelfPermission(this,android.Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED) NotificationRepository.register()

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
                var currentUid by remember { mutableStateOf(FirebaseAuth.getInstance().currentUser?.uid) }
                DisposableEffect(Unit) {
                    val listener=FirebaseAuth.AuthStateListener {auth->
                        currentUid=auth.currentUser?.uid
                        if(currentUid!=null && (android.os.Build.VERSION.SDK_INT<33 || androidx.core.content.ContextCompat.checkSelfPermission(this@MainActivity,android.Manifest.permission.POST_NOTIFICATIONS)==android.content.pm.PackageManager.PERMISSION_GRANTED)) NotificationRepository.register()
                    }
                    FirebaseAuth.getInstance().addAuthStateListener(listener)
                    onDispose {FirebaseAuth.getInstance().removeAuthStateListener(listener)}
                }
                LaunchedEffect(notificationPath,currentUid) {
                    val path=notificationPath ?: return@LaunchedEffect
                    if (FirebaseAuth.getInstance().currentUser == null) { navController.navigate(Screen.Login.route); return@LaunchedEffect }
                    val uri=android.net.Uri.parse(path)
                    val conversation=uri.getQueryParameter("conversation")
                    if(conversation!=null && !conversation.contains('/')) navController.navigate(Screen.Chat.createRoute(conversation))
                    else if(path.startsWith("/propiedad/")) navController.navigate(Screen.PropertyDetail.createRoute(path.removePrefix("/propiedad/")))
                    else navController.navigate(Screen.Profile.route)
                    notificationPath=null
                }
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
