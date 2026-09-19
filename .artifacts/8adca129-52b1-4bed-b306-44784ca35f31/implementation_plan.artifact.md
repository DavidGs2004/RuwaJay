# Plan de Sincronización y Mejora de RuwaJay (Web + Móvil)

Este plan detalla los pasos necesarios para asegurar que el proyecto Android sea 100% funcional, equivalente a la versión web y que ambos compartan la misma base de datos en Firebase.

## User Review Required

> [!IMPORTANT]
> Actualmente existe una desconexión técnica entre la Web y la App Móvil:
> 1. **Autenticación:** La web usa un backend FastAPI (SQLite), mientras que la App usa Firebase Auth directamente. Esto causa que los usuarios creados en un lado no existan en el otro.
> 2. **Chat:** La web usa WebSockets (FastAPI), y la App usa Firestore. Los mensajes no se sincronizan entre plataformas.
> 3. **Funcionalidades:** La App móvil carece de la "Calculadora Financiera 30/70" y el "Comparador de Propiedades" presentes en la web.

Propongo unificar todo en **Firebase** para cumplir con el requerimiento de "estar conectados en Firebase".

## Proposed Changes

### 📱 Android App (Mejoras de Paridad)

#### [MODIFY] [ExploreScreen.kt](file:///C:/Aplicaciones_Android/proyectoExpo/proyectogithub/RuwaJay/android-app/app/src/main/java/com/example/ruwajay/ui/screens/ExploreScreen.kt)
*   Añadir botón para abrir la **Calculadora Financiera 30/70**.
*   Añadir botón para cambiar a **Vista de Mapa** (actualmente solo tiene lista).

#### [NEW] [RentCalculatorDialog.kt](file:///C:/Aplicaciones_Android/proyectoExpo/proyectogithub/RuwaJay/android-app/app/src/main/java/com/example/ruwajay/ui/components/RentCalculatorDialog.kt)
*   Implementar la lógica de asequibilidad (regla 30/70) para sugerir presupuestos de renta basados en ingresos.

#### [NEW] [CompareManager.kt](file:///C:/Aplicaciones_Android/proyectoExpo/proyectogithub/RuwaJay/android-app/app/src/main/java/com/example/ruwajay/ui/components/CompareManager.kt)
*   Permitir seleccionar hasta 3 propiedades y ver una comparativa de precios, amenidades y ubicación.

### 🌐 Web Frontend (Sincronización Total con Firebase)

#### [MODIFY] [AuthContext.jsx](file:///C:/Aplicaciones_Android/proyectoExpo/proyectogithub/RuwaJay/src/context/AuthContext.jsx)
*   Cambiar la fuente de verdad de la autenticación de FastAPI a **Firebase Auth**.
*   Eliminar la dependencia de `syncFirebaseIdentity` y usar el flujo nativo de Firebase para que sea igual a la App.

#### [MODIFY] [ChatContext.jsx](file:///C:/Aplicaciones_Android/proyectoExpo/proyectogithub/RuwaJay/src/context/ChatContext.jsx)
*   Migrar el sistema de chat de WebSockets (FastAPI) a **Firebase Firestore**.
*   Esto permitirá que un mensaje enviado desde la Web llegue instantáneamente a la App y viceversa.

### ⚙️ Backend & Infraestructura

#### [MODIFY] [firestore.rules](file:///C:/Aplicaciones_Android/proyectoExpo/proyectogithub/RuwaJay/firestore.rules)
*   Verificar y ajustar las reglas de seguridad para permitir el chat y las propiedades de forma segura.

---

## Verification Plan

### Automated Tests
*   Verificar la inicialización de Firebase en ambas plataformas.
*   Probar el flujo de registro en Android y verificar que el usuario pueda loguearse en la Web.

### Manual Verification
1.  **Flujo de Chat:** Enviar un mensaje desde la Web y recibirlo en el emulador de Android.
2.  **Publicación:** Publicar una propiedad desde la App y verla reflejada en el catálogo Web.
3.  **Calculadora:** Abrir la calculadora en Android y verificar que el cálculo de presupuesto sea correcto.
