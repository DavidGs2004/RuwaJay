package com.example.ruwajay.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bathtub
import androidx.compose.material.icons.filled.Bed
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CompareArrows
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.SquareFoot
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalContext
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.ruwajay.data.model.Property
import com.example.ruwajay.ui.theme.BrandBorder
import com.example.ruwajay.ui.theme.BrandBorderLight
import com.example.ruwajay.ui.theme.BrandCafe
import com.example.ruwajay.ui.theme.BrandCrema
import com.example.ruwajay.ui.theme.BrandCremaWarm
import com.example.ruwajay.ui.theme.BrandForest
import com.example.ruwajay.ui.theme.BrandGold
import com.example.ruwajay.ui.theme.BrandGradientSunset
import com.example.ruwajay.ui.theme.BrandJade
import com.example.ruwajay.ui.theme.BrandTerracota
import com.example.ruwajay.ui.theme.BrandTextMuted
import com.example.ruwajay.ui.theme.BrandTextPrimary
import com.example.ruwajay.ui.theme.BrandTextSecondary

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PropertyCard(
    property: Property,
    onClick: () -> Unit,
    onCompareToggle: ((Boolean) -> Unit)? = null,
    isCompared: Boolean = false,
    onFavoriteToggle: ((Boolean) -> Unit)? = null,
    isFavorite: Boolean = false,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(22.dp),
        border = BorderStroke(1.dp, BrandBorderLight),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp, pressedElevation = 6.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column {
            // Contenedor de Imagen con proporción y gradiente idéntico a la web
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(210.dp)
            ) {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(property.images.firstOrNull())
                        .crossfade(true)
                        .build(),
                    contentDescription = property.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )

                // Overlay degradado elegante para contraste
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                listOf(
                                    Color.Black.copy(alpha = 0.30f),
                                    Color.Transparent,
                                    Color.Black.copy(alpha = 0.55f)
                                )
                            )
                        )
                )

                // Badges Superiores Izquierdos (Nuevo, Verificado, Tipo)
                Row(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (property.isNew) {
                        Surface(
                            shape = RoundedCornerShape(50.dp),
                            color = Color.Transparent,
                            modifier = Modifier.background(BrandGradientSunset, RoundedCornerShape(50.dp)),
                            shadowElevation = 2.dp
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.Star, contentDescription = null, tint = Color.White, modifier = Modifier.size(11.dp))
                                Spacer(modifier = Modifier.width(3.dp))
                                Text("Nuevo", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold)
                            }
                        }
                    }

                    if (property.verified) {
                        Surface(
                            shape = RoundedCornerShape(50.dp),
                            color = BrandForest.copy(alpha = 0.92f),
                            shadowElevation = 2.dp
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color.White, modifier = Modifier.size(11.dp))
                                Spacer(modifier = Modifier.width(3.dp))
                                Text("Verificado", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold)
                            }
                        }
                    }
                }

                // Botones Flotantes Superiores Derechos (Comparador + Favorito)
                Row(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (onCompareToggle != null) {
                        Surface(
                            modifier = Modifier
                                .size(38.dp)
                                .clip(CircleShape)
                                .clickable { onCompareToggle(!isCompared) },
                            color = if (isCompared) BrandForest else Color.White.copy(alpha = 0.90f),
                            shape = CircleShape,
                            shadowElevation = 4.dp
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.CompareArrows,
                                    contentDescription = "Comparar",
                                    tint = if (isCompared) Color.White else BrandCafe,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }

                    if (onFavoriteToggle != null) {
                        Surface(
                            modifier = Modifier
                                .size(38.dp)
                                .clip(CircleShape)
                                .clickable { onFavoriteToggle(!isFavorite) },
                            color = if (isFavorite) BrandTerracota else Color.White.copy(alpha = 0.90f),
                            shape = CircleShape,
                            shadowElevation = 4.dp
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    if (isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                                    contentDescription = "Favorito",
                                    tint = if (isFavorite) Color.White else BrandCafe,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }
                }

                // Badge de Precio Flotante en la esquina inferior izquierda
                Surface(
                    modifier = Modifier
                        .padding(12.dp)
                        .align(Alignment.BottomStart),
                    color = Color.White.copy(alpha = 0.95f),
                    shape = RoundedCornerShape(14.dp),
                    shadowElevation = 4.dp,
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.8f))
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Q ${"%,d".format(property.price)}",
                            color = BrandForest,
                            fontSize = 17.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                        Text(
                            text = " / mes",
                            color = BrandTextMuted,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(start = 2.dp)
                        )
                    }
                }
            }

            // Cuerpo de Información de la Propiedad
            Column(modifier = Modifier.padding(16.dp)) {
                // Título
                Text(
                    text = property.title,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = BrandCafe,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 21.sp
                )

                Spacer(modifier = Modifier.height(6.dp))

                // Ubicación con pin terracota
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = BrandTerracota,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "${property.location.zone}, ${property.location.city}",
                        fontSize = 13.sp,
                        color = BrandTextSecondary,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))
                HorizontalDivider(color = BrandBorderLight, thickness = 1.dp)
                Spacer(modifier = Modifier.height(10.dp))

                // Fila de Características (Habitaciones, Baños, Parqueo, Metros)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    PropertyInfoBadge(Icons.Default.Bed, "${property.features.bedrooms}")
                    PropertyInfoBadge(Icons.Default.Bathtub, "${property.features.bathrooms}")
                    if (property.features.parking > 0) {
                        PropertyInfoBadge(Icons.Default.DirectionsCar, "${property.features.parking}")
                    }
                    Spacer(modifier = Modifier.weight(1f))
                    PropertyInfoBadge(Icons.Default.SquareFoot, "${property.features.area} m²")
                }

                // Tags de Categoría, Amueblado, Mascotas
                Spacer(modifier = Modifier.height(10.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // Tag Tipo
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = BrandCremaWarm,
                        border = BorderStroke(1.dp, BrandBorder)
                    ) {
                        Text(
                            text = property.type.replaceFirstChar { it.uppercase() },
                            color = BrandCafe,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }

                    if (property.furnished) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = BrandGold.copy(alpha = 0.12f),
                            border = BorderStroke(1.dp, BrandGold.copy(alpha = 0.3f))
                        ) {
                            Text(
                                text = "Amueblado",
                                color = BrandGold,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }

                    if (property.petsAllowed) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = BrandJade.copy(alpha = 0.10f),
                            border = BorderStroke(1.dp, BrandJade.copy(alpha = 0.25f))
                        ) {
                            Text(
                                text = "🐾 Mascotas",
                                color = BrandJade,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PropertyInfoBadge(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .background(BrandCrema, RoundedCornerShape(8.dp))
            .padding(horizontal = 8.dp, vertical = 5.dp)
    ) {
        Icon(icon, null, tint = BrandForest, modifier = Modifier.size(14.dp))
        Spacer(modifier = Modifier.width(4.dp))
        Text(text = label, fontSize = 12.sp, color = BrandCafe, fontWeight = FontWeight.Bold)
    }
}
