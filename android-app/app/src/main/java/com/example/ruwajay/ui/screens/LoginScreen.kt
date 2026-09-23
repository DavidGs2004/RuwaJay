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

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.ui.res.painterResource
import com.example.ruwajay.R
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.shape.CircleShape

import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Stars

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
    val authRepository = remember { AuthRepository() }

    fun handleResult(result: Result<Unit>) {
        isLoading = false
        message = result.exceptionOrNull()?.localizedMessage
            ?: if (isRegister) "Cuenta creada correctamente." else null
        if (result.isSuccess) onLoginSuccess()
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
        androidx.compose.material3.Surface(
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
                            if (email.isBlank()) {
                                message = "Escribe tu correo para recuperar la contraseña."
                            } else {
                                isLoading = true
                                authRepository.sendPasswordReset(email) { result ->
                                    isLoading = false
                                    message = result.exceptionOrNull()?.localizedMessage
                                        ?: "Se ha enviado un enlace a tu correo para restablecer tu contraseña."
                                }
                            }
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
}

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = BrandForest,
    unfocusedBorderColor = BrandCremaDark,
    focusedLabelColor = BrandForest,
    unfocusedLabelColor = BrandTextSecondary,
    cursorColor = BrandForest
)
