package com.example.ruwajay.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ruwajay.R
import com.example.ruwajay.data.repository.rememberProperties
import com.example.ruwajay.data.repository.rememberSystemUpdates
import com.example.ruwajay.ui.components.PropertyCard
import com.example.ruwajay.ui.components.RuwaFooter
import com.example.ruwajay.ui.components.RuwaHeader
import com.example.ruwajay.ui.theme.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.delay

@Composable
fun HomeScreen(
    onPropertyClick: (String) -> Unit = {},
    onExploreClick: () -> Unit = {},
    onCategoryClick: (String) -> Unit = { onExploreClick() },
    onPublishClick: () -> Unit = {},
    onMapClick: () -> Unit = {},
    onZoneClick: (String) -> Unit = {}
) {
    val focusManager = LocalFocusManager.current
    var searchText by remember { mutableStateOf("") }
    val firebaseUser = FirebaseAuth.getInstance().currentUser
    val firestore = remember { FirebaseFirestore.getInstance() }
    var favoriteIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var showUpdatesModal by remember { mutableStateOf(false) }

    val configuration = LocalConfiguration.current
    val screenWidth = configuration.screenWidthDp.dp
    val isTablet = screenWidth >= 600.dp

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

    val popularZones = listOf(
        "Zona 10", "Zona 14", "Zona 15", "San Cristóbal", "Antigua", "Carretera a El Salvador"
    )
    val featuredProperties = rememberProperties().filter { it.status == "disponible" }
    val systemUpdates = rememberSystemUpdates(includeInactive = false)

    val bannerDrawables = listOf(
        R.drawable.banner_1,
        R.drawable.banner_2,
        R.drawable.banner_3,
        R.drawable.banner_4,
        R.drawable.banner_5
    )
    val pagerState = rememberPagerState(pageCount = { bannerDrawables.size })

    LaunchedEffect(pagerState) {
        while (true) {
            delay(5000)
            val nextPage = (pagerState.currentPage + 1) % bannerDrawables.size
            pagerState.animateScrollToPage(nextPage)
        }
    }

    Scaffold(
        topBar = {
            RuwaHeader(
                onExploreClick = onExploreClick,
                onSystemUpdatesClick = { showUpdatesModal = true }
            )
        },
        containerColor = BrandSurfaceBackground
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = PaddingValues(bottom = 0.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // ── HERO BANNER CAROUSEL CON TEXTO Y CTA EXACTO A LA WEB ──────────
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(if (isTablet) 360.dp else 260.dp)
                ) {
                    HorizontalPager(
                        state = pagerState,
                        modifier = Modifier.fillMaxSize()
                    ) { page ->
                        Image(
                            painter = painterResource(id = bannerDrawables[page]),
                            contentDescription = "Banner RuwaJay ${page + 1}",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                    }

                    // Gradiente superpuesto idéntico al Hero de la web
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.horizontalGradient(
                                    colors = listOf(
                                        Color.Black.copy(alpha = 0.82f),
                                        Color.Black.copy(alpha = 0.45f),
                                        Color.Black.copy(alpha = 0.15f)
                                    )
                                )
                            )
                    )

                    // Texto e invitación a explorar
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = if (isTablet) 36.dp else 20.dp, vertical = 20.dp)
                            .widthIn(max = 500.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.Start
                    ) {
                        Text(
                            text = "TU HOGAR, TU CAMINO",
                            color = BrandGoldLight,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = if (isTablet) 14.sp else 11.sp,
                            letterSpacing = 1.8.sp
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Encuentra tu hogar para vivir indefinidamente",
                            color = Color.White,
                            fontWeight = FontWeight.Black,
                            fontSize = if (isTablet) 30.sp else 22.sp,
                            lineHeight = if (isTablet) 36.sp else 28.sp
                        )
                        Spacer(modifier = Modifier.height(14.dp))
                        Button(
                            onClick = onExploreClick,
                            shape = RoundedCornerShape(24.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.White,
                                contentColor = BrandForest
                            ),
                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp),
                            contentPadding = PaddingValues(horizontal = 22.dp, vertical = 10.dp)
                        ) {
                            Text(
                                text = "Explorar hogares",
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = if (isTablet) 14.sp else 12.sp
                            )
                        }
                    }

                    // Indicadores de slide (dots)
                    Row(
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .padding(bottom = 10.dp)
                            .background(Color.Black.copy(alpha = 0.35f), RoundedCornerShape(12.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        bannerDrawables.indices.forEach { index ->
                            val isSelected = pagerState.currentPage == index
                            Box(
                                modifier = Modifier
                                    .height(5.dp)
                                    .width(if (isSelected) 22.dp else 6.dp)
                                    .clip(RoundedCornerShape(3.dp))
                                    .background(if (isSelected) Color.White else Color.White.copy(alpha = 0.5f))
                            )
                        }
                    }
                }
            }

            // ── BUSCADOR ELEVADO CON ZONAS POPULARES ──────────────────────────
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .widthIn(max = 900.dp)
                        .padding(horizontal = 16.dp, vertical = 14.dp)
                ) {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        shadowElevation = 3.dp,
                        color = BrandSurfaceElevated,
                        border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = "¿Dónde quieres vivir?",
                                fontWeight = FontWeight.ExtraBold,
                                color = BrandTextPrimary,
                                fontSize = if (isTablet) 16.sp else 14.sp
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            OutlinedTextField(
                                value = searchText,
                                onValueChange = { searchText = it },
                                modifier = Modifier.fillMaxWidth(),
                                placeholder = {
                                    Text("Zona, colonia, municipio o departamento...", color = BrandTextMuted, fontSize = 13.sp)
                                },
                                leadingIcon = {
                                    Icon(Icons.Default.Search, contentDescription = null, tint = BrandForest)
                                },
                                shape = RoundedCornerShape(14.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedTextColor = BrandTextPrimary,
                                    unfocusedTextColor = BrandTextPrimary,
                                    focusedBorderColor = BrandForest,
                                    unfocusedBorderColor = BrandBorder,
                                    focusedContainerColor = BrandSurface,
                                    unfocusedContainerColor = BrandSurface
                                ),
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                                keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus(); onExploreClick() }),
                                singleLine = true
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            Text(
                                text = "Zonas populares en Guatemala",
                                fontSize = 11.sp,
                                color = BrandTextSecondary,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                items(popularZones, key = { it }) { zone ->
                                    Surface(
                                        shape = RoundedCornerShape(20.dp),
                                        color = BrandSurfaceBackground,
                                        border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder),
                                        modifier = Modifier.clickable {
                                            searchText = zone
                                            onExploreClick()
                                        }
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Icon(
                                                Icons.Default.LocationOn,
                                                contentDescription = null,
                                                tint = BrandForest,
                                                modifier = Modifier.size(13.dp)
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text(
                                                text = zone,
                                                fontSize = 11.sp,
                                                color = BrandTextPrimary,
                                                fontWeight = FontWeight.SemiBold
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // ── NOVEDADES Y COMUNICADOS OFICIALES ─────────────────────────────
            if (systemUpdates.isNotEmpty()) {
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .widthIn(max = 900.dp)
                            .padding(horizontal = 16.dp, vertical = 6.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("📢", fontSize = 16.sp)
                                Spacer(Modifier.width(6.dp))
                                Text(
                                    text = "Novedades y Actualizaciones",
                                    fontWeight = FontWeight.Black,
                                    color = BrandTextPrimary,
                                    fontSize = if (isTablet) 18.sp else 16.sp
                                )
                            }
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = BrandForest.copy(alpha = 0.12f)
                            ) {
                                Text(
                                    text = "Oficial",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = BrandForest,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            items(systemUpdates, key = { it.id }) { update ->
                                Surface(
                                    shape = RoundedCornerShape(16.dp),
                                    color = BrandSurfaceElevated,
                                    border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder),
                                    shadowElevation = 2.dp,
                                    modifier = Modifier.width(if (isTablet) 320.dp else 280.dp)
                                ) {
                                    Column(modifier = Modifier.padding(14.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Surface(
                                                color = when (update.category) {
                                                    "alerta" -> Color(0xFFFEE2E2)
                                                    "mantenimiento" -> Color(0xFFFEF3C7)
                                                    "mejora" -> Color(0xFFDBEAFE)
                                                    else -> BrandJade.copy(alpha = 0.15f)
                                                },
                                                shape = RoundedCornerShape(6.dp)
                                            ) {
                                                Text(
                                                    update.category.uppercase(),
                                                    color = when (update.category) {
                                                        "alerta" -> Color(0xFFDC2626)
                                                        "mantenimiento" -> Color(0xFFB45309)
                                                        "mejora" -> Color(0xFF1D4ED8)
                                                        else -> BrandForest
                                                    },
                                                    fontWeight = FontWeight.Black,
                                                    fontSize = 9.sp,
                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                )
                                            }

                                            if (update.priority == "urgente") {
                                                Surface(
                                                    color = Color(0xFFDC2626),
                                                    shape = RoundedCornerShape(6.dp)
                                                ) {
                                                    Text(
                                                        "URGENTE",
                                                        color = Color.White,
                                                        fontWeight = FontWeight.Black,
                                                        fontSize = 9.sp,
                                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                    )
                                                }
                                            }
                                        }

                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text(
                                            text = update.title,
                                            fontWeight = FontWeight.Bold,
                                            color = BrandTextPrimary,
                                            fontSize = 14.sp,
                                            maxLines = 1
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = update.content,
                                            color = BrandTextSecondary,
                                            fontSize = 12.sp,
                                            lineHeight = 16.sp,
                                            maxLines = 3
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // ── CATEGORIAS CON LINK Y GRADIENTE IDÉNTICO A LA WEB ─────────────
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .widthIn(max = 900.dp)
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    Text(
                        text = "Descubre casas para alquilar indefinidamente",
                        fontWeight = FontWeight.Black,
                        color = BrandForest,
                        fontSize = if (isTablet) 24.sp else 20.sp,
                        lineHeight = if (isTablet) 30.sp else 26.sp
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    val categories = listOf(
                        Triple("Casas familiares", R.drawable.banner_1, "casa"),
                        Triple("Casas urbanas", R.drawable.banner_2, "apartamento"),
                        Triple("Casas acogedoras", R.drawable.banner_3, "amueblado")
                    )

                    if (isTablet) {
                        // Disposición en cuadrícula para tablets
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            categories.forEach { (title, drawableId, typeFilter) ->
                                CategoryCard(
                                    title = title,
                                    drawableId = drawableId,
                                    modifier = Modifier.weight(1f).height(170.dp),
                                    onClick = { onCategoryClick(typeFilter) }
                                )
                            }
                        }
                    } else {
                        // Disposición en carrusel horizontal fluido para teléfonos
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            items(categories, key = { it.first }) { (title, drawableId, typeFilter) ->
                                CategoryCard(
                                    title = title,
                                    drawableId = drawableId,
                                    modifier = Modifier.width(230.dp).height(150.dp),
                                    onClick = { onCategoryClick(typeFilter) }
                                )
                            }
                        }
                    }
                }
            }

            // ── SECCIÓN BENEFICIOS (ENTENDEMOS POR QUÉ...) ────────────────────
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .widthIn(max = 900.dp)
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    Text(
                        text = "Entendemos por qué quieres alquilar indefinidamente",
                        fontWeight = FontWeight.Black,
                        color = BrandForest,
                        fontSize = if (isTablet) 24.sp else 20.sp,
                        lineHeight = if (isTablet) 30.sp else 26.sp
                    )
                    Spacer(modifier = Modifier.height(14.dp))

                    val benefits = listOf(
                        Triple(
                            Icons.Default.Home,
                            "Estabilidad de un hogar",
                            "Contratos y alquileres pensados para tu tranquilidad y la de tu familia."
                        ),
                        Triple(
                            Icons.Default.AttachMoney,
                            "Presupuesto predecible",
                            "Conoce la cuota exacta de tu mensualidad sin tarifas sorpresas ni costos ocultos."
                        ),
                        Triple(
                            Icons.Default.Autorenew,
                            "Flexibilidad y comodidad",
                            "Elige el espacio ideal con todas las comodidades cerca de tu área diaria."
                        )
                    )

                    if (isTablet) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            benefits.forEach { (icon, bTitle, bDesc) ->
                                BenefitCard(
                                    icon = icon,
                                    title = bTitle,
                                    desc = bDesc,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            benefits.forEach { (icon, bTitle, bDesc) ->
                                BenefitCard(
                                    icon = icon,
                                    title = bTitle,
                                    desc = bDesc,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }
                    }
                }
            }

            // ── PROPIEDADES DISPONIBLES EN TIEMPO REAL ────────────────────────
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .widthIn(max = 900.dp)
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Propiedades disponibles",
                            fontWeight = FontWeight.Black,
                            color = BrandTextPrimary,
                            fontSize = if (isTablet) 20.sp else 18.sp
                        )
                        Text(
                            text = "Ver todas",
                            color = BrandForest,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .clickable { onExploreClick() }
                                .padding(4.dp)
                        )
                    }
                }
            }

            items(featuredProperties, key = { it.id }) { property ->
                val isFav = favoriteIds.contains(property.id)
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .widthIn(max = 900.dp)
                        .padding(horizontal = 16.dp, vertical = 6.dp)
                ) {
                    PropertyCard(
                        property = property,
                        onClick = { onPropertyClick(property.id) },
                        isFavorite = isFav,
                        onFavoriteToggle = { toggle ->
                            firebaseUser?.let { user ->
                                val favoriteRef = firestore.collection("users").document(user.uid)
                                    .collection("favorites").document(property.id)
                                if (!toggle) {
                                    favoriteRef.delete()
                                } else {
                                    favoriteRef.set(
                                        mapOf("propertyId" to property.id, "createdAt" to System.currentTimeMillis())
                                    )
                                }
                            }
                        }
                    )
                }
            }

            // ── PIE DE PÁGINA (RUWA FOOTER) ──────────────────────────────────
            item {
                Spacer(modifier = Modifier.height(24.dp))
                RuwaFooter(
                    onExploreClick = onExploreClick,
                    onPublishClick = onPublishClick,
                    onMapClick = onMapClick,
                    onZoneClick = onZoneClick
                )
            }
        }
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

@Composable
private fun CategoryCard(
    title: String,
    drawableId: Int,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = BrandSurfaceElevated,
        border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder),
        shadowElevation = 3.dp,
        modifier = modifier.clickable { onClick() }
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            Image(
                painter = painterResource(id = drawableId),
                contentDescription = title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Transparent, Color.Black.copy(alpha = 0.85f))
                        )
                    )
            )
            Row(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = title,
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 15.sp
                )
                Surface(
                    shape = CircleShape,
                    color = Color.White.copy(alpha = 0.25f),
                    modifier = Modifier.size(32.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            Icons.Default.ChevronRight,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun BenefitCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    desc: String,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = BrandSurfaceElevated,
        border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder),
        shadowElevation = 1.dp,
        modifier = modifier
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.Top
        ) {
            // Contenedor circular dorado idéntico a HomePage.jsx
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(BrandGold.copy(alpha = 0.2f))
                    .border(2.dp, BrandGold, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = BrandForest,
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(14.dp))

            Column {
                Text(
                    text = title,
                    fontWeight = FontWeight.Black,
                    color = BrandTextPrimary,
                    fontSize = 15.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = desc,
                    fontWeight = FontWeight.SemiBold,
                    color = BrandTextSecondary,
                    fontSize = 12.sp,
                    lineHeight = 17.sp
                )
            }
        }
    }
}
