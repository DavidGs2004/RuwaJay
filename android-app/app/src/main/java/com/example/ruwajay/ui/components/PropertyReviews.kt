package com.example.ruwajay.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ruwajay.data.model.Review
import com.example.ruwajay.data.repository.MockDataRepository
import com.example.ruwajay.ui.theme.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.Timestamp
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun PropertyReviews(propertyId: String, propertyTitle: String) {
    var firestoreReviews by remember { mutableStateOf<List<Review>>(emptyList()) }
    var showAddModal by remember { mutableStateOf(false) }
    var successMessage by remember { mutableStateOf("") }
    val firestore = remember { FirebaseFirestore.getInstance() }
    val auth = remember { FirebaseAuth.getInstance() }

    DisposableEffect(propertyId) {
        val listener = firestore.collection("properties")
            .document(propertyId)
            .collection("reviews")
            .addSnapshotListener { snapshot, error ->
                if (error == null && snapshot != null) {
                    val loaded = snapshot.documents.mapNotNull { doc ->
                        try {
                            val ts = doc.get("createdAt") as? Timestamp
                            val dateStr = ts?.let {
                                SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(it.toDate())
                            } ?: "Reciente"

                            Review(
                                id = doc.id,
                                propertyId = propertyId,
                                userName = doc.getString("userName") ?: "Inquilino",
                                rating = (doc.get("rating") as? Number)?.toDouble() ?: 5.0,
                                date = dateStr,
                                verifiedTenant = doc.getBoolean("verifiedTenant") ?: true,
                                comment = doc.getString("comment") ?: "",
                                tags = (doc.get("tags") as? List<*>)?.filterIsInstance<String>() ?: emptyList(),
                                isNew = false
                            )
                        } catch (_: Exception) { null }
                    }
                    firestoreReviews = loaded
                }
            }
        onDispose { listener.remove() }
    }

    val displayReviews = remember(firestoreReviews) {
        if (firestoreReviews.isNotEmpty()) firestoreReviews
        else MockDataRepository.reviews.filter { it.propertyId == propertyId }
    }
    
    val stats = remember(displayReviews) {
        if (displayReviews.isEmpty()) return@remember Pair(5.0, 0)
        val avg = displayReviews.map { it.rating }.average()
        Pair(avg, displayReviews.size)
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 16.dp)
            .background(Color.White, RoundedCornerShape(24.dp))
            .padding(20.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    modifier = Modifier.size(40.dp),
                    shape = RoundedCornerShape(12.dp),
                    color = BrandGold.copy(alpha = 0.15f)
                ) {
                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                        Icon(Icons.Default.Star, null, tint = BrandGold, modifier = Modifier.size(20.dp))
                    }
                }
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text("Opiniones y Reseñas", fontWeight = FontWeight.Black, fontSize = 18.sp, color = BrandCafe)
                    Text("Experiencias de inquilinos", color = BrandTextMuted, fontSize = 12.sp)
                }
            }

            IconButton(
                onClick = { showAddModal = !showAddModal },
                modifier = Modifier
                    .background(BrandForest, CircleShape)
                    .size(36.dp)
            ) {
                Icon(if (showAddModal) Icons.Default.Close else Icons.Default.Add, null, tint = Color.White, modifier = Modifier.size(18.dp))
            }
        }

        AnimatedVisibility(visible = successMessage.isNotEmpty()) {
            Surface(
                color = BrandJade.copy(alpha = 0.1f),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp)
            ) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CheckCircle, null, tint = BrandJade, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(successMessage, color = BrandJade, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Summary Score
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp)
                .background(Color(0xFFFAF5EE).copy(alpha = 0.7f), RoundedCornerShape(16.dp))
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    String.format("%.1f", stats.first),
                    fontWeight = FontWeight.Black,
                    fontSize = 32.sp,
                    color = BrandCafe
                )
                Row {
                    (1..5).forEach { star ->
                        Icon(
                            Icons.Default.Star,
                            null,
                            tint = if (star <= Math.round(stats.first)) BrandGold else BrandCremaDark,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }
                Text("Basado en ${stats.second} opiniones", color = BrandTextMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            }

            Spacer(modifier = Modifier.width(16.dp))

            // Categories
            Column(modifier = Modifier.weight(2f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                CategoryBar("Limpieza y estado", 4.9f)
                CategoryBar("Seguridad del sector", 4.8f)
                CategoryBar("Comunicación", 4.9f)
                CategoryBar("Calidad / precio", 4.7f)
            }
        }

        // Add Review Form
        if (showAddModal) {
            AddReviewForm(
                onCancel = { showAddModal = false },
                onSubmit = { rating, comment, tags ->
                    val currentUser = auth.currentUser
                    val nameToUse = currentUser?.displayName ?: "Inquilino Verificado"
                    val payload = mapOf(
                        "propertyId" to propertyId,
                        "userName" to nameToUse,
                        "userId" to (currentUser?.uid ?: "anonymous"),
                        "rating" to rating,
                        "comment" to comment,
                        "tags" to tags,
                        "verifiedTenant" to true,
                        "createdAt" to FieldValue.serverTimestamp()
                    )

                    firestore.collection("properties")
                        .document(propertyId)
                        .collection("reviews")
                        .add(payload)

                    showAddModal = false
                    successMessage = "¡Gracias por tu opinión! Tu reseña ha sido publicada con éxito."
                }
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Reviews List
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            displayReviews.forEach { review ->
                ReviewItem(review)
            }
            if (displayReviews.isEmpty()) {
                Text(
                    "No hay opiniones todavía. ¡Sé el primero en opinar!",
                    color = BrandTextMuted,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(vertical = 16.dp).align(Alignment.CenterHorizontally)
                )
            }
        }
    }
}

@Composable
private fun CategoryBar(label: String, score: Float) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(label, fontSize = 10.sp, color = BrandTextSecondary, modifier = Modifier.weight(1f), maxLines = 1)
        Box(
            modifier = Modifier
                .weight(1.5f)
                .height(6.dp)
                .background(BrandCremaDark, CircleShape)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(score / 5f)
                    .background(BrandForest, CircleShape)
            )
        }
        Text(score.toString(), fontSize = 10.sp, fontWeight = FontWeight.Black, color = BrandForest, modifier = Modifier.width(24.dp).padding(start = 4.dp))
    }
}

@Composable
private fun AddReviewForm(onCancel: () -> Unit, onSubmit: (Int, String, List<String>) -> Unit) {
    var rating by remember { mutableStateOf(5) }
    var comment by remember { mutableStateOf("") }
    var selectedTags by remember { mutableStateOf(listOf("Zona muy segura")) }
    val quickTags = listOf("Zona muy segura", "Garita 24/7", "Agua constante", "Excelente ubicación")

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 16.dp)
            .background(Color.White, RoundedCornerShape(20.dp))
            .padding(16.dp)
    ) {
        Text("Tu Calificación General *", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = BrandCafe)
        Row(modifier = Modifier.padding(vertical = 8.dp)) {
            (1..5).forEach { s ->
                Icon(
                    Icons.Default.Star,
                    null,
                    tint = if (s <= rating) BrandGold else BrandCremaDark,
                    modifier = Modifier.size(32.dp).clickable { rating = s }
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(
            value = comment,
            onValueChange = { comment = it },
            label = { Text("Tu comentario u opinión detallada *", fontSize = 12.sp) },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            maxLines = 4
        )

        Spacer(modifier = Modifier.height(12.dp))
        Text("Etiquetas destacadas", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = BrandCafe)
        Row(modifier = Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            quickTags.forEach { tag ->
                val isSelected = selectedTags.contains(tag)
                Surface(
                    color = if (isSelected) BrandForest else Color(0xFFFAF5EE),
                    shape = CircleShape,
                    modifier = Modifier.clickable {
                        if (isSelected) selectedTags = selectedTags - tag
                        else selectedTags = selectedTags + tag
                    }
                ) {
                    Text(
                        if (isSelected) "✓ $tag" else "+ $tag",
                        color = if (isSelected) Color.White else BrandCafe,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
            TextButton(onClick = onCancel) { Text("Cancelar", color = BrandTextMuted) }
            Spacer(modifier = Modifier.width(8.dp))
            Button(
                onClick = { onSubmit(rating, comment, selectedTags) },
                enabled = comment.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = BrandForest),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Publicar Opinión", fontWeight = FontWeight.Black)
            }
        }
    }
}

@Composable
private fun ReviewItem(review: Review) {
    var isLiked by remember { mutableStateOf(false) }

    Surface(
        color = if (review.isNew) BrandJade.copy(alpha = 0.05f) else Color(0xFFFCFBF8),
        shape = RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, if (review.isNew) BrandJade.copy(alpha = 0.3f) else BrandCremaDark),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier.size(36.dp).clip(CircleShape).background(BrandForest),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(review.userName.first().toString(), color = Color.White, fontWeight = FontWeight.Black, fontSize = 14.sp)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(review.userName, fontWeight = FontWeight.Black, fontSize = 13.sp, color = BrandCafe)
                            if (review.verifiedTenant) {
                                Spacer(modifier = Modifier.width(4.dp))
                                Icon(Icons.Default.Verified, null, tint = BrandGold, modifier = Modifier.size(12.dp))
                            }
                        }
                        Text(review.date, color = BrandTextMuted, fontSize = 10.sp, fontWeight = FontWeight.Medium)
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    (1..5).forEach { s ->
                        Icon(
                            Icons.Default.Star,
                            null,
                            tint = if (s <= Math.round(review.rating)) BrandGold else BrandCremaDark,
                            modifier = Modifier.size(12.dp)
                        )
                    }
                    Text(String.format("%.1f", review.rating), fontWeight = FontWeight.Black, fontSize = 12.sp, color = BrandCafe, modifier = Modifier.padding(start = 4.dp))
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            Text(review.comment, fontSize = 12.sp, color = BrandTextSecondary, lineHeight = 18.sp)

            if (review.tags.isNotEmpty()) {
                Row(modifier = Modifier.fillMaxWidth().padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    review.tags.forEach { tag ->
                        Surface(color = Color.White, border = androidx.compose.foundation.BorderStroke(1.dp, BrandForest.copy(alpha = 0.2f)), shape = RoundedCornerShape(8.dp)) {
                            Text(tag, fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = BrandForest, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                        }
                    }
                }
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = BrandCremaDark.copy(alpha = 0.5f))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("¿Te resultó útil esta reseña?", color = BrandTextMuted, fontSize = 10.sp)
                Surface(
                    color = if (isLiked) BrandForest else Color.Transparent,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.clickable { isLiked = !isLiked }
                ) {
                    Row(modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.ThumbUp, null, tint = if (isLiked) Color.White else BrandTextSecondary, modifier = Modifier.size(12.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(if (isLiked) "Útil (1)" else "Útil", color = if (isLiked) Color.White else BrandTextSecondary, fontSize = 10.sp, fontWeight = if (isLiked) FontWeight.Bold else FontWeight.Normal)
                    }
                }
            }
        }
    }
}
