package com.example.ruwajay.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import kotlinx.coroutines.delay
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ruwajay.R
import com.example.ruwajay.data.repository.rememberProperties
import com.example.ruwajay.data.repository.rememberSystemUpdates
import com.example.ruwajay.ui.components.PropertyCard
import com.example.ruwajay.ui.theme.BrandCafe
import com.example.ruwajay.ui.theme.BrandCrema
import com.example.ruwajay.ui.theme.BrandCremaDark
import com.example.ruwajay.ui.theme.BrandForest
import com.example.ruwajay.ui.theme.BrandForestDark
import com.example.ruwajay.ui.theme.BrandGold
import com.example.ruwajay.ui.theme.BrandGoldMuted
import com.example.ruwajay.ui.theme.BrandJade
import com.example.ruwajay.ui.theme.BrandTextPrimary
import com.example.ruwajay.ui.theme.BrandTextSecondary
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore

@Composable
fun HomeScreen(
    onPropertyClick: (String) -> Unit = {},
    onExploreClick: () -> Unit = {}
) {
    var searchText by remember { mutableStateOf("") }
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

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandCrema),
        contentPadding = PaddingValues(bottom = 24.dp)
    ) {
        // ── TOP APP BAR ──────────────────────────────────────────
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Image(
                    painter = painterResource(id = R.drawable.ic_logo),
                    contentDescription = "Logo RuwaJay",
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(
                        text = "RuwaJay",
                        color = BrandForestDark,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 22.sp
                    )
                    Text(
                        text = "Tu hogar en Guatemala 🇬🇹",
                        color = BrandGold,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 11.sp
                    )
                }
            }
        }

        // ── HERO BANNER CAROUSEL ─────────────────────────────────
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(2062f / 763f)
            ) {
                // Carrusel de imágenes que se adapta a cualquier tamaño de pantalla
                HorizontalPager(
                    state = pagerState,
                    modifier = Modifier.fillMaxSize()
                ) { page ->
                    Image(
                        painter = painterResource(id = bannerDrawables[page]),
                        contentDescription = "Banner RuwaJay ${page + 1}",
                        contentScale = ContentScale.FillWidth,
                        modifier = Modifier.fillMaxSize()
                    )
                }

                // Indicadores de página (dots) discretos en la parte inferior
                Row(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 6.dp)
                        .background(
                            color = Color.Black.copy(alpha = 0.38f),
                            shape = RoundedCornerShape(12.dp)
                        )
                        .padding(horizontal = 8.dp, vertical = 3.dp),
                    horizontalArrangement = Arrangement.spacedBy(5.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    bannerDrawables.indices.forEach { index ->
                        val isSelected = pagerState.currentPage == index
                        Box(
                            modifier = Modifier
                                .height(4.dp)
                                .width(if (isSelected) 18.dp else 5.dp)
                                .clip(RoundedCornerShape(2.dp))
                                .background(
                                    if (isSelected) Color.White else Color.White.copy(alpha = 0.5f)
                                )
                        )
                    }
                }
            }
        }

        // ── SEARCH BOX ───────────────────────────────────────────
        item {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 4.dp),
                shape = RoundedCornerShape(20.dp),
                shadowElevation = 4.dp,
                color = Color.White
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "¿Dónde quieres vivir?",
                        fontWeight = FontWeight.SemiBold,
                        color = BrandTextPrimary,
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = searchText,
                        onValueChange = { searchText = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Zona, colonia o ciudad...", color = BrandTextSecondary) },
                        leadingIcon = {
                            Icon(Icons.Default.Search, contentDescription = null, tint = BrandForest)
                        },
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = BrandTextPrimary,
                            unfocusedTextColor = BrandTextPrimary,
                            focusedBorderColor = BrandForest,
                            unfocusedBorderColor = BrandCremaDark,
                            focusedContainerColor = Color.White,
                            unfocusedContainerColor = Color.White
                        ),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        keyboardActions = KeyboardActions(onSearch = { onExploreClick() }),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = "Zonas populares",
                        fontSize = 11.sp,
                        color = BrandTextSecondary,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        items(popularZones) { zone ->
                            Surface(
                                shape = RoundedCornerShape(20.dp),
                                color = BrandCremaDark,
                                modifier = Modifier.clickable { searchText = zone }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        Icons.Default.LocationOn,
                                        contentDescription = null,
                                        tint = BrandForest,
                                        modifier = Modifier.size(12.dp)
                                    )
                                    Spacer(modifier = Modifier.width(3.dp))
                                    Text(
                                        text = zone,
                                        fontSize = 11.sp,
                                        color = BrandCafe,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // ── NOVEDADES Y COMUNICADOS DEL SISTEMA ───────────────────
        if (systemUpdates.isNotEmpty()) {
            item {
                Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)) {
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
                                fontWeight = FontWeight.Bold,
                                color = BrandCafe,
                                fontSize = 16.sp
                            )
                        }
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = BrandForest.copy(alpha = 0.1f)
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
                        items(systemUpdates) { update ->
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = Color.White,
                                shadowElevation = 2.dp,
                                modifier = Modifier.width(280.dp)
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
                                        color = BrandCafe,
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

        // ── CATEGORIAS ────────────────────────────────────────────
        item {
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                Text(
                    text = "Descubre casas para alquilar indefinidamente",
                    fontWeight = FontWeight.Bold,
                    color = BrandForest,
                    fontSize = 20.sp
                )
                Spacer(modifier = Modifier.height(10.dp))
                val categories = listOf(
                    featuredProperties.getOrNull(0) to "Casas familiares",
                    featuredProperties.getOrNull(1) to "Casas urbanas",
                    featuredProperties.getOrNull(2) to "Casas acogedoras"
                )
                LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(categories) { (property, title) ->
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = Color.White,
                            shadowElevation = 4.dp,
                            modifier = Modifier.width(220.dp).height(150.dp)
                        ) {
                            Box {
                                if (property != null) {
                                    coil.compose.AsyncImage(
                                        model = property.images.firstOrNull(),
                                        contentDescription = title,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxSize()
                                    )
                                }
                                Box(
                                    modifier = Modifier.fillMaxSize().background(
                                        Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.8f)))
                                    )
                                )
                                Row(
                                    modifier = Modifier.align(Alignment.BottomStart).fillMaxWidth().padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(title, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    Icon(Icons.Default.ChevronRight, contentDescription = null, tint = BrandGoldMuted)
                                }
                            }
                        }
                    }
                }
            }
        }

        // ── PROPIEDADES DESTACADAS ────────────────────────────────
        item {
            Spacer(modifier = Modifier.height(16.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Propiedades disponibles",
                    fontWeight = FontWeight.Bold,
                    color = BrandTextPrimary,
                    fontSize = 18.sp
                )
                Text(
                    text = "Ver todas",
                    color = BrandForest,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.clickable { onExploreClick() }
                )
            }
            Spacer(modifier = Modifier.height(10.dp))
        }

        items(featuredProperties) { property ->
            val isFav = favoriteIds.contains(property.id)
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
                            favoriteRef.set(mapOf("propertyId" to property.id, "createdAt" to System.currentTimeMillis()))
                        }
                    }
                },
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
            )
        }
    }
}
