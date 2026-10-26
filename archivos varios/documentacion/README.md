# RuwaJay

Plataforma de vivienda en Guatemala: web React/Vite y Android Kotlin/Compose.

Publicación en el VPS Windows bajo **https://expotec.duckdns.org/ruwajay/** y actualizaciones desde GitHub: [guía paso a paso](../../recuros%20ia/ORGANIZACION.txt). `npm run dev:frontend` conserva la raíz local; `npm run build:vps` compila para `/ruwajay/`. El workflow prepara la web; Firebase/Supabase se configuran por separado según la guía de integración.

La integración actual conserva Firebase Authentication, Firestore, Hosting y FCM en Spark. Supabase Free ejecuta el servidor y almacena fotos, documentos y audio. No requiere desplegar Cloud Functions ni Firebase Storage. Ambas aplicaciones llaman al mismo servidor con su sesión Firebase; no se crean nuevas cuentas de usuarios en Supabase.

El código está preparado localmente. El inicio de sesión, configuración y despliegue de Supabase quedaron para el compañero por indicación del usuario. Todavía no se publicó esta integración ni se migraron datos reales. Consulta [las instrucciones de integración y despliegue](../../recuros%20ia/ORGANIZACION.txt).

## Desarrollo y comprobación

Desde `web/`, copiar .env.example a .env.local y configurar la URL del servidor ya desplegado. No colocar secretos de servidor en clientes.

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

Configurar Java 21, SDK 37, ANDROID_HOME y la misma URL pública de Supabase en app/local.properties. Desde app:

```powershell
.\gradlew.bat :app:assembleDebug :app:testDebugUnitTest
```

La versión actual es 2.6.0 (versionCode 5). La ruta con acentos puede impedir pruebas Gradle en Windows; compilar una copia en ruta ASCII. Un APK debug sin URL del servidor configurada sirve para inspección, pero necesita recompilarse tras el despliegue para probar las operaciones remotas.

### Comprobar las notificaciones Android

En **Perfil → Avisos**, usar **Activar notificaciones**, **Probar sonido y aviso** y **Ajustes de notificaciones**. La prueba local comprueba permiso, presentación y sonido del teléfono; no envía un mensaje por FCM. El canal debe permitir sonido y avisos emergentes. Android conserva la configuración elegida por el usuario; la app no la reemplaza al iniciar.

La app observa mensajes y avisos nuevos desde cualquier pantalla mientras está en primer plano. Omite el historial inicial, los mensajes propios y los ya leídos. Comparte el identificador del evento con FCM para evitar alertas duplicadas dentro del proceso. Los mensajes directos de Android se guardan junto con su resumen en un lote atómico.

Para recibir con la app en segundo plano o cerrada se necesita el servidor Supabase desplegado, sus credenciales FCM y el token del dispositivo registrado. Configurar la misma URL del servidor en web y Android y actualizar ambos clientes: cuando existe esa configuración, el envío pasa por el gateway, que guarda mensaje, resumen y trabajo de notificación juntos. Sin URL se conserva el chat directo existente, pero esa escritura no genera por sí sola un push desde Supabase. El gateway actualizado también conserva respuestas citadas y admite videos MP4/WebM.

Prueba de aceptación: con dos cuentas distintas, enviar desde la web al teléfono en inicio, dentro del chat, en segundo plano y con la pantalla bloqueada. Comprobar una sola alerta, sonido y apertura de la conversación al tocarla. Repetir desde Android hacia otra cuenta y comprobar que cambiar de cuenta o abrir el historial no reproduce mensajes antiguos. El sonido físico y la entrega FCM remota requieren esta prueba en un teléfono real.
