# RuwaJay en el VPS Windows y publicación automática

Destino: **https://expotec.duckdns.org/ruwajay/**. Esta guía supone **IIS**, pendiente de confirmar en el VPS. Si usas Apache/XAMPP, `web.config` no se aplica y hay que adaptar la configuración del servidor antes de publicar.

El repositorio ya tiene remoto `https://github.com/DavidGs2004/RuwaJay/` y rama `main`. Los cambios se prepararon localmente; esto no significa que ya estén subidos, que el runner esté instalado ni que el sitio esté publicado.

## 1. Qué se publica

RuwaJay es React/Vite. El VPS sirve los archivos estáticos compilados. WordPress sigue en la raíz y la aplicación de empleados conserva su configuración. RuwaJay usa Firebase Authentication/Firestore y el gateway Supabase existente; PHP, MySQL y la API Express de empleados no sustituyen esos servicios. No necesitas un proceso Node, PM2, otro puerto público ni otro certificado para servir esta web.

La automatización será:

```text
Cambio local → git push a main → GitHub compila y prueba
            → runner del VPS descarga el paquete
            → respalda ruwajay → publica recursos → reemplaza index.html
```

Se sigue haciendo un build en cada publicación, pero GitHub lo ejecuta automáticamente. Solo se publican los archivos de `dist`, nunca las fuentes, `.git`, `node_modules` ni credenciales. El workflow no despliega cambios en reglas Firebase, funciones Supabase, SQL o Android; esos tienen su proceso en `INTEGRACION.md`.

## 2. Comprobar localmente

Usa Node 24. En PowerShell puedes utilizar `npm.cmd` si la política de ejecución bloquea `npm.ps1`.

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
```

Edita `.env.local` y sustituye `YOUR_PROJECT_REF` por el proyecto real ya configurado. Usa `VITE_SUPABASE_URL` o la URL completa `VITE_RUWA_BACKEND_URL`. Reinicia Vite cuando cambies variables.

```powershell
npm.cmd run dev:frontend
```

Abre `http://localhost:5173/`. Para probar localmente la misma subcarpeta del VPS:

```powershell
npm.cmd run dev:frontend -- --base=/ruwajay/
```

Abre `http://localhost:5173/ruwajay/`. Para probar el resultado compilado:

```powershell
npm.cmd run build:vps
npm.cmd run preview -- --base=/ruwajay/ --host localhost
```

Abre `http://localhost:4173/ruwajay/login` y recarga la página. `npm run build` sigue disponible para otros destinos que sirvan desde `/`.

Las rutas React usan `BASE_URL`, igual que logos, banners, fotos de respaldo y el service worker. Los enlaces de navegación React continúan siendo `/perfil`, `/chat`, etc.; el router agrega la base. En nuevos recursos públicos utiliza `${import.meta.env.BASE_URL}logo/logo.png`, o importa recursos desde `src/assets`. No agregues `/ruwajay` manualmente a cada `Link`.

## 3. Preparar IIS una sola vez

Entra al VPS por Escritorio Remoto y abre **Administrador de IIS**. Identifica el sitio que tiene el binding HTTPS para `expotec.duckdns.org` y verifica su ruta física en **Configuración básica**. No supongas que es la ruta predeterminada si la cambiaste al instalar WordPress.

1. Guarda una copia del `web.config` raíz actual y de la configuración IIS del sitio.
2. Comprueba que IIS tiene **Contenido estático**, **Documento predeterminado** y **URL Rewrite**. Este último debe aparecer como una función del sitio. Usa la [página oficial de URL Rewrite](https://learn.microsoft.com/en-us/iis/extensions/url-rewrite/iis-url-rewrite) si falta.
3. Si la raíz real es `C:\inetpub\wwwroot`, crea `C:\inetpub\wwwroot\ruwajay`. Si es otra, crea `ruwajay` dentro de esa raíz. Puedes usar un directorio virtual llamado `ruwajay` si necesitas otra ubicación física.
4. Da lectura a la identidad del sitio IIS en esa carpeta. Más adelante, la cuenta del servicio runner necesitará **Modificar** únicamente en la carpeta de RuwaJay y la carpeta de respaldos.
5. Mantén los bindings actuales de HTTP/HTTPS y la renovación del certificado. La subcarpeta utiliza el mismo hostname y certificado.

El build incluye `public/web.config`, que Vite copia a `dist/web.config`. Define `index.html` como documento y devuelve ese archivo al navegar a rutas React, por ejemplo `/ruwajay/perfil`. Los archivos existentes se sirven directamente. La regla requiere `Accept: text/html` para que un recurso faltante no devuelva HTML como JavaScript.

### Evitar que WordPress o un proxy intercepte RuwaJay

Revisa las reglas en el **web.config raíz**. Las reglas distribuidas se evalúan también desde directorios superiores: la configuración hija no puede deshacer una reescritura que ya ocurrió arriba. Esto se explica en la [referencia de IIS](https://learn.microsoft.com/en-us/iis/extensions/url-rewrite-module/url-rewrite-module-configuration-reference).

En la regla que manda solicitudes a `index.php` de WordPress, agrega esta condición dentro de sus condiciones existentes con `logicalGrouping="MatchAll"`:

```xml
<add input="{URL}" pattern="^/ruwajay(/|$)" negate="true" />
```

Debe quedar conceptualmente así; **edita la regla existente**, no reemplaces todo tu archivo por este ejemplo:

```xml
<rule name="WordPress" stopProcessing="true">
  <match url=".*" />
  <conditions logicalGrouping="MatchAll">
    <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
    <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
    <add input="{URL}" pattern="^/ruwajay(/|$)" negate="true" />
  </conditions>
  <action type="Rewrite" url="index.php" />
</rule>
```

Si la regla de empleados ya solo coincide con `^empleados`, conserva ese alcance. Si existe cualquier proxy o catch-all que coincida con todas las rutas, también debe excluir `/ruwajay`. Conserva las redirecciones generales de HTTPS. No modifiques reglas globales sin revisar su alcance.

## 4. Habilitar el dominio en Firebase y Supabase

En Firebase Console del proyecto **ruwa-jay**, abre Authentication → Settings → Authorized domains y agrega `expotec.duckdns.org` (sin protocolo ni subcarpeta). Confirma también `localhost` para desarrollo. Conserva `VITE_FIREBASE_AUTH_DOMAIN` con su valor Firebase actual; no lo cambies al dominio del VPS solo por alojar allí la web. Consulta [Google Sign-In con Firebase](https://firebase.google.com/docs/auth/web/google-signin).

Si quieres que el correo de recuperación abra este sitio, configura la URL de acción de la plantilla **restablecer contraseña** como `https://expotec.duckdns.org/ruwajay/reset-password`. Prueba un correo nuevo; los enlaces históricos conservan su destino anterior. No apliques esa ruta a otros tipos de correos sin implementar sus acciones.

El gateway Supabase rechaza orígenes que no estén autorizados. En los secretos de la función configura `RUWA_EXTRA_ORIGINS` incluyendo:

```text
https://expotec.duckdns.org,http://localhost:5173,http://localhost:4173
```

Conserva otros orígenes necesarios si ya existen. Un origen no incluye `/ruwajay` ni barra final. El cliente redirige `127.0.0.1` a `localhost`.

Para que los enlaces de notificaciones FCM apunten al VPS, configura también el secreto servidor:

```text
RUWA_WEB_URL=https://expotec.duckdns.org/ruwajay/
```

Se agregó soporte para esa variable en `supabase/functions/ruwajay-api/index.ts`; requiere desplegar esa versión del gateway según [INTEGRACION.md](INTEGRACION.md), con el proyecto confirmado. No la pongas en `.env.local`: es configuración del servidor Supabase. Los tokens, reglas, buckets y trabajos Cron siguen siendo necesarios para la operación completa.

Comprueba `https://TU_PROYECTO.supabase.co/functions/v1/ruwajay-api/health` y las operaciones desde el navegador. Que `/health` responda no demuestra que CORS, permisos y subidas funcionen. La clave VAPID pública se configura si vas a habilitar push web. Las claves `service_role`, cuentas de servicio y secretos Cron permanecen en Supabase.

## 5. Instalar el runner en el VPS

Un runner es el servicio que recibe las publicaciones de GitHub en el VPS. Aquí solo descarga y copia el paquete; la compilación ocurre en GitHub. El VPS necesita salida HTTPS a GitHub y a sus servidores de artefactos. No necesitas exponer un puerto de despliegue a Internet.

1. Abre el repositorio `DavidGs2004/RuwaJay` en GitHub con una cuenta que administre el repositorio.
2. Ve a **Settings → Actions → Runners → New self-hosted runner**. Selecciona **Windows / x64**.
3. En una consola administrativa del VPS, sigue los comandos actuales que GitHub genera para descargar, verificar y descomprimir el runner en `C:\actions-runner-ruwajay`. Está fuera de `wwwroot`.
4. Ejecuta el comando `config.cmd` que muestra GitHub, con su token temporal, y agrega la etiqueta personalizada **ruwajay** cuando pregunte por labels. No publiques ese token.
5. Cuando pregunte si deseas ejecutarlo como servicio, responde que sí. Elige una cuenta dedicada con permisos de escritura sobre la carpeta `ruwajay`, `C:\RuwaJay-backups` y su directorio de trabajo, sin permisos de modificación sobre WordPress o empleados. Crea la carpeta de respaldos fuera de la raíz pública. Si seleccionas `NT AUTHORITY\NETWORK SERVICE`, esa es la identidad a la que debes dar esos permisos.
6. Comprueba en GitHub que aparezca **Idle** y tenga las etiquetas `self-hosted`, `Windows`, `X64`, `ruwajay`. Comprueba que el servicio vuelva a iniciar tras reiniciar Windows.

Sigue las instrucciones actuales de [registro del runner](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners) y [ejecución como servicio Windows](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/configure-the-application?platform=windows).

Este runner ejecuta instrucciones procedentes del repositorio: limita quién puede cambiar `main` y los workflows. El workflow proporcionado solo publica desde `main`; no ejecutes código de pull requests externos en el VPS. GitHub detalla este riesgo en sus [recomendaciones para runners propios](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions#hardening-for-self-hosted-runners). Usa protección de rama o revisión según cómo trabaje tu equipo.

## 6. Variables de GitHub

En el repositorio: **Settings → Secrets and variables → Actions → Variables → New repository variable**. Son variables de repositorio, no de un Environment.

| Nombre | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://TU_PROYECTO_REAL.supabase.co` |
| `VITE_RUWA_BACKEND_URL` | Opcional; URL completa si deseas sobrescribir la derivada de Supabase |
| `VITE_FIREBASE_VAPID_KEY` | Clave pública VAPID, si habilitas notificaciones web |
| `VITE_MAPBOX_ACCESS_TOKEN` | Token público de Mapbox, si lo utilizas |
| `RUWAJAY_IIS_PATH` | Ruta física absoluta exclusiva, por ejemplo `C:\inetpub\wwwroot\ruwajay` |
| `RUWAJAY_BACKUP_ROOT` | `C:\RuwaJay-backups` |
| `RUWAJAY_DEPLOY_ENABLED` | `true`, al terminar la preparación |

El workflow rechaza una URL del backend vacía, con el placeholder o sin HTTPS. Las variables `VITE_*` terminan en JavaScript público: no son un lugar para secretos. El cliente conserva la configuración Firebase pública ya incluida en el repositorio.

Si `RUWAJAY_DEPLOY_ENABLED` no es `true`, se compila y guarda el paquete, y la publicación queda omitida. Esto permite preparar el servidor antes de activar las actualizaciones. Cambiar variables no dispara un build: utiliza **Run workflow** después.

## 7. Primera publicación y trabajo diario

Revisa el diff y sube los cambios a `main` con tu flujo habitual de Git. Puedes hacerlo desde VS Code/GitHub Desktop. Desde terminal, después de seleccionar y confirmar los archivos que vas a incluir:

```powershell
git push origin main
```

El archivo `.github/workflows/deploy-vps.yml` debe estar en GitHub. Ve a **Actions → Publicar RuwaJay en VPS Windows** y observa los jobs `build` y `deploy`. También puedes usar **Run workflow**, seleccionando `main`. Si el equipo trabaja con ramas, combina los cambios en `main` para publicar.

La publicación automática se dispara cuando cambian fuentes, recursos, dependencias, pruebas o la configuración del workflow. Cambios solo en documentación o Android no necesitan volver a publicar la web.

Comprueba al terminar:

- `https://expotec.duckdns.org/` sigue mostrando WordPress.
- `https://expotec.duckdns.org/empleados` sigue funcionando.
- `https://expotec.duckdns.org/ruwajay/` abre la web; sin sesión muestra login.
- `/ruwajay/login` y `/ruwajay/perfil` cargan también al entrar directamente o presionar F5.
- `/ruwajay/logo/logo.png` y `/ruwajay/manifest.json` devuelven sus archivos.
- Login por correo/Google, recuperación de contraseña, fotos, publicación y chat funcionan con usuarios de prueba.
- Si habilitas push, el service worker tiene ámbito `/ruwajay/` y al tocar el aviso abre la ruta dentro de esa carpeta.

En adelante: cambia el código local, pruébalo y sube a `main`. GitHub ejecutará pruebas y build, respaldará la versión anterior y publicará. No se requiere RDP ni copiar `dist` en cada actualización.

## 8. Respaldos y recuperación

`scripts/deploy-iis.ps1` verifica que el destino termine en `ruwajay`, que el build use `/ruwajay/` y que las rutas estén separadas. Copia la versión existente a una carpeta con fecha dentro de `RUWAJAY_BACKUP_ROOT`; luego copia recursos nuevos y reemplaza `index.html` al final. Conserva recursos antiguos con hash para pestañas abiertas y no usa borrado en espejo.

El respaldo contiene únicamente la web estática; no respalda datos Firebase/Supabase. Las carpetas de respaldos y los assets antiguos acumulan espacio: revisa su tamaño y conserva las versiones que necesites antes de hacer limpieza manual.

Si la comprobación HTTP final falla, el workflow informa error; no restaura automáticamente, porque un problema de IIS o conectividad también puede causar ese fallo. Para volver a una versión anterior, ejecuta en el VPS con una copia local del script:

```powershell
# Sustituye el nombre del respaldo y las rutas por las reales.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\herramientas\deploy-iis.ps1 -Source C:\RuwaJay-backups\RESPALDO_ELEGIDO -Destination C:\inetpub\wwwroot\ruwajay -BackupRoot C:\RuwaJay-backups
```

Guarda el script en esa ruta de herramientas antes de usar el comando. Restaurar genera un respaldo de la versión que reemplaza. También puedes revertir el commit problemático en Git y subir el revert para reconstruir/publicar la versión corregida.

## 9. Diagnóstico rápido

| Síntoma | Revisión |
| --- | --- |
| Se abre WordPress al recargar una ruta | Falta excluir `/ruwajay` en la regla raíz de WordPress o un proxy general |
| IIS 500.19 | Revisa el código de detalle: módulo URL Rewrite ausente, sección bloqueada o configuración heredada incompatible |
| IIS 403.14 | `index.html` falta o Documento predeterminado no está habilitado |
| JS/CSS 404 o MIME HTML | Se publicó un build de raíz o alguna regla está reescribiendo archivos hacia WordPress/index.html |
| `auth/unauthorized-domain` | Agrega el hostname en Firebase Authorized domains |
| Backend devuelve 403/CORS | Configura `RUWA_EXTRA_ORIGINS` con el origen exacto, sin subcarpeta |
| No hay subidas/mensajes | Confirma URL de gateway, despliegue, secretos, buckets y reglas según `INTEGRACION.md` |
| Job `deploy` aparece Skipped | `RUWAJAY_DEPLOY_ENABLED` no es `true`, o la ejecución no es de `main` |
| Job `deploy` queda Queued | Runner apagado, sin servicio o sin las etiquetas requeridas |
| Robocopy falla con 8 o superior | Revisa las rutas, espacio y permisos de la identidad del servicio |

La selección de la base está documentada en [Vite: Public Base Path](https://vite.dev/guide/build#public-base-path). La comprobación local no verifica la configuración real del VPS, su certificado, las credenciales del runner ni las operaciones remotas de Supabase.
