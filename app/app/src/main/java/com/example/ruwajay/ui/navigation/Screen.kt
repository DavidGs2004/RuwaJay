package com.example.ruwajay.ui.navigation

sealed class Screen(val route: String) {
    object Home : Screen("home")
    object Explore : Screen("explore")
    object SavedSearch : Screen("saved_search/{id}") {fun createRoute(id:String)="saved_search/$id"}
    object Profile : Screen("profile")
    object Verification : Screen("verification")
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
    object EditProperty : Screen("edit_property/{id}") { fun createRoute(id: String) = "edit_property/$id" }
    object Publish : Screen("publish")
}
