# RuwaJay

Plataforma de vivienda en Guatemala: web React/Vite y app Android Kotlin/Compose.

Ambos clientes utilizan Firebase Authentication y Cloud Firestore. Las nuevas cargas de fotografias y audio utilizan Firebase Storage. Las URL HTTPS antiguas de Supabase se conservan. Cloud Functions valida reservas, abre conversaciones y genera notificaciones.

## Estado de la integracion

Los cambios locales requieren configurar y desplegar servicios antes de utilizarlos en produccion. No se han migrado ni modificado los datos reales. Consulta [la configuracion, migracion y validacion](docs/INTEGRACION.md).

## Desarrollo web

```powershell
npm ci
npm ci --prefix functions
npm run dev
```

## Validacion

```powershell
npm test
npm run build
npm run test:rules
npm run test:integration
npm run test:browser
```

Las pruebas con emuladores se ejecutan contra `demo-ruwajay`, sin acceder a la base real. Requieren Java 21. Las pruebas de navegador usan Edge o Chrome instalado, o Chromium de Playwright.

## Android

Configura Java 21, SDK 37 y `ANDROID_HOME`, abre `android-app` en Android Studio o ejecuta:

```powershell
cd android-app
.\gradlew.bat :app:assembleDebug :app:testDebugUnitTest
```

Las rutas con caracteres especiales pueden impedir las pruebas en Windows. Consulta las instrucciones de integracion.

No se incluyen enlaces de descarga o afirmaciones de publicacion en tiendas que no hayan sido verificados.
