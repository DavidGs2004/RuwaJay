package com.example.ruwajay.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Calculator
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.ruwajay.ui.theme.*

@Composable
fun RentCalculatorDialog(
    onDismiss: () -> Unit,
    onApplyFilter: (Int) -> Unit
) {
    var incomeStr by remember { mutableStateOf("10000") }
    var selectedTier by remember { mutableStateOf(0.30) }
    
    val income = incomeStr.toIntOrNull() ?: 0
    val recommended = (income * selectedTier).toInt()
    val maxBudget = (income * 0.38).toInt()
    
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .wrapContentHeight(),
            shape = RoundedCornerShape(24.dp),
            color = Color.White
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            color = BrandForest,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.size(36.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.Calculator, null, tint = Color.White, modifier = Modifier.size(20.dp))
                            }
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            "Calculadora 30/70",
                            fontWeight = FontWeight.ExtraBold,
                            color = BrandCafe,
                            fontSize = 18.sp
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, null, tint = BrandTextMuted)
                    }
                }
                
                Spacer(modifier = Modifier.height(20.dp))
                
                // Input Ingreso
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        "Ingreso mensual neto (Q)",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = BrandTextSecondary
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    OutlinedTextField(
                        value = incomeStr,
                        onValueChange = { if (it.all { c -> c.isDigit() }) incomeStr = it },
                        modifier = Modifier.fillMaxWidth(),
                        prefix = { Text("Q ", fontWeight = FontWeight.Bold, color = BrandForest) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = BrandForest,
                            unfocusedBorderColor = BrandCremaDark
                        )
                    )
                }
                
                Spacer(modifier = Modifier.height(20.dp))
                
                // Tiers
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TierButton(
                        label = "Conservador",
                        percent = "25%",
                        selected = selectedTier == 0.25,
                        onClick = { selectedTier = 0.25 },
                        modifier = Modifier.weight(1f)
                    )
                    TierButton(
                        label = "Recomendado",
                        percent = "30%",
                        selected = selectedTier == 0.30,
                        onClick = { selectedTier = 0.30 },
                        modifier = Modifier.weight(1f)
                    )
                    TierButton(
                        label = "Flexible",
                        percent = "35%",
                        selected = selectedTier == 0.35,
                        onClick = { selectedTier = 0.35 },
                        modifier = Modifier.weight(1f)
                    )
                }
                
                Spacer(modifier = Modifier.height(24.dp))
                
                // Resultados
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    ResultCard(
                        label = "Renta Sugerida",
                        value = "Q $recommended",
                        color = BrandForest,
                        modifier = Modifier.weight(1f)
                    )
                    ResultCard(
                        label = "Tope Máximo",
                        value = "Q $maxBudget",
                        color = BrandTerracota,
                        modifier = Modifier.weight(1f)
                    )
                }
                
                Spacer(modifier = Modifier.height(24.dp))
                
                // Botón Acción
                Button(
                    onClick = { onApplyFilter(maxBudget) },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BrandForest)
                ) {
                    Text("Filtrar por este presupuesto", fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.width(8.dp))
                    Icon(Icons.Default.ArrowForward, null, modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

@Composable
private fun TierButton(
    label: String,
    percent: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        color = if (selected) BrandForest.copy(alpha = 0.1f) else Color.Transparent,
        border = androidx.compose.foundation.BorderStroke(
            width = 1.dp,
            color = if (selected) BrandForest else BrandCremaDark
        )
    ) {
        Column(
            modifier = Modifier.padding(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(percent, fontWeight = FontWeight.ExtraBold, color = if (selected) BrandForest else BrandTextPrimary, fontSize = 16.sp)
            Text(label, fontSize = 10.sp, color = BrandTextSecondary)
        }
    }
}

@Composable
private fun ResultCard(
    label: String,
    value: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .background(color.copy(alpha = 0.05f), RoundedCornerShape(16.dp))
            .border(1.dp, color.copy(alpha = 0.1f), RoundedCornerShape(16.dp))
            .padding(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(label.uppercase(), fontSize = 9.sp, fontWeight = FontWeight.Bold, color = BrandTextMuted, letterSpacing = 1.sp)
        Spacer(modifier = Modifier.height(4.dp))
        Text(value, fontSize = 18.sp, fontWeight = FontWeight.Black, color = color)
    }
}
