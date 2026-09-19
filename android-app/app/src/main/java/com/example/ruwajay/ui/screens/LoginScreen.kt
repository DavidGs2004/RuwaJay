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

@Composable
fun LoginScreen(onLoginSuccess: () -> Unit = {}) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isRegister by remember { mutableStateOf(false) }
    var name by remember { mutableStateOf("") }
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
        Spacer(modifier = Modifier.height(24.dp))

        // Logo
        Text("R", color = BrandTerracota, fontWeight = FontWeight.ExtraBold, fontSize = 52.sp)
        Text("RuwaJay", color = BrandTextPrimary, fontWeight = FontWeight.ExtraBold, fontSize = 30.sp)
        Text(
            if (isRegister) "Crea tu cuenta gratuita" else "Bienvenido de vuelta",
            color = BrandGold,
            fontSize = 14.sp,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(36.dp))

        // Form card
        androidx.compose.material3.Surface(
            shape = RoundedCornerShape(24.dp),
            color = Color.White,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    if (isRegister) "Crear Cuenta" else "Iniciar Sesión",
                    fontWeight = FontWeight.ExtraBold,
                    color = BrandTextPrimary,
                    fontSize = 20.sp
                )
                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth().background(BrandCremaDark, RoundedCornerShape(14.dp)).padding(4.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    TextButton(
                        onClick = { isRegister = false },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.textButtonColors(
                            containerColor = if (!isRegister) BrandTerracota else Color.Transparent,
                            contentColor = if (!isRegister) Color.White else BrandTextSecondary
                        )
                    ) { Text("Iniciar sesión", fontWeight = FontWeight.Bold) }
                    TextButton(
                        onClick = { isRegister = true },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.textButtonColors(
                            containerColor = if (isRegister) BrandForest else Color.Transparent,
                            contentColor = if (isRegister) Color.White else BrandTextSecondary
                        )
                    ) { Text("Registrarme", fontWeight = FontWeight.Bold) }
                }
                Spacer(modifier = Modifier.height(16.dp))

                if (isRegister) {
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
                                        ?: "Revisa tu correo para cambiar la contraseña."
                                }
                            }
                        },
                        modifier = Modifier.align(Alignment.End),
                        enabled = !isLoading
                    ) {
                        Text("¿Olvidaste tu contraseña?", color = BrandForest, fontSize = 12.sp)
                    }
                } else {
                    Spacer(modifier = Modifier.height(8.dp))
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
                        isLoading = true
                        message = null
                        if (isRegister) {
                            authRepository.register(name, email, password, ::handleResult)
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
