package com.example.ruwajay.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bathtub
import androidx.compose.material.icons.filled.Bed
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.SquareFoot
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.ruwajay.data.model.Property
import com.example.ruwajay.ui.theme.BrandCafe
import com.example.ruwajay.ui.theme.BrandCremaDark
import com.example.ruwajay.ui.theme.BrandForest
import com.example.ruwajay.ui.theme.BrandGold
import com.example.ruwajay.ui.theme.BrandTextMuted
import com.example.ruwajay.ui.theme.BrandTextPrimary
import com.example.ruwajay.ui.theme.BrandTextSecondary

import androidx.compose.material.icons.filled.CompareArrows
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.IconButton

@Composable
fun PropertyCard(
    property: Property,
    onClick: () -> Unit,
    onCompareToggle: ((Boolean) -> Unit)? = null,
    isCompared: Boolean = false,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column {
            // Imagen principal
            Box(modifier = Modifier.fillMaxWidth().height(200.dp)) {
                AsyncImage(
                    model = property.images.firstOrNull(),
                    contentDescription = property.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxWidth().height(200.dp)
                        .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp))
                )
                Box(
                    modifier = Modifier.fillMaxWidth().height(200.dp).background(
                        Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.55f)))
                    )
                )
                // Badge de tipo
                Surface(
                    modifier = Modifier.padding(12.dp).align(Alignment.TopStart),
                    color = BrandForest,
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = property.type.replaceFirstChar { it.uppercase() },
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }

                // Selector de Comparar
                if (onCompareToggle != null) {
                    Surface(
                        modifier = Modifier
                            .padding(12.dp)
                            .align(Alignment.TopEnd)
                            .clickable { onCompareToggle(!isCompared) },
                        color = if (isCompared) BrandTerracota else Color.Black.copy(0.4f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.CompareArrows,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                "Comparar",
                                color = Color.White,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
                // Badge de estado si no es disponible
                if (property.status != "disponible") {
                    Surface(
                        modifier = Modifier.padding(12.dp).align(Alignment.TopEnd),
                        color = if (property.status == "reservada") Color(0xFFF59E0B) else Color(0xFFEF4444),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = property.status.replaceFirstChar { it.uppercase() },
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
                Surface(
                    modifier = Modifier.padding(12.dp).align(Alignment.BottomStart),
                    color = Color.White.copy(alpha = 0.95f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.Bottom
                    ) {
                        Text(
                            text = "Q ${"%,d".format(property.price)}",
                            color = BrandForest,
                            fontSize = 17.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                        Text(" / mes", color = BrandTextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Column(modifier = Modifier.padding(14.dp)) {
                Text(
                    text = property.title,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = BrandTextPrimary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = BrandTextMuted,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(2.dp))
                    Text(
                        text = "${property.location.zone}, ${property.location.city}",
                        fontSize = 12.sp,
                        color = BrandTextMuted,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Spacer(modifier = Modifier.height(10.dp))
                // Amenities row
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    AmenityChip(icon = Icons.Default.Bed, label = "${property.features.bedrooms} hab")
                    AmenityChip(icon = Icons.Default.Bathtub, label = "${property.features.bathrooms} baños")
                    AmenityChip(icon = Icons.Default.SquareFoot, label = "${property.features.area} m²")
                }
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = property.location.city,
                        fontSize = 12.sp,
                        color = BrandTextSecondary
                    )
                }
            }
        }
    }
}

@Composable
fun AmenityChip(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .background(BrandCremaDark, RoundedCornerShape(6.dp))
            .padding(horizontal = 7.dp, vertical = 4.dp)
    ) {
        Icon(icon, contentDescription = null, tint = BrandCafe, modifier = Modifier.size(13.dp))
        Spacer(modifier = Modifier.width(3.dp))
        Text(text = label, fontSize = 11.sp, color = BrandCafe, fontWeight = FontWeight.Medium)
    }
}
