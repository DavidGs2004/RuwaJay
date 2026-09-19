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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ruwajay.R
import com.example.ruwajay.data.repository.rememberProperties
import com.example.ruwajay.ui.components.PropertyCard
import com.example.ruwajay.ui.theme.BrandCafe
import com.example.ruwajay.ui.theme.BrandCrema
import com.example.ruwajay.ui.theme.BrandCremaDark
import com.example.ruwajay.ui.theme.BrandForest
import com.example.ruwajay.ui.theme.BrandForestDark
import com.example.ruwajay.ui.theme.BrandGoldMuted
import com.example.ruwajay.ui.theme.BrandTextPrimary
import com.example.ruwajay.ui.theme.BrandTextSecondary

@Composable
fun HomeScreen(
    onPropertyClick: (String) -> Unit = {},
    onExploreClick: () -> Unit = {}
) {
    var searchText by remember { mutableStateOf("") }

    val popularZones = listOf(
        "Zona 10", "Zona 14", "Zona 15", "San Cristóbal", "Antigua", "Carretera a El Salvador"
    )
    val featuredProperties = rememberProperties().filter { it.status == "disponible" }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandCrema),
        contentPadding = PaddingValues(bottom = 24.dp)
    ) {
        // ── HERO HEADER ──────────────────────────────────────────
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(280.dp)
            ) {
                // Imagen hero igual que la web
                Image(
                    painter = painterResource(id = R.drawable.hero_banner),
                    contentDescription = "Banner RuwaJay",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
                // Overlay degradado oscuro para legibilidad del texto
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    BrandForestDark.copy(alpha = 0.72f),
                                    BrandForest.copy(alpha = 0.55f),
                                    Color.Transparent
                                )
                            )
                        )
                )
                // Contenido sobre la imagen
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 20.dp, vertical = 24.dp),
                    verticalArrangement = Arrangement.SpaceBetween
                ) {
                    // App name con logo
                    Row(verticalAlignment = Alignment.CenterVertically) {
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
                                color = Color.White,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 22.sp
                            )
                            Text(
                                text = "Tu hogar en Guatemala 🇬🇹",
                                color = BrandGoldMuted,
                                fontSize = 11.sp
                            )
                        }
                    }

                    // Headline
                    Column {
                        Text(
                            text = "Encuentra tu hogar",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 28.sp
                        )
                        Text(
                            text = "para vivir indefinidamente",
                            color = BrandGoldMuted,
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Busca casas para alquilar de forma indefinida",
                            color = Color.White.copy(alpha = 0.85f),
                            fontSize = 12.sp
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
                    .padding(horizontal = 16.dp)
                    .offset(y = (-20).dp),
                shape = RoundedCornerShape(20.dp),
                shadowElevation = 8.dp,
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
            PropertyCard(
                property = property,
                onClick = { onPropertyClick(property.id) },
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
            )
        }
    }
}
