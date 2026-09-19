package com.example.ruwajay.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Bathtub
import androidx.compose.material.icons.filled.Bed
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.SquareFoot
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.ruwajay.data.repository.MockDataRepository
import com.example.ruwajay.data.repository.rememberProperties
import com.example.ruwajay.ui.components.PropertyReviews
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.example.ruwajay.ui.components.AmenityChip
import com.example.ruwajay.ui.theme.*
import com.example.ruwajay.ui.components.OsmMapView
import com.example.ruwajay.ui.components.OsmMarker
import org.osmdroid.util.GeoPoint

@Composable
fun PropertyDetailScreen(
    propertyId: String,
    onNavigateBack: () -> Unit = {},
    onChatClick: () -> Unit = {},
    onRouteClick: () -> Unit = {}
) {
    val property = rememberProperties().find { it.id == propertyId }
        ?: return Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Propiedad no encontrada", color = BrandTextPrimary)
        }

    val owner = MockDataRepository.owners.find { it.id == property.ownerId }
    val firebaseUser = FirebaseAuth.getInstance().currentUser
    var isFavorite by remember(propertyId, firebaseUser?.uid) { mutableStateOf(false) }
    var reviewCount by remember(propertyId) { mutableStateOf(0) }

    LaunchedEffect(propertyId, firebaseUser?.uid) {
        FirebaseFirestore.getInstance().collection("properties").document(propertyId)
            .collection("reviews").get()
            .addOnSuccessListener { reviewCount = it.size() }
        if (firebaseUser != null) {
            FirebaseFirestore.getInstance()
                .collection("users").document(firebaseUser.uid)
                .collection("favorites").document(propertyId).get()
                .addOnSuccessListener { isFavorite = it.exists() }
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(BrandCrema).verticalScroll(rememberScrollState())) {
        // ── IMAGE CAROUSEL ──────────────────────────────────────
        Box(modifier = Modifier.fillMaxWidth().height(280.dp)) {
            AsyncImage(
                model = property.images.firstOrNull(),
                contentDescription = property.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
            Box(
                modifier = Modifier.fillMaxSize().background(
                    Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0.18f), Color.Transparent, Color.Black.copy(alpha = 0.28f)))
                )
            )
            // Back button
            IconButton(
                onClick = onNavigateBack,
                modifier = Modifier.padding(12.dp).align(Alignment.TopStart)
                    .background(Color.Black.copy(0.4f), CircleShape)
            ) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Volver", tint = Color.White)
            }
            IconButton(
                onClick = {
                    firebaseUser?.let { user ->
                        val favorite = FirebaseFirestore.getInstance()
                            .collection("users").document(user.uid)
                            .collection("favorites").document(propertyId)
                        if (isFavorite) favorite.delete() else favorite.set(mapOf("propertyId" to propertyId, "createdAt" to System.currentTimeMillis()))
                        isFavorite = !isFavorite
                    }
                },
                modifier = Modifier.padding(12.dp).align(Alignment.TopEnd)
                    .background(Color.Black.copy(0.4f), CircleShape)
            ) {
                Icon(if (isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder, contentDescription = "Favorito", tint = if (isFavorite) BrandTerracota else Color.White)
            }
            // Status badge
            Surface(
                modifier = Modifier.padding(12.dp).align(Alignment.TopEnd),
                color = if (property.status == "disponible") BrandForest else Color(0xFFF59E0B),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(
                    text = property.status.replaceFirstChar { it.uppercase() },
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                )
            }
        }

        // Thumbnails
        if (property.images.size > 1) {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(property.images) { img ->
                    AsyncImage(
                        model = img,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.size(64.dp).clip(RoundedCornerShape(10.dp))
                    )
                }
            }
        }

        // ── CONTENT ─────────────────────────────────────────────
        Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
            // Type & Price
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(color = BrandForest, shape = RoundedCornerShape(50.dp)) {
                    Text(
                        property.type.replaceFirstChar { it.uppercase() },
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }
                Text("Q ${"%,d".format(property.price)} / mes", color = BrandTerracota, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
            }
            if (reviewCount > 0) {
                Text("${reviewCount} reseña(s) compartida(s)", color = BrandTextSecondary, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
            }

            Spacer(modifier = Modifier.height(10.dp))
            Text(property.title, color = BrandTextPrimary, fontWeight = FontWeight.Bold, fontSize = 20.sp)

            Spacer(modifier = Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.LocationOn, contentDescription = null, tint = BrandForest, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("${property.location.address}, ${property.location.zone}, ${property.location.city}", color = BrandTextSecondary, fontSize = 13.sp)
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Features row
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                AmenityChip(Icons.Default.Bed, "${property.features.bedrooms} habitaciones")
                AmenityChip(Icons.Default.Bathtub, "${property.features.bathrooms} baños")
                AmenityChip(Icons.Default.SquareFoot, "${property.features.area} m²")
            }

            Spacer(modifier = Modifier.height(16.dp))
            SectionTitle("Descripción")
            Text(property.description, color = BrandTextSecondary, fontSize = 14.sp, lineHeight = 22.sp)

            Spacer(modifier = Modifier.height(16.dp))
            SectionTitle("Amenidades")
            property.amenities.forEach { amenity ->
                Row(modifier = Modifier.padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Star, contentDescription = null, tint = BrandGold, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(amenity, color = BrandTextPrimary, fontSize = 14.sp)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            SectionTitle("Requisitos")
            property.requirements.forEach { req ->
                Row(modifier = Modifier.padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.VerifiedUser, contentDescription = null, tint = BrandForest, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(req, color = BrandTextPrimary, fontSize = 14.sp)
                }
            }

            // Owner info
            if (owner != null) {
                Spacer(modifier = Modifier.height(16.dp))
                SectionTitle("Propietario")
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = Color.White,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Surface(shape = CircleShape, color = BrandForest, modifier = Modifier.size(48.dp)) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                Text(owner.name.first().toString(), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                            }
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(owner.name, color = BrandTextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                                if (owner.verified) {
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Icon(Icons.Default.VerifiedUser, null, tint = BrandForest, modifier = Modifier.size(14.dp))
                                }
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Star, null, tint = BrandGold, modifier = Modifier.size(12.dp))
                                Text(" ${owner.rating} • Responde ${owner.responseTime}", color = BrandTextMuted, fontSize = 12.sp)
                            }
                        }
                        Surface(
                            color = if (owner.online) Color(0xFF22C55E) else BrandCremaDark,
                            shape = CircleShape,
                            modifier = Modifier.size(10.dp)
                        ) {}
                    }
                }
            }

            // Reviews
            PropertyReviews(propertyId = property.id, propertyTitle = property.title)

            // Inline map
            Spacer(modifier = Modifier.height(16.dp))
            SectionTitle("Ubicación")
            Surface(
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth().height(200.dp)
            ) {
                val propPoint = GeoPoint(
                    property.location.coordinates.lat,
                    property.location.coordinates.lng
                )
                OsmMapView(
                    center = propPoint,
                    zoom = 14.0,
                    markers = listOf(
                        OsmMarker(
                            id = property.id,
                            position = propPoint,
                            title = property.title
                        )
                    )
                )
            }

            // Action Buttons
            Spacer(modifier = Modifier.height(20.dp))
            Button(
                onClick = onChatClick,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandForest)
            ) {
                Icon(Icons.Default.Chat, null, tint = Color.White)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Contactar propietario", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
            Spacer(modifier = Modifier.height(10.dp))
            OutlinedButton(
                onClick = onRouteClick,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = BrandCafe)
            ) {
                Icon(Icons.Default.Map, null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Ver ruta a la propiedad", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun SectionTitle(title: String) {
    Text(title, color = BrandCafe, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
    Spacer(Modifier.height(6.dp))
}
