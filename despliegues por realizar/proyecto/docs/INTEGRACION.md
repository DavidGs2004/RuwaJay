# Integración de web y Android

Estos cambios están preparados en el repositorio. No se han publicado reglas, funciones, web, APK ni migraciones en el proyecto real. **No publicar solo las reglas:** las visitas y la apertura de conversaciones requieren las nuevas funciones del servidor.

## Fuente de datos y comportamiento

- Identidad: Firebase Authentication. Los identificadores locales, nombres y correos no conceden permisos.
- Firestore: `users`, `properties`, `visits`, `visit_slots`, `conversations/{id}/messages`, `lease_drafts`, `system_updates`, `verification_requests` y subcolecciones de usuarios `favorites`, `saved_searches`, `devices`, `notifications`.
- Visitas: fechas `date` en `YYYY-MM-DD`, horas `time` en `HH:mm`, zona horaria Guatemala. `createVisit` reserva el horario en una transacción. `changeVisitStatus` valida quién puede confirmar, rechazar o cancelar. La confirmación crea el chat. Una tarea del servidor vence solicitudes pendientes de más de siete días.
- Chat: identificador `v2_{tenantUid}_{ownerUid}_{propertyId}`; mensajes `type: text|image|audio|location`, `mediaUrl`, `senderId`, `senderName`, `createdAt`. El mensaje y su resumen se guardan juntos. `readAt.{uid}` registra lectura por participante. Las conversaciones existentes se conservan hasta migrarlas.
- Fotos: nuevas cargas mediante Firebase Storage. Las URL HTTPS existentes de Supabase permanecen utilizables. Una URL `blob:localhost` no contiene el archivo y requiere volver a subir la fotografía.
- Perfil y reseñas: Firestore compartido. El servidor actualiza nombres, contactos y fotos copiados en propiedades, visitas y conversaciones cuando cambia el perfil. Una solicitud de verificación no verifica automáticamente a la persona.
- Contratos: borradores privados en `lease_drafts/{conversationId}`. El propietario guarda condiciones y ambos participantes las consultan. La web permite imprimir la plantilla; Android comparte el resumen. No hay firma electrónica ni contrato firmado almacenado.
- Notificaciones: avisos persistentes por usuario y envío mediante FCM para mensajes, visitas, búsquedas coincidentes y reducción de precios de favoritos. El usuario activa permisos por dispositivo. Los eventos de mensajería migrados no generan avisos históricos.
- Mapas: sin inventar coordenadas de viviendas. Android utiliza GPS y rutas viales; puede abrir navegación externa. Con Mapbox configurado usa su proveedor de rutas; el respaldo OSRM no incluye tráfico en vivo.
- Llamadas: se retiró el modal que simulaba una llamada. El botón abre el marcador telefónico cuando hay un teléfono. `active_calls` queda cerrado: el repositorio recibido no contiene un cliente WebRTC real. Implementar llamadas internas exige una decisión explícita y un servicio TURN para dispositivos detrás de redes restringidas.

## Configuración antes de desplegar

1. Confirmar que Android (`google-services.json`) y web utilizan el mismo proyecto de Firebase. La configuración predeterminada corresponde a `ruwa-jay`.
2. Habilitar proveedores de Authentication y dominios autorizados; comprobar certificados SHA de Android para Google Sign-In.
3. Confirmar disponibilidad y permisos de Cloud Functions, Firestore, Cloud Storage, Cloud Messaging y Cloud Scheduler, y revisar el plan/facturación del proyecto. No aceptar cargos desde este repositorio sin revisar la consola.
4. Configurar la clave pública Web Push en `VITE_FIREBASE_VAPID_KEY`. Definir `WEB_ORIGIN` para Functions con el origen HTTPS real. Android no necesita VAPID.
5. Mapbox opcional: `VITE_MAPBOX_ACCESS_TOKEN` para web y `MAPBOX_ACCESS_TOKEN` en `android-app/local.properties` o entorno de compilación Android. Los tokens deben tener restricciones apropiadas en el proveedor. Para producción se recomienda un proveedor con capacidad y disponibilidad acordes al tráfico esperado.
6. Revisar `supabase/storage_lockdown.sql` y todas las políticas reales antes de cerrar las cargas anónimas antiguas. El SQL no elimina archivos.
7. Configurar App Links del dominio real con `/.well-known/assetlinks.json`, applicationId y certificados de la compilación firmada. Los enlaces de esquema `ruwajay://...` ya están presentes; la verificación HTTPS depende del dominio y certificado reales.

## Auditoría y migración

El script usa Firebase Admin con credenciales del operador mediante Application Default Credentials; `firebase login` por sí solo no configura ADC. Realizar ese inicio de sesión en la computadora del operador, sin enviar contraseñas ni archivos de claves al chat. Antes de aplicar una migración, pausar las escrituras de usuarios y revisar el respaldo.

```powershell
node functions/scripts/migrate-data.js --project ruwa-jay --backup .artifacts/db-backup.json --report .artifacts/db-audit.json
```

La ejecución anterior solo lee y respalda. También se puede revisar un respaldo existente sin conexión:

```powershell
node functions/scripts/migrate-data.js --input .artifacts/db-backup.json --mapping .artifacts/identity-mapping.json --report .artifacts/db-plan.json
```

El archivo de decisiones debe contener `identities` (ID anterior → UID verificado), `properties` (coordenadas/fotos confirmadas), `adminDecisions` (`retain` o `demote` por administrador existente) `confirmedVisitIds` para confirmar la legitimidad de visitas aceptadas antiguas, `archiveRooms` para conversaciones de prueba confirmadas por el operador y, si se acepta archivarlos, `acceptMissingAudio` con las rutas de notas simuladas antiguas. No inferir propietarios por nombre. Verificar las cuentas y la titularidad antes de escribir el mapa.

El modo `--apply` requiere proyecto, respaldo de entrada y **otra ruta de respaldo nuevo**, comprueba que no hubo cambios desde el diagnóstico y rechaza cualquier incidencia pendiente. Las escrituras se aplican en un lote atómico de hasta 450 operaciones. Para bases mayores se necesita una migración por etapas durante mantenimiento. Las conversaciones antiguas se conservan y se marcan con `migratedTo`; los clientes muestran las nuevas. El script no recupera fotos temporales ni audios que nunca se grabaron.

Los respaldos pueden contener información privada: mantenerlos fuera de Git (`.artifacts` está ignorado). Revisar por separado los tokens administrativos existentes y revocar las credenciales de respaldo que estaban incrustadas en la versión anterior.

## Orden de publicación

1. Probar los cambios en un proyecto de pruebas y resolver el diagnóstico de los datos reales.
2. Preparar respaldo, ventana de mantenimiento y reversión con las versiones anteriores de reglas/clientes. Reconciliar reservas existentes: las funciones nuevas necesitan los documentos `visit_slots`.
3. Publicar índices y funciones; esperar a que los índices estén listos.
4. Aplicar la migración revisada, reglas de Firestore y Storage, web y versión Android compatibles dentro de la ventana acordada.
5. Verificar cuentas, propiedades, fotos, favoritos, visitas, chat, audios, lectura, contratos, perfil, reseñas y permisos en ambos sentidos.
6. Probar FCM en teléfono/navegador reales, en primer plano y segundo plano; comprobar cambio de cuenta y cierre de sesión. El emulador no demuestra entrega push real.

## Validación local

```powershell
npm ci
npm ci --prefix functions
npm test
npm run build
npm run test:rules
npm run test:storage
npm run test:integration
npm run test:browser
```

Los comandos con emuladores usan exclusivamente `demo-ruwajay`. Requieren Java 21 y Node compatible. Configurar `JAVA_HOME` y el PATH correspondiente. La prueba de navegador usa Edge/Chrome instalado; en otros entornos instalar Chromium con Playwright. El modo `VITE_FIREBASE_EMULATORS=true` funciona únicamente en desarrollo; un build de producción no se conecta a emuladores.

Android: Java 21, SDK 37 y `ANDROID_HOME` configurado:

```powershell
cd android-app
.\gradlew.bat :app:assembleDebug :app:testDebugUnitTest
```

En esta máquina, la ruta `Ruwajay Compañeros` provoca problemas de carga de clases de prueba en Windows. Se validó una copia del mismo código en una ruta temporal sin caracteres especiales. Para compilar aquí puede usarse `-Pandroid.overridePathCheck=true`; para ejecutar pruebas es preferible una ruta sin acentos. Los APK de depuración no son una publicación firmada de producción.
