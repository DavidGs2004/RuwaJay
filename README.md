# RuwaJay

Plataforma de vivienda en Guatemala: web React/Vite y Android Kotlin/Compose.

La integración actual conserva Firebase Authentication, Firestore, Hosting y FCM en Spark. Supabase Free ejecuta el servidor y almacena fotos, documentos y audio. No requiere desplegar Cloud Functions ni Firebase Storage. Ambas aplicaciones llaman al mismo servidor con su sesión Firebase; no se crean nuevas cuentas de usuarios en Supabase.

El código está preparado localmente. El inicio de sesión, configuración y despliegue de Supabase quedaron para el compañero por indicación del usuario. Todavía no se publicó esta integración ni se migraron datos reales. Consulta [las instrucciones de integración y despliegue](docs/INTEGRACION.md).

## Desarrollo y comprobación

Copiar .env.example a .env.local y configurar la URL del servidor ya desplegado. No colocar secretos de servidor en clientes.

```powershell
npm ci
npm run dev:frontend
npm test
npm run test:backend:unit
npm run test:supabase
npm run build
```

Las pruebas del gateway usan Auth/Firestore de demo-ruwajay y un almacenamiento simulado. Requieren Java 21; no demuestran un despliegue Supabase real. test:integration y test:browser conservan el servidor Functions de emuladores como regresión de la implementación anterior. Ese servidor no se despliega en Spark.

## Android

Configurar Java 21, SDK 37, ANDROID_HOME y la misma URL pública de Supabase en android-app/local.properties. Desde android-app:

```powershell
.\gradlew.bat :app:assembleDebug :app:testDebugUnitTest
```

La versión actual es 2.6.0 (versionCode 5). La ruta con acentos puede impedir pruebas Gradle en Windows; compilar una copia en ruta ASCII. Un APK debug sin URL del servidor configurada sirve para inspección, pero necesita recompilarse tras el despliegue para probar las operaciones remotas.
