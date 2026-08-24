# 🏡 Ruwa Jay

### Aplicación móvil para búsqueda y reserva de casas

**Ruwa Jay** es una aplicación móvil que permite **buscar casas, consultar sus características, disponibilidad y precios, y realizar reservas** de forma sencilla.

---

## 🚀 Funcionalidades

* 🏠 Catálogo de casas y fotografías.
* 🔎 Búsqueda y filtros.
* 📍 Ubicación de propiedades.
* 👥 Capacidad, habitaciones, baños y tamaño.
* 💰 Consulta de precios.
* 📅 Disponibilidad y selección de fechas.
* ✅ Realización y confirmación de reservas.
* 📋 Historial de reservas.
* ❤️ Casas favoritas.
* ⭐ Calificaciones y reseñas.
* 🔔 Notificaciones.

---

## 🛠️ Tecnologías

* **Kotlin** — Desarrollo de la aplicación.
* **Android Studio** — Entorno de desarrollo.
* **Jetpack Compose** — Interfaz de usuario.
* **Material 3** — Diseño visual.
* **Firebase Authentication** — Usuarios y acceso.
* **Cloud Firestore** — Base de datos.
* **Firebase Storage** — Fotografías.
* **Firebase Cloud Messaging** — Notificaciones.
* **Git y GitHub** — Control de versiones y colaboración.

---

## 🧠 Arquitectura

Se utilizará **MVVM (Modelo - Vista - Modelo de Vista)** para mantener el proyecto organizado y escalable.

```text
Interfaz (Jetpack Compose)
          ↓
       ViewModel
          ↓
      Repositorio
          ↓
       Firebase
```

---

## 🔥 Firebase

Firebase permitirá gestionar:

```text
usuarios
casas
reservas
favoritos
reseñas
```

Además, se utilizará para autenticación, almacenamiento de imágenes y notificaciones.

---

## 🔄 Flujo principal

```text
👤 Usuario
   ↓
🔐 Iniciar sesión
   ↓
🏠 Buscar casa
   ↓
📋 Ver detalles
   ↓
📅 Consultar disponibilidad
   ↓
🗓️ Seleccionar fechas
   ↓
💰 Ver precio
   ↓
✅ Confirmar reserva
   ↓
📋 Mis reservas
```

---

## 🌿 Control de versiones

Se utilizará Git y GitHub para el desarrollo colaborativo.

```text
main
  │
  └── develop
        │
        ├── feature/autenticacion
        ├── feature/propiedades
        ├── feature/reservas
        └── feature/perfil
```

**Flujo:** Rama → Cambios → Commit → Push → Pull Request → Revisión → `develop`

> ⚠️ No realizar cambios directamente sobre `main`.

---

## 🔮 Futuras funcionalidades

* 🗺️ Mapas y geolocalización.
* 💳 Pagos digitales.
* 💬 Chat.
* 🏷️ Promociones.
* 👨‍💼 Gestión para propietarios.
* 📊 Estadísticas.
* 🤖 Recomendaciones.

---
### 🏡 RUWA JAY

**Encuentra tu lugar. Reserva tu experiencia.**

