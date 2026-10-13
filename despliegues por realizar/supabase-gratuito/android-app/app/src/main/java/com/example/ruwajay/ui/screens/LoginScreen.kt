package com.example.ruwajay.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.material3.FilterChip
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ruwajay.data.repository.AuthRepository
import com.example.ruwajay.ui.theme.BrandCrema
import com.example.ruwajay.ui.theme.BrandCremaDark
import com.example.ruwajay.ui.theme.BrandForest
import com.example.ruwajay.ui.theme.BrandForestDark
import com.example.ruwajay.ui.theme.BrandGold
import com.example.ruwajay.ui.theme.BrandGoldMuted
import com.example.ruwajay.ui.theme.BrandTerracota
import com.example.ruwajay.ui.theme.BrandTextPrimary
import com.example.ruwajay.ui.theme.BrandTextSecondary
import com.example.ruwajay.ui.theme.BrandCafe

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Stars
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedButton
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import com.example.ruwajay.R
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException

@Composable
fun LoginScreen(onLoginSuccess: () -> Unit = {}) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isRegister by remember { mutableStateOf(false) }
    var name by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("seeker") } // "seeker" or "owner"
    var phone by remember { mutableStateOf("") }
    var message by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    
    // Recuperación de contraseña dialog
    var showResetDialog by remember { mutableStateOf(false) }
    var resetEmail by remember { mutableStateOf("") }
    var resetMessage by remember { mutableStateOf<String?>(null) }
    var isResetLoading by remember { mutableStateOf(false) }

    val authRepository = remember { AuthRepository() }
    val context = LocalContext.current

    fun handleResult(result: Result<Unit>) {
        isLoading = false
        message = result.exceptionOrNull()?.localizedMessage
            ?: if (isRegister) "Cuenta creada correctamente." else null
        if (result.isSuccess) onLoginSuccess()
    }

    // Google Sign-In setup
    val gso = remember {
        GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken("716762704483-edmm9mfbjt6u4l834kdsn3okn6c8gqag.apps.googleusercontent.com")
            .requestEmail()
            .build()
    }
    val googleSignInClient = remember { GoogleSignIn.getClient(context, gso) }

    val googleLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
        try {
            val account = task.getResult(ApiException::class.java)
            val idToken = account?.idToken
            if (idToken != null) {
                isLoading = true
                message = null
                authRepository.signInWithGoogle(idToken, ::handleResult)
            } else {
                isLoading = false
                message = "No se pudo obtener la credencial de Google."
            }
        } catch (e: ApiException) {
            isLoading = false
            message = when (e.statusCode) {
                10 -> "Configuración de Google en sincronización (Error 10). Puedes ingresar directamente con tu correo y contraseña abajo."
                12500 -> "Error de conexión con Google Play Services (12500). Puedes ingresar con tu correo y contraseña."
                12501 -> "Acceso con Google cancelado."
                else -> "Error al conectar con Google (${e.statusCode}). Puedes ingresar con tu correo y contraseña."
            }
        } catch (e: Exception) {
            isLoading = false
            message = e.localizedMessage ?: "Error al autenticar con Google. Puedes ingresar con tu correo y contraseña."
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandCrema)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(32.dp))

        // Logo Oficial
        Image(
            painter = painterResource(id = R.drawable.ic_logo),
            contentDescription = "RuwaJay Logo",
            modifier = Modifier
                .size(100.dp)
                .clip(CircleShape)
                .background(Color.White, CircleShape)
                .padding(4.dp)
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text("RuwaJay", color = BrandTextPrimary, fontWeight = FontWeight.ExtraBold, fontSize = 32.sp, letterSpacing = (-0.5).sp)
        Text(
            if (isRegister) "Crea tu cuenta gratuita" else "Bienvenido de vuelta",
            color = BrandGold,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(32.dp))

        // Form card con animación
        Surface(
            shape = RoundedCornerShape(28.dp),
            color = Color.White,
            shadowElevation = 8.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                AnimatedContent(
                    targetState = isRegister,
                    transitionSpec = {
                        fadeIn(animationSpec = tween(300)) togetherWith fadeOut(animationSpec = tween(300))
                    },
                    label = "TitleAnimation"
                ) { registering ->
                    Text(
                        if (registering) "Crear Cuenta" else "Iniciar Sesión",
                        fontWeight = FontWeight.Black,
                        color = BrandCafe,
                        fontSize = 24.sp
                    )
                }
                Spacer(modifier = Modifier.height(20.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(BrandCremaDark.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
                        .padding(4.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    val tabModifier = Modifier
                        .weight(1f)
                        .height(44.dp)
                    
                    Surface(
                        onClick = { isRegister = false },
                        modifier = tabModifier,
                        color = if (!isRegister) Color.White else Color.Transparent,
                        shape = RoundedCornerShape(12.dp),
                        shadowElevation = if (!isRegister) 2.dp else 0.dp
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text("Acceder", fontWeight = FontWeight.ExtraBold, color = if (!isRegister) BrandTerracota else BrandTextSecondary, fontSize = 13.sp)
                        }
                    }
                    Surface(
                        onClick = { isRegister = true },
                        modifier = tabModifier,
                        color = if (isRegister) Color.White else Color.Transparent,
                        shape = RoundedCornerShape(12.dp),
                        shadowElevation = if (isRegister) 2.dp else 0.dp
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text("Registrarme", fontWeight = FontWeight.ExtraBold, color = if (isRegister) BrandForest else BrandTextSecondary, fontSize = 13.sp)
                        }
                    }
                }
                Spacer(modifier = Modifier.height(20.dp))

                // BOTÓN GOOGLE SIGN-IN
                OutlinedButton(
                    onClick = {
                        googleLauncher.launch(googleSignInClient.signInIntent)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, BrandCremaDark),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = Color.White,
                        contentColor = BrandTextPrimary
                    ),
                    enabled = !isLoading
                ) {
                    GoogleLogo(modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = if (isRegister) "Registrarse con Google" else "Continuar con Google",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = BrandTextPrimary
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // DIVISOR
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    HorizontalDivider(modifier = Modifier.weight(1f), color = BrandCremaDark)
                    Text(
                        text = "  o con tu correo  ",
                        color = BrandTextSecondary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                    HorizontalDivider(modifier = Modifier.weight(1f), color = BrandCremaDark)
                }

                Spacer(modifier = Modifier.height(16.dp))

                if (isRegister) {
                    // Role selection
                    Text("¿Qué deseas hacer?", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BrandCafe)
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = role == "seeker",
                            onClick = { role = "seeker" },
                            label = { Text("Busco vivienda", fontSize = 11.sp) },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp)
                        )
                        FilterChip(
                            selected = role == "owner",
                            onClick = { role = "owner" },
                            label = { Text("Quiero publicar", fontSize = 11.sp) },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Nombre completo") },
                        leadingIcon = { Icon(Icons.Default.Person, null, tint = BrandForest) },
                        shape = RoundedCornerShape(12.dp),
                        colors = fieldColors(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next)
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    if (role == "owner") {
                        OutlinedTextField(
                            value = phone,
                            onValueChange = { phone = it },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Teléfono de contacto") },
                            leadingIcon = { Icon(Icons.Default.Phone, null, tint = BrandForest) },
                            shape = RoundedCornerShape(12.dp),
                            colors = fieldColors(),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Next)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                    }
                }

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Correo electrónico") },
                    leadingIcon = { Icon(Icons.Default.Email, null, tint = BrandForest) },
                    shape = RoundedCornerShape(12.dp),
                    colors = fieldColors(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next)
                )
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Contraseña") },
                    leadingIcon = { Icon(Icons.Default.Lock, null, tint = BrandForest) },
                    shape = RoundedCornerShape(12.dp),
                    colors = fieldColors(),
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done)
                )

                if (!isRegister) {
                    TextButton(
                        onClick = {
                            resetEmail = email
                            resetMessage = null
                            showResetDialog = true
                        },
                        modifier = Modifier.align(Alignment.End),
                        enabled = !isLoading
                    ) {
                        Text("¿Olvidaste tu contraseña?", color = BrandForest, fontSize = 12.sp)
                    }
                } else {
                    Spacer(modifier = Modifier.height(16.dp))
                }

                message?.let { text ->
                    Text(
                        text = text,
                        color = if (text.contains("correctamente") || text.contains("Revisa")) BrandForest else BrandTerracota,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(vertical = 8.dp)
                    )
                }

                Button(
                    onClick = {
                        if (email.isBlank() || password.isBlank() || (isRegister && name.isBlank())) {
                            message = "Completa los campos requeridos."
                            return@Button
                        }
                        if (isRegister && role == "owner" && phone.isBlank()) {
                            message = "Se requiere un teléfono para cuentas de propietario."
                            return@Button
                        }

                        isLoading = true
                        message = null
                        if (isRegister) {
                            authRepository.register(name, email, password, role, phone.takeIf { it.isNotBlank() }, ::handleResult)
                        } else {
                            authRepository.signIn(email, password, ::handleResult)
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BrandForest),
                    enabled = !isLoading
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    } else {
                        Text(
                            if (isRegister) "Crear cuenta" else "Ingresar",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))
        TextButton(onClick = { isRegister = !isRegister }) {
            Text(
                if (isRegister) "¿Ya tienes cuenta? Inicia sesión" else "¿No tienes cuenta? Regístrate",
                color = BrandForest,
                fontSize = 14.sp
            )
        }
        Spacer(modifier = Modifier.height(40.dp))
    }

    // Modal de Recuperación de Contraseña
    if (showResetDialog) {
        AlertDialog(
            onDismissRequest = { if (!isResetLoading) showResetDialog = false },
            containerColor = Color.White,
            shape = RoundedCornerShape(20.dp),
            title = {
                Text("Recuperar Contraseña", fontWeight = FontWeight.ExtraBold, color = BrandCafe, fontSize = 20.sp)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        "Ingresa tu correo registrado y te enviaremos un enlace oficial de Firebase para restablecer tu contraseña.",
                        fontSize = 13.sp,
                        color = BrandTextSecondary
                    )
                    OutlinedTextField(
                        value = resetEmail,
                        onValueChange = { resetEmail = it },
                        label = { Text("Correo electrónico") },
                        leadingIcon = { Icon(Icons.Default.Email, null, tint = BrandForest) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = fieldColors(),
                        singleLine = true
                    )
                    resetMessage?.let { msg ->
                        Text(
                            text = msg,
                            color = if (msg.contains("enviado") || msg.contains("éxito")) BrandForest else BrandTerracota,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (resetEmail.isBlank()) {
                            resetMessage = "Ingresa tu correo electrónico."
                            return@Button
                        }
                        isResetLoading = true
                        resetMessage = null
                        authRepository.sendPasswordReset(resetEmail) { result ->
                            isResetLoading = false
                            if (result.isSuccess) {
                                resetMessage = "¡Enlace enviado! Revisa tu bandeja de entrada o spam."
                            } else {
                                resetMessage = result.exceptionOrNull()?.localizedMessage ?: "No se pudo enviar el correo."
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandForest),
                    shape = RoundedCornerShape(10.dp),
                    enabled = !isResetLoading
                ) {
                    if (isResetLoading) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                    } else {
                        Text("Enviar enlace")
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showResetDialog = false },
                    enabled = !isResetLoading
                ) {
                    Text("Cerrar", color = BrandTextSecondary)
                }
            }
        )
    }
}

@Composable
fun GoogleLogo(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        val w = size.width
        val h = size.height

        // Cuadrante Azul (Derecha / Arriba)
        drawArc(
            color = Color(0xFF4285F4),
            startAngle = -45f,
            sweepAngle = 90f,
            useCenter = true
        )
        // Cuadrante Verde (Abajo)
        drawArc(
            color = Color(0xFF34A853),
            startAngle = 45f,
            sweepAngle = 90f,
            useCenter = true
        )
        // Cuadrante Amarillo (Izquierda)
        drawArc(
            color = Color(0xFFFBBC05),
            startAngle = 135f,
            sweepAngle = 90f,
            useCenter = true
        )
        // Cuadrante Rojo (Arriba)
        drawArc(
            color = Color(0xFFEA4335),
            startAngle = 225f,
            sweepAngle = 90f,
            useCenter = true
        )
        // Hueco interno
        drawCircle(
            color = Color.White,
            radius = w * 0.32f
        )
        // Barra horizontal del 'G'
        drawRect(
            color = Color(0xFF4285F4),
            topLeft = Offset(w * 0.44f, h * 0.38f),
            size = Size(w * 0.56f, h * 0.24f)
        )
    }
}

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = BrandTextPrimary,
    unfocusedTextColor = BrandTextPrimary,
    focusedBorderColor = BrandForest,
    unfocusedBorderColor = BrandCremaDark,
    focusedLabelColor = BrandForest,
    unfocusedLabelColor = BrandTextSecondary,
    cursorColor = BrandForest
)
