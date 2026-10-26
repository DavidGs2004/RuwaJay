package com.example.ruwajay.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ruwajay.data.model.Property
import com.example.ruwajay.data.repository.rememberProperties
import com.example.ruwajay.data.repository.rememberSystemUpdates
import com.example.ruwajay.ui.components.*
import com.example.ruwajay.ui.theme.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.delay
import org.osmdroid.util.GeoPoint
import kotlin.math.*

private val GT_DEPARTMENTS_FULL = listOf(
    "Todos", "Guatemala", "Sacatepéquez", "Quetzaltenango", "Chimaltenango", "Escuintla",
    "Alta Verapaz", "Baja Verapaz", "Petén", "San Marcos", "Huehuetenango", "Izabal",
    "Jalapa", "Jutiapa", "Zacapa", "Chiquimula", "El Progreso", "Retalhuleu",
    "Suchitepéquez", "Sololá", "Totonicapán", "Quiché", "Santa Rosa"
)

private val SORT_OPTIONS = listOf(
    "recommended" to "Recomendados",
    "price_asc" to "Precio: menor a mayor",
    "price_desc" to "Precio: mayor a menor",
    "area_desc" to "Mayor área (m²)",
    "bedrooms_desc" to "Más habitaciones",
    "closest" to "Más cercanos"
)

private fun calculateDistKm(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
    val r = 6371.0
    val dLat = Math.toRadians(lat2 - lat1)
    val dLon = Math.toRadians(lon2 - lon1)
    val a = sin(dLat / 2).pow(2) + cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLon / 2).pow(2)
    val c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return r * c
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExploreScreen(
    onPropertyClick: (String) -> Unit = {},
    onPublishClick: () -> Unit = {},
    savedSearchId: String? = null
) {
    var searchText by remember { mutableStateOf("") }
    var selectedTypeFilter by remember { mutableStateOf("todos") }
    var viewMode by remember { mutableStateOf("lista") }
    var showCalculator by remember { mutableStateOf(false) }
    var showSaveSearchModal by remember { mutableStateOf(false) }
    var saveSearchName by remember { mutableStateOf("") }
    var saveSearchNotify by remember { mutableStateOf(true) }
    var comparedPropertyIds by remember { mutableStateOf(setOf<String>()) }
    var showCompareDialog by remember { mutableStateOf(false) }
    val systemUpdates = rememberSystemUpdates(includeInactive = false)
    var showUpdatesModal by remember { mutableStateOf(false) }

    // Radar y GPS
    val gps = rememberGpsPosition()
    var radarActive by remember { mutableStateOf(false) }
    var selectedRadiusKm by remember { mutableStateOf<Int?>(10) }

    // Filtros
    var departmentFilter by remember { mutableStateOf("Todos") }
    var zoneFilter by remember { mutableStateOf("") }
    var minPriceFilter by remember { mutableStateOf("") }
    var maxPriceFilter by remember { mutableStateOf<Double?>(null) }
    var bedroomsFilter by remember { mutableStateOf("") }
    var bathroomsFilter by remember { mutableStateOf("") }
    var petsFilter by remember { mutableStateOf(false) }
    var furnishedFilter by remember { mutableStateOf(false) }
    var parkingFilter by remember { mutableStateOf(false) }
    var verifiedFilter by remember { mutableStateOf(false) }
    var patioFilter by remember { mutableStateOf(false) }
    var securityFilter by remember { mutableStateOf(false) }
    var waterFilter by remember { mutableStateOf(false) }

    // Ordenamiento
    var sortBy by remember { mutableStateOf("recommended") }
    var sortMenuExpanded by remember { mutableStateOf(false) }
    var deptMenuExpanded by remember { mutableStateOf(false) }
    var showAdvancedSheet by remember { mutableStateOf(false) }
    var searchStatusNotice by remember { mutableStateOf<String?>(null) }

    val firebaseUser = FirebaseAuth.getInstance().currentUser
    val firestore = remember { FirebaseFirestore.getInstance() }
    var favoriteIds by remember { mutableStateOf<Set<String>>(emptySet()) }

    val configuration = LocalConfiguration.current
    val isTablet = configuration.screenWidthDp >= 600

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

    LaunchedEffect(savedSearchId) {
        if (savedSearchId != null && firebaseUser != null) {
            firestore.collection("users").document(firebaseUser.uid)
                .collection("saved_searches").document(savedSearchId).get()
                .addOnSuccessListener { snapshot ->
                    val criteria = snapshot.get("filters") as? Map<*, *> ?: emptyMap<Any, Any>()
                    searchText = snapshot.getString("searchQuery") ?: ""
                    selectedTypeFilter = (criteria["type"] as? String)?.takeIf { it.isNotBlank() } ?: "todos"
                    maxPriceFilter = criteria["priceMax"]?.toString()?.toDoubleOrNull()
                    minPriceFilter = criteria["priceMin"]?.toString() ?: ""
                    departmentFilter = (criteria["department"] as? String) ?: "Todos"
                    zoneFilter = (criteria["zone"] as? String) ?: ""
                    bedroomsFilter = criteria["bedrooms"]?.toString() ?: ""
                    bathroomsFilter = criteria["bathrooms"]?.toString() ?: ""
                    patioFilter = criteria["patio"] == true
                    securityFilter = criteria["security"] == true
                    waterFilter = criteria["waterGuaranteed"] == true
                    petsFilter = criteria["petsAllowed"] == true
                    furnishedFilter = criteria["furnished"] == true
                    parkingFilter = criteria["parking"] == true
                    verifiedFilter = criteria["verified"] == true
                }
        }
    }

    val allProperties = rememberProperties()

    // Filtrado y cálculo de distancias
    val filtered = remember(
        allProperties, searchText, selectedTypeFilter, maxPriceFilter, minPriceFilter,
        departmentFilter, zoneFilter, bedroomsFilter, bathroomsFilter, petsFilter,
        furnishedFilter, parkingFilter, verifiedFilter, patioFilter, securityFilter,
        waterFilter, radarActive, selectedRadiusKm, gps.point, sortBy
    ) {
        var list = allProperties.filter { prop ->
            val terms = searchText.trim().split(Regex("[,\\s]+")).filter { it.isNotBlank() }
            val searchableText = "${prop.title} ${prop.location.zone} ${prop.location.city} ${prop.location.approximateAddress.orEmpty()} ${prop.location.department.orEmpty()} ${prop.location.address}"
            val matchesSearch = searchText.isEmpty() ||
                    searchableText.contains(searchText, ignoreCase = true) ||
                    (terms.isNotEmpty() && terms.all { searchableText.contains(it, ignoreCase = true) })

            val matchesType = when (selectedTypeFilter) {
                "todos" -> true
                "disponible", "reservada", "alquilada" -> prop.status == selectedTypeFilter
                else -> prop.type == selectedTypeFilter
            }

            val matchesPriceMax = maxPriceFilter == null || prop.price <= maxPriceFilter!!
            val matchesPriceMin = minPriceFilter.isBlank() || prop.price >= (minPriceFilter.toDoubleOrNull() ?: 0.0)

            val matchesDept = departmentFilter == "Todos" || prop.location.department.equals(departmentFilter, true)
            val matchesZone = zoneFilter.isBlank() ||
                    prop.location.zone.contains(zoneFilter, true) ||
                    prop.location.city.contains(zoneFilter, true)

            val matchesBeds = bedroomsFilter.isBlank() || prop.features.bedrooms >= (bedroomsFilter.toDoubleOrNull() ?: 0.0)
            val matchesBaths = bathroomsFilter.isBlank() || prop.features.bathrooms >= (bathroomsFilter.toDoubleOrNull() ?: 0.0)

            val matchesPets = !petsFilter || prop.petsAllowed
            val matchesFurnished = !furnishedFilter || prop.furnished
            val matchesParking = !parkingFilter || prop.features.parking > 0
            val matchesVerified = !verifiedFilter || prop.verified
            val matchesPatio = !patioFilter || prop.patio
            val matchesSecurity = !securityFilter || prop.amenities.any { it.contains("seguridad", true) || it.contains("garita", true) }
            val matchesWater = !waterFilter || prop.amenities.any { it.contains("agua", true) || it.contains("cisterna", true) }

            // Filtro de Radar GPS
            val matchesRadar = if (radarActive && selectedRadiusKm != null && gps.point != null) {
                val coords = prop.location.mapCoordinates
                if (coords != null) {
                    val dist = calculateDistKm(gps.point!!.latitude, gps.point!!.longitude, coords.lat, coords.lng)
                    dist <= selectedRadiusKm!!
                } else false
            } else true

            matchesSearch && matchesType && matchesPriceMax && matchesPriceMin &&
                    matchesDept && matchesZone && matchesBeds && matchesBaths &&
                    matchesPets && matchesFurnished && matchesParking && matchesVerified &&
                    matchesPatio && matchesSecurity && matchesWater && matchesRadar
        }

        // Ordenamiento
        when (sortBy) {
            "price_asc" -> list.sortedBy { it.price }
            "price_desc" -> list.sortedByDescending { it.price }
            "area_desc" -> list.sortedByDescending { it.features.area }
            "bedrooms_desc" -> list.sortedByDescending { it.features.bedrooms }
            "closest" -> {
                val pt = gps.point
                if (pt != null) {
                    list.sortedBy { prop ->
                        val coords = prop.location.mapCoordinates
                        if (coords != null) calculateDistKm(pt.latitude, pt.longitude, coords.lat, coords.lng)
                        else Double.MAX_VALUE
                    }
                } else list
            }
            else -> list // recommended
        }
    }

    Scaffold(
        topBar = {
            RuwaHeader(
                onExploreClick = {},
                onSystemUpdatesClick = { showUpdatesModal = true }
            )
        },
        containerColor = BrandSurfaceBackground
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize(),
                contentPadding = PaddingValues(bottom = 90.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .widthIn(max = 960.dp)
                            .padding(horizontal = 16.dp, vertical = 14.dp)
                    ) {
                        // Título y Toggle Lista / Mapa
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "Explorar Viviendas",
                                    color = BrandForest,
                                    fontWeight = FontWeight.Black,
                                    fontSize = if (isTablet) 28.sp else 24.sp
                                )
                                Text(
                                    text = "${filtered.size} opciones disponibles en Guatemala",
                                    color = BrandTextSecondary,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            // Switch Vista Lista / Mapa
                            Surface(
                                color = BrandSurfaceElevated,
                                shape = RoundedCornerShape(14.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder),
                                shadowElevation = 2.dp
                            ) {
                                Row(modifier = Modifier.padding(3.dp)) {
                                    val isList = viewMode == "lista"
                                    IconButton(
                                        onClick = { viewMode = "lista" },
                                        modifier = Modifier
                                            .size(36.dp)
                                            .background(
                                                if (isList) BrandForest else Color.Transparent,
                                                RoundedCornerShape(10.dp)
                                            )
                                    ) {
                                        Icon(
                                            Icons.Default.List,
                                            contentDescription = "Lista",
                                            tint = if (isList) Color.White else BrandTextMuted,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                    IconButton(
                                        onClick = { viewMode = "mapa" },
                                        modifier = Modifier
                                            .size(36.dp)
                                            .background(
                                                if (!isList) BrandForest else Color.Transparent,
                                                RoundedCornerShape(10.dp)
                                            )
                                    ) {
                                        Icon(
                                            Icons.Default.Map,
                                            contentDescription = "Mapa",
                                            tint = if (!isList) Color.White else BrandTextMuted,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Barra de búsqueda con limpieza instantánea
                        val focusManager = LocalFocusManager.current
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = BrandSurfaceElevated,
                            border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder),
                            shadowElevation = 2.dp,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            OutlinedTextField(
                                value = searchText,
                                onValueChange = { searchText = it },
                                modifier = Modifier.fillMaxWidth(),
                                placeholder = { Text("Zona, colonia, municipio o departamento...", color = BrandTextMuted, fontSize = 13.sp) },
                                leadingIcon = { Icon(Icons.Default.Search, null, tint = BrandForest) },
                                trailingIcon = {
                                    if (searchText.isNotEmpty()) {
                                        IconButton(onClick = { searchText = "" }) {
                                            Icon(Icons.Default.Close, null, tint = BrandTextMuted)
                                        }
                                    }
                                },
                                shape = RoundedCornerShape(16.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color.Transparent,
                                    unfocusedBorderColor = Color.Transparent,
                                    focusedContainerColor = Color.Transparent,
                                    unfocusedContainerColor = Color.Transparent
                                ),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                                keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus() })
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Radar GPS Proximidad (Exacto a ExplorePage.jsx)
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = if (radarActive) BrandForest.copy(alpha = 0.08f) else BrandSurfaceElevated,
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (radarActive) BrandForest else BrandBorder
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            Icons.Default.GpsFixed,
                                            contentDescription = null,
                                            tint = if (radarActive) BrandForest else BrandTextMuted,
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Spacer(Modifier.width(8.dp))
                                        Text(
                                            text = "Radar de cercanía GPS",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp,
                                            color = BrandTextPrimary
                                        )
                                    }
                                    Switch(
                                        checked = radarActive,
                                        onCheckedChange = { active ->
                                            radarActive = active
                                            if (active && gps.point == null) {
                                                gps.request()
                                            }
                                        },
                                        colors = SwitchDefaults.colors(
                                            checkedThumbColor = Color.White,
                                            checkedTrackColor = BrandForest
                                        )
                                    )
                                }

                                if (radarActive) {
                                    Spacer(Modifier.height(8.dp))
                                    Text(
                                        text = if (gps.point != null) "📍 Buscando viviendas alrededor de tu ubicación actual:"
                                        else "⚠️ Activa el GPS para detectar tu posición",
                                        fontSize = 11.sp,
                                        color = if (gps.point != null) BrandForest else Color(0xFFDC2626),
                                        fontWeight = FontWeight.Bold
                                    )
                                    Spacer(Modifier.height(6.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        listOf(2 to "2 km", 5 to "5 km", 10 to "10 km", 25 to "25 km", null to "Todas").forEach { (rad, radLabel) ->
                                            FilterChip(
                                                selected = selectedRadiusKm == rad,
                                                onClick = { selectedRadiusKm = rad },
                                                label = { Text(radLabel, fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                                                colors = FilterChipDefaults.filterChipColors(
                                                    selectedContainerColor = BrandForest,
                                                    selectedLabelColor = Color.White
                                                )
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Selectores de Departamento y Ordenamiento
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Selector Departamentos de Guatemala
                            Box(modifier = Modifier.weight(1f)) {
                                OutlinedButton(
                                    onClick = { deptMenuExpanded = true },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.outlinedButtonColors(containerColor = BrandSurfaceElevated),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder)
                                ) {
                                    Icon(Icons.Default.Place, null, tint = BrandForest, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text(
                                        text = departmentFilter,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = BrandTextPrimary,
                                        maxLines = 1
                                    )
                                    Spacer(Modifier.weight(1f))
                                    Icon(Icons.Default.ArrowDropDown, null, tint = BrandTextSecondary)
                                }
                                DropdownMenu(
                                    expanded = deptMenuExpanded,
                                    onDismissRequest = { deptMenuExpanded = false }
                                ) {
                                    GT_DEPARTMENTS_FULL.forEach { dept ->
                                        DropdownMenuItem(
                                            text = { Text(dept, fontSize = 13.sp) },
                                            onClick = {
                                                departmentFilter = dept
                                                deptMenuExpanded = false
                                            }
                                        )
                                    }
                                }
                            }

                            // Selector Ordenamiento
                            Box(modifier = Modifier.weight(1f)) {
                                OutlinedButton(
                                    onClick = { sortMenuExpanded = true },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.outlinedButtonColors(containerColor = BrandSurfaceElevated),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder)
                                ) {
                                    Icon(Icons.Default.SwapVert, null, tint = BrandGold, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text(
                                        text = SORT_OPTIONS.find { it.first == sortBy }?.second ?: "Recomendados",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = BrandTextPrimary,
                                        maxLines = 1
                                    )
                                    Spacer(Modifier.weight(1f))
                                    Icon(Icons.Default.ArrowDropDown, null, tint = BrandTextSecondary)
                                }
                                DropdownMenu(
                                    expanded = sortMenuExpanded,
                                    onDismissRequest = { sortMenuExpanded = false }
                                ) {
                                    SORT_OPTIONS.forEach { (key, label) ->
                                        DropdownMenuItem(
                                            text = { Text(label, fontSize = 13.sp) },
                                            onClick = {
                                                sortBy = key
                                                sortMenuExpanded = false
                                            }
                                        )
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Filtros rápidos por Tipo + Botón Filtros Avanzados + Calculadora + Guardar Búsqueda
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            LazyRow(
                                modifier = Modifier.weight(1f),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                items(listOf("todos" to "Todos", "casa" to "Casas", "apartamento" to "Apartamentos", "disponible" to "Disponibles")) { (typeKey, typeLabel) ->
                                    FilterChip(
                                        selected = selectedTypeFilter == typeKey,
                                        onClick = { selectedTypeFilter = typeKey },
                                        label = { Text(typeLabel, fontSize = 12.sp, fontWeight = FontWeight.Bold) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = BrandTerracota,
                                            selectedLabelColor = Color.White
                                        ),
                                        border = FilterChipDefaults.filterChipBorder(
                                            enabled = true,
                                            selected = selectedTypeFilter == typeKey,
                                            selectedBorderColor = BrandTerracota,
                                            borderColor = BrandBorder
                                        ),
                                        shape = RoundedCornerShape(12.dp)
                                    )
                                }
                            }

                            Spacer(Modifier.width(6.dp))

                            // Botón Filtros Avanzados
                            IconButton(
                                onClick = { showAdvancedSheet = true },
                                modifier = Modifier
                                    .size(38.dp)
                                    .background(BrandSurfaceElevated, RoundedCornerShape(12.dp))
                                    .border(1.dp, BrandBorder, RoundedCornerShape(12.dp))
                            ) {
                                Icon(Icons.Default.Tune, null, tint = BrandForest, modifier = Modifier.size(18.dp))
                            }

                            Spacer(Modifier.width(6.dp))

                            // Botón Calculadora
                            IconButton(
                                onClick = { showCalculator = true },
                                modifier = Modifier
                                    .size(38.dp)
                                    .background(BrandForest.copy(alpha = 0.12f), RoundedCornerShape(12.dp))
                            ) {
                                Icon(Icons.Default.Calculate, null, tint = BrandForest, modifier = Modifier.size(18.dp))
                            }

                            Spacer(Modifier.width(6.dp))

                            // Botón Guardar Búsqueda
                            IconButton(
                                onClick = {
                                    if (firebaseUser == null) {
                                        searchStatusNotice = "Inicia sesión para guardar tu búsqueda."
                                    } else {
                                        saveSearchName = searchText.ifBlank { "Búsqueda ${departmentFilter}" }
                                        showSaveSearchModal = true
                                    }
                                },
                                modifier = Modifier
                                    .size(38.dp)
                                    .background(BrandGold.copy(alpha = 0.15f), RoundedCornerShape(12.dp))
                            ) {
                                Icon(Icons.Default.BookmarkAdd, null, tint = BrandGold, modifier = Modifier.size(18.dp))
                            }
                        }

                        // Píldoras de filtros activos con botón 'X' para remover en 1 click
                        val activePills = mutableListOf<Pair<String, () -> Unit>>()
                        if (departmentFilter != "Todos") {
                            activePills.add("Depto: $departmentFilter" to { departmentFilter = "Todos" })
                        }
                        if (zoneFilter.isNotBlank()) {
                            activePills.add("Zona: $zoneFilter" to { zoneFilter = "" })
                        }
                        if (selectedTypeFilter != "todos") {
                            activePills.add("Tipo: $selectedTypeFilter" to { selectedTypeFilter = "todos" })
                        }
                        if (minPriceFilter.isNotBlank()) {
                            activePills.add("Mín: Q $minPriceFilter" to { minPriceFilter = "" })
                        }
                        if (maxPriceFilter != null) {
                            activePills.add("Máx: Q ${maxPriceFilter!!.toInt()}" to { maxPriceFilter = null })
                        }
                        if (bedroomsFilter.isNotBlank()) {
                            activePills.add("$bedroomsFilter+ Habs" to { bedroomsFilter = "" })
                        }
                        if (bathroomsFilter.isNotBlank()) {
                            activePills.add("$bathroomsFilter+ Baños" to { bathroomsFilter = "" })
                        }
                        if (petsFilter) activePills.add("Mascotas" to { petsFilter = false })
                        if (furnishedFilter) activePills.add("Amueblada" to { furnishedFilter = false })
                        if (parkingFilter) activePills.add("Parqueo" to { parkingFilter = false })
                        if (verifiedFilter) activePills.add("Verificada" to { verifiedFilter = false })
                        if (patioFilter) activePills.add("Patio" to { patioFilter = false })
                        if (securityFilter) activePills.add("Seguridad" to { securityFilter = false })
                        if (waterFilter) activePills.add("Agua garantizada" to { waterFilter = false })

                        if (activePills.isNotEmpty()) {
                            Spacer(Modifier.height(8.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                items(activePills) { (label, onRemove) ->
                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = BrandCremaDark,
                                        border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder)
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(label, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BrandTextPrimary)
                                            Spacer(Modifier.width(4.dp))
                                            Icon(
                                                Icons.Default.Close,
                                                contentDescription = "Quitar filtro",
                                                tint = BrandTextSecondary,
                                                modifier = Modifier
                                                    .size(13.dp)
                                                    .clickable { onRemove() }
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        searchStatusNotice?.let { notice ->
                            Spacer(Modifier.height(6.dp))
                            Text(notice, color = BrandForest, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                // Contenido: Lista o Mapa
                if (viewMode == "mapa") {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(540.dp)
                                .padding(horizontal = 16.dp)
                                .clip(RoundedCornerShape(20.dp))
                                .border(1.dp, BrandBorder, RoundedCornerShape(20.dp))
                        ) {
                            val center = if (isInsideGuatemala(gps.point)) gps.point!! else GUATEMALA_CENTER
                            val markers = filtered.mapNotNull { prop ->
                                prop.location.mapCoordinates?.let { c ->
                                    OsmMarker(
                                        id = prop.id,
                                        position = GeoPoint(c.lat, c.lng),
                                        title = "${prop.title} - Q${prop.price.toInt()}",
                                        price = prop.price
                                    )
                                }
                            }
                            OsmMapView(
                                modifier = Modifier.fillMaxSize(),
                                center = center,
                                userPosition = gps.point,
                                markers = markers,
                                onMarkerClick = { markerId -> onPropertyClick(markerId) }
                            )
                        }
                    }
                } else {
                    if (filtered.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 40.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("🏠", fontSize = 48.sp)
                                    Spacer(Modifier.height(10.dp))
                                    Text(
                                        "No encontramos viviendas con estos filtros",
                                        fontWeight = FontWeight.Black,
                                        fontSize = 16.sp,
                                        color = BrandTextPrimary
                                    )
                                    Spacer(Modifier.height(6.dp))
                                    Text(
                                        "Prueba ampliando el radio del radar o quitando algunos filtros.",
                                        fontSize = 13.sp,
                                        color = BrandTextSecondary
                                    )
                                }
                            }
                        }
                    } else {
                        items(filtered, key = { it.id }) { property ->
                            val isFav = favoriteIds.contains(property.id)
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .widthIn(max = 960.dp)
                                    .padding(horizontal = 16.dp, vertical = 6.dp)
                            ) {
                                PropertyCard(
                                    property = property,
                                    onClick = { onPropertyClick(property.id) },
                                    isCompared = comparedPropertyIds.contains(property.id),
                                    onCompareToggle = { toggle ->
                                        comparedPropertyIds = if (toggle) {
                                            if (comparedPropertyIds.size < 3) comparedPropertyIds + property.id else comparedPropertyIds
                                        } else {
                                            comparedPropertyIds - property.id
                                        }
                                    },
                                    isFavorite = isFav,
                                    onFavoriteToggle = { toggle ->
                                        firebaseUser?.let { user ->
                                            val favoriteRef = firestore.collection("users").document(user.uid)
                                                .collection("favorites").document(property.id)
                                            if (!toggle) favoriteRef.delete()
                                            else favoriteRef.set(mapOf("propertyId" to property.id, "createdAt" to System.currentTimeMillis()))
                                        }
                                    }
                                )
                            }
                        }
                    }
                }

                // RuwaFooter al final
                item {
                    Spacer(modifier = Modifier.height(24.dp))
                    RuwaFooter(
                        onExploreClick = {
                            viewMode = "lista"
                            searchText = ""
                        },
                        onMapClick = {
                            viewMode = "mapa"
                        },
                        onPublishClick = onPublishClick,
                        onZoneClick = { zone ->
                            viewMode = "lista"
                            searchText = zone
                        }
                    )
                }
            }

            // Botón flotante Comparar
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
                    Spacer(Modifier.width(8.dp))
                    Text("Comparar ${comparedPropertyIds.size} opciones", fontWeight = FontWeight.Black)
                }
            }
        }
    }

    // Modal de Filtros Avanzados
    if (showAdvancedSheet) {
        AlertDialog(
            onDismissRequest = { showAdvancedSheet = false },
            title = { Text("Filtros Avanzados", fontWeight = FontWeight.Black, color = BrandForest) },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 420.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = zoneFilter,
                        onValueChange = { zoneFilter = it },
                        label = { Text("Zona o sector específico") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = minPriceFilter,
                            onValueChange = { minPriceFilter = it },
                            label = { Text("Precio Mín (Q)") },
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = maxPriceFilter?.toInt()?.toString() ?: "",
                            onValueChange = { maxPriceFilter = it.toDoubleOrNull() },
                            label = { Text("Precio Máx (Q)") },
                            modifier = Modifier.weight(1f)
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = bedroomsFilter,
                            onValueChange = { bedroomsFilter = it },
                            label = { Text("Mín. Habitaciones") },
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = bathroomsFilter,
                            onValueChange = { bathroomsFilter = it },
                            label = { Text("Mín. Baños") },
                            modifier = Modifier.weight(1f)
                        )
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = petsFilter, onCheckedChange = { petsFilter = it })
                        Text("Acepta mascotas", fontSize = 13.sp)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = furnishedFilter, onCheckedChange = { furnishedFilter = it })
                        Text("Amueblada", fontSize = 13.sp)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = parkingFilter, onCheckedChange = { parkingFilter = it })
                        Text("Con parqueo", fontSize = 13.sp)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = patioFilter, onCheckedChange = { patioFilter = it })
                        Text("Con patio / jardín", fontSize = 13.sp)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = securityFilter, onCheckedChange = { securityFilter = it })
                        Text("Seguridad 24/7 / Garita", fontSize = 13.sp)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = waterFilter, onCheckedChange = { waterFilter = it })
                        Text("Agua garantizada / Cisterna", fontSize = 13.sp)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = verifiedFilter, onCheckedChange = { verifiedFilter = it })
                        Text("Casero verificado con DPI", fontSize = 13.sp)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { showAdvancedSheet = false },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandForest)
                ) {
                    Text("Aplicar Filtros", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        petsFilter = false
                        furnishedFilter = false
                        parkingFilter = false
                        patioFilter = false
                        securityFilter = false
                        waterFilter = false
                        verifiedFilter = false
                        zoneFilter = ""
                        minPriceFilter = ""
                        maxPriceFilter = null
                        bedroomsFilter = ""
                        bathroomsFilter = ""
                    }
                ) {
                    Text("Limpiar Todo", color = Color.Red)
                }
            }
        )
    }

    // Modal Guardar Búsqueda
    if (showSaveSearchModal) {
        AlertDialog(
            onDismissRequest = { showSaveSearchModal = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.BookmarkAdd, null, tint = BrandGold)
                    Spacer(Modifier.width(8.dp))
                    Text("Guardar Búsqueda", fontWeight = FontWeight.Black, color = BrandTextPrimary)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        "Guarda tus filtros actuales para recibir avisos cuando se publiquen nuevas viviendas que coincidan.",
                        fontSize = 12.sp,
                        color = BrandTextSecondary
                    )
                    OutlinedTextField(
                        value = saveSearchName,
                        onValueChange = { saveSearchName = it },
                        label = { Text("Nombre de la búsqueda") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Switch(checked = saveSearchNotify, onCheckedChange = { saveSearchNotify = it })
                        Spacer(Modifier.width(8.dp))
                        Text("Notificarme nuevas opciones", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val uid = firebaseUser?.uid
                        if (uid != null) {
                            val criteria = mapOf(
                                "type" to if (selectedTypeFilter in listOf("casa", "apartamento")) selectedTypeFilter else "",
                                "priceMax" to (maxPriceFilter?.toString() ?: ""),
                                "priceMin" to minPriceFilter,
                                "department" to departmentFilter,
                                "zone" to zoneFilter,
                                "bedrooms" to bedroomsFilter,
                                "bathrooms" to bathroomsFilter,
                                "petsAllowed" to petsFilter,
                                "furnished" to furnishedFilter,
                                "parking" to parkingFilter,
                                "verified" to verifiedFilter,
                                "patio" to patioFilter,
                                "security" to securityFilter,
                                "waterGuaranteed" to waterFilter
                            )
                            firestore.collection("users").document(uid).collection("saved_searches").add(
                                mapOf(
                                    "name" to saveSearchName.ifBlank { "Mi búsqueda" },
                                    "searchQuery" to searchText,
                                    "filters" to criteria,
                                    "notifyPush" to saveSearchNotify,
                                    "createdAt" to FieldValue.serverTimestamp()
                                )
                            ).addOnSuccessListener {
                                searchStatusNotice = "¡Búsqueda guardada con éxito!"
                                showSaveSearchModal = false
                            }.addOnFailureListener {
                                searchStatusNotice = "Error: ${it.message}"
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandForest)
                ) {
                    Text("Guardar", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showSaveSearchModal = false }) {
                    Text("Cancelar")
                }
            }
        )
    }

    // Modal Calculadora de Alquiler Asequible
    if (showCalculator) {
        RentCalculatorDialog(
            onDismiss = { showCalculator = false },
            onApplyFilter = { max ->
                maxPriceFilter = max.toDouble()
                showCalculator = false
            }
        )
    }

    // Diálogo Comparar Propiedades
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

    // Modal de Novedades y Comunicados
    if (showUpdatesModal) {
        AlertDialog(
            onDismissRequest = { showUpdatesModal = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("📢", fontSize = 20.sp)
                    Spacer(Modifier.width(8.dp))
                    Text("Novedades RuwaJay", fontWeight = FontWeight.Black, color = BrandForest)
                }
            },
            text = {
                Column(modifier = Modifier.fillMaxWidth().heightIn(max = 380.dp).verticalScroll(rememberScrollState())) {
                    if (systemUpdates.isEmpty()) {
                        Text("No hay novedades recientes en este momento.", color = BrandTextSecondary)
                    } else {
                        systemUpdates.forEach { update ->
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = BrandSurfaceBackground,
                                border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder),
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text(update.title, fontWeight = FontWeight.Bold, color = BrandTextPrimary, fontSize = 14.sp)
                                    Spacer(Modifier.height(4.dp))
                                    Text(update.content, color = BrandTextSecondary, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showUpdatesModal = false }) {
                    Text("Entendido", color = BrandForest, fontWeight = FontWeight.Bold)
                }
            }
        )
    }
}
