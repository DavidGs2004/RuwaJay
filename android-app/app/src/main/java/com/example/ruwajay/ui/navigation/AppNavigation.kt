package com.example.ruwajay.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
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
        composable(Screen.Home.route) {
            HomeScreen(
                onPropertyClick = { id -> navController.navigate(Screen.PropertyDetail.createRoute(id)) },
                onExploreClick = { navController.navigate(Screen.Explore.route) }
            )
        }
        composable(Screen.Explore.route) {
            ExploreScreen(
                onPropertyClick = { id -> navController.navigate(Screen.PropertyDetail.createRoute(id)) }
            )
        }
        composable(
            route = Screen.PropertyDetail.route,
            arguments = listOf(navArgument("id") { type = NavType.StringType })
        ) { backStackEntry ->
            val id = backStackEntry.arguments?.getString("id") ?: ""
            PropertyDetailScreen(
                propertyId = id,
                onNavigateBack = { navController.popBackStack() },
                onChatClick = { navController.navigate(Screen.Inbox.route) },
                onRouteClick = { navController.navigate(Screen.Route.createRoute(id)) }
            )
        }
        composable(
            route = Screen.Chat.route,
            arguments = listOf(navArgument("conversationId") { type = NavType.StringType })
        ) { backStackEntry ->
            val conversationId = backStackEntry.arguments?.getString("conversationId") ?: ""
            ChatScreen(
                conversationId = conversationId,
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable(Screen.Inbox.route) {
            InboxScreen(
                onNavigateBack = { navController.popBackStack() },
                onConversationClick = { id -> navController.navigate(Screen.Chat.createRoute(id)) }
            )
        }
        composable(
            route = Screen.Route.route,
            arguments = listOf(navArgument("id") { type = NavType.StringType })
        ) { backStackEntry ->
            RouteScreen(
                propertyId = backStackEntry.arguments?.getString("id") ?: "",
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable(Screen.Login.route) {
            LoginScreen(onLoginSuccess = {
                navController.navigate(Screen.Profile.route) {
                    popUpTo(Screen.Login.route) { inclusive = true }
                }
            })
        }
        composable(Screen.Profile.route) {
            ProfileScreen(
                onLoginClick = { navController.navigate(Screen.Login.route) },
                onInboxClick = { navController.navigate(Screen.Inbox.route) },
                onExploreClick = { navController.navigate(Screen.Explore.route) },
                onPublishClick = { navController.navigate(Screen.Publish.route) }
            )
        }
        composable(Screen.Publish.route) {
            PublishScreen()
        }
    }
}
