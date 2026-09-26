# Plan de Corrección del Proyecto RuwaJay

El objetivo es corregir los errores de compilación detectados y asegurar que el proyecto esté listo para generar la APK y ejecutarse en un dispositivo móvil.

## Estado Inicial
El proyecto presentaba errores de compilación que impedían la generación del archivo APK:
1. **Unresolved reference 'offset'**: Falta de importación en `HomeScreen.kt`.
2. **Unresolved reference 'NavigationOutlined'**: Referencia a un icono inexistente o mal importado en `RouteScreen.kt`.

## Cambios Realizados

### [Componente UI]

#### [MODIFICAR] [HomeScreen.kt](file:///C:/Aplicaciones_Android/proyectoExpo/RuwaJay/android-app/app/src/main/java/com/example/ruwajay/ui/screens/HomeScreen.kt)
- Se añadió la importación necesaria para el modificador `.offset()`: `androidx.compose.foundation.layout.offset`.

#### [MODIFICAR] [RouteScreen.kt](file:///C:/Aplicaciones_Android/proyectoExpo/RuwaJay/android-app/app/src/main/java/com/example/ruwajay/ui/screens/RouteScreen.kt)
- Se eliminó la importación del icono `NavigationOutlined` que no existe en la librería estándar de Material Icons, resolviendo el error de compilación.

## Verificación
- Se ejecutó la tarea de Gradle `app:assembleDebug` y el build finalizó con éxito.
- El proyecto ya es capaz de generar el archivo APK.

## Próximos Pasos para el Usuario
Para instalar la aplicación en su celular:
1. Conecte su teléfono mediante USB.
2. Active la **Depuración USB** en las opciones de desarrollador de su teléfono.
3. Presione el botón **Run** (ícono de play verde) en Android Studio o ejecute `./gradlew installDebug` desde la terminal.
4. Alternativamente, puede encontrar la APK generada en: `app/build/outputs/apk/debug/app-debug.apk`.
