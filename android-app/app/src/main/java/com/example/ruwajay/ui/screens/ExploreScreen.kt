package com.example.ruwajay.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Calculator
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CompareArrows
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ruwajay.data.repository.rememberProperties
import com.example.ruwajay.ui.components.PropertyCard
import com.example.ruwajay.ui.components.RentCalculatorDialog
import com.example.ruwajay.ui.components.PropertyCompareDialog
import com.example.ruwajay.ui.theme.*
import com.example.ruwajay.ui.components.OsmMapView
import com.example.ruwajay.ui.components.OsmMarker
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
            // Header
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
                        fontSize = 22.sp
                    )
                    
                    // Toggle Vista
                    Row(
                        modifier = Modifier
                            .background(Color.White, RoundedCornerShape(12.dp))
                            .padding(2.dp)
                    ) {
                        val listSelected = viewMode == "lista"
                        Surface(
                            onClick = { viewMode = "lista" },
                            color = if (listSelected) BrandForest else Color.Transparent,
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(
                                Icons.Default.List,
                                contentDescription = "Lista",
                                tint = if (listSelected) Color.White else BrandTextMuted,
                                modifier = Modifier.padding(8.dp).size(20.dp)
                            )
                        }
                        Surface(
                            onClick = { viewMode = "mapa" },
                            color = if (!listSelected) BrandForest else Color.Transparent,
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(
                                Icons.Default.Map,
                                contentDescription = "Mapa",
                                tint = if (!listSelected) Color.White else BrandTextMuted,
                                modifier = Modifier.padding(8.dp).size(20.dp)
                            )
                        }
                    }
                }
                
                Text(
                    text = "${filtered.size} propiedades encontradas",
                    color = BrandTextSecondary,
                    fontSize = 13.sp
                )
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = searchText,
                    onValueChange = { searchText = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Buscar por zona, tipo...", color = BrandTextMuted) },
                    leadingIcon = {
                        Icon(Icons.Default.Search, contentDescription = null, tint = BrandForest)
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BrandForest,
                        unfocusedBorderColor = BrandCremaDark,
                        focusedTextColor = BrandTextPrimary,
                        unfocusedTextColor = BrandTextPrimary,
                        cursorColor = BrandForest,
                        focusedContainerColor = Color.White,
                        unfocusedContainerColor = Color.White
                    ),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search)
                )
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
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
                                label = {
                                    Text(
                                        text = filter.replaceFirstChar { it.uppercase() },
                                        fontSize = 12.sp
                                    )
                                },
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
                                )
                            )
                        }
                    }
                    
                    // Botón Calculadora
                    IconButton(
                        onClick = { showCalculator = true },
                        modifier = Modifier.background(BrandForest.copy(0.1f), RoundedCornerShape(12.dp))
                    ) {
                        Icon(Icons.Default.Calculator, null, tint = BrandForest)
                    }
                }
                
                if (maxPriceFilter != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    SuggestionChip(
                        onClick = { maxPriceFilter = null },
                        label = { Text("Presupuesto: ≤ Q $maxPriceFilter", fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                        icon = { Icon(Icons.Default.Close, null, modifier = Modifier.size(14.dp)) },
                        colors = SuggestionChipDefaults.suggestionChipColors(containerColor = BrandForest.copy(0.1f), labelColor = BrandForest)
                    )
                }
            }

            // Contenido
            if (filtered.isEmpty()) {
                EmptyState()
            } else if (viewMode == "mapa") {
                ExploreMapView(filtered, onPropertyClick)
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp, bottom = 100.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(filtered) { property ->
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
                            }
                        )
                    }
                }
            }
        }
        
        // Botón Flotante Comparar
        if (comparedPropertyIds.size >= 2) {
            ExtendedFloatingActionButton(
                onClick = { showCompareDialog = true },
                modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 24.dp),
                containerColor = BrandTerracota,
                contentColor = Color.White,
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Default.CompareArrows, null)
                Spacer(Modifier.width(8.dp))
                Text("Comparar ${comparedPropertyIds.size} viviendas", fontWeight = FontWeight.Bold)
            }
        }

        // Diálogo Calculadora
        if (showCalculator) {
            RentCalculatorDialog(
                onDismiss = { showCalculator = false },
                onApplyFilter = { max ->
                    maxPriceFilter = max
                    showCalculator = false
                }
            )
        }

        // Diálogo Comparar
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
fun ExploreMapView(properties: List<com.example.ruwajay.data.model.Property>, onPropertyClick: (String) -> Unit) {
    val guatemalaCity = GeoPoint(14.6349, -90.5069)
    val markers = properties.map { prop ->
        OsmMarker(
            id = prop.id,
            position = GeoPoint(prop.location.coordinates.lat, prop.location.coordinates.lng),
            title = prop.title,
            snippet = "Q ${prop.price}"
        )
    }

    OsmMapView(
        center = guatemalaCity,
        zoom = 12.0,
        markers = markers,
        onMarkerClick = onPropertyClick
    )
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
            modifier = Modifier.size(64.dp),
            tint = BrandTextMuted
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text("No se encontraron propiedades", color = BrandTextPrimary, fontWeight = FontWeight.Bold)
        Text("Intenta con otros filtros", color = BrandTextSecondary, fontSize = 13.sp)
    }
}
