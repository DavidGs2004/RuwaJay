# Integración de web y Android — Supabase Free + Firebase Spark

## Estado y cuentas

El usuario eligió Supabase para evitar Blaze. El inicio de sesión en Supabase y el despliegue quedan para su compañero, al final. No se abrió sesión Supabase ni se publicaron el nuevo servidor, reglas o clientes. No se habilitó facturación ni se migraron documentos reales.

En Firebase CLI, garyochoa69@gmail.com continúa como cuenta predeterminada y gochoa21.yt@gmail.com como adicional. Usar siempre --account gochoa21.yt@gmail.com y --project ruwa-jay; no ejecutar logout ni login:use. El 13/10/2026 se desplegaron solamente índices de Firestore: cinco READY, reglas publicadas sin cambios. Firebase tiene facturación deshabilitada, Functions API desactivada y ningún bucket Storage.

## Arquitectura preparada

- Firebase Auth sigue siendo la identidad en web y Android. El gateway verifica firma RS256, audiencia, emisor y caducidad del token del proyecto ruwa-jay; también comprueba el perfil y suspensión. No modifica roles de Firebase para integrarlos con Supabase Auth.
- Firestore conserva usuarios, viviendas, visitas, reservas, conversaciones/mensajes, favoritos, búsquedas, dispositivos y notificaciones, contratos y solicitudes de verificación. Los clientes conservan listeners de lectura en tiempo real.
- supabase/functions/ruwajay-api es el servidor HTTP. Valida reservas y estados, crea conversaciones tras confirmación del propietario, guarda mensaje/resumen juntos, actualiza viviendas y perfiles y propaga sus metadatos. Las mutaciones tienen requestId y comprobación de reintento; las credenciales Firebase y Supabase se usan únicamente en el servidor.
- Supabase Storage: property-images y profile-images son públicos; chat-media y verification son privados. El gateway autentica subidas y comprueba dueño/participantes antes de emitir enlaces privados de cinco minutos. Firestore guarda referencias estables supabase://, nunca enlaces firmados caducables. Los clientes renuevan el enlace privado. Las fotos de perfil públicas se usan en tarjetas y conversaciones.
- Fotos existentes HTTPS de Supabase permanecen; archivos públicos históricos no se vuelven privados automáticamente. Una URL blob: no permite recuperar la foto. No se inventan coordenadas, fotos, identidades ni grabaciones.
- server_jobs registra avisos, búsquedas/favoritos y propagación de perfiles en la misma transacción de la mutación. Se procesa tras solicitudes y con Cron cada cinco minutos; reintenta fallos con espera. Avisos se conservan en Firestore y FCM usa la API HTTP v1; la entrega push real sigue por comprobar.
- Mantenimiento de visitas corre por páginas de 100, una vez por hora. Solo vence visitas schemaVersion 2 con fecha de creación válida y más de siete días; libera únicamente su propia reserva. Las históricas requieren revisión. Se limpian hasta 100 comprobantes de reintentos caducados por hora. Con más de 100 visitas pendientes, recorrer todas tarda varias horas.
- Propagación/avisos consultan páginas de 200, con límite de 10.000 resultados por proceso. Consultas transaccionales de historial fallan de forma explícita si llegan a 500 resultados para evitar reservas duplicadas por truncamiento. Ajustar estos procesos si el volumen aumenta; revisar trabajos con intentos repetidos.
- Contratos son borradores compartidos y plantilla imprimible, sin firma electrónica. Llamadas abren el marcador; no hay WebRTC. Mapas funcionan sin Mapbox; OSRM no ofrece tráfico en vivo. Autenticación especial, notificaciones, ubicación y audio físicos requieren aceptación en dispositivos reales.

No desplegar el directorio functions en Firebase: se conserva para regresiones de emuladores, helpers y migración. El backend Python del comando npm run dev no sustituye este gateway; usar npm run dev:frontend con la URL preparada.

## Configuración que hará el compañero al final

1. Confirmar acceso y el proyecto Supabase de destino. Las fotografías históricas apuntan a yrwrvmcmxqmvkwmsuegc.supabase.co, pero no se comprobó acceso al panel ni configuración actual. No crear otro proyecto ni borrar archivos por suposición. Confirmar plan Free sin activar Pro/Blaze.
2. Revisar y respaldar configuración de buckets/políticas. Ejecutar supabase/storage_setup.sql en el proyecto confirmado. Conserva archivos; las políticas restrictivas bloquean escritura directa desde anon/authenticated y lectura directa de buckets privados. Coordinar clientes antiguos que usaban subidas anónimas. storage_lockdown.sql solo inspecciona el estado.
3. Crear una cuenta de servicio exclusiva de ruwa-jay. Dar permisos de datos necesarios (roles/datastore.user) y envío FCM (roles/firebasecloudmessaging.admin), sin Owner/Editor global. Guardar su JSON como RUWA_FIREBASE_SERVICE_ACCOUNT en secretos de la función. No reutilizar tokens OAuth de las cuentas del operador. Mantener la clave fuera de repositorio, web, APK y chat.
4. Generar RUWA_CRON_SECRET aleatorio de al menos 32 caracteres y guardarlo como secreto servidor. SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son variables integradas de la función; no copiarlas a los clientes. Agregar RUWA_EXTRA_ORIGINS únicamente si hay dominios propios HTTPS, separados por comas.
5. Una vez autorizado el acceso, usar la CLI oficial en el equipo del compañero. Desde esta raíz: npx supabase login; npx supabase projects list. Confirmar el project-ref antes de cualquier mutación. Preparar un archivo privado .env.server.local con los secretos, sin placeholders reales publicados.

```powershell
# SOLO el compañero, después de verificar acceso/proyecto/plan y guardar secretos:
npx supabase secrets set --env-file .env.server.local --project-ref PROJECT_REF_CONFIRMADO
npx supabase functions deploy ruwajay-api --project-ref PROJECT_REF_CONFIRMADO --no-verify-jwt
```

verify_jwt=false es intencional: el token es Firebase, y la función lo verifica dentro del handler. No retirar esa validación. El endpoint /health devuelve proyecto/versión y es público; /scheduled exige el secreto Cron.

6. Crear en Supabase Vault los secretos ruwajay_api_url (URL completa terminada en /functions/v1/ruwajay-api) y ruwajay_cron_secret (igual a RUWA_CRON_SECRET); ejecutar supabase/cron_setup.sql una vez. Revisar cron.job y evitar trabajos duplicados; no pegar valores secretos en archivos versionados. Revisar ejecuciones fallidas de Cron y trabajos pendientes en Firestore.
7. Web: crear .env.local con VITE_SUPABASE_URL, o VITE_RUWA_BACKEND_URL completo. Android: usar la misma URL como SUPABASE_URL o RUWA_BACKEND_URL en local.properties/entorno y recompilar. No hace falta anon key para este gateway. La clave pública VAPID es opcional para habilitar push web; comprobar proveedores Firebase y SHA Android/Google Sign-In.
8. Sin URL configurada, el cliente de producción devuelve un error de servicio no configurado; no intenta subir a Firebase Storage ni llamar Functions de pago. No publicar el build sin la configuración y aceptación remota.

La documentación oficial describe [configuración y validación de JWT](https://supabase.com/docs/guides/functions/function-configuration), [Cron con Vault](https://supabase.com/docs/guides/functions/schedule-functions), [roles Firestore](https://docs.cloud.google.com/iam/docs/roles-permissions/firestore) y [permisos FCM](https://docs.cloud.google.com/iam/docs/roles-permissions/firebasecloudmessaging). Free tiene cuotas y limitaciones; no garantiza operación ilimitada ni disponibilidad continua. Revisar [el plan](https://supabase.com/pricing) y [los límites de funciones](https://supabase.com/docs/guides/functions/limits) antes de publicar. No activar un plan de pago para resolver cuotas sin decisión del usuario.

## Datos reales y publicación coordinada

La captura privada .artifacts/live-audit-2026-10-13T13-54-09-877Z contiene 128 documentos Firestore y 16 usuarios Auth. No es una exportación oficial/atómica ni una restauración ensayada. No contiene respaldo de archivos Supabase. El diagnóstico tiene diez incidencias: dos conversaciones con participantes por verificar, cuatro audios sin archivo, un titular no validado, una vivienda que necesita fotos nuevas y dos confirmaciones históricas sin verificar. La migración propuesta no se aplicó.

Antes de publicar: resolver esas decisiones con información real, respaldar archivos/configuración y preparar mantenimiento/reversión. Desplegar y comprobar el gateway, buckets y Cron; esperar índices READY. Coordinar migración revisada, reglas y clientes compatibles. Las nuevas reglas de visitas/chat requieren el servidor activo. Clientes antiguos que escriben directamente no generan automáticamente los avisos de este gateway: deben actualizarse o incluirse en el plan de transición.

```powershell
# Después de comprobar servidor, datos, clientes y configuración pública:
npm run build
npx firebase deploy --project ruwa-jay --account gochoa21.yt@gmail.com --only firestore:rules,hosting
# Si cambian índices, desplegarlos por separado y esperar a que estén READY.
```

No agregar functions ni storage al comando para esta arquitectura. Probar con usuarios diferentes en web y teléfono: fotos/perfil, reservas concurrentes, confirmación, mensajes, audio privado, suspensión, cambio de cuenta, favoritos, contratos y FCM en primer/segundo plano. Publicar Android firmado con certificados y App Links del dominio real. Un APK debug no es una versión de tienda.

## Auditoría y migración

El serializador ahora conserva Timestamp, GeoPoint, referencias con proyecto/base y bytes, y rechaza objetos no soportados. Esto no sustituye una exportación oficial ni una prueba de reversión.

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

## Validación local

```powershell
npm test
npm run test:backend:unit
npm run test:supabase
npx deno check supabase/functions/ruwajay-api/index.ts
npm run build
npm run test:rules
npm run test:storage
npm run test:integration
npm run test:browser
```

Gateway: Auth/Firestore reales de emuladores demo-ruwajay, archivos/push simulados. Unitarias: JWT, cuenta de servicio ligada al proyecto, rutas privadas y límites. La prueba de navegador actual usa el servidor legado en emuladores; no valida una instalación Supabase remota. La compilación Android 2.6.0 y sus cuatro unitarias pasaron en copia ASCII de este proyecto. No se verificó envío FCM, política SQL de un proyecto real ni archivos reales con Supabase.

Android requiere Java 21/SDK 37. En Windows, compilar una copia sin acentos si Gradle no puede ejecutar pruebas desde Ruwajay Compañeros. No copiar local.properties, claves ni respaldos privados a la entrega.
