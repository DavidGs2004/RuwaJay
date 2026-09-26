package com.example.ruwajay.ui.navigation

sealed class Screen(val route: String) {
    object Home : Screen("home")
    object Explore : Screen("explore")
    object Profile : Screen("profile")
    object PropertyDetail : Screen("property_detail/{id}") {
        fun createRoute(id: String) = "property_detail/$id"
    }
    object Route : Screen("route/{id}") {
        fun createRoute(id: String) = "route/$id"
    }
    object Chat : Screen("chat/{conversationId}") {
        fun createRoute(conversationId: String) = "chat/$conversationId"
    }
    object Inbox : Screen("inbox")
    object Login : Screen("login")
    object Publish : Screen("publish")
}
