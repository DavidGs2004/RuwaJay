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

class MainActivity : ComponentActivity() {
    private var notificationPath by mutableStateOf<String?>(null)
    override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); setIntent(intent); notificationPath = intent.getStringExtra("path") }

    private val notificationPermissionLauncher = registerForActivityResult(
        androidx.activity.result.contract.ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            NotificationRepository.register()
        }
    }

    private fun checkAndRequestNotificationPermission() {
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            if (androidx.core.content.ContextCompat.checkSelfPermission(
                    this,
                    android.Manifest.permission.POST_NOTIFICATIONS
                ) != android.content.pm.PackageManager.PERMISSION_GRANTED
            ) {
                notificationPermissionLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
                return
            }
        }
        NotificationRepository.register()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        notificationPath = intent.getStringExtra("path")
        if (android.os.Build.VERSION.SDK_INT >= 26) {

            RuwaMessagingService.ensureNotificationChannel(this)
        }

        enableEdgeToEdge()

        // Ejecutar inicialización y purga de caché de OSM en segundo plano para no demorar el primer cuadro de la app
        kotlin.concurrent.thread(name = "osm-init") {
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
        }

        setContent {
            RuwaJayTheme {
                val navController = rememberNavController()
                var currentUid by remember { mutableStateOf(FirebaseAuth.getInstance().currentUser?.uid) }
                DisposableEffect(Unit) {
                    val listener=FirebaseAuth.AuthStateListener {auth->
                        currentUid=auth.currentUser?.uid
                        if(currentUid!=null) checkAndRequestNotificationPermission()
                    }
                    FirebaseAuth.getInstance().addAuthStateListener(listener)
                    onDispose {FirebaseAuth.getInstance().removeAuthStateListener(listener)}
                }
                DisposableEffect(currentUid) {
                    val stop = currentUid?.let { uid ->
                        com.example.ruwajay.data.repository.observeForegroundNotifications(applicationContext, uid) {
                            lifecycle.currentState.isAtLeast(androidx.lifecycle.Lifecycle.State.RESUMED)
                        }
                    }
                    onDispose { stop?.invoke() }
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

                androidx.compose.foundation.layout.Box(modifier = Modifier.fillMaxSize()) {
                    Scaffold(
                        // Cada pantalla controla sus propios insets del teclado. Aplicar
                        // imePadding aquí y otra vez en ChatScreen hacía perder el foco.
                        modifier = Modifier.fillMaxSize(),
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

                    // Global Call Overlay (recibe y atiende llamadas desde la web en tiempo real)
                    val activeUser = FirebaseAuth.getInstance().currentUser
                    com.example.ruwajay.ui.components.GlobalCallOverlay(
                        currentUserId = activeUser?.uid,
                        currentUserEmail = activeUser?.email
                    )
                }
            }
        }
    }
}
