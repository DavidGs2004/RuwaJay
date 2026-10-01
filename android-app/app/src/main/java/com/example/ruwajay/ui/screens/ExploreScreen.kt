package com.example.ruwajay.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CompareArrows
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.ruwajay.data.repository.rememberProperties
import com.example.ruwajay.ui.components.OsmMapView
import com.example.ruwajay.ui.components.OsmMarker
import com.example.ruwajay.ui.components.PropertyCard
import com.example.ruwajay.ui.components.PropertyCompareDialog
import com.example.ruwajay.ui.components.RentCalculatorDialog
import com.example.ruwajay.ui.theme.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.delay
import org.osmdroid.util.GeoPoint

@Composable
fun ExploreScreen(onPropertyClick: (String) -> Unit = {}) {
    var searchText by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf("todos") }
    var viewMode by remember { mutableStateOf("lista") }
    var showCalculator by remember { mutableStateOf(false) }
    var maxPriceFilter by remember { mutableStateOf<Int?>(null) }
    var comparedPropertyIds by remember { mutableStateOf(setOf<String>()) }
    var showCompareDialog by remember { mutableStateOf(false) }
    
    val firebaseUser = FirebaseAuth.getInstance().currentUser
    val firestore = remember { FirebaseFirestore.getInstance() }
    var favoriteIds by remember { mutableStateOf<Set<String>>(emptySet()) }

    DisposableEffect(firebaseUser?.uid) {
        if (firebaseUser == null) return@DisposableEffect onDispose {}
        val listener = firestore.collection("users").document(firebaseUser.uid)
            .collection("favorites")
            .addSnapshotListener { snapshot, _ ->
                if (snapshot != null) {
                    favoriteIds = snapshot.documents.map { it.id }.toSet()
                }
            }
        onDispose { listener.remove() }
    }

    // Feedback de carga inicial
    var isInitialLoading by remember { mutableStateOf(true) }
    LaunchedEffect(Unit) {
        delay(800)
        isInitialLoading = false
    }

    val filters = listOf("todos", "casa", "apartamento", "disponible", "reservada")
    val allProperties = rememberProperties()
    val filtered = allProperties.filter { prop ->
        val matchesSearch = searchText.isEmpty() ||
                prop.title.contains(searchText, ignoreCase = true) ||
                prop.location.zone.contains(searchText, ignoreCase = true) ||
                prop.location.city.contains(searchText, ignoreCase = true)
        val matchesFilter = when (selectedFilter) {
            "todos" -> true
            "disponible", "reservada", "alquilada" -> prop.status == selectedFilter
            else -> prop.type == selectedFilter
        }
        val matchesMaxPrice = maxPriceFilter == null || prop.price <= maxPriceFilter!!
        
        matchesSearch && matchesFilter && matchesMaxPrice
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(BrandCrema)
        ) {
            // ── HEADER REFINADO ──
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(BrandCrema)
                    .padding(horizontal = 16.dp, vertical = 16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Explorar Viviendas",
                        color = BrandForest,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 26.sp,
                        letterSpacing = (-0.5).sp
                    )
                    
                    // Toggle Vista Estilizado
                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(14.dp),
                        shadowElevation = 2.dp
                    ) {
                        Row(modifier = Modifier.padding(2.dp)) {
                            val listSelected = viewMode == "lista"
                            
                            IconButton(
                                onClick = { viewMode = "lista" },
                                modifier = Modifier
                                    .size(36.dp)
                                    .background(
                                        if (listSelected) BrandForest else Color.Transparent,
                                        RoundedCornerShape(11.dp)
                                    )
                            ) {
                                Icon(
                                    Icons.Default.List, 
                                    null, 
                                    tint = if (listSelected) Color.White else BrandTextMuted,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                            IconButton(
                                onClick = { viewMode = "mapa" },
                                modifier = Modifier
                                    .size(36.dp)
                                    .background(
                                        if (!listSelected) BrandForest else Color.Transparent,
                                        RoundedCornerShape(11.dp)
                                    )
                            ) {
                                Icon(
                                    Icons.Default.Map, 
                                    null, 
                                    tint = if (!listSelected) Color.White else BrandTextMuted,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }
                }
                
                Text(
                    text = if (isInitialLoading) "Cargando lo mejor para ti..." else "${filtered.size} opciones encontradas en Guatemala",
                    color = BrandTextSecondary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Barra de búsqueda con elevación
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Color.White,
                    shadowElevation = 4.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    val focusManager = LocalFocusManager.current
                    OutlinedTextField(
                        value = searchText,
                        onValueChange = { searchText = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Zona, colonia o ciudad...", color = BrandTextMuted) },
                        leadingIcon = { Icon(Icons.Default.Search, null, tint = BrandForest) },
                        trailingIcon = { 
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(end = 4.dp)) {
                                if (searchText.isNotEmpty()) {
                                    IconButton(onClick = { searchText = "" }) {
                                        Icon(Icons.Default.Close, null, tint = BrandTextMuted)
                                    }
                                }
                                IconButton(onClick = { focusManager.clearFocus() }) {
                                    Icon(Icons.Default.Search, "Buscar", tint = BrandForest)
                                }
                            }
                        },
                        shape = RoundedCornerShape(16.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = BrandTextPrimary,
                            unfocusedTextColor = BrandTextPrimary,
                            focusedBorderColor = Color.Transparent,
                            unfocusedBorderColor = Color.Transparent,
                            focusedContainerColor = Color.Transparent,
                            unfocusedContainerColor = Color.Transparent,
                            cursorColor = BrandForest
                        ),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus() })
                    )
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    LazyRow(
                        modifier = Modifier.weight(1f),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(filters) { filter ->
                            FilterChip(
                                selected = selectedFilter == filter,
                                onClick = { selectedFilter = filter },
                                label = { Text(filter.replaceFirstChar { it.uppercase() }, fontSize = 12.sp, fontWeight = FontWeight.Bold) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = BrandTerracota,
                                    selectedLabelColor = Color.White,
                                    containerColor = Color.White,
                                    labelColor = BrandTextSecondary
                                ),
                                border = FilterChipDefaults.filterChipBorder(
                                    enabled = true,
                                    selected = selectedFilter == filter,
                                    selectedBorderColor = BrandTerracota,
                                    borderColor = BrandCremaDark
                                ),
                                shape = RoundedCornerShape(12.dp)
                            )
                        }
                    }
                    
                    Spacer(Modifier.width(8.dp))
                    
                    // Botón Calculadora Animado
                    IconButton(
                        onClick = { showCalculator = true },
                        modifier = Modifier
                            .size(42.dp)
                            .background(BrandForest.copy(alpha = 0.12f), RoundedCornerShape(14.dp))
                    ) {
                        Icon(Icons.Default.Calculate, null, tint = BrandForest, modifier = Modifier.size(20.dp))
                    }
                }
                
                if (maxPriceFilter != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    SuggestionChip(
                        onClick = { maxPriceFilter = null },
                        label = { Text("Presupuesto: ≤ Q $maxPriceFilter", fontSize = 11.sp, fontWeight = FontWeight.Black) },
                        icon = { Icon(Icons.Default.Close, null, modifier = Modifier.size(14.dp)) },
                        colors = SuggestionChipDefaults.suggestionChipColors(containerColor = BrandForest.copy(0.1f), labelColor = BrandForest),
                        shape = RoundedCornerShape(8.dp)
                    )
                }
            }

            // ── CONTENIDO CON ANIMACIÓN ──
            Crossfade(
                targetState = if (isInitialLoading) "loading" else viewMode,
                animationSpec = tween(500),
                label = "ExploreContentTransition"
            ) { state ->
                when (state) {
                    "loading" -> LoadingState()
                    "mapa" -> ExploreMapView(filtered, onPropertyClick)
                    else -> {
                        if (filtered.isEmpty()) {
                            EmptyState()
                        } else {
                            LazyColumn(
                                contentPadding = PaddingValues(start = 16.dp, top = 8.dp, end = 16.dp, bottom = 100.dp),
                                verticalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                items(filtered) { property ->
                                    val isFav = favoriteIds.contains(property.id)
                                    PropertyCard(
                                        property = property,
                                        onClick = { onPropertyClick(property.id) },
                                        isCompared = comparedPropertyIds.contains(property.id),
                                        onCompareToggle = { selected ->
                                            if (selected) {
                                                if (comparedPropertyIds.size < 3) comparedPropertyIds = comparedPropertyIds + property.id
                                            } else {
                                                comparedPropertyIds = comparedPropertyIds - property.id
                                            }
                                        },
                                        isFavorite = isFav,
                                        onFavoriteToggle = { toggle ->
                                            firebaseUser?.let { user ->
                                                val favoriteRef = firestore.collection("users").document(user.uid)
                                                    .collection("favorites").document(property.id)
                                                if (!toggle) {
                                                    favoriteRef.delete()
                                                } else {
                                                    favoriteRef.set(mapOf("propertyId" to property.id, "createdAt" to System.currentTimeMillis()))
                                                }
                                            }
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // ── BOTÓN FLOTANTE COMPARAR ──
        if (comparedPropertyIds.size >= 2) {
            ExtendedFloatingActionButton(
                onClick = { showCompareDialog = true },
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 24.dp),
                containerColor = BrandTerracota,
                contentColor = Color.White,
                shape = RoundedCornerShape(18.dp),
                elevation = FloatingActionButtonDefaults.elevation(8.dp)
            ) {
                Icon(Icons.Default.CompareArrows, null)
                Spacer(Modifier.width(10.dp))
                Text("Comparar ${comparedPropertyIds.size} opciones", fontWeight = FontWeight.Black)
            }
        }

        // Diálogos
        if (showCalculator) {
            RentCalculatorDialog(
                onDismiss = { showCalculator = false },
                onApplyFilter = { max ->
                    maxPriceFilter = max
                    showCalculator = false
                }
            )
        }

        if (showCompareDialog) {
            PropertyCompareDialog(
                properties = allProperties.filter { comparedPropertyIds.contains(it.id) },
                onDismiss = { showCompareDialog = false },
                onNavigateToDetail = { id ->
                    showCompareDialog = false
                    onPropertyClick(id)
                }
            )
        }
    }
}

@Composable
fun LoadingState() {
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        repeat(3) {
            Surface(
                modifier = Modifier.fillMaxWidth().height(240.dp),
                color = BrandCremaDark.copy(alpha = 0.3f),
                shape = RoundedCornerShape(16.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = BrandForest.copy(alpha = 0.2f))
                }
            }
        }
    }
}

@Composable
fun ExploreMapView(properties: List<com.example.ruwajay.data.model.Property>, onPropertyClick: (String) -> Unit) {
    val guatemalaCity = GeoPoint(14.6349, -90.5069)
    var selectedPropertyId by remember { mutableStateOf<String?>(null) }
    val selectedProperty = remember(selectedPropertyId, properties) {
        properties.find { it.id == selectedPropertyId }
    }

    val markers = properties.map { prop ->
        OsmMarker(
            id = prop.id,
            position = GeoPoint(prop.location.coordinates.lat, prop.location.coordinates.lng),
            title = prop.title,
            snippet = "Q ${prop.price}"
        )
    }

    Box(modifier = Modifier.fillMaxSize()) {
        OsmMapView(
            center = guatemalaCity,
            zoom = 12.0,
            markers = markers,
            onMarkerClick = { id ->
                selectedPropertyId = id
            }
        )

        AnimatedVisibility(
            visible = selectedProperty != null,
            enter = fadeIn() + slideInVertically(initialOffsetY = { it }),
            exit = fadeOut() + slideOutVertically(targetOffsetY = { it }),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(start = 16.dp, end = 16.dp, bottom = 90.dp)
        ) {
            selectedProperty?.let { prop ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onPropertyClick(prop.id) },
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(72.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(BrandCremaDark)
                        ) {
                            if (prop.images.isNotEmpty()) {
                                AsyncImage(
                                    model = prop.images.first(),
                                    contentDescription = prop.title,
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = androidx.compose.ui.layout.ContentScale.Crop
                                )
                            } else {
                                Icon(
                                    Icons.Default.Home,
                                    contentDescription = null,
                                    tint = BrandTextMuted,
                                    modifier = Modifier.align(Alignment.Center)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = prop.title,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = BrandCafe,
                                maxLines = 1
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "Zona ${prop.location.zone}, ${prop.location.city}",
                                color = BrandTextSecondary,
                                fontSize = 11.sp,
                                maxLines = 1
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Q ${prop.price}/mes",
                                    color = BrandForest,
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 15.sp
                                )
                                Button(
                                    onClick = { onPropertyClick(prop.id) },
                                    colors = ButtonDefaults.buttonColors(containerColor = BrandForest),
                                    shape = RoundedCornerShape(10.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                                ) {
                                    Text("Ver", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }

                        IconButton(
                            onClick = { selectedPropertyId = null },
                            modifier = Modifier
                                .size(24.dp)
                                .align(Alignment.Top)
                        ) {
                            Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = BrandTextSecondary, modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun EmptyState() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            Icons.Default.Search,
            contentDescription = null,
            modifier = Modifier.size(80.dp),
            tint = BrandTextMuted.copy(alpha = 0.4f)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text("Sin resultados", color = BrandTextPrimary, fontWeight = FontWeight.Black, fontSize = 20.sp)
        Text("Prueba cambiando los filtros o la zona", color = BrandTextSecondary, fontSize = 14.sp)
    }
}
