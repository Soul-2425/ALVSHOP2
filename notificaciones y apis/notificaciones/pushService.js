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
 * 5. Plantillas de mensajes dinámicos y personalizables desde el Panel Admin.
 */

import { supabase } from '../../src/supabaseClient';
import { soundEffects } from '../../src/services/soundEffects';

// Clave pública VAPID para Web Push
const PUBLIC_VAPID_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuTlUh-r48MhSbgYpE';

/**
 * Plantillas por defecto para cada tipo de evento
 */
export const DEFAULT_NOTIFICATION_TEMPLATES = {
  order_created: {
    title: '🛒 ¡Pedido Registrado!',
    body: 'Tu pedido #{{order_id}} de {{product}} por ${{amount}} USDT ha sido registrado con éxito.'
  },
  order_completed: {
    title: '🎉 ¡Pedido Entregado y Completado!',
    body: 'Tu pedido #{{order_id}} ha sido completado con éxito. ¡Gracias por confiar en ALVSHOP!'
  },
  admin_new_order: {
    title: '🛒 ¡Nuevo Pedido en Tienda!',
    body: 'Orden #{{order_id}} por ${{amount}} USDT ({{payment_method}}) de {{customer_name}}.'
  },
  support_reply: {
    title: '💬 Mensaje de Soporte Técnico',
    body: '{{message}}'
  },
  admin_support_message: {
    title: '📩 Nuevo Mensaje en Soporte',
    body: '{{customer_name}}: {{message}}'
  },
  feed_interaction: {
    title: '❤️ Nuevo Like en la Comunidad',
    body: '{{user_name}} interactuó con una publicación del feed.'
  }
};

/**
 * Reemplaza variables como {{order_id}} en una plantilla
 */
export function interpolateTemplate(text, variables = {}) {
  if (!text) return '';
  return text.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => {
    return variables[key] !== undefined && variables[key] !== null ? String(variables[key]) : '';
  });
}

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
      return false;
    }

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
          console.warn('[PUSH SERVICE] Suscripción VAPID omitida:', subErr);
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

    // 3. Web Notification nativa si la ventana está en segundo plano
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
 * CASOS DE USO CON PLANTILLAS PERSONALIZABLES
 * ==============================================================================
 */

/**
 * Caso 1: Pedido Creado (Cliente)
 */
export async function notifyOrderCreated({ orderId, userId, product = 'Diamantes Free Fire', amount = 0, customTemplates = null }) {
  const tpl = customTemplates?.order_created || DEFAULT_NOTIFICATION_TEMPLATES.order_created;
  const shortId = orderId ? orderId.slice(0, 8) : '';
  const variables = { order_id: shortId, product, amount: Number(amount).toFixed(2) };

  const title = interpolateTemplate(tpl.title, variables);
  const body = interpolateTemplate(tpl.body, variables);

  return await sendPushNotification({
    userId,
    title,
    body,
    type: 'order_created',
    metadata: { orderId, product, amount, url: '/profile?tab=orders' }
  });
}

/**
 * Caso 2: Pedido Entregado / Completado (Cliente)
 */
export async function notifyOrderCompleted({ orderId, userId, product = 'Recarga Digital', amount = 0, customTemplates = null }) {
  soundEffects.playOrderCompletedSound();

  const tpl = customTemplates?.order_completed || DEFAULT_NOTIFICATION_TEMPLATES.order_completed;
  const shortId = orderId ? orderId.slice(0, 8) : '';
  const variables = { order_id: shortId, product, amount: Number(amount).toFixed(2) };

  const title = interpolateTemplate(tpl.title, variables);
  const body = interpolateTemplate(tpl.body, variables);

  return await sendPushNotification({
    userId,
    title,
    body,
    type: 'order_completed',
    metadata: { orderId, amount, url: '/profile?tab=orders' }
  });
}

/**
 * Caso 3: Nuevo Pedido Ingresado (Admin)
 */
export async function notifyAdminNewOrder({ orderId, amount, customerName = 'Cliente', paymentMethod = 'Manual', customTemplates = null }) {
  soundEffects.playNewOrderAdminSound();

  const tpl = customTemplates?.admin_new_order || DEFAULT_NOTIFICATION_TEMPLATES.admin_new_order;
  const shortId = orderId ? orderId.slice(0, 8) : '';
  const variables = { order_id: shortId, amount: Number(amount || 0).toFixed(2), customer_name: customerName, payment_method: paymentMethod };

  const title = interpolateTemplate(tpl.title, variables);
  const body = interpolateTemplate(tpl.body, variables);

  return await sendPushNotification({
    userId: null,
    title,
    body,
    type: 'admin_new_order',
    metadata: { isAdmin: true, orderId, amount, url: '/admin/orders' }
  });
}

/**
 * Caso 4: Respuesta del Asesor en Soporte Técnico
 */
export async function notifySupportReply({ conversationId, userId, message, customTemplates = null }) {
  soundEffects.playChatMessageSound();

  const tpl = customTemplates?.support_reply || DEFAULT_NOTIFICATION_TEMPLATES.support_reply;
  const variables = { message: message || 'Un asesor ha respondido a tu consulta.' };

  const title = interpolateTemplate(tpl.title, variables);
  const body = interpolateTemplate(tpl.body, variables);

  return await sendPushNotification({
    userId,
    title,
    body,
    type: 'support_reply',
    metadata: { conversationId, url: '/support' }
  });
}

/**
 * Caso 5: Nuevo Mensaje de Cliente en Soporte (Admin)
 */
export async function notifyAdminSupportMessage({ conversationId, userName = 'Cliente', message, customTemplates = null }) {
  soundEffects.playChatMessageSound();

  const tpl = customTemplates?.admin_support_message || DEFAULT_NOTIFICATION_TEMPLATES.admin_support_message;
  const variables = { customer_name: userName, message: (message || '').slice(0, 70) };

  const title = interpolateTemplate(tpl.title, variables);
  const body = interpolateTemplate(tpl.body, variables);

  return await sendPushNotification({
    userId: null,
    title,
    body,
    type: 'admin_support_message',
    metadata: { isAdmin: true, conversationId, url: '/support' }
  });
}

/**
 * Caso 6: Likes o Comentarios en el Feed (Admin)
 */
export async function notifyAdminFeedInteraction({ type = 'comment', userName = 'Usuario', content = '', postId, customTemplates = null }) {
  soundEffects.playFeedInteractionSound();

  const tpl = customTemplates?.feed_interaction || DEFAULT_NOTIFICATION_TEMPLATES.feed_interaction;
  const variables = { user_name: userName, content: content.slice(0, 60), type };

  const title = interpolateTemplate(tpl.title, variables);
  const body = interpolateTemplate(tpl.body, variables);

  return await sendPushNotification({
    userId: null,
    title,
    body,
    type: 'feed_interaction',
    metadata: { isAdmin: true, postId, url: '/feed' }
  });
}
