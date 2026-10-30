package com.example.ruwajay.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.ruwajay.data.model.Coordinates
import com.example.ruwajay.data.repository.publishProperty
import com.example.ruwajay.data.repository.rememberProperties
import com.example.ruwajay.ui.components.OsmLocationPickerMap
import com.example.ruwajay.ui.components.RuwaFooter
import com.example.ruwajay.ui.components.RuwaHeader
import com.example.ruwajay.ui.theme.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import org.osmdroid.util.GeoPoint

private val GT_DEPARTMENTS = listOf(
    "Guatemala", "Sacatepéquez", "Quetzaltenango", "Chimaltenango", "Escuintla",
    "Sololá", "Petén", "Alta Verapaz", "Baja Verapaz", "Izabal", "Zacapa",
    "Chiquimula", "Santa Rosa", "Jutiapa", "Jalapa", "Suchitepéquez", "Retalhuleu",
    "San Marcos", "Huehuetenango", "Quiché", "Totonicapán", "El Progreso"
)

private val AVAILABLE_SERVICES_LIST = listOf(
    "Agua potable 24/7",
    "Extracción de basura",
    "Seguridad privada y garita",
    "Internet fibra óptica",
    "Mantenimiento de áreas comunes",
    "Cable TV",
    "Energía eléctrica independiente",
    "Cisterna y bomba de agua"
)

private val SAMPLE_DEMO_IMAGES = listOf(
    "Fachada Principal" to "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
    "Sala y Comedor" to "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80",
    "Cocina Equipada" to "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
    "Dormitorio Principal" to "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PublishScreen(
    propertyId: String? = null,
    onNavigateToVerification: () -> Unit = {},
    onNavigateToProfile: () -> Unit = {}
) {
    val auth = FirebaseAuth.getInstance()
    val firestore = FirebaseFirestore.getInstance()
    val currentUser = auth.currentUser

    var userData by remember { mutableStateOf<Map<String, Any>?>(null) }
    var isCheckingUser by remember { mutableStateOf(true) }

    DisposableEffect(currentUser?.uid) {
        val uid = currentUser?.uid
        if (uid != null) {
            val listener = firestore.collection("users").document(uid)
                .addSnapshotListener { snapshot, error ->
                    isCheckingUser = false
                    if (error == null && snapshot != null) {
                        userData = snapshot.data
                    }
                }
            onDispose { listener.remove() }
        } else {
            isCheckingUser = false
            userData = null
            onDispose {}
        }
    }

    val userRole = (userData?.get("role") as? String) ?: "seeker"
    val isSuperAdmin = userRole == "admin"
    val isVerified = (userData?.get("verified") as? Boolean) == true
    val verificationStatus = (userData?.get("verificationStatus") as? String).orEmpty()
    val accountStatus = com.example.ruwajay.data.model.resolveAccountStatus(userData)
    val isSuspended = accountStatus == "suspended"

    // Wizard Step: 1 = Tipo y Ubicación, 2 = Espacios y Servicios, 3 = Precios y Fotos, 4 = Revisión final
    var currentStep by remember { mutableIntStateOf(1) }

    // Form fields
    var propertyType by remember { mutableStateOf("casa") }
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var department by remember { mutableStateOf("Guatemala") }
    var municipality by remember { mutableStateOf("Guatemala") }
    var zone by remember { mutableStateOf("Zona 10") }
    var approximateAddress by remember { mutableStateOf("") }
    var exactAddress by remember { mutableStateOf("") }
    var pickedGeoPoint by remember { mutableStateOf<GeoPoint?>(GeoPoint(14.6349, -90.5069)) }

    // Step 2
    var bedrooms by remember { mutableStateOf("2") }
    var bathrooms by remember { mutableStateOf("1") }
    var area by remember { mutableStateOf("85") }
    var parking by remember { mutableStateOf("1") }
    var furnished by remember { mutableStateOf(false) }
    var petsAllowed by remember { mutableStateOf(true) }
    var patio by remember { mutableStateOf(false) }
    var selectedServices by remember { mutableStateOf(setOf("Agua potable 24/7", "Extracción de basura")) }

    // Step 3
    var price by remember { mutableStateOf("") }
    var deposit by remember { mutableStateOf("") }
    var maintenance by remember { mutableStateOf("0") }
    var selectedImages by remember { mutableStateOf<List<Uri>>(emptyList()) }
    var retainedImages by remember { mutableStateOf<List<String>>(emptyList()) }
    var coverImageIndex by remember { mutableIntStateOf(0) }

    // Submisión
    var submitted by remember { mutableStateOf(false) }
    var confirmPublication by remember { mutableStateOf(false) }
    var isPublishing by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var deptExpanded by remember { mutableStateOf(false) }

    val existing = rememberProperties().find { it.id == propertyId }
    LaunchedEffect(existing?.id) {
        if (existing != null) {
            title = existing.title
            description = existing.description
            price = existing.price.toInt().toString()
            deposit = (existing.deposit ?: existing.price).toInt().toString()
            department = existing.location.department ?: "Guatemala"
            municipality = existing.location.city
            zone = existing.location.zone
            approximateAddress = existing.location.approximateAddress ?: ""
            exactAddress = existing.location.exactAddress ?: ""
            bedrooms = existing.features.bedrooms.toString()
            bathrooms = existing.features.bathrooms.toString()
            propertyType = existing.type
            area = existing.features.area.toInt().toString()
            parking = existing.features.parking.toString()
            maintenance = existing.maintenanceFee.toInt().toString()
            selectedServices = existing.amenities.toSet()
            furnished = existing.furnished
            petsAllowed = existing.petsAllowed
            retainedImages = existing.images
            pickedGeoPoint = existing.location.mapCoordinates?.let { GeoPoint(it.lat, it.lng) }
        }
    }

    val context = LocalContext.current
    val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetMultipleContents()) { uris ->
        val remainingSlots = 8 - (retainedImages.size + selectedImages.size)
        selectedImages = (selectedImages + uris).take(8)
    }

    val configuration = LocalConfiguration.current
    val isTablet = configuration.screenWidthDp >= 600

    fun submitPublication() {
        if (isPublishing) return
        if (isCheckingUser || auth.currentUser?.uid != currentUser?.uid || currentUser == null || isSuspended || accountStatus != "active" ||
            !(userRole == "admin" || isSuperAdmin || (isVerified && verificationStatus !in listOf("pendiente", "rechazada")))) {
            errorMessage = "Tu cuenta debe estar activa y la verificación debe estar aprobada para publicar."
            return
        }
        isPublishing = true
        errorMessage = null
        publishProperty(
            propertyId = propertyId,
            title = title,
            description = description,
            price = price.toDoubleOrNull() ?: 0.0,
            deposit = deposit.toDoubleOrNull() ?: (price.toDoubleOrNull() ?: 0.0),
            maintenanceFee = maintenance.toDoubleOrNull() ?: 0.0,
            department = department,
            municipality = municipality,
            zone = zone,
            approximateAddress = approximateAddress,
            exactAddress = exactAddress,
            bedrooms = bedrooms.toIntOrNull() ?: 1,
            bathrooms = bathrooms.toIntOrNull() ?: 1,
            area = area.toDoubleOrNull() ?: 60.0,
            parking = parking.toIntOrNull() ?: 0,
            furnished = furnished,
            petsAllowed = petsAllowed,
            type = propertyType,
            amenities = selectedServices.toList(),
            coordinates = pickedGeoPoint?.let { Coordinates(it.latitude, it.longitude) },
            imageUris = selectedImages,
            retainedImages = retainedImages,
            contentResolver = context.contentResolver,
            onResult = { result ->
                isPublishing = false
                result.onSuccess {
                    submitted = true
                }.onFailure { err ->
                    errorMessage = "Error al publicar: ${err.message}"
                }
            }
        )
    }

    Scaffold(
        topBar = {
            RuwaHeader()
        },
        containerColor = BrandSurfaceBackground
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 840.dp)
                    .padding(16.dp)
            ) {
                // Título
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = if (propertyId != null) "Editar Vivienda" else "Publicar Vivienda",
                            fontWeight = FontWeight.Black,
                            fontSize = if (isTablet) 28.sp else 22.sp,
                            color = BrandTextPrimary
                        )
                        Text(
                            text = "Anuncia tu inmueble en alquiler en toda Guatemala",
                            fontSize = 12.sp,
                            color = BrandTextSecondary
                        )
                    }
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = BrandForest.copy(alpha = 0.12f)
                    ) {
                        Icon(
                            Icons.Default.HomeWork,
                            contentDescription = null,
                            tint = BrandForest,
                            modifier = Modifier.padding(10.dp).size(24.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Validaciones de cuenta
                if (isCheckingUser) {
                    CircularProgressIndicator(modifier = Modifier.padding(24.dp))
                    return@Column
                }
                if (currentUser == null) {
                    Surface(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 20.dp),
                        shape = RoundedCornerShape(20.dp),
                        color = BrandSurfaceElevated,
                        border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder)
                    ) {
                        Column(modifier = Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.Lock, null, tint = BrandTerracota, modifier = Modifier.size(44.dp))
                            Spacer(Modifier.height(10.dp))
                            Text("Inicia sesión para publicar", fontWeight = FontWeight.Black, fontSize = 17.sp, color = BrandTextPrimary)
                            Spacer(Modifier.height(6.dp))
                            Text("Debes tener una cuenta registrada para publicar viviendas.", color = BrandTextSecondary, fontSize = 13.sp, textAlign = TextAlign.Center)
                        }
                    }
                    return@Column
                }

                if (isSuspended) {
                    Surface(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 20.dp),
                        shape = RoundedCornerShape(20.dp),
                        color = Color(0xFFFDF2F2),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFCA5A5))
                    ) {
                        Column(modifier = Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.Shield, null, tint = Color.Red, modifier = Modifier.size(40.dp))
                            Spacer(Modifier.height(8.dp))
                            Text("Cuenta Suspendida", fontWeight = FontWeight.Black, fontSize = 16.sp, color = Color(0xFF991B1B))
                            Spacer(Modifier.height(4.dp))
                            Text("Tu cuenta tiene restricciones de moderación.", color = Color(0xFF7F1D1D), fontSize = 12.sp)
                        }
                    }
                    return@Column
                }

                val canPublish = userRole == "admin" || isSuperAdmin || (isVerified && verificationStatus !in listOf("pendiente", "rechazada"))
                if (!canPublish && !isCheckingUser) {
                    Surface(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
                        shape = RoundedCornerShape(20.dp),
                        color = BrandSurfaceElevated,
                        border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder)
                    ) {
                        Column(modifier = Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.VerifiedUser, null, tint = BrandForest, modifier = Modifier.size(48.dp))
                            Spacer(Modifier.height(12.dp))
                            Text(if (verificationStatus == "pendiente") "Tu DPI está en revisión" else "Verificación de Casero Requerida", fontWeight = FontWeight.Black, fontSize = 18.sp, color = BrandTextPrimary)
                            Spacer(Modifier.height(6.dp))
                            Text(
                                "Para garantizar la autenticidad de los inmuebles en RuwaJay, debes verificar tu identidad con tu DPI antes de publicar.",
                                color = BrandTextSecondary,
                                fontSize = 13.sp,
                                textAlign = TextAlign.Center
                            )
                            Spacer(Modifier.height(16.dp))
                            Button(
                                onClick = onNavigateToVerification,
                                colors = ButtonDefaults.buttonColors(containerColor = BrandForest),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text("Completar Verificación con DPI", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                    return@Column
                }

                if (submitted) {
                    Surface(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 30.dp),
                        shape = RoundedCornerShape(24.dp),
                        color = BrandSurfaceElevated,
                        border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder)
                    ) {
                        Column(modifier = Modifier.padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("🎉", fontSize = 54.sp)
                            Spacer(Modifier.height(14.dp))
                            Text(if (propertyId == null) "¡Vivienda publicada!" else "¡Cambios guardados!", fontWeight = FontWeight.Black, fontSize = 22.sp, color = BrandForest)
                            Spacer(Modifier.height(8.dp))
                            Text(
                                "Tu inmueble ya se encuentra en línea y los inquilinos interesados podrán enviarte solicitudes de visita.",
                                color = BrandTextSecondary,
                                fontSize = 13.sp,
                                textAlign = TextAlign.Center
                            )
                            Spacer(Modifier.height(24.dp))
                            Button(
                                onClick = onNavigateToProfile,
                                colors = ButtonDefaults.buttonColors(containerColor = BrandForest),
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth().height(48.dp)
                            ) {
                                Icon(Icons.Default.Person, contentDescription = null, tint = Color.White)
                                Spacer(Modifier.width(8.dp))
                                Text("Finalizar e ir a Mi Perfil", fontWeight = FontWeight.Black, fontSize = 14.sp)
                            }
                            Spacer(Modifier.height(10.dp))
                            OutlinedButton(
                                onClick = {
                                    submitted = false
                                    currentStep = 1
                                    title = ""
                                    description = ""
                                    price = ""
                                    deposit = ""
                                    selectedImages = emptyList()
                                },
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth().height(44.dp)
                            ) {
                                Icon(Icons.Default.AddHome, contentDescription = null, tint = BrandCafe)
                                Spacer(Modifier.width(8.dp))
                                Text("Publicar otra vivienda", fontWeight = FontWeight.Bold, color = BrandCafe)
                            }
                        }
                    }
                    return@Column
                }

                // ── INDICADOR DE PASOS DEL WIZARD (1 al 4) ────────────
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = BrandSurfaceElevated,
                    border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 8.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.SpaceAround,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        listOf(
                            1 to "Ubicación",
                            2 to "Espacios",
                            3 to "Precios",
                            4 to "Revisión"
                        ).forEach { (stepNum, stepLabel) ->
                            val isActive = currentStep == stepNum
                            val isDone = currentStep > stepNum
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.clickable { currentStep = stepNum }
                            ) {
                                Surface(
                                    shape = CircleShape,
                                    color = when {
                                        isActive -> BrandForest
                                        isDone -> BrandForest.copy(alpha = 0.2f)
                                        else -> BrandSurfaceBackground
                                    },
                                    border = androidx.compose.foundation.BorderStroke(
                                        1.dp,
                                        if (isActive || isDone) BrandForest else BrandBorder
                                    ),
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        if (isDone) {
                                            Icon(Icons.Default.Check, null, tint = BrandForest, modifier = Modifier.size(16.dp))
                                        } else {
                                            Text(
                                                text = "$stepNum",
                                                color = if (isActive) Color.White else BrandTextMuted,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Black
                                            )
                                        }
                                    }
                                }
                                Spacer(Modifier.width(6.dp))
                                Text(
                                    text = stepLabel,
                                    fontSize = 12.sp,
                                    fontWeight = if (isActive) FontWeight.Black else FontWeight.Medium,
                                    color = if (isActive) BrandForest else BrandTextSecondary
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                errorMessage?.let { err ->
                    Surface(
                        color = Color(0xFFFEE2E2),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
                    ) {
                        Text(err, color = Color(0xFF991B1B), fontSize = 12.sp, modifier = Modifier.padding(12.dp))
                    }
                }

                // ── CONTENIDO POR PASO DEL WIZARD ─────────────────────
                when (currentStep) {
                    1 -> {
                        // PASO 1: Tipo y Ubicación
                        Text("Paso 1: Tipo y Ubicación", fontWeight = FontWeight.Black, fontSize = 17.sp, color = BrandTextPrimary)
                        Spacer(Modifier.height(10.dp))

                        Text("Tipo de Inmueble", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = BrandTextPrimary)
                        Spacer(Modifier.height(6.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf("casa" to "Casa", "apartamento" to "Apartamento", "habitacion" to "Habitación", "local" to "Local").forEach { (typeKey, typeLabel) ->
                                FilterChip(
                                    selected = propertyType == typeKey,
                                    onClick = { propertyType = typeKey },
                                    label = { Text(typeLabel, fontSize = 12.sp, fontWeight = FontWeight.Bold) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = BrandTerracota,
                                        selectedLabelColor = Color.White
                                    )
                                )
                            }
                        }

                        Spacer(Modifier.height(12.dp))
                        OutlinedTextField(
                            value = title,
                            onValueChange = { title = it },
                            label = { Text("Título descriptivo del inmueble") },
                            placeholder = { Text("Ej: Casa amplia de 2 niveles en Condominio Las Luces") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        Spacer(Modifier.height(10.dp))
                        OutlinedTextField(
                            value = description,
                            onValueChange = { description = it },
                            label = { Text("Descripción completa") },
                            placeholder = { Text("Detalla ambientes, comodidades, seguridad y cercanías...") },
                            modifier = Modifier.fillMaxWidth(),
                            maxLines = 4
                        )

                        Spacer(Modifier.height(12.dp))
                        // Dropdown Departamento
                        Box(modifier = Modifier.fillMaxWidth()) {
                            OutlinedButton(
                                onClick = { deptExpanded = true },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder)
                            ) {
                                Text("Departamento: $department", fontWeight = FontWeight.Bold, color = BrandTextPrimary)
                                Spacer(Modifier.weight(1f))
                                Icon(Icons.Default.ArrowDropDown, null)
                            }
                            DropdownMenu(expanded = deptExpanded, onDismissRequest = { deptExpanded = false }) {
                                GT_DEPARTMENTS.forEach { dept ->
                                    DropdownMenuItem(
                                        text = { Text(dept) },
                                        onClick = {
                                            department = dept
                                            deptExpanded = false
                                        }
                                    )
                                }
                            }
                        }

                        Spacer(Modifier.height(10.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = municipality,
                                onValueChange = { municipality = it },
                                label = { Text("Municipio") },
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = zone,
                                onValueChange = { zone = it },
                                label = { Text("Zona / Sector") },
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Spacer(Modifier.height(10.dp))
                        OutlinedTextField(
                            value = approximateAddress,
                            onValueChange = { approximateAddress = it },
                            label = { Text("Dirección aproximada (Pública)") },
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(Modifier.height(10.dp))
                        OutlinedTextField(
                            value = exactAddress,
                            onValueChange = { exactAddress = it },
                            label = { Text("Dirección exacta (Solo confirmados)") },
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(Modifier.height(14.dp))
                        Text("Coloca el pin en el mapa", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = BrandTextPrimary)
                        Spacer(Modifier.height(8.dp))
                        OsmLocationPickerMap(
                            initialPoint = pickedGeoPoint ?: GeoPoint(14.6349, -90.5069),
                            onLocationSelected = { pickedGeoPoint = it },
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                        )
                    }

                    2 -> {
                        // PASO 2: Espacios y Servicios
                        Text("Paso 2: Espacios y Servicios", fontWeight = FontWeight.Black, fontSize = 17.sp, color = BrandTextPrimary)
                        Spacer(Modifier.height(12.dp))

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = bedrooms,
                                onValueChange = { bedrooms = it },
                                label = { Text("Habitaciones") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = bathrooms,
                                onValueChange = { bathrooms = it },
                                label = { Text("Baños") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Spacer(Modifier.height(10.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = area,
                                onValueChange = { area = it },
                                label = { Text("Área (m²)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = parking,
                                onValueChange = { parking = it },
                                label = { Text("Parqueos") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Spacer(Modifier.height(14.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("Amueblada", fontWeight = FontWeight.Bold)
                            Switch(checked = furnished, onCheckedChange = { furnished = it })
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("Acepta mascotas", fontWeight = FontWeight.Bold)
                            Switch(checked = petsAllowed, onCheckedChange = { petsAllowed = it })
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("Patio o jardín", fontWeight = FontWeight.Bold)
                            Switch(checked = patio, onCheckedChange = { patio = it })
                        }

                        Spacer(Modifier.height(14.dp))
                        Text("Servicios incluidos con la cuota", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = BrandTextPrimary)
                        Spacer(Modifier.height(6.dp))

                        AVAILABLE_SERVICES_LIST.forEach { srv ->
                            val isChecked = selectedServices.contains(srv)
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        selectedServices = if (isChecked) selectedServices - srv else selectedServices + srv
                                    }
                                    .padding(vertical = 4.dp)
                            ) {
                                Checkbox(checked = isChecked, onCheckedChange = {
                                    selectedServices = if (it) selectedServices + srv else selectedServices - srv
                                })
                                Text(srv, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                            }
                        }
                    }

                    3 -> {
                        // PASO 3: Precios y Fotos
                        Text("Paso 3: Precios y Fotos", fontWeight = FontWeight.Black, fontSize = 17.sp, color = BrandTextPrimary)
                        Spacer(Modifier.height(12.dp))

                        OutlinedTextField(
                            value = price,
                            onValueChange = { price = it },
                            label = { Text("Precio mensual de alquiler (Q)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            leadingIcon = { Text("Q", fontWeight = FontWeight.Bold, color = BrandForest) },
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(Modifier.height(10.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = deposit,
                                onValueChange = { deposit = it },
                                label = { Text("Depósito de garantía (Q)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = maintenance,
                                onValueChange = { maintenance = it },
                                label = { Text("Mantenimiento (Q)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Spacer(Modifier.height(16.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Fotografías del Inmueble (Máx 8)", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            OutlinedButton(
                                onClick = { imagePicker.launch("image/*") },
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(Icons.Default.AddPhotoAlternate, null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Añadir fotos", fontSize = 12.sp)
                            }
                        }

                        // Fotos demo rápidas para prueba
                        Spacer(Modifier.height(6.dp))
                        Text("O añade fotos de demostración para probar rápido:", fontSize = 11.sp, color = BrandTextSecondary)
                        Spacer(Modifier.height(6.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(SAMPLE_DEMO_IMAGES) { (demoName, demoUrl) ->
                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = BrandSurfaceElevated,
                                    border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder),
                                    modifier = Modifier.clickable {
                                        if (retainedImages.size < 8) {
                                            retainedImages = retainedImages + demoUrl
                                        }
                                    }
                                ) {
                                    Row(modifier = Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Add, null, tint = BrandForest, modifier = Modifier.size(14.dp))
                                        Spacer(Modifier.width(4.dp))
                                        Text(demoName, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }

                        Spacer(Modifier.height(12.dp))

                        // Muestra de fotos seleccionadas con selector de PORTADA
                        val allThumbs = retainedImages.map { it to false } + selectedImages.map { it.toString() to true }
                        if (allThumbs.isNotEmpty()) {
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                itemsIndexed(allThumbs) { idx, (uriStr, _) ->
                                    val isCover = idx == coverImageIndex
                                    Box(
                                        modifier = Modifier
                                            .size(80.dp)
                                            .clip(RoundedCornerShape(12.dp))
                                            .border(2.dp, if (isCover) BrandGold else BrandBorder, RoundedCornerShape(12.dp))
                                            .clickable { coverImageIndex = idx }
                                    ) {
                                        AsyncImage(
                                            model = uriStr,
                                            contentDescription = null,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier.fillMaxSize()
                                        )
                                        if (isCover) {
                                            Surface(
                                                color = BrandGold,
                                                shape = RoundedCornerShape(bottomEnd = 8.dp),
                                                modifier = Modifier.align(Alignment.TopStart)
                                            ) {
                                                Text("Portada", fontSize = 9.sp, fontWeight = FontWeight.Black, color = Color.White, modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    4 -> {
                        // PASO 4: Revisión final
                        Text("Paso 4: Revisión y Confirmación", fontWeight = FontWeight.Black, fontSize = 17.sp, color = BrandTextPrimary)
                        Spacer(Modifier.height(12.dp))

                        Surface(
                            shape = RoundedCornerShape(18.dp),
                            color = BrandSurfaceElevated,
                            border = androidx.compose.foundation.BorderStroke(1.dp, BrandBorder),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(title.ifBlank { "Sin título especificado" }, fontWeight = FontWeight.Black, fontSize = 16.sp, color = BrandTextPrimary)
                                Spacer(Modifier.height(4.dp))
                                Text("Q ${price.ifBlank { "0" }} / mes • Depósito: Q ${deposit.ifBlank { "0" }}", fontWeight = FontWeight.Bold, color = BrandTerracota, fontSize = 14.sp)
                                Spacer(Modifier.height(4.dp))
                                Text("$department, $municipality, $zone", fontSize = 12.sp, color = BrandTextSecondary)
                                HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = BrandBorder)
                                Text("• $bedrooms habitaciones, $bathrooms baños, $area m², $parking parqueos", fontSize = 12.sp, color = BrandTextPrimary)
                                Text("• Servicios: ${selectedServices.joinToString(", ")}", fontSize = 12.sp, color = BrandTextSecondary)
                                Text("• ${retainedImages.size + selectedImages.size} fotografías seleccionadas", fontSize = 12.sp, color = BrandForest, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // ── BOTONES DE NAVEGACIÓN ANTERIOR / SIGUIENTE / PUBLICAR ──
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (currentStep > 1) {
                        OutlinedButton(
                            onClick = { currentStep -= 1 },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.ArrowBack, null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Anterior")
                        }
                    } else {
                        Spacer(Modifier.width(1.dp))
                    }

                    if (currentStep < 4) {
                        Button(
                            onClick = { currentStep += 1 },
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = BrandForest)
                        ) {
                            Text("Siguiente")
                            Spacer(Modifier.width(6.dp))
                            Icon(Icons.Default.ArrowForward, null, modifier = Modifier.size(16.dp))
                        }
                    } else {
                        Button(
                            onClick = {
                                if (title.isBlank() || price.isBlank()) {
                                    errorMessage = "Por favor indica un título y precio válidos."
                                    return@Button
                                }
                                confirmPublication = true
                            },
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = BrandTerracota),
                            enabled = !isPublishing
                        ) {
                            if (isPublishing) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Publicando...")
                            } else {
                                Icon(Icons.Default.CloudUpload, null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(if (propertyId != null) "Guardar Cambios" else "Publicar Vivienda", fontWeight = FontWeight.Black)
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(30.dp))
                RuwaFooter()
            }
        }
    }
    if (confirmPublication) {
        AlertDialog(
            onDismissRequest = { confirmPublication = false },
            title = { Text(if (propertyId == null) "¿Publicar esta vivienda?" else "¿Guardar los cambios?") },
            text = { Text("Confirma que la ubicación, el precio y las fotografías son correctos antes de continuar.") },
            confirmButton = { TextButton(onClick = { confirmPublication = false; submitPublication() }) { Text("Confirmar") } },
            dismissButton = { TextButton(onClick = { confirmPublication = false }) { Text("Revisar") } }
        )
    }

}
