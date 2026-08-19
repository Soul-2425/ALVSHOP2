# Guía Técnica de Integración - Jorge 🚀

¡Hola Jorge! Este documento contiene las especificaciones exactas de los JSONs y el flujo para que puedas **configurar las Notificaciones Push inmediatamente** y preparar los endpoints de validación de juegos.

---

## ⚡ 1. Notificaciones Push (¡Puedes empezar aquí!)

Toda la estructura en Supabase ya está lista para que conectes el Service Worker y el gestor de suscripciones:

### Tablas a utilizar en Supabase:
1. **`push_subscriptions`:**
   Guarda la suscripción del navegador del usuario:
   - `user_id` (UUID): ID del usuario registrado (`auth.uid()`).
   - `endpoint` (TEXT): URL del endpoint Web Push.
   - `p256dh` (TEXT): Clave pública del navegador.
   - `auth` (TEXT): Clave de autenticación.
   - `user_agent` (TEXT): Identificador del navegador/dispositivo.

2. **`notification_logs`:**
   Historial de notificaciones emitidas:
   - `user_id`, `title`, `body`, `type`, `metadata` (JSONB).

### Archivo donde debes colocar tu código:
- `notificaciones y apis/notificaciones/pushService.js` (ya tiene la plantilla base con funciones exportables).

### Casos de Envío de Push:
- **Al Cliente:**
  1. `orders.status` cambia a `'Completed'` $\rightarrow$ *"¡Tu pedido #{id} ha sido completado y entregado!"*
  2. Asesor responde en soporte (`support_messages.is_admin_reply = true`) $\rightarrow$ *"Un asesor ha respondido a tu consulta."*
- **Al Admin / Asesores:**
  1. Nueva orden creada (`orders.status = 'Pending'`) $\rightarrow$ *"Nueva orden de compra #{id} por ${monto} USDT"*
  2. Mensaje de soporte recibido $\rightarrow$ *"Nuevo mensaje de cliente en soporte"*
  3. Likes o comentarios en publicaciones de la comunidad.

---

## 🎮 2. Especificación JSON para APIs de Juegos (Free Fire, etc.)

Tu código debe residir en `notificaciones y apis/apis/index.js`.

### A. Endpoint / Función de Validación de UID:
- **Entrada (Request):**
  ```json
  {
    "game": "Free Fire",
    "uid": "1548962314",
    "region": "LATAM"
  }
  ```
- **Respuesta Esperada en Caso de Éxito (Response 200):**
  ```json
  {
    "success": true,
    "nickname": "ALV_ProSniper_GT",
    "account_level": 54,
    "region": "LATAM"
  }
  ```
- **Respuesta Esperada en Caso de Error (Response 400/404):**
  ```json
  {
    "success": false,
    "error": "El ID ingresado no fue encontrado o es incorrecto."
  }
  ```

### B. Endpoint / Función de Ejecución de Recargas (Automáticas):
- **Entrada (Request):**
  ```json
  {
    "order_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "product_name": "100 + 10 Diamantes Free Fire",
    "uid": "1548962314",
    "nickname": "ALV_ProSniper_GT"
  }
  ```
- **Respuesta Esperada:**
  ```json
  {
    "success": true,
    "supplier_transaction_id": "SUP-99882312",
    "status": "DELIVERED",
    "timestamp": "2026-08-19T02:55:00Z"
  }
  ```

---

## 🎨 3. Colores Oficiales del Proyecto
Por si necesitas diseñar algún icono, badge o notificación:
- **Fondo:** Negro Carbón (`#0a0d14`)
- **Primario:** Azul Marino (`#1e3a8a`)
- **Acento / Resplandor:** Cyan Neón (`#06b6d4` / `#22d3ee`)

¡Cualquier duda o ajuste que necesites en la base de datos nos avisas por aquí!
