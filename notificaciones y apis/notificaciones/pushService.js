/**
 * ==============================================================================
 * SERVICIO DE NOTIFICACIONES PUSH & TIEMPO REAL - ALVSHOP
 * Ubicación: /notificaciones y apis/notificaciones/pushService.js
 * ==============================================================================
 * 
 * Gestiona:
 * 1. Solicitud de permisos de notificación (Web & Móvil).
 * 2. Registro de Service Worker y suscripción a Web Push en `push_subscriptions`.
 * 3. Notificaciones en tiempo real (Supabase WebSockets Realtime Channels).
 * 4. Registro de historial en la tabla `notification_logs`.
 * 5. Disparo de eventos para Cliente y Backoffice Admin:
 *    - Cliente: Pedido entregado/completado.
 *    - Cliente: Respuesta en chat de soporte.
 *    - Admin: Nuevo pedido recibido.
 *    - Admin: Likes / Comentarios en el Feed.
 *    - Admin: Nuevo mensaje de cliente en chat de soporte.
 */

import { supabase } from '../../src/supabaseClient';
import { soundEffects } from '../../src/services/soundEffects';

// Clave pública VAPID para Web Push (estándar o generable)
const PUBLIC_VAPID_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuTlUh-r48MhSbgYpE';

/**
 * Convierte una clave VAPID base64 a Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Verifica el estado actual del soporte y permiso de notificaciones
 */
export function getPushPermissionStatus() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'default', 'granted', 'denied'
}

/**
 * Solicita permisos de notificación al navegador y registra la suscripción en Supabase
 * @param {string} userId - ID del usuario logueado
 * @returns {Promise<boolean>}
 */
export async function requestPushPermission(userId) {
  if (typeof window === 'undefined') return false;

  if (!('Notification' in window)) {
    console.warn('[PUSH SERVICE] Este navegador no soporta la API de Notificaciones.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[PUSH SERVICE] El usuario no concedió permisos de notificación.');
      return false;
    }

    console.log('[PUSH SERVICE] Permisos de notificación concedidos.');

    // Registrar Service Worker si está soportado
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
          });
        } catch (subErr) {
          console.warn('[PUSH SERVICE] Suscripción VAPID omitida, usando fallback de registro local:', subErr);
        }
      }

      // Guardar suscripción en Supabase si hay usuario
      if (userId && subscription) {
        const rawKey = subscription.getKey ? subscription.getKey('p256dh') : null;
        const rawAuth = subscription.getKey ? subscription.getKey('auth') : null;

        const p256dh = rawKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) : 'local-p256dh';
        const auth = rawAuth ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuth))) : 'local-auth';

        await supabase.from('push_subscriptions').upsert(
          {
            user_id: userId,
            endpoint: subscription.endpoint || `local-endpoint-${userId}`,
            p256dh: p256dh,
            auth: auth,
            user_agent: navigator.userAgent
          },
          { onConflict: 'user_id' }
        );

        console.log('[PUSH SERVICE] Suscripción registrada exitosamente en Supabase.');
      }
    }

    return true;
  } catch (error) {
    console.error('[PUSH SERVICE] Error al solicitar permisos push:', error);
    return false;
  }
}

/**
 * Registra una notificación en la base de datos y la emite en tiempo real
 * @param {object} params
 * @param {string} params.userId - Destinatario
 * @param {string} params.title - Título
 * @param {string} params.body - Mensaje
 * @param {string} params.type - Tipo de evento ('order_completed', 'support_reply', 'feed_interaction', 'admin_new_order')
 * @param {object} params.metadata - Datos adicionales (order_id, url, etc.)
 */
export async function sendPushNotification({ userId, title, body, type = 'general', metadata = {} }) {
  console.log(`[PUSH SERVICE] Emitiendo notificación [${type}]: ${title} -> ${body}`);

  try {
    // 1. Guardar en notification_logs en Supabase
    if (userId) {
      await supabase.from('notification_logs').insert({
        user_id: userId,
        title,
        body,
        type,
        is_read: false,
        metadata
      });
    }

    // 2. Transmitir por canal de Supabase Realtime
    const channelName = metadata.isAdmin ? 'admin_global_channel' : `user_channel_${userId}`;
    const channel = supabase.channel(channelName);

    channel.send({
      type: 'broadcast',
      event: 'push_notification',
      payload: {
        id: 'notif-' + Date.now(),
        userId,
        title,
        body,
        type,
        metadata,
        created_at: new Date().toISOString()
      }
    });

    // 3. Si la ventana está en segundo plano y hay permiso de notificación, disparar Web Notification nativa
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      if (document.hidden) {
        try {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification(title, {
              body,
              icon: '/favicon.svg',
              badge: '/favicon.svg',
              tag: `alv-${type}-${Date.now()}`,
              data: { url: metadata.url || '/' }
            });
          } else {
            new Notification(title, { body, icon: '/favicon.svg' });
          }
        } catch (e) {
          console.warn('[PUSH SERVICE] Error mostrando notificación nativa:', e);
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('[PUSH SERVICE] Error enviando notificación:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ==============================================================================
 * CASOS DE USO ESPECÍFICOS - CLIENTE
 * ==============================================================================
 */

/**
 * Caso Cliente 1: Pedido Entregado / Completado (orders.status -> 'Completed')
 */
export async function notifyOrderCompleted({ orderId, userId, amount = 0 }) {
  soundEffects.playOrderCompletedSound();

  return await sendPushNotification({
    userId,
    title: '🎉 ¡Pedido Entregado y Completado!',
    body: `Tu pedido #${orderId ? orderId.slice(0, 8) : ''} ha sido completado con éxito. ¡Gracias por confiar en ALVSHOP!`,
    type: 'order_completed',
    metadata: {
      orderId,
      amount,
      url: '/profile?tab=orders'
    }
  });
}

/**
 * Caso Cliente 2: Respuesta del Asesor en Soporte Técnico (support_messages.is_admin_reply = true)
 */
export async function notifySupportReply({ conversationId, userId, message }) {
  soundEffects.playChatMessageSound();

  return await sendPushNotification({
    userId,
    title: '💬 Mensaje de Soporte Técnico',
    body: message || 'Un asesor de ALVSHOP ha respondido a tu consulta.',
    type: 'support_reply',
    metadata: {
      conversationId,
      url: '/support'
    }
  });
}

/**
 * ==============================================================================
 * CASOS DE USO ESPECÍFICOS - BACKOFFICE ADMIN
 * ==============================================================================
 */

/**
 * Caso Admin 1: Nuevo Pedido Ingresado (orders.status = 'Pending' / 'Verification')
 */
export async function notifyAdminNewOrder({ orderId, amount, customerName, paymentMethod = 'Manual' }) {
  soundEffects.playNewOrderAdminSound();

  return await sendPushNotification({
    userId: null,
    title: '🛒 ¡Nuevo Pedido Ingresado!',
    body: `Orden #${orderId ? orderId.slice(0, 8) : ''} por $${Number(amount || 0).toFixed(2)} USDT (${paymentMethod}) de ${customerName || 'Cliente'}.`,
    type: 'admin_new_order',
    metadata: {
      isAdmin: true,
      orderId,
      amount,
      url: '/admin'
    }
  });
}

/**
 * Caso Admin 2: Likes o Comentarios en el Feed de la Comunidad
 */
export async function notifyAdminFeedInteraction({ type = 'comment', userName, content, postId }) {
  soundEffects.playFeedInteractionSound();

  const isLike = type === 'like';
  const title = isLike ? '❤️ Nuevo Like en la Comunidad' : '💬 Nuevo Comentario en el Feed';
  const body = isLike
    ? `${userName || 'Un usuario'} le dio Me Gusta a una publicación.`
    : `${userName || 'Usuario'}: "${(content || '').slice(0, 60)}"`;

  return await sendPushNotification({
    userId: null,
    title,
    body,
    type: 'feed_interaction',
    metadata: {
      isAdmin: true,
      postId,
      url: '/feed'
    }
  });
}

/**
 * Caso Admin 3: Nuevo Mensaje de Cliente en Soporte Técnico (support_messages.is_admin_reply = false)
 */
export async function notifyAdminSupportMessage({ conversationId, userName, message }) {
  soundEffects.playChatMessageSound();

  return await sendPushNotification({
    userId: null,
    title: '📩 Nuevo Mensaje en Soporte',
    body: `${userName || 'Cliente'}: ${(message || '').slice(0, 70)}`,
    type: 'admin_support_message',
    metadata: {
      isAdmin: true,
      conversationId,
      url: '/support'
    }
  });
}
