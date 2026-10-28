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
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.Timestamp
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
import com.example.ruwajay.data.repository.CallRequestBus

class MainActivity : ComponentActivity() {
    private var notificationPath by mutableStateOf<String?>(null)
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val path = intent.getStringExtra("path") ?: intent.getStringExtra("conversationId")?.let { "/chat?conversation=$it" }
        notificationPath = path

        val incomingCallId = intent.getStringExtra("callId")
        if (!incomingCallId.isNullOrBlank()) {
            CallRequestBus.notifyIncomingPush(incomingCallId)
            RuwaNotifications.cancel(this, "call_$incomingCallId")
        }
    }

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
        val initialPath = intent.getStringExtra("path") ?: intent.getStringExtra("conversationId")?.let { "/chat?conversation=$it" }
        notificationPath = initialPath

        val incomingCallId = intent.getStringExtra("callId")
        if (!incomingCallId.isNullOrBlank()) {
            CallRequestBus.notifyIncomingPush(incomingCallId)
            RuwaNotifications.cancel(this, "call_$incomingCallId")
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O_MR1) {
                setShowWhenLocked(true)
                setTurnScreenOn(true)
            }
        }

        if (android.os.Build.VERSION.SDK_INT >= 26) {
            RuwaMessagingService.ensureNotificationChannel(this)
        }

        enableEdgeToEdge()
        checkAndRequestNotificationPermission()

        // Inicialización ligera de OSM en segundo plano sin purgas de disco bloqueantes
        kotlin.concurrent.thread(name = "osm-init") {
            try {
                Configuration.getInstance().apply {
                    load(applicationContext, applicationContext.getSharedPreferences("osmdroid", Context.MODE_PRIVATE))
                    userAgentValue = "RuwaJay-GT-App/3.0 (info@ruwajay.com)"
                    
                    val basePath = File(filesDir, "osmdroid")
                    basePath.mkdirs()
                    osmdroidBasePath = basePath
                    
                    val tileCache = File(cacheDir, "osmdroid_tiles_v4")
                    tileCache.mkdirs()
                    osmdroidTileCache = tileCache
                    cacheMapTileCount = 150.toShort()
                    cacheMapTileOvershoot = 30.toShort()
                }
            } catch (_: Exception) {}
        }

        setContent {
            RuwaJayTheme {
                val navController = rememberNavController()
                var currentUid by remember { mutableStateOf(FirebaseAuth.getInstance().currentUser?.uid) }
                var unreadMessagesCount by remember { mutableStateOf(0) }
                var canStartPublishing by remember(currentUid) { mutableStateOf(false) }

                DisposableEffect(currentUid) {
                    val uid = currentUid ?: return@DisposableEffect onDispose {}
                    val listener = FirebaseFirestore.getInstance().collection("users").document(uid)
                        .addSnapshotListener { snapshot, error ->
                            val status = snapshot?.getString("accountStatus") ?: snapshot?.getString("status") ?: "active"
                            canStartPublishing = error == null && snapshot?.exists() == true && status == "active" && snapshot.getBoolean("suspended") != true
                        }
                    onDispose { listener.remove() }
                }

                DisposableEffect(Unit) {
                    val listener = FirebaseAuth.AuthStateListener { auth ->
                        currentUid = auth.currentUser?.uid
                        if (currentUid != null) checkAndRequestNotificationPermission()
                    }
                    FirebaseAuth.getInstance().addAuthStateListener(listener)
                    onDispose { FirebaseAuth.getInstance().removeAuthStateListener(listener) }
                }

                // Contador de mensajes no leídos para el badge en la barra inferior
                DisposableEffect(currentUid) {
                    val uid = currentUid
                    if (uid == null) {
                        unreadMessagesCount = 0
                        return@DisposableEffect onDispose {}
                    }
                    val listener = FirebaseFirestore.getInstance()
                        .collection("conversations")
                        .whereArrayContains("participants", uid)
                        .addSnapshotListener { snapshot, error ->
                            if (error != null || snapshot == null) return@addSnapshotListener
                            val totalUnread = snapshot.documents.sumOf { doc ->
                                if (doc.getString("migratedTo") != null || doc.getBoolean("archived") == true) return@sumOf 0
                                val lastSenderId = doc.getString("lastSenderId")
                                val lastMessageTimestamp = doc.getTimestamp("lastMessageTimestamp")?.toDate()?.time ?: 0L
                                val readAtMap = doc.get("readAt") as? Map<*, *>
                                val readAtTime = (readAtMap?.get(uid) as? Timestamp)?.toDate()?.time ?: 0L

                                val isFromOther = lastSenderId != null && lastSenderId != uid
                                val isTimestampUnread = isFromOther && lastMessageTimestamp > readAtTime

                                val unreadMap = doc.get("unreadCount") as? Map<*, *>
                                val countInMap = (unreadMap?.get(uid) as? Number)?.toInt()
                                val unreadCountsMap = doc.get("unreadCounts") as? Map<*, *>
                                val countInCountsMap = (unreadCountsMap?.get(uid) as? Number)?.toInt()
                                val directCount = (doc.get("unreadCount") as? Number)?.toInt()

                                val rawCount = countInMap ?: countInCountsMap ?: directCount ?: 0
                                if (rawCount > 0) rawCount else if (isTimestampUnread) 1 else 0
                            }
                            unreadMessagesCount = totalUnread
                        }
                    onDispose { listener.remove() }
                }

                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route
                val activeConversationId = if (currentRoute?.startsWith("chat/") == true) {
                    navBackStackEntry?.arguments?.getString("conversationId")
                } else null

                // Notificaciones con sonido cuando llega un mensaje y el usuario no está en ese chat o salió de la app
                DisposableEffect(currentUid, activeConversationId) {
                    val stop = currentUid?.let { uid ->
                        com.example.ruwajay.data.repository.observeForegroundNotifications(applicationContext, uid) { roomId ->
                            lifecycle.currentState.isAtLeast(androidx.lifecycle.Lifecycle.State.RESUMED) && activeConversationId == roomId
                        }
                    }
                    onDispose { stop?.invoke() }
                }

                LaunchedEffect(notificationPath, currentUid) {
                    val path = notificationPath ?: return@LaunchedEffect
                    if (FirebaseAuth.getInstance().currentUser == null) {
                        navController.navigate(Screen.Login.route)
                        return@LaunchedEffect
                    }
                    val uri = android.net.Uri.parse(path)
                    val conversation = uri.getQueryParameter("conversation")
                        ?: if (path.startsWith("/chat/")) path.removePrefix("/chat/")
                        else if (path.startsWith("chat/")) path.removePrefix("chat/")
                        else null

                    if (!conversation.isNullOrBlank() && !conversation.contains('/')) {
                        navController.navigate(Screen.Chat.createRoute(conversation)) {
                            popUpTo(Screen.Home.route) { saveState = false }
                            launchSingleTop = true
                        }
                    } else if (path.startsWith("/propiedad/") && !uri.lastPathSegment.isNullOrBlank()) {
                        navController.navigate(Screen.PropertyDetail.createRoute(android.net.Uri.encode(uri.lastPathSegment))) {
                            launchSingleTop = true
                        }
                    } else if (path == "/inbox" || path == "/mensajes") {
                        navController.navigate(Screen.Inbox.route) {
                            launchSingleTop = true
                        }
                    } else {
                        navController.navigate(Screen.Profile.createRoute(uri.getQueryParameter("tab") ?: "avisos")) {
                            launchSingleTop = true
                        }
                    }
                    notificationPath = null
                }

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
                        modifier = Modifier.fillMaxSize().imePadding(),
                        bottomBar = {
                            if (showBottomNav) {
                                BottomNavBar(
                                    navController = navController,
                                    unreadCount = unreadMessagesCount,
                                    showPublishButton = canStartPublishing
                                )
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
