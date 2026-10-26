package com.example.ruwajay.ui.screens

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.ruwajay.data.repository.ChatRepository
import com.example.ruwajay.data.repository.VisitRepository
import com.example.ruwajay.data.repository.rememberProperties
import com.example.ruwajay.ui.components.*
import com.example.ruwajay.ui.theme.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import org.osmdroid.util.GeoPoint
import java.util.Calendar
import java.util.Locale
import kotlin.math.*

private fun calculateDistKm(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
    val r = 6371.0
    val dLat = Math.toRadians(lat2 - lat1)
    val dLon = Math.toRadians(lon2 - lon1)
    val a = sin(dLat / 2).pow(2) + cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLon / 2).pow(2)
    val c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return r * c
}

@Composable
fun PropertyDetailScreen(
    propertyId: String,
    onNavigateBack: () -> Unit = {},
    onChatClick: (String) -> Unit = {},
    onRouteClick: () -> Unit = {},
    onEditClick: () -> Unit = {}
) {
    val context = LocalContext.current
    val property = rememberProperties().find { it.id == propertyId }
        ?: return Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Propiedad no encontrada", color = BrandTextPrimary)
        }

    val firebaseUser = FirebaseAuth.getInstance().currentUser
    var isFavorite by remember(propertyId, firebaseUser?.uid) { mutableStateOf(false) }
    var reviewCount by remember(propertyId) { mutableStateOf(0) }
    val chatRepo = remember { ChatRepository() }
    val visitRepo = remember { VisitRepository() }
    var isCreatingChat by remember { mutableStateOf(false) }

    var hasConfirmedVisit by remember { mutableStateOf(false) }
    var hasPendingVisit by remember { mutableStateOf(false) }
    val isOwner = firebaseUser?.uid != null && firebaseUser.uid == property.ownerId
    val canAccessContract = isOwner || hasConfirmedVisit
    var showVisitDialog by remember { mutableStateOf(false) }
    var showContractModal by remember { mutableStateOf(false) }
    var showLightbox by remember { mutableStateOf(false) }
    var selectedImageIndex by remember { mutableStateOf(0) }
    var activeCategoryTab by remember { mutableStateOf("todas") } // "todas", "exterior", "interior", "habitaciones"

    // Calculadora de presupuesto
    var leaseMonths by remember { mutableStateOf(12) }
    val maintenanceFee = property.maintenanceFee
    val depositAmount = property.deposit ?: property.price

    // GPS y distancia en vivo
    val gps = rememberGpsPosition()
    val distanceKm = remember(gps.point, property.location.mapCoordinates) {
        val pt = gps.point
        val coords = property.location.mapCoordinates
        if (pt != null && coords != null) {
            calculateDistKm(pt.latitude, pt.longitude, coords.lat, coords.lng)
        } else null
    }

    val configuration = LocalConfiguration.current
    val isTablet = configuration.screenWidthDp >= 600

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

    DisposableEffect(propertyId, firebaseUser?.uid) {
        val listener = if (firebaseUser != null) {
            FirebaseFirestore.getInstance().collection("visits")
                .whereEqualTo("propertyId", propertyId)
                .whereEqualTo("tenantId", firebaseUser.uid)
                .addSnapshotListener { snap, _ ->
                    val statuses = snap?.documents?.mapNotNull { it.getString("status") }.orEmpty()
                    hasConfirmedVisit = statuses.any { it == "confirmada" || it == "aceptada" }
                    hasPendingVisit = statuses.contains("pendiente")
                }
        } else null
        onDispose { listener?.remove() }
    }

    // Filtrar fotos por pestaña de categoría
    val allImages = property.images.ifEmpty { listOf("") }
    val displayedImages = remember(activeCategoryTab, allImages) {
        when (activeCategoryTab) {
            "exterior" -> allImages.take(2)
            "interior" -> allImages.drop(1).take(2)
            "habitaciones" -> allImages.takeLast(2)
            else -> allImages
        }
    }

    // WhatsApp URL con mensaje preconfigurado
    val ownerPhone = property.ownerPhone.replace(Regex("[^0-9]"), "")
    val shareText = "Mira esta propiedad en RuwaJay: ${property.title} - Q${property.price.toInt()}/mes en ${property.location.city}, ${property.location.zone}. https://ruwajay.com/propiedad/$propertyId"

    Scaffold(
        topBar = {
            RuwaHeader(
                onExploreClick = onNavigateBack
            )
        },
        containerColor = BrandSurfaceBackground
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Contenedor principal con limitador de ancho para tablet
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 960.dp)
            ) {
                // ── FOTO PRINCIPAL CON BOTONES SUPERPUESTOS ──────────
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(if (isTablet) 420.dp else 290.dp)
                        .background(BrandCremaDark)
                ) {
                    val currentHeroImage = displayedImages.getOrNull(selectedImageIndex) ?: allImages.firstOrNull().orEmpty()
                    val heroModel = remember(currentHeroImage) {
                        ImageRequest.Builder(context)
                            .data(currentHeroImage)
                            .size(1080, 720)
                            .memoryCachePolicy(coil.request.CachePolicy.ENABLED)
                            .diskCachePolicy(coil.request.CachePolicy.ENABLED)
                            .crossfade(false)
                            .build()
                    }
                    AsyncImage(
                        model = heroModel,
                        contentDescription = property.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxSize()
                            .clickable { showLightbox = true }
                    )

                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    listOf(
                                        Color.Black.copy(alpha = 0.45f),
                                        Color.Transparent,
                                        Color.Black.copy(alpha = 0.55f)
                                    )
                                )
                            )
                    )

                    // Barra superior sobre la foto
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = onNavigateBack,
                            modifier = Modifier.background(Color.Black.copy(alpha = 0.5f), CircleShape)
                        ) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Volver", tint = Color.White)
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            // Botón Compartir
                            IconButton(
                                onClick = {
                                    val sendIntent = Intent().apply {
                                        action = Intent.ACTION_SEND
                                        putExtra(Intent.EXTRA_TEXT, shareText)
                                        type = "text/plain"
                                    }
                                    context.startActivity(Intent.createChooser(sendIntent, "Compartir propiedad"))
                                },
                                modifier = Modifier.background(Color.Black.copy(alpha = 0.5f), CircleShape)
                            ) {
                                Icon(Icons.Default.Share, contentDescription = "Compartir", tint = Color.White)
                            }
                        }
                    }

                    // Píldoras de estado y ampliación en la parte inferior de la foto
                    Row(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            color = if (property.status == "disponible") BrandForest else Color(0xFFD97706),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = property.status.replaceFirstChar { it.uppercase() },
                                color = Color.White,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }

                        Surface(
                            color = Color.Black.copy(alpha = 0.6f),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.clickable { showLightbox = true }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.Fullscreen, null, tint = Color.White, modifier = Modifier.size(15.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Ver ${allImages.size} fotos", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                // ── PESTAÑAS DE CATEGORÍA DE FOTOS (TODAS, EXTERIOR, INTERIOR, HABITACIONES) ──
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf("todas" to "Todas", "exterior" to "Exterior", "interior" to "Interior", "habitaciones" to "Habitaciones").forEach { (tabKey, tabLabel) ->
                        FilterChip(
                            selected = activeCategoryTab == tabKey,
                            onClick = {
                                activeCategoryTab = tabKey
                                selectedImageIndex = 0
                            },
                            label = { Text(tabLabel, fontSize = 12.sp, fontWeight = FontWeight.Bold) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = BrandForest,
                                selectedLabelColor = Color.White
                            ),
                            shape = RoundedCornerShape(10.dp)
                        )
                    }
                }

                // Carrusel de miniaturas
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    itemsIndexed(displayedImages) { index, img ->
                        val isSelected = index == selectedImageIndex
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(2.dp, if (isSelected) BrandTerracota else Color.Transparent),
                            modifier = Modifier
                                .size(72.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .clickable { selectedImageIndex = index }
                        ) {
                            val thumbModel = remember(img) {
                                ImageRequest.Builder(context)
                                    .data(img)
                                    .size(200, 200)
                                    .memoryCachePolicy(coil.request.CachePolicy.ENABLED)
                                    .diskCachePolicy(coil.request.CachePolicy.ENABLED)
                                    .crossfade(false)
                                    .build()
                            }
                            AsyncImage(
                                model = thumbModel,
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // ── DETALLES PRINCIPALES, PRECIO Y DISTANCIA GPS ───────
                Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(color = BrandForest.copy(alpha = 0.12f), shape = RoundedCornerShape(8.dp)) {
                            Text(
                                property.type.replaceFirstChar { it.uppercase() },
                                color = BrandForest,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Black,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                        Text(
                            "Q ${"%,.2f".format(property.price)} / mes",
                            color = BrandTerracota,
                            fontWeight = FontWeight.Black,
                            fontSize = if (isTablet) 24.sp else 21.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = property.title,
                        color = BrandTextPrimary,
                        fontWeight = FontWeight.Black,
                        fontSize = if (isTablet) 24.sp else 20.sp,
                        lineHeight = 26.sp
                    )

                    Spacer(modifier = Modifier.height(6.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.LocationOn, contentDescription = null, tint = BrandForest, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            "${property.location.address}, ${property.location.zone}, ${property.location.city}",
                            color = BrandTextSecondary,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    // Píldora de distancia en vivo con GPS
                    if (distanceKm != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = BrandForest.copy(alpha = 0.12f),
                            border = BorderStroke(1.dp, BrandForest.copy(alpha = 0.3f))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.NearMe, null, tint = BrandForest, modifier = Modifier.size(15.dp))
                                Spacer(Modifier.width(6.dp))
                                Text(
                                    "A %.1f km de tu ubicación actual".format(distanceKm),
                                    color = BrandForest,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.ExtraBold
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Características clave
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Surface(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(14.dp),
                            color = BrandSurfaceElevated,
                            border = BorderStroke(1.dp, BrandBorder)
                        ) {
                            Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.Bed, null, tint = BrandForest, modifier = Modifier.size(20.dp))
                                Spacer(Modifier.height(4.dp))
                                Text("${property.features.bedrooms} Habs", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = BrandTextPrimary)
                            }
                        }
                        Surface(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(14.dp),
                            color = BrandSurfaceElevated,
                            border = BorderStroke(1.dp, BrandBorder)
                        ) {
                            Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.Bathtub, null, tint = BrandForest, modifier = Modifier.size(20.dp))
                                Spacer(Modifier.height(4.dp))
                                Text("${property.features.bathrooms} Baños", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = BrandTextPrimary)
                            }
                        }
                        Surface(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(14.dp),
                            color = BrandSurfaceElevated,
                            border = BorderStroke(1.dp, BrandBorder)
                        ) {
                            Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.SquareFoot, null, tint = BrandForest, modifier = Modifier.size(20.dp))
                                Spacer(Modifier.height(4.dp))
                                Text("${property.features.area} m²", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = BrandTextPrimary)
                            }
                        }
                        Surface(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(14.dp),
                            color = BrandSurfaceElevated,
                            border = BorderStroke(1.dp, BrandBorder)
                        ) {
                            Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.DirectionsCar, null, tint = BrandForest, modifier = Modifier.size(20.dp))
                                Spacer(Modifier.height(4.dp))
                                Text("${property.features.parking} Parqueos", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = BrandTextPrimary)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    // ── ESTIMADOR DE PRESUPUESTO MENSUAL (EXACTO A LA WEB) ──
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(18.dp),
                        color = BrandSurfaceElevated,
                        border = BorderStroke(1.dp, BrandBorder)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Calculate, null, tint = BrandForest, modifier = Modifier.size(20.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Estimador de presupuesto mensual", fontWeight = FontWeight.Black, fontSize = 15.sp, color = BrandTextPrimary)
                            }
                            Spacer(Modifier.height(10.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Renta base mensual:", fontSize = 13.sp, color = BrandTextSecondary)
                                Text("Q ${"%,.2f".format(property.price)}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = BrandTextPrimary)
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Depósito de garantía (reembolsable):", fontSize = 13.sp, color = BrandTextSecondary)
                                Text("Q ${"%,.2f".format(depositAmount)}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = BrandTextPrimary)
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Mantenimiento y servicios:", fontSize = 13.sp, color = BrandTextSecondary)
                                Text("Q ${"%,.2f".format(maintenanceFee)}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = BrandTextPrimary)
                            }
                            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = BrandBorder)
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Total primer mes (Renta + Depósito):", fontWeight = FontWeight.Black, fontSize = 13.sp, color = BrandForest)
                                Text("Q ${"%,.2f".format(property.price + depositAmount + maintenanceFee)}", fontWeight = FontWeight.Black, fontSize = 14.sp, color = BrandForest)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    // Descripción
                    Text("Descripción", fontWeight = FontWeight.Black, fontSize = 17.sp, color = BrandTextPrimary)
                    Spacer(Modifier.height(6.dp))
                    Text(property.description, color = BrandTextSecondary, fontSize = 14.sp, lineHeight = 20.sp)

                    Spacer(modifier = Modifier.height(16.dp))

                    // Amenidades
                    Text("Amenidades y servicios", fontWeight = FontWeight.Black, fontSize = 17.sp, color = BrandTextPrimary)
                    Spacer(Modifier.height(8.dp))
                    property.amenities.forEach { amenity ->
                        Row(modifier = Modifier.padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CheckCircle, null, tint = BrandForest, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(amenity, color = BrandTextPrimary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    // Tarjeta de Propietario con Botones de Llamada y WhatsApp
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(18.dp),
                        color = BrandSurfaceElevated,
                        border = BorderStroke(1.dp, BrandBorder)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(shape = CircleShape, color = BrandForest, modifier = Modifier.size(48.dp)) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text(property.ownerName.take(1).uppercase(), color = Color.White, fontWeight = FontWeight.Black, fontSize = 20.sp)
                                    }
                                }
                                Spacer(Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(property.ownerName.ifBlank { "Propietario RuwaJay" }, fontWeight = FontWeight.Black, fontSize = 15.sp, color = BrandTextPrimary)
                                        if (property.verified) {
                                            Spacer(Modifier.width(4.dp))
                                            Icon(Icons.Default.Verified, null, tint = BrandForest, modifier = Modifier.size(15.dp))
                                        }
                                    }
                                    Text("Casero verificado en Guatemala 🇬🇹", fontSize = 12.sp, color = BrandTextSecondary)
                                }
                            }

                            Spacer(Modifier.height(12.dp))

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                // Botón WhatsApp Directo
                                Button(
                                    onClick = {
                                        if (ownerPhone.isNotBlank()) {
                                            val waMsg = Uri.encode("¡Hola! Vi tu propiedad en RuwaJay: ${property.title} y deseo coordinar una visita.")
                                            val waUri = Uri.parse("https://wa.me/$ownerPhone?text=$waMsg")
                                            context.startActivity(Intent(Intent.ACTION_VIEW, waUri))
                                        } else {
                                            Toast.makeText(context, "El propietario no tiene WhatsApp registrado", Toast.LENGTH_SHORT).show()
                                        }
                                    },
                                    modifier = Modifier.weight(1f).height(44.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366)),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Icon(Icons.Default.Chat, null, tint = Color.White, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text("WhatsApp", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                }

                                // Botón Llamar
                                OutlinedButton(
                                    onClick = {
                                        if (ownerPhone.isNotBlank()) {
                                            val callIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$ownerPhone"))
                                            context.startActivity(callIntent)
                                        } else {
                                            Toast.makeText(context, "Teléfono no disponible", Toast.LENGTH_SHORT).show()
                                        }
                                    },
                                    modifier = Modifier.weight(1f).height(44.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    border = BorderStroke(1.dp, BrandBorder)
                                ) {
                                    Icon(Icons.Default.Phone, null, tint = BrandForest, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text("Llamar", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = BrandTextPrimary)
                                }
                            }
                        }
                    }

                    // Contrato de Arrendamiento (Decreto Ley 106) — sólo visible tras cerrar trato o para el dueño
                    if (canAccessContract) {
                        Spacer(modifier = Modifier.height(18.dp))
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(18.dp),
                            color = BrandForest.copy(alpha = 0.08f),
                            border = BorderStroke(1.dp, BrandForest.copy(alpha = 0.25f))
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { showContractModal = true }
                                    .padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Description, null, tint = BrandForest, modifier = Modifier.size(24.dp))
                                    Spacer(Modifier.width(10.dp))
                                    Column {
                                        Text("Borrador del Contrato Legal", fontWeight = FontWeight.Black, fontSize = 14.sp, color = BrandForest)
                                        Text("Basado en el Código Civil de Guatemala (Decreto Ley 106)", fontSize = 11.sp, color = BrandTextSecondary)
                                    }
                                }
                                Icon(Icons.Default.ChevronRight, null, tint = BrandForest)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    // Mapa de ubicación
                    Text("Ubicación exacta", fontWeight = FontWeight.Black, fontSize = 17.sp, color = BrandTextPrimary)
                    Spacer(Modifier.height(8.dp))
                    Surface(
                        shape = RoundedCornerShape(18.dp),
                        modifier = Modifier.fillMaxWidth().height(220.dp),
                        border = BorderStroke(1.dp, BrandBorder)
                    ) {
                        val coords = property.location.mapCoordinates
                        if (coords != null) {
                            val propPoint = GeoPoint(coords.lat, coords.lng)
                            OsmMapView(
                                center = propPoint,
                                zoom = 14.0,
                                markers = listOf(
                                    OsmMarker(
                                        id = property.id,
                                        position = propPoint,
                                        title = property.title
                                    )
                                ),
                                showTopBadges = false
                            )
                        } else {
                            Box(contentAlignment = Alignment.Center) {
                                Text("Ubicación pendiente de confirmación", color = BrandTextSecondary)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    // Reseñas
                    PropertyReviews(propertyId = property.id, propertyTitle = property.title)

                    Spacer(modifier = Modifier.height(18.dp))

                    // Botones de acción principales: Chat o Solicitar Visita + Ver Ruta
                    if (hasConfirmedVisit && firebaseUser?.uid != property.ownerId) {
                        Button(
                            onClick = {
                                if (isCreatingChat) return@Button
                                isCreatingChat = true
                                chatRepo.getOrCreateConversation(
                                    propertyId = property.id,
                                    ownerId = property.ownerId,
                                    propertyTitle = property.title
                                ) { result ->
                                    isCreatingChat = false
                                    result.onSuccess { convId -> onChatClick(convId) }
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = BrandForest),
                            enabled = !isCreatingChat
                        ) {
                            Icon(Icons.Default.Chat, null, tint = Color.White)
                            Spacer(Modifier.width(8.dp))
                            Text("Abrir chat directo con el propietario", fontWeight = FontWeight.Black, fontSize = 15.sp)
                        }
                    } else {
                        Button(
                            onClick = { showVisitDialog = true },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = BrandTerracota),
                            enabled = !hasPendingVisit
                        ) {
                            Icon(Icons.Default.Event, null, tint = Color.White)
                            Spacer(Modifier.width(8.dp))
                            Text(
                                if (hasPendingVisit) "Solicitud de Cita Pendiente" else "Solicitar Cita Presencial",
                                fontWeight = FontWeight.Black,
                                fontSize = 15.sp
                            )
                        }
                        Spacer(Modifier.height(6.dp))
                        Text(
                            "💬 El chat directo se desbloquea al coordinar o confirmar una visita presencial con el propietario.",
                            color = BrandTextSecondary,
                            fontSize = 11.sp,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Botón Ver Ruta de navegación
                    Button(
                        onClick = onRouteClick,
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E40AF))
                    ) {
                        Icon(Icons.Default.Navigation, null, tint = Color.White)
                        Spacer(Modifier.width(8.dp))
                        Text("Iniciar navegación y ruta hacia la vivienda", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }

                    if (firebaseUser?.uid == property.ownerId) {
                        Spacer(modifier = Modifier.height(10.dp))
                        OutlinedButton(
                            onClick = onEditClick,
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Icon(Icons.Default.Edit, null, tint = BrandForest)
                            Spacer(Modifier.width(8.dp))
                            Text("Editar esta vivienda", fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // ── RUWA FOOTER AL FINAL ──────────────────────────────
                Spacer(modifier = Modifier.height(30.dp))
                RuwaFooter()
            }
        }
    }

    // Modal Lightbox de fotos fullscreen
    if (showLightbox) {
        Dialog(
            onDismissRequest = { showLightbox = false },
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black)
            ) {
                val currentImage = allImages.getOrNull(selectedImageIndex) ?: ""
                AsyncImage(
                    model = currentImage,
                    contentDescription = null,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.fillMaxSize()
                )

                // Botón Cerrar
                IconButton(
                    onClick = { showLightbox = false },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(16.dp)
                        .background(Color.Black.copy(alpha = 0.6f), CircleShape)
                ) {
                    Icon(Icons.Default.Close, null, tint = Color.White)
                }

                // Indicador de foto
                Text(
                    text = "${selectedImageIndex + 1} / ${allImages.size}",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 32.dp)
                        .background(Color.Black.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                        .padding(horizontal = 14.dp, vertical = 6.dp)
                )

                // Flechas Anterior / Siguiente
                if (selectedImageIndex > 0) {
                    IconButton(
                        onClick = { selectedImageIndex -= 1 },
                        modifier = Modifier
                            .align(Alignment.CenterStart)
                            .padding(start = 12.dp)
                            .background(Color.Black.copy(alpha = 0.6f), CircleShape)
                    ) {
                        Icon(Icons.Default.ChevronLeft, null, tint = Color.White)
                    }
                }
                if (selectedImageIndex < allImages.lastIndex) {
                    IconButton(
                        onClick = { selectedImageIndex += 1 },
                        modifier = Modifier
                            .align(Alignment.CenterEnd)
                            .padding(end = 12.dp)
                            .background(Color.Black.copy(alpha = 0.6f), CircleShape)
                    ) {
                        Icon(Icons.Default.ChevronRight, null, tint = Color.White)
                    }
                }
            }
        }
    }

    // Modal Contrato Legal Decreto Ley 106
    if (showContractModal) {
        AlertDialog(
            onDismissRequest = { showContractModal = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Gavel, null, tint = BrandForest)
                    Spacer(Modifier.width(8.dp))
                    Text("Contrato de Arrendamiento", fontWeight = FontWeight.Black, fontSize = 16.sp)
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 420.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    Text(
                        "CONTRATO PRIVADO DE ARRENDAMIENTO DE BIEN INMUEBLE PARA VIVIENDA",
                        fontWeight = FontWeight.Black,
                        fontSize = 13.sp,
                        color = BrandForest
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "En la República de Guatemala, comparecen por una parte el PROPIETARIO (${property.ownerName.ifBlank { "Propietario Registrado" }}) y por la otra parte el INQUILINO (${firebaseUser?.displayName ?: "Inquilino Registrado"}). Conforme a lo establecido en los Artículos 1880 al 1941 del Código Civil de Guatemala (Decreto Ley 106), convienen las siguientes cláusulas:\n\n" +
                                "PRIMERA: OBJETO DEL CONTRATO. El Arrendante da en arrendamiento el inmueble ubicado en ${property.location.address}, ${property.location.zone}, ${property.location.city}.\n\n" +
                                "SEGUNDA: DESTINO. El inmueble se destinará exclusivamente para vivienda familiar del Arrendatario.\n\n" +
                                "TERCERA: PLAZO. El plazo convenido es de DOCE (12) MESES prorrogables de común acuerdo.\n\n" +
                                "CUARTA: PRECIO DE LA RENTA. La renta mensual convenida es de Q ${"%,.2f".format(property.price)}, pagadera por mensualidades anticipadas dentro de los primeros cinco días de cada mes.\n\n" +
                                "QUINTA: DEPÓSITO DE GARANTÍA. El Arrendatario entrega en este acto la cantidad de Q ${"%,.2f".format(depositAmount)} para responder por desperfectos o saldos pendientes al finalizar la ocupación.\n\n" +
                                "SEXTA: SERVICIOS Y MANTENIMIENTO. Serán cubiertos conforme a la cuota estipulada de Q ${"%,.2f".format(maintenanceFee)} mensuales.\n\n" +
                                "SÉPTIMA: JURISDICCIÓN. Ambas partes renuncian al fuero de su domicilio y se someten a los tribunales de la Ciudad de Guatemala.",
                        fontSize = 12.sp,
                        lineHeight = 18.sp,
                        color = BrandTextPrimary
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = { showContractModal = false },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandForest)
                ) {
                    Text("Cerrar", fontWeight = FontWeight.Bold)
                }
            }
        )
    }

    // Modal Agendar Cita de Visita Presencial
    if (showVisitDialog) {
        val cal = remember { Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, 1) } }
        var selectedDate by remember {
            mutableStateOf(String.format(Locale.US, "%04d-%02d-%02d", cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH)))
        }
        var selectedTime by remember { mutableStateOf("10:00") }
        var visitNotes by remember { mutableStateOf("") }
        var isSubmittingVisit by remember { mutableStateOf(false) }

        AlertDialog(
            onDismissRequest = { showVisitDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CalendarMonth, null, tint = BrandTerracota)
                    Spacer(Modifier.width(8.dp))
                    Text("Agendar Visita Presencial", fontWeight = FontWeight.Black, fontSize = 16.sp)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Elige la fecha y hora sugerida para coordinar con el casero:", fontSize = 12.sp, color = BrandTextSecondary)

                    OutlinedButton(
                        onClick = {
                            DatePickerDialog(
                                context,
                                { _, y, m, d -> selectedDate = String.format(Locale.US, "%04d-%02d-%02d", y, m + 1, d) },
                                cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)
                            ).show()
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.DateRange, null, tint = BrandForest)
                        Spacer(Modifier.width(8.dp))
                        Text("Fecha: $selectedDate", fontWeight = FontWeight.Bold)
                    }

                    OutlinedButton(
                        onClick = {
                            TimePickerDialog(
                                context,
                                { _, hour, min -> selectedTime = String.format(Locale.US, "%02d:%02d", hour, min) },
                                10, 0, true
                            ).show()
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.AccessTime, null, tint = BrandForest)
                        Spacer(Modifier.width(8.dp))
                        Text("Hora: $selectedTime", fontWeight = FontWeight.Bold)
                    }

                    OutlinedTextField(
                        value = visitNotes,
                        onValueChange = { visitNotes = it },
                        label = { Text("Nota para el casero (opcional)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val uid = firebaseUser?.uid
                        if (uid != null) {
                            isSubmittingVisit = true
                            visitRepo.createVisit(
                                propertyId = property.id,
                                propertyTitle = property.title,
                                propertyAddress = property.location.address.ifBlank { "${property.location.city}, ${property.location.department}" },
                                ownerId = property.ownerId,
                                ownerName = property.ownerName.ifBlank { "Propietario" },
                                visitDate = selectedDate,
                                visitTime = selectedTime,
                                notes = visitNotes
                            ) { result ->
                                isSubmittingVisit = false
                                showVisitDialog = false
                                result.onSuccess {
                                    Toast.makeText(context, "¡Cita solicitada exitosamente!", Toast.LENGTH_LONG).show()
                                }.onFailure {
                                    Toast.makeText(context, "Error: ${it.message}", Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandForest),
                    enabled = !isSubmittingVisit
                ) {
                    Text("Enviar Solicitud", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showVisitDialog = false }) {
                    Text("Cancelar")
                }
            }
        )
    }
}
