package com.example.ruwajay.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ruwajay.data.model.SystemUpdate
import com.example.ruwajay.data.repository.rememberProperties
import com.example.ruwajay.data.repository.updatePropertyStatus
import com.example.ruwajay.data.repository.deleteProperty
import com.example.ruwajay.data.repository.updateUserRole
import com.example.ruwajay.data.repository.toggleUserSuspension
import com.example.ruwajay.data.repository.rememberSystemUpdates
import com.example.ruwajay.data.repository.publishSystemUpdate
import com.example.ruwajay.data.repository.toggleSystemUpdateStatus
import com.example.ruwajay.data.repository.deleteSystemUpdate
import com.example.ruwajay.ui.components.PropertyCard
import com.example.ruwajay.ui.theme.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun ProfileScreen(
    onLoginClick: () -> Unit = {},
    onInboxClick: () -> Unit = {},
    onExploreClick: () -> Unit = {},
    onPublishClick: () -> Unit = {},
    onPropertyClick: (String) -> Unit = {}
) {
    val auth = FirebaseAuth.getInstance()
    val firestore = FirebaseFirestore.getInstance()
    
    // Real user state from Firebase
    var currentUser by remember { mutableStateOf(auth.currentUser) }
    var userData by remember { mutableStateOf<Map<String, Any>?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var favoriteIds by remember { mutableStateOf<List<String>>(emptyList()) }
    var chatsCount by remember { mutableStateOf(0) }

    // Listen for Auth changes (Login/Logout)
    DisposableEffect(Unit) {
        val authListener = FirebaseAuth.AuthStateListener { firebaseAuth ->
            currentUser = firebaseAuth.currentUser
            if (firebaseAuth.currentUser == null) {
                userData = null
                favoriteIds = emptyList()
                chatsCount = 0
                isLoading = false
            }
        }
        auth.addAuthStateListener(authListener)
        onDispose { auth.removeAuthStateListener(authListener) }
    }

    // Real-time listener for user profile data in Firestore
    DisposableEffect(currentUser?.uid) {
        var listener: ListenerRegistration? = null
        var favListener: ListenerRegistration? = null
        var chatListener: ListenerRegistration? = null

        if (currentUser != null) {
            isLoading = true
            val uid = currentUser!!.uid
            
            listener = firestore.collection("users").document(uid)
                .addSnapshotListener { snapshot, error ->
                    isLoading = false
                    if (error == null && snapshot != null) {
                        userData = snapshot.data
                    }
                }

            favListener = firestore.collection("users").document(uid)
                .collection("favorites")
                .addSnapshotListener { snapshot, _ ->
                    if (snapshot != null) {