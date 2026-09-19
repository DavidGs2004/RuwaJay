# Tareas de Unificación y Mejora RuwaJay

- `[ ]` **Infraestructura y Seguridad**
    - `[ ]` Ajustar `firestore.rules` para permitir chat y gestión de favoritos.
- `[x]` **Sincronización Web (Firebase como Fuente de Verdad)**
    - `[x]` Migrar `AuthContext.jsx` a Firebase Auth nativo.
    - `[x]` Migrar `ChatContext.jsx` a Firestore (eliminando dependencia de WebSockets).
    - `[x]` Asegurar que `FavoritesContext.jsx` use Firestore.
- `[x]` **Mejoras en App Android (Paridad con Web)**
    - `[x]` Implementar Vista de Mapa en `ExploreScreen.kt`.
    - `[x]` Crear e integrar `RentCalculatorDialog.kt` (Calculadora 30/70).
    - `[x]` Implementar sistema de comparación de propiedades.
- `[/]` **Verificación Final**
    - `[ ]` Probar registro/login cruzado (Web <-> App).
    - `[ ]` Probar chat en tiempo real cruzado.
    - `[ ]` Validar persistencia de favoritos.
