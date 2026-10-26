from pathlib import Path
import textwrap

root = Path(__file__).resolve().parents[1]
base = root / 'app/app/src/main/java/com/example/ruwajay'

path = base / 'ui/navigation/Screen.kt'
text = path.read_text(encoding='utf-8').replace('    object Profile : Screen("profile")', '    object Profile : Screen("profile")\n    object Verification : Screen("verification")')
path.write_text(text, encoding='utf-8')
path = base / 'ui/navigation/AppNavigation.kt'
text = path.read_text(encoding='utf-8').replace('onNavigateToVerification = { navController.navigate(Screen.Profile.route) }', 'onNavigateToVerification = { navController.navigate(Screen.Verification.route) { launchSingleTop = true } }')
marker = '        composable(route=Screen.EditProperty.route'
index = text.index(marker)
text = text[:index] + '''        composable(Screen.Verification.route) {
            ProfileScreen(
                openVerification = true,
                onLoginClick = { navController.navigate(Screen.Login.route) },
                onPublishClick = { navController.navigate(Screen.Publish.route) { launchSingleTop = true } },
                onExploreClick = { navController.navigate(Screen.Explore.route) },
                onInboxClick = { navController.navigate(Screen.Inbox.route) },
                onChatClick = { navController.navigate(Screen.Chat.createRoute(it)) },
                onPropertyClick = { navController.navigate(Screen.PropertyDetail.createRoute(it)) },
                onSearchClick = { navController.navigate(Screen.SavedSearch.createRoute(it)) }
            )
        }
''' + text[index:]
path.write_text(text, encoding='utf-8')

path = base / 'ui/components/BottomNavBar.kt'
text = path.read_text(encoding='utf-8').replace('activeRoute == Screen.Profile.route || activeRoute == Screen.Publish.route || activeRoute?.startsWith("edit_property") == true', 'activeRoute == Screen.Profile.route || activeRoute == Screen.Verification.route')
path.write_text(text, encoding='utf-8')

path = base / 'ui/screens/PublishScreen.kt'
text = path.read_text(encoding='utf-8')
text = text.replace('val canPublish = userRole == "owner" || userRole == "admin" || isSuperAdmin || isVerified', 'val canPublish = userRole == "admin" || isSuperAdmin || (isVerified && verificationStatus !in listOf("pendiente", "rechazada"))')
text = text.replace('Text("Verificación de Casero Requerida",', 'Text(if (verificationStatus == "pendiente") "Tu DPI está en revisión" else "Verificación de Casero Requerida",')
text = text.replace('    var submitted by remember { mutableStateOf(false) }', '    var submitted by remember { mutableStateOf(false) }\n    var confirmPublication by remember { mutableStateOf(false) }')
start = text.index('                                isPublishing = true')
end = text.index('\n                            },\n                            shape =', start)
operation = textwrap.dedent(text[start:end])
text = text[:start] + '                                confirmPublication = true' + text[end:]
index = text.index('    Scaffold(')
text = text[:index] + '    fun submitPublication() {\n' + textwrap.indent(operation, '        ') + '\n    }\n\n' + text[index:]
index = text.rindex('\n}')
text = text[:index] + '''
    if (confirmPublication) {
        AlertDialog(
            onDismissRequest = { confirmPublication = false },
            title = { Text(if (propertyId == null) "¿Publicar esta vivienda?" else "¿Guardar los cambios?") },
            text = { Text("Confirma que la ubicación, el precio y las fotografías son correctos antes de continuar.") },
            confirmButton = { TextButton(onClick = { confirmPublication = false; submitPublication() }) { Text("Confirmar") } },
            dismissButton = { TextButton(onClick = { confirmPublication = false }) { Text("Revisar") } }
        )
    }
''' + text[index:]
text = text.replace('Text("¡Vivienda Publicada Exitosamente!",', 'Text(if (propertyId == null) "¡Vivienda publicada!" else "¡Cambios guardados!",')
path.write_text(text, encoding='utf-8')

# El buscador de resultados permanece en el encabezado: no se desplaza al
# reducirse el alto disponible y no hay scrolls programados al escribir.
path = base / 'ui/screens/ExploreScreen.kt'
text = path.read_text(encoding='utf-8')
start = text.index('                        // Barra de búsqueda')
end = text.index('                        // Radar GPS', start)
search = textwrap.dedent(text[start:end])
text = text[:start] + text[end:]
start = text.index('            RuwaHeader(', text.index('    Scaffold('))
end = text.index('\n        },', start)
header = text[start:end]
text = text[:start] + '            Column {\n' + textwrap.indent(textwrap.dedent(header), '                ') + '''
                Box(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
''' + textwrap.indent(search, '                    ') + '\n                }\n            }' + text[end:]
path.write_text(text, encoding='utf-8')

path = base / 'ui/screens/HomeScreen.kt'
text = path.read_text(encoding='utf-8')
text = text.replace('import androidx.compose.ui.platform.LocalConfiguration', 'import androidx.compose.ui.platform.LocalFocusManager\nimport androidx.compose.ui.platform.LocalConfiguration')
text = text.replace('    var searchText by remember', '    val focusManager = LocalFocusManager.current\n    var searchText by remember', 1)
text = text.replace('keyboardActions = KeyboardActions(onSearch = { onExploreClick() })', 'keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus(); onExploreClick() })')
path.write_text(text, encoding='utf-8')
print('Navegacion de verificacion, confirmacion de publicacion y buscador fijo integrados.')
