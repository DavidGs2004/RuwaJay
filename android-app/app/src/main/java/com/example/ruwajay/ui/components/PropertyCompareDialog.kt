package com.example.ruwajay.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CompareArrows
import androidx.compose.material.icons.filled.SquareFoot
import androidx.compose.material.icons.filled.Bed
import androidx.compose.material.icons.filled.Bathtub
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.example.ruwajay.data.model.Property
import com.example.ruwajay.ui.theme.*

@Composable
fun PropertyCompareDialog(
    properties: List<Property>,
    onDismiss: () -> Unit,
    onNavigateToDetail: (String) -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = Color.White
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CompareArrows, null, tint = BrandForest)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Comparar Propiedades", fontWeight = FontWeight.Black, fontSize = 20.sp, color = BrandCafe)
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, null)
                    }
                }

                // Table-like comparison
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp)
                ) {
                    // Property Headers (Images + Titles)
                    Row(modifier = Modifier.fillMaxWidth()) {
                        Spacer(modifier = Modifier.width(100.dp)) // Label column
                        properties.forEach { property ->
                            Column(
                                modifier = Modifier.weight(1f).padding(4.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                AsyncImage(
                                    model = property.images.firstOrNull(),
                                    contentDescription = null,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.size(80.dp).background(BrandCrema, RoundedCornerShape(12.dp))
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    property.title,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 2,
                                    textAlign = TextAlign.Center,
                                    lineHeight = 12.sp
                                )
                            }
                        }
                    }

                    Divider(modifier = Modifier.padding(vertical = 12.dp))

                    // Comparison Rows
                    CompareRow("Precio", properties.map { "Q ${it.price}" }, BrandForest)
                    CompareRow("Depósito", properties.map { if (it.deposit != null) "Q ${it.deposit}" else "1 mes" })
                    CompareRow("Zona", properties.map { it.location.zone })
                    CompareRow("Habitaciones", properties.map { "${it.features.bedrooms}" })
                    CompareRow("Baños", properties.map { "${it.features.bathrooms}" })
                    CompareRow("Área", properties.map { "${it.features.area} m²" })
                    CompareRow("Amueblado", properties.map { if (it.amenities.any { a -> a.contains("amueblado", true) }) "Sí" else "No" })
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    // Action Buttons
                    Row(modifier = Modifier.fillMaxWidth()) {
                        Spacer(modifier = Modifier.width(100.dp))
                        properties.forEach { property ->
                            Button(
                                onClick = { onNavigateToDetail(property.id) },
                                modifier = Modifier.weight(1f).padding(4.dp),
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = BrandForest),
                                contentPadding = PaddingValues(4.dp)
                            ) {
                                Text("Ver Ficha", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    // ── CONCLUSIÓN Y VEREDICTO FINAL SEGÚN PRESUPUESTO ──
                    if (properties.size >= 2) {
                        Spacer(modifier = Modifier.height(24.dp))
                        
                        val sortedByEntry = properties.sortedBy { it.price + (it.deposit ?: it.price) }
                        val winner = sortedByEntry.first()
                        val mostExpensive = sortedByEntry.last()
                        val winnerEntryCost = winner.price + (winner.deposit ?: winner.price)
                        val maxEntryCost = mostExpensive.price + (mostExpensive.deposit ?: mostExpensive.price)
                        val savings = maxEntryCost - winnerEntryCost

                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            color = BrandCrema,
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Surface(
                                        color = BrandForest,
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier.size(28.dp)
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text("🏆", fontSize = 14.sp)
                                        }
                                    }
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Column {
                                        Text(
                                            "Conclusión y Veredicto Final",
                                            fontWeight = FontWeight.Black,
                                            fontSize = 14.sp,
                                            color = BrandCafe
                                        )
                                        Text(
                                            "Recomendación para empezar a alquilar",
                                            fontSize = 11.sp,
                                            color = BrandTextSecondary
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(12.dp))

                                Surface(
                                    modifier = Modifier.fillMaxWidth(),
                                    color = Color.White,
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Text(
                                            "Opción Más Conveniente: ${winner.title}",
                                            fontWeight = FontWeight.Black,
                                            fontSize = 13.sp,
                                            color = BrandForest
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            "Para empezar a alquilar cuidando tu presupuesto, esta propiedad es tu mejor elección. Requiere un costo de entrada de Q $winnerEntryCost (1er mes: Q ${winner.price} + Depósito: Q ${winner.deposit ?: winner.price}), ahorrándote Q $savings respecto a la opción de mayor costo para que mantengas liquidez.",
                                            fontSize = 11.sp,
                                            color = BrandTextSecondary,
                                            lineHeight = 15.sp
                                        )

                                        Spacer(modifier = Modifier.height(10.dp))

                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Column {
                                                Text("Costo Inicial Total", fontSize = 9.sp, color = BrandTextMuted)
                                                Text("Q $winnerEntryCost", fontSize = 13.sp, fontWeight = FontWeight.Black, color = BrandForest)
                                            }
                                            if (savings > 0) {
                                                Column(horizontalAlignment = Alignment.End) {
                                                    Text("Ahorro de Entrada", fontSize = 9.sp, color = BrandTextMuted)
                                                    Text("Q $savings", fontSize = 13.sp, fontWeight = FontWeight.Black, color = BrandTerracota)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(40.dp))
                }
            }
        }
    }
}

@Composable
private fun CompareRow(label: String, values: List<String>, valueColor: Color = BrandTextPrimary) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                label,
                modifier = Modifier.width(100.dp),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = BrandTextSecondary
            )
            values.forEach { value ->
                Text(
                    value,
                    modifier = Modifier.weight(1f),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = valueColor,
                    textAlign = TextAlign.Center
                )
            }
        }
        Divider(color = BrandCremaDark.copy(alpha = 0.5f))
    }
}
