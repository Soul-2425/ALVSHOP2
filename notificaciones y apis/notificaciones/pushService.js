/**
 * ==============================================================================
 * SERVICIO DE NOTIFICACIONES PUSH - JORGE
 * Ubicación: /notificaciones y apis/notificaciones/pushService.js
 * ==============================================================================
 * 
 * Aquí debes colocar la lógica para:
 * 1. Solicitar permisos de notificación al usuario en navegador o móvil.
 * 2. Guardar la suscripción en la tabla `push_subscriptions` de Supabase.
 * 3. Enviar notificaciones en los eventos requeridos:
 *    - Cliente: Pedido entregado/completado (`orders.status = 'Completed'`).
 *    - Cliente: Respuesta en chat de soporte (`support_messages.is_admin_reply = true`).
 *    - Admin: Nuevo pedido recibido (`orders.status = 'Pending'`).
 *    - Admin: Comentarios/Likes en feed (`feed_comments`, `feed_likes`).
 *    - Admin: Nuevo mensaje de cliente en chat de soporte.
 */

/**
 * Solicita permisos de notificación al navegador y registra la suscripción en Supabase
 * @param {string} userId - ID del usuario logueado
 */
export async function requestPushPermission(userId) {
  // TODO (JORGE): Implementar lógica de Notification.requestPermission() y suscripción Service Worker
  console.log(`[PUSH NOTIFICATIONS JORGE] Solicitando permisos para usuario: ${userId}`);

  if (!('Notification' in window)) {
    console.warn('Este navegador no soporta notificaciones push');
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    console.log('Permisos de notificación concedidos por el usuario.');
    // TODO (JORGE): Obtener el PushSubscription y guardarlo en la tabla 'push_subscriptions'
    return true;
  }

  return false;
}

/**
 * Disparador de notificación Push (Front/Back)
 * @param {string} userId - Destinatario
 * @param {string} title - Título de la notificación
 * @param {string} body - Mensaje
 * @param {string} type - Tipo de notificación
 */
export async function sendPushNotification({ userId, title, body, type, metadata = {} }) {
  // TODO (JORGE): Llamar a tu backend / Edge Function o Web Push para enviar la notificación
  console.log(`[PUSH NOTIFICATIONS JORGE] Enviando notificación a ${userId}: [${title}] ${body}`);
  return { success: true };
}
