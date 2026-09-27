package com.example.ruwajay.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import androidx.navigation.navDeepLink
import com.google.firebase.auth.FirebaseAuth
import com.example.ruwajay.ui.screens.ChatScreen
import com.example.ruwajay.ui.screens.ExploreScreen
import com.example.ruwajay.ui.screens.HomeScreen
import com.example.ruwajay.ui.screens.LoginScreen
import com.example.ruwajay.ui.screens.ProfileScreen
import com.example.ruwajay.ui.screens.PropertyDetailScreen
import com.example.ruwajay.ui.screens.PublishScreen
import com.example.ruwajay.ui.screens.RouteScreen
import com.example.ruwajay.ui.screens.InboxScreen

@Composable
fun AppNavigation(navController: NavHostController, modifier: Modifier = Modifier) {
    val hasActiveSession = FirebaseAuth.getInstance().currentUser != null

    NavHost(
        navController = navController,
        startDestination = if (hasActiveSession) Screen.Home.route else Screen.Login.route,
        modifier = modifier
    ) {
        composable(
            route = Screen.Home.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "ruwajay://home" },
                navDeepLink { uriPattern = "ruwajay://inicio" },
                navDeepLink { uriPattern = "https://ruwajay.com" },
                navDeepLink { uriPattern = "http://ruwajay.com" }
            )
        ) {
            HomeScreen(
                onPropertyClick = { id -> navController.navigate(Screen.PropertyDetail.createRoute(id)) },
                onExploreClick = { navController.navigate(Screen.Explore.route) }
            )
        }
        composable(
            route = Screen.Explore.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "ruwajay://explore" },
                navDeepLink { uriPattern = "ruwajay://explorar" },
                navDeepLink { uriPattern = "https://ruwajay.com/explorar" },
                navDeepLink { uriPattern = "http://ruwajay.com/explorar" }
            )
        ) {
            ExploreScreen(
                onPropertyClick = { id -> navController.navigate(Screen.PropertyDetail.createRoute(id)) }
            )
        }
        composable(
            route = Screen.PropertyDetail.route,
            arguments = listOf(navArgument("id") { type = NavType.StringType }),
            deepLinks = listOf(
                navDeepLink { uriPattern = "ruwajay://property/{id}" },
                navDeepLink { uriPattern = "ruwajay://propiedad/{id}" },
                navDeepLink { uriPattern = "https://ruwajay.com/propiedad/{id}" },
                navDeepLink { uriPattern = "http://ruwajay.com/propiedad/{id}" }
            )
        ) { backStackEntry ->
            val id = backStackEntry.arguments?.getString("id") ?: ""
            PropertyDetailScreen(
                propertyId = id,
                onNavigateBack = { navController.popBackStack() },
                onChatClick = { conversationId ->
                    if (conversationId.isNotBlank()) {
                        navController.navigate(Screen.Chat.createRoute(conversationId))
                    } else {
                        navController.navigate(Screen.Inbox.route)
                    }
                },
                onRouteClick = { navController.navigate(Screen.Route.createRoute(id)) }
            )
        }
        composable(
            route = Screen.Chat.route,
            arguments = listOf(navArgument("conversationId") { type = NavType.StringType }),
            deepLinks = listOf(
                navDeepLink { uriPattern = "ruwajay://chat/{conversationId}" },
                navDeepLink { uriPattern = "https://ruwajay.com/chat/{conversationId}" }
            )
        ) { backStackEntry ->
            val conversationId = backStackEntry.arguments?.getString("conversationId") ?: ""
            ChatScreen(
                conversationId = conversationId,
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable(
            route = Screen.Inbox.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "ruwajay://inbox" },
                navDeepLink { uriPattern = "ruwajay://chat" },
                navDeepLink { uriPattern = "https://ruwajay.com/chat" }
            )
        ) {
            InboxScreen(
                onNavigateBack = { navController.popBackStack() },
                onConversationClick = { id -> navController.navigate(Screen.Chat.createRoute(id)) }
            )
        }
        composable(
            route = Screen.Route.route,
            arguments = listOf(navArgument("id") { type = NavType.StringType }),
            deepLinks = listOf(
                navDeepLink { uriPattern = "ruwajay://route/{id}" },
                navDeepLink { uriPattern = "ruwajay://ruta/{id}" },
                navDeepLink { uriPattern = "https://ruwajay.com/ruta/{id}" }
            )
        ) { backStackEntry ->
            RouteScreen(
                propertyId = backStackEntry.arguments?.getString("id") ?: "",
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable(
            route = Screen.Login.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "ruwajay://login" },
                navDeepLink { uriPattern = "https://ruwajay.com/login" }
            )
        ) {
            LoginScreen(onLoginSuccess = {
                navController.navigate(Screen.Profile.route) {
                    popUpTo(Screen.Login.route) { inclusive = true }
                }
            })
        }
        composable(
            route = Screen.Profile.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "ruwajay://profile" },
                navDeepLink { uriPattern = "ruwajay://perfil" },
                navDeepLink { uriPattern = "https://ruwajay.com/perfil" }
            )
        ) {
            ProfileScreen(
                onLoginClick = { navController.navigate(Screen.Login.route) },
                onInboxClick = { navController.navigate(Screen.Inbox.route) },
                onExploreClick = { navController.navigate(Screen.Explore.route) },
                onPublishClick = { navController.navigate(Screen.Publish.route) },
                onPropertyClick = { id -> navController.navigate(Screen.PropertyDetail.createRoute(id)) }
            )
        }
        composable(
            route = Screen.Publish.route,
            deepLinks = listOf(
                navDeepLink { uriPattern = "ruwajay://publish" },
                navDeepLink { uriPattern = "ruwajay://publicar" },
                navDeepLink { uriPattern = "https://ruwajay.com/publicar" }
            )
        ) {
            PublishScreen()
        }
    }
}
