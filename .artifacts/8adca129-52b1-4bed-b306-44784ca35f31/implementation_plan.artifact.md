# Plan de Unificación de Recuperación de Contraseña

Este plan asegura que la funcionalidad de "Olvidé mi contraseña" funcione correctamente en ambas plataformas utilizando el método estándar de Firebase (enlace por correo electrónico), eliminando procesos obsoletos que dependían del backend anterior.

## User Review Required

> [!IMPORTANT]
> **Cambio de Flujo:** En la Web, eliminaremos el proceso de "ingresar un código de 6 dígitos" (que era para el backend de Python) y lo cambiaremos por el flujo nativo de Firebase: se envía un enlace directamente al correo del usuario para que cambie su clave de forma segura.

## Proposed Changes

### 📱 Android App (Ajuste de Mensajería)

#### [MODIFY] [LoginScreen.kt](file:///C:/Aplicaciones_Android/proyectoExpo/proyectogithub/RuwaJay/android-app/app/src/main/java/com/example/ruwajay/ui/screens/LoginScreen.kt)
*   Ajustar el mensaje de éxito para que el usuario sepa que debe buscar un **enlace** en su correo, no un código.

---

### 🌐 Web Frontend (Simplificación)

#### [MODIFY] [LoginPage.jsx](file:///C:/Aplicaciones_Android/proyectoExpo/proyectogithub/RuwaJay/src/pages/LoginPage.jsx)
*   Simplificar el modo `reset`: ahora solo pedirá el correo y mostrará un mensaje de "Enlace enviado".
*   Eliminar los pasos 2 (verificar código) y 3 (nueva contraseña dentro de la app), ya que Firebase maneja esto en su propia página segura.

#### [MODIFY] [AuthContext.jsx](file:///C:/Aplicaciones_Android/proyectoExpo/proyectogithub/RuwaJay/src/context/AuthContext.jsx)
*   Limpiar las funciones `verifyResetCode` y `resetPassword` que ya no son necesarias con el flujo de enlace directo.

---

## Verification Plan

### Manual Verification
1.  **Android:** Hacer clic en "¿Olvidaste tu contraseña?", ingresar un correo real y verificar que llegue el email de Firebase.
2.  **Web:** Hacer clic en "¿Olvidaste tu contraseña?", ingresar el correo y confirmar que el mensaje indique que se envió un enlace.
3.  **Flujo Completo:** Seguir el enlace del correo y cambiar la contraseña para asegurar que el acceso se recupere.
