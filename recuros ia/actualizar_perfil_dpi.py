from pathlib import Path
import textwrap

root = Path(__file__).resolve().parents[1]
path = root / 'app/app/src/main/java/com/example/ruwajay/ui/screens/ProfileScreen.kt'
text = path.read_text(encoding='utf-8')
text = text.replace('import android.content.Intent', 'import android.app.DatePickerDialog\nimport java.util.Calendar\nimport android.content.Intent', 1)
text = text.replace('import com.example.ruwajay.data.model.Property', 'import com.example.ruwajay.data.model.DpiDates\nimport com.example.ruwajay.data.model.Property', 1)
text = text.replace('    onSearchClick: (String) -> Unit = {}\n', '    onSearchClick: (String) -> Unit = {},\n    openVerification: Boolean = false\n')
text = text.replace('    var showDpiFormModal by remember { mutableStateOf(false) }', '''    var ownDpiRequest by remember(currentUser?.uid) { mutableStateOf<Map<String, Any>?>(null) }
    var isLoadingDpi by remember(currentUser?.uid) { mutableStateOf(currentUser != null) }
    var dpiLoadError by remember(currentUser?.uid) { mutableStateOf<String?>(null) }
    var showLogoutConfirmation by remember { mutableStateOf(false) }
    var showDpiFormModal by remember(currentUser?.uid) { mutableStateOf(false) }
    var openedVerification by remember(currentUser?.uid) { mutableStateOf(false) }

    DisposableEffect(currentUser?.uid) {
        val uid = currentUser?.uid ?: return@DisposableEffect onDispose {}
        val listener = firestore.collection("verification_requests").document(uid).addSnapshotListener { snapshot, error ->
            isLoadingDpi = false
            dpiLoadError = error?.localizedMessage
            if (error == null) ownDpiRequest = snapshot?.data
        }
        onDispose { listener.remove() }
    }
    LaunchedEffect(openVerification, currentUser?.uid, userData, isLoadingDpi) {
        if (openVerification && !openedVerification && userData != null && !isLoadingDpi && dpiLoadError == null) {
            showDpiFormModal = true
            openedVerification = true
        }
    }''')
text = text.replace('    val isVerified = (userData?.get("verified") as? Boolean) == true || userRole == "owner"', '    val isVerified = (userData?.get("verified") as? Boolean) == true && userData?.get("verificationStatus") !in listOf("pendiente", "rechazada")')
start = text.index('                            if (isVerified) {\n                                Row(horizontalArrangement = Arrangement.End')
end = text.index('\n                        }\n                    }', start)
text = text[:start] + '''                            val storedDpi = ownDpiRequest ?: (userData?.get("dpiData") as? Map<*, *>)
                            dpiLoadError?.let {
                                Text("No se pudo consultar tu DPI: $it", color = Color.Red, fontSize = 12.sp)
                            }
                            if (!storedDpi?.get("cui").toString().let { it.isBlank() || it == "null" }) {
                                TextButton(onClick = { showDpiDetailsModal = true }) {
                                    Icon(Icons.Default.Visibility, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text("Ver mis datos y documento de DPI")
                                }
                            }
                            Button(
                                onClick = { showDpiFormModal = true },
                                enabled = !isLoadingDpi && dpiLoadError == null,
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = BrandForest)
                            ) {
                                Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(6.dp))
                                Text(if (isLoadingDpi) "Consultando DPI…" else if (storedDpi == null) "Registrar mi DPI" else "Actualizar datos o sustituir DPI")
                            }
                            Text("Los cambios se enviarán a revisión. Los datos previamente aprobados se conservan hasta la nueva aprobación.", fontSize = 11.sp, color = BrandTextSecondary)
''' + text[end:]
text = text.replace('NotificationRepository.signOut { currentUser = null }', 'showLogoutConfirmation = true')
marker = '    // ── MODAL: FORMULARIO DE VERIFICACIÓN CON DPI (USUARIO) ──'
text = text.replace(marker, '''    if (showLogoutConfirmation) {
        AlertDialog(
            onDismissRequest = { showLogoutConfirmation = false },
            title = { Text("¿Cerrar sesión?") },
            text = { Text("Tendrás que iniciar sesión de nuevo para acceder a tu cuenta.") },
            confirmButton = { TextButton(onClick = {
                showLogoutConfirmation = false
                NotificationRepository.signOut { currentUser = null }
            }) { Text("Cerrar sesión") } },
            dismissButton = { TextButton(onClick = { showLogoutConfirmation = false }) { Text("Cancelar") } }
        )
    }

''' + marker)
text = text.replace('        DpiVerificationFormModal(\n', '''        DpiVerificationFormModal(
            initialData = ownDpiRequest ?: (userData?.get("dpiData") as? Map<*, *>) ?: emptyMap<Any, Any>(),
''', 1)
text = text.replace('        val dpiData = userData?.get("dpiData") as? Map<*, *>', '        val dpiData = ownDpiRequest ?: (userData?.get("dpiData") as? Map<*, *>)')
needle = '                    Text("Fecha de Verificación:'
index = text.index(needle)
text = text[:index] + '''                    Text("Nacimiento: ${DpiDates.display((dpiData?.get("birthDate") as? String).orEmpty())}", fontSize = 12.sp)
                    Text("Vencimiento: ${DpiDates.display((dpiData?.get("expirationDate") as? String).orEmpty())}", fontSize = 12.sp)
                    val photo = (dpiData?.get("documentPhoto") as? String).orEmpty()
                    if (photo.isNotBlank()) DpiDocumentImage(photo, "Mi documento DPI", Modifier.fillMaxWidth().height(150.dp))
''' + text[index:]
text = text.replace('Column(modifier = Modifier.fillMaxWidth()) {\n                    Text("CUI Oficial:', 'Column(modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState())) {\n                    Text("CUI Oficial:')
text = text.replace('Text(req.birthDate,', 'Text(DpiDates.display(req.birthDate),')
text = text.replace('''AsyncImage(
                                                                    model = req.documentPhoto,''', '''DpiDocumentImage(
                                                                    reference = req.documentPhoto,''')
text = text.replace('''AsyncImage(
                    model = photoUrl,''', '''DpiDocumentImage(
                    reference = photoUrl,''')
# Formulario de registro y edición.
text = text.replace('private fun DpiVerificationFormModal(\n', 'private fun DpiVerificationFormModal(\n    initialData: Map<*, *>,\n')
fields = {'cuiInput': ('cui', ''), 'department': ('department', 'Guatemala'), 'municipality': ('municipality', ''), 'birthDate': ('birthDate', ''), 'expirationDate': ('expirationDate', ''), 'legalAddress': ('legalAddress', ''), 'emergencyName': ('emergencyName', ''), 'emergencyPhone': ('emergencyPhone', ''), 'emergencyRelation': ('emergencyRelation', 'Familiar')}
for field, (key, default) in fields.items():
    old = f'var {field} by remember {{ mutableStateOf("{default}") }}'
    # municipality originalmente usa Guatemala.
    if field == 'municipality':
        old = 'var municipality by remember { mutableStateOf("Guatemala") }'
    value = f'(initialData["{key}"] as? String) ?: "{default}"'
    if field in {'birthDate', 'expirationDate'}:
        value = f'DpiDates.display(({value}))'
    text = text.replace(old, f'var {field} by remember {{ mutableStateOf({value}) }}', 1)
text = text.replace('    var isSubmitting by remember { mutableStateOf(false) }', '''    val existingPhoto = (initialData["documentPhoto"] as? String).orEmpty()
    var confirmSubmission by remember { mutableStateOf(false) }
    var confirmDiscard by remember { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }''', 1)
start = text.index('                // Fechas\n', text.index('private fun DpiVerificationFormModal'))
end = text.index('                // Dirección Legal', start)
text = text[:start] + '''                DpiDateField("Fecha de nacimiento", birthDate, { birthDate = it }, birth = true)
                Spacer(Modifier.height(8.dp))
                DpiDateField("Vencimiento del DPI", expirationDate, { expirationDate = it }, birth = false)
                Spacer(Modifier.height(8.dp))

''' + text[end:]
text = text.replace('''                    } else {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Icon(Icons.Default.CameraAlt''', '''                    } else if (existingPhoto.isNotBlank()) {
                        Row(Modifier.fillMaxSize().padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            DpiDocumentImage(existingPhoto, "DPI registrado", Modifier.size(70.dp))
                            Text("Documento registrado. Toca para sustituirlo.", fontSize = 11.sp, modifier = Modifier.weight(1f).padding(8.dp))
                        }
                    } else {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Icon(Icons.Default.CameraAlt''', 1)
text = text.replace('if (selectedPhotoUri == null) {\n                        formError', 'if (selectedPhotoUri == null && existingPhoto.isBlank()) {\n                        formError', 1)
start = text.index('                    isSubmitting = true', text.index('private fun DpiVerificationFormModal'))
end = text.index('\n                },\n                enabled = !isSubmitting', start)
submission = textwrap.dedent(text[start:end]).replace('cui = cleanCui', 'cui = cuiInput.filter { it.isDigit() }')
text = text[:start] + '''                    val dateError = DpiDates.validationError(birthDate, expirationDate)
                    if (dateError != null) {
                        formError = dateError
                        return@Button
                    }
                    formError = null
                    confirmSubmission = true''' + text[end:]
start = text.index('    AlertDialog(', text.index('private fun DpiVerificationFormModal'))
text = text[:start] + '    fun submitDpi() {\n' + textwrap.indent(submission, '        ') + '\n    }\n\n' + text[start:]
start = text.index('private fun DpiVerificationFormModal')
tail = text[start:]
tail = tail.replace('onDismissRequest = { if (!isSubmitting) onDismiss() }', 'onDismissRequest = { if (!isSubmitting) confirmDiscard = true }', 1)
tail = tail.replace('TextButton(onClick = onDismiss, enabled = !isSubmitting)', 'TextButton(onClick = { confirmDiscard = true }, enabled = !isSubmitting)', 1)
end = tail.index('\n}\n\n@Composable\nprivate fun TabButton')
tail = tail[:end] + '''
    if (confirmSubmission) {
        AlertDialog(
            onDismissRequest = { confirmSubmission = false },
            title = { Text("¿Enviar DPI a revisión?") },
            text = { Text("Confirma que los datos y el documento son correctos. Los cambios serán revisados por un administrador.") },
            confirmButton = { TextButton(onClick = { confirmSubmission = false; submitDpi() }) { Text("Confirmar envío") } },
            dismissButton = { TextButton(onClick = { confirmSubmission = false }) { Text("Revisar datos") } }
        )
    }
    if (confirmDiscard) {
        AlertDialog(
            onDismissRequest = { confirmDiscard = false },
            title = { Text("¿Salir del formulario?") },
            text = { Text("Los cambios que no hayas enviado se perderán.") },
            confirmButton = { TextButton(onClick = onDismiss) { Text("Salir sin guardar") } },
            dismissButton = { TextButton(onClick = { confirmDiscard = false }) { Text("Continuar editando") } }
        )
    }
''' + tail[end:]
text = text[:start] + tail
text += '''

@Composable
private fun DpiDateField(label: String, value: String, onChange: (String) -> Unit, birth: Boolean) {
    val context = LocalContext.current
    OutlinedTextField(
        value = value, onValueChange = onChange,
        label = { Text(label) }, placeholder = { Text("DD/MM/AAAA") },
        modifier = Modifier.fillMaxWidth(), singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Ascii),
        trailingIcon = {
            IconButton(onClick = {
                val initial = DpiDates.normalize(value) ?: if (birth) "2000-01-01" else DpiDates.today()
                val (year, month, day) = initial.split("-").map { it.toInt() }
                DatePickerDialog(context, { _, y, m, d ->
                    onChange(String.format(java.util.Locale.US, "%02d/%02d/%04d", d, m + 1, y))
                }, year, month - 1, day).apply {
                    val (ty, tm, td) = DpiDates.today().split("-").map { it.toInt() }
                    val boundary = Calendar.getInstance().apply { clear(); set(ty, tm - 1, td) }
                    if (birth) {
                        boundary.add(Calendar.DAY_OF_MONTH, -1)
                        datePicker.maxDate = boundary.timeInMillis
                        datePicker.minDate = Calendar.getInstance().apply { clear(); set(1900, 0, 1) }.timeInMillis
                    } else datePicker.minDate = boundary.timeInMillis
                }.show()
            }) { Icon(Icons.Default.CalendarMonth, contentDescription = "Elegir $label") }
        }
    )
}

@Composable
private fun DpiDocumentImage(
    reference: String, contentDescription: String?, modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Fit
) {
    val uid = FirebaseAuth.getInstance().currentUser?.uid
    var resolved by remember(reference, uid) { mutableStateOf<String?>(null) }
    var error by remember(reference, uid) { mutableStateOf(false) }
    DisposableEffect(reference, uid) {
        var active = true
        RuwaBackend.resolve(reference, expectedUid = uid)
            .addOnSuccessListener { if (active) resolved = it }
            .addOnFailureListener { if (active) error = true }
        onDispose { active = false }
    }
    Box(modifier, contentAlignment = Alignment.Center) {
        when {
            error -> Text("No se pudo cargar el DPI. Inténtalo de nuevo.", fontSize = 11.sp, color = Color.Red)
            resolved == null -> CircularProgressIndicator(Modifier.size(24.dp))
            else -> AsyncImage(model = resolved, contentDescription = contentDescription, modifier = Modifier.fillMaxSize(), contentScale = contentScale)
        }
    }
}
'''
path.write_text(text, encoding='utf-8')
print('Perfil: registro/edicion de DPI, documento privado, calendarios y confirmaciones.')
