package com.example.ruwajay.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.Bathtub
import androidx.compose.material.icons.filled.Bed
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
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
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import android.net.Uri
import androidx.compose.ui.platform.LocalContext
import coil.compose.AsyncImage
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ruwajay.ui.theme.BrandCrema
import com.example.ruwajay.ui.theme.BrandCremaDark
import com.example.ruwajay.ui.theme.BrandForest
import com.example.ruwajay.ui.theme.BrandGold
import com.example.ruwajay.ui.theme.BrandTextPrimary
import com.example.ruwajay.ui.theme.BrandTextSecondary
import com.example.ruwajay.ui.theme.BrandTerracota
import com.example.ruwajay.data.repository.publishProperty

@Composable
fun PublishScreen() {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var price by remember { mutableStateOf("") }
    var deposit by remember { mutableStateOf("") }
    var department by remember { mutableStateOf("Guatemala") }
    var municipality by remember { mutableStateOf("Guatemala") }
    var zone by remember { mutableStateOf("") }
    var approximateAddress by remember { mutableStateOf("") }
    var exactAddress by remember { mutableStateOf("") }
    var bedrooms by remember { mutableStateOf("") }
    var bathrooms by remember { mutableStateOf("") }
    var propertyType by remember { mutableStateOf("casa") }
    var submitted by remember { mutableStateOf(false) }
    var isPublishing by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var selectedImages by remember { mutableStateOf<List<Uri>>(emptyList()) }
    val context = LocalContext.current
    val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetMultipleContents()) { uris ->
        selectedImages = uris.take(10)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandCrema)
            .verticalScroll(rememberScrollState())
    ) {
        // Header
        Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 20.dp)) {
            Text("Publicar tu propiedad", color = BrandTextPrimary, fontWeight = FontWeight.ExtraBold, fontSize = 24.sp)
            Text("Encuentra inquilinos confiables para tu vivienda en Guatemala", color = BrandTextSecondary, fontSize = 13.sp)
        }

        if (submitted) {
            // Success state
            Column(
                modifier = Modifier.fillMaxSize().padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text("🎉", fontSize = 64.sp)
                Spacer(modifier = Modifier.height(16.dp))
                Text("¡Publicación enviada!", fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = BrandForest)
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Tu propiedad será revisada y publicada en las próximas 24 horas.",
                    color = BrandTextSecondary,
                    fontSize = 14.sp
                )
                Spacer(modifier = Modifier.height(24.dp))
                Button(
                    onClick = { submitted = false },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandForest),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("Publicar otra propiedad", fontWeight = FontWeight.Bold)
                }
            }
        } else {
            Column(modifier = Modifier.padding(16.dp)) {
                errorMessage?.let { error ->
                    Text(error, color = BrandTerracota, fontSize = 12.sp, modifier = Modifier.padding(bottom = 8.dp))
                }
                FormSection("Tipo de Propiedad") {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("casa", "apartamento").forEach { type ->
                            FilterChip(
                                selected = propertyType == type,
                                onClick = { propertyType = type },
                                label = { Text(type.replaceFirstChar { it.uppercase() }) },
                                leadingIcon = { Icon(if (type == "casa") Icons.Default.Home else Icons.Default.Bed, null, Modifier.padding(0.dp)) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = BrandTerracota,
                                    selectedLabelColor = Color.White,
                                    selectedLeadingIconColor = Color.White
                                ),
                                border = FilterChipDefaults.filterChipBorder(
                                    enabled = true,
                                    selected = propertyType == type,
                                    selectedBorderColor = BrandTerracota
                                )
                            )
                        }
                    }
                }

                FormSection("Información básica") {
                    FormField("Título de la publicación", title, { title = it }, Icons.Default.Home, "Ej: Casa en Zona 15 con jardín")
                    Spacer(modifier = Modifier.height(10.dp))
                    FormField("Descripción", description, { description = it }, Icons.Default.Description, "Describe las características...", maxLines = 4)
                }

                FormSection("Precio y ubicación") {
                    FormField("Precio mensual (Q)", price, { price = it }, Icons.Default.AttachMoney, "Ej: 4500", keyboardType = KeyboardType.Number)
                    Spacer(modifier = Modifier.height(10.dp))
                    FormField("Depósito (Q)", deposit, { deposit = it }, Icons.Default.AttachMoney, "Ej: 4500", keyboardType = KeyboardType.Number)
                    Spacer(modifier = Modifier.height(10.dp))
                    FormField("Departamento", department, { department = it }, Icons.Default.LocationOn, "Ej: Guatemala")
                    Spacer(modifier = Modifier.height(10.dp))
                    FormField("Municipio", municipality, { municipality = it }, Icons.Default.LocationOn, "Ej: Guatemala")
                    Spacer(modifier = Modifier.height(10.dp))
                    FormField("Zona", zone, { zone = it }, Icons.Default.LocationOn, "Ej: Zona 10")
                    Spacer(modifier = Modifier.height(10.dp))
                    FormField("Dirección aproximada", approximateAddress, { approximateAddress = it }, Icons.Default.LocationOn, "Ej: Cerca de Pradera")
                    Spacer(modifier = Modifier.height(10.dp))
                    FormField("Dirección exacta", exactAddress, { exactAddress = it }, Icons.Default.LocationOn, "Ej: 4ta avenida 3-20")
                }

                FormSection("Características") {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Column(modifier = Modifier.weight(1f)) {
                            FormField("Habitaciones", bedrooms, { bedrooms = it }, Icons.Default.Bed, "0", keyboardType = KeyboardType.Number)
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            FormField("Baños", bathrooms, { bathrooms = it }, Icons.Default.Bathtub, "0", keyboardType = KeyboardType.Number)
                        }
                    }
                }

                // Image upload placeholder
                FormSection("Imágenes") {
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(120.dp)
                            .clickable { imagePicker.launch("image/*") },
                        shape = RoundedCornerShape(14.dp),
                        color = BrandCremaDark
                    ) {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Icon(Icons.Default.Image, null, tint = BrandForest, modifier = Modifier.padding(8.dp))
                            Text("Toca para subir fotos", color = BrandTextSecondary, fontSize = 13.sp)
                            Text("Máximo 10 imágenes", color = BrandTextSecondary, fontSize = 11.sp)
                        }
                    }
                    if (selectedImages.isNotEmpty()) {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(selectedImages) { uri ->
                                AsyncImage(
                                    model = uri,
                                    contentDescription = "Imagen seleccionada",
                                    modifier = Modifier.width(88.dp).height(72.dp)
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))
                Button(
                    onClick = {
                        val numericPrice = price.toIntOrNull()
                        val numericDeposit = deposit.toIntOrNull() ?: 0
                        val numericBedrooms = bedrooms.toIntOrNull()
                        val numericBathrooms = bathrooms.toIntOrNull()
                        if (title.isBlank() || description.isBlank() || department.isBlank() || municipality.isBlank() || zone.isBlank() || approximateAddress.isBlank() || exactAddress.isBlank() || numericPrice == null || numericBedrooms == null || numericBathrooms == null) {
                            errorMessage = "Completa título, descripción, precio, dirección y características."
                            return@Button
                        }

                        isPublishing = true
                        errorMessage = null
                        publishProperty(
                            title = title,
                            description = description,
                            price = numericPrice,
                            deposit = numericDeposit,
                            type = propertyType,
                            department = department,
                            municipality = municipality,
                            zone = zone,
                            approximateAddress = approximateAddress,
                            exactAddress = exactAddress,
                            bedrooms = numericBedrooms,
                            bathrooms = numericBathrooms,
                            imageUris = selectedImages,
                            contentResolver = context.contentResolver,
                            onResult = { result ->
                                isPublishing = false
                                result.onSuccess { submitted = true }
                                    .onFailure { error -> errorMessage = error.localizedMessage ?: "No se pudo publicar la propiedad." }
                            }
                        )
                    },
                    modifier = Modifier.fillMaxWidth().height(54.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BrandTerracota),
                    enabled = !isPublishing
                ) {
                    Text(
                        if (isPublishing) "Publicando..." else "Publicar propiedad",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 16.sp,
                        color = Color.White
                    )
                }
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun FormSection(title: String, content: @Composable () -> Unit) {
    Spacer(modifier = Modifier.height(16.dp))
    Text(title, fontWeight = FontWeight.Bold, color = BrandTextPrimary, fontSize = 15.sp)
    Spacer(modifier = Modifier.height(8.dp))
    content()
}

@Composable
private fun FormField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    placeholder: String,
    maxLines: Int = 1,
    keyboardType: KeyboardType = KeyboardType.Text
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = Modifier.fillMaxWidth(),
        label = { Text(label) },
        leadingIcon = { Icon(icon, null, tint = BrandForest) },
        placeholder = { Text(placeholder, color = BrandTextSecondary) },
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = BrandForest,
            unfocusedBorderColor = BrandCremaDark,
            focusedLabelColor = BrandForest
        ),
        maxLines = maxLines,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType)
    )
}
