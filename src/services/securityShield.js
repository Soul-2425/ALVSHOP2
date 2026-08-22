/**
 * ==============================================================================
 * ESCUDO DE SEGURIDAD & RATE LIMITING - ALVSHOP
 * Ubicación: /src/services/securityShield.js
 * ==============================================================================
 * 
 * Protege contra bots, ataques de fuerza bruta y DDoS:
 * 1. Límite estricto de 3 intentos por minuto por acción/dispositivo/IP.
 * 2. Baneo temporal (15 min) ante violaciones repetitivas (3 ofensas en 5 min).
 * 3. Registro persistente de alertas en memoria y sincronización con logs administrativos.
 */

import { supabase } from '../supabaseClient.js';

const RATE_LIMIT_CONFIG = {
  maxAttemptsPerMinute: 3,
  windowMs: 60 * 1000,           // 1 minuto
  violationWindowMs: 5 * 60 * 1000, // 5 minutos
  maxViolationsBeforeBan: 3,
  banDurationMs: 15 * 60 * 1000  // 15 minutos de baneo
};

// Almacén en memoria para timestamps de peticiones y bloqueos activos
const requestBuckets = new Map();
const violationBuckets = new Map();
const activeBans = new Map();

// Helper para obtener un identificador del cliente / IP
export function getClientFingerprint() {
  if (typeof window === 'undefined') return 'server_runner';
  let fp = localStorage.getItem('alv_client_fp');
  if (!fp) {
    fp = 'client_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
    localStorage.setItem('alv_client_fp', fp);
  }
  return fp;
}

/**
 * Valida si una acción está permitida bajo el límite de tasa (3 por minuto)
 * @param {string} action - Nombre de la acción ('validate_uid', 'checkout', etc.)
 * @param {string} [identifier] - ID de usuario o IP / fingerprint
 * @returns {{ allowed: boolean, remaining: number, resetInSeconds: number, isBanned: boolean, error?: string }}
 */
export function checkRateLimit(action = 'general', identifier = null) {
  const targetId = identifier || getClientFingerprint();
  const now = Date.now();
  const banKey = `${targetId}`;

  // 1. Verificar si está baneado
  if (activeBans.has(banKey)) {
    const banExpiry = activeBans.get(banKey);
    if (now < banExpiry) {
      const remainingSeconds = Math.ceil((banExpiry - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds: remainingSeconds,
        isBanned: true,
        error: `⛔ Acceso bloqueado por seguridad debido a intentos repetitivos. Espera ${Math.ceil(remainingSeconds / 60)} minutos.`
      };
    } else {
      activeBans.delete(banKey);
    }
  }

  // 2. Limpiar peticiones antiguas (> 60 segundos)
  const bucketKey = `${action}_${targetId}`;
  let timestamps = requestBuckets.get(bucketKey) || [];
  timestamps = timestamps.filter(t => now - t < RATE_LIMIT_CONFIG.windowMs);

  if (timestamps.length >= RATE_LIMIT_CONFIG.maxAttemptsPerMinute) {
    // Registrar violación de límite
    recordViolation(targetId, action);

    const oldestAttempt = timestamps[0];
    const resetInSeconds = Math.ceil((RATE_LIMIT_CONFIG.windowMs - (now - oldestAttempt)) / 1000);

    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.max(1, resetInSeconds),
      isBanned: false,
      error: `⚠️ Límite de seguridad alcanzado (máximo 3 intentos por minuto). Por favor espera ${resetInSeconds} segundos antes de reintentar.`
    };
  }

  // Registrar intento actual
  timestamps.push(now);
  requestBuckets.set(bucketKey, timestamps);

  const remaining = RATE_LIMIT_CONFIG.maxAttemptsPerMinute - timestamps.length;
  return {
    allowed: true,
    remaining,
    resetInSeconds: 60,
    isBanned: false
  };
}

/**
 * Registra una infracción y banea si se superan 3 ofensas en 5 minutos
 */
function recordViolation(targetId, action) {
  const now = Date.now();
  let violations = violationBuckets.get(targetId) || [];
  violations = violations.filter(t => now - t < RATE_LIMIT_CONFIG.violationWindowMs);
  violations.push(now);
  violationBuckets.set(targetId, violations);

  if (violations.length >= RATE_LIMIT_CONFIG.maxViolationsBeforeBan) {
    const banUntil = now + RATE_LIMIT_CONFIG.banDurationMs;
    activeBans.set(targetId, banUntil);
    console.warn(`[SECURITY SHIELD] Cliente ${targetId} BANEADO por 15 minutos por ataques repetitivos.`);
    
    // Registrar en Supabase para notificación en el panel admin
    logSecurityIncident(targetId, action, 'Baneo automático por exceso de intentos (Rate Limit abusivo)');
  }
}

/**
 * Registra un incidente de seguridad en el panel administrativo
 */
export async function logSecurityIncident(identifier, action, reason) {
  try {
    const payload = {
      ip_address: identifier || getClientFingerprint(),
      action: action,
      reason: reason,
      is_blocked: true,
      created_at: new Date().toISOString()
    };

    await supabase.from('security_logs').insert(payload);
  } catch (e) {
    // Fallback silencioso si la tabla aún se está creando
    console.warn('[SECURITY LOG] Registrado localmente:', reason);
  }
}

/**
 * Obtiene la lista de bloqueos e incidentes activos
 */
export function getActiveSecurityStatus() {
  const now = Date.now();
  const bans = [];

  activeBans.forEach((expiry, id) => {
    if (now < expiry) {
      bans.push({
        id,
        minutesRemaining: Math.ceil((expiry - now) / 60000),
        bannedAt: new Date(expiry - RATE_LIMIT_CONFIG.banDurationMs).toLocaleTimeString()
      });
    }
  });

  return bans;
}

/**
 * Desbloquea manualmente una IP o identificador desde el panel admin
 */
export function unblockClient(identifier) {
  activeBans.delete(identifier);
  violationBuckets.delete(identifier);
  return true;
}
