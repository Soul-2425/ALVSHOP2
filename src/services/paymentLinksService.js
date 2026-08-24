import { supabase } from '../supabaseClient';

const STORAGE_KEY = 'alv_payment_links_pool';

// Default starter seed if pool is empty
const DEFAULT_SEED_LINKS = [
  { id: 'pl-5-1', amount_usd: 5, url: 'https://app.recurrente.com/s/jonathan-carlos-estuardo-alvarez-mendez/o/5usdc1', identifier_tag: '5usdc1', provider: 'Recurrente', status: 'available', created_at: new Date().toISOString() },
  { id: 'pl-5-2', amount_usd: 5, url: 'https://app.recurrente.com/s/jonathan-carlos-estuardo-alvarez-mendez/o/5usdc2', identifier_tag: '5usdc2', provider: 'Recurrente', status: 'available', created_at: new Date().toISOString() },
  { id: 'pl-5-3', amount_usd: 5, url: 'https://app.recurrente.com/s/jonathan-carlos-estuardo-alvarez-mendez/o/5usdc3', identifier_tag: '5usdc3', provider: 'Recurrente', status: 'available', created_at: new Date().toISOString() },
  { id: 'pl-10-1', amount_usd: 10, url: 'https://app.recurrente.com/s/jonathan-carlos-estuardo-alvarez-mendez/o/10usdc1', identifier_tag: '10usdc1', provider: 'Recurrente', status: 'available', created_at: new Date().toISOString() },
  { id: 'pl-10-2', amount_usd: 10, url: 'https://app.recurrente.com/s/jonathan-carlos-estuardo-alvarez-mendez/o/10usdc2', identifier_tag: '10usdc2', provider: 'Recurrente', status: 'available', created_at: new Date().toISOString() },
  { id: 'pl-20-1', amount_usd: 20, url: 'https://app.recurrente.com/s/jonathan-carlos-estuardo-alvarez-mendez/o/20usdc1', identifier_tag: '20usdc1', provider: 'Recurrente', status: 'available', created_at: new Date().toISOString() },
  { id: 'pl-30-1', amount_usd: 30, url: 'https://app.recurrente.com/s/jonathan-carlos-estuardo-alvarez-mendez/o/30usdc1', identifier_tag: '30usdc1', provider: 'Recurrente', status: 'available', created_at: new Date().toISOString() }
];

function getLocalPool() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SEED_LINKS));
  return DEFAULT_SEED_LINKS;
}

function saveLocalPool(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}
}

/**
 * Obtener todos los enlaces del Pool (con sincronización Supabase)
 */
export async function getAllPaymentLinks() {
  try {
    const { data, error } = await supabase
      .from('payment_links_pool')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      saveLocalPool(data);
      return data;
    }
  } catch (e) {
    console.warn('Supabase payment_links_pool table fallback to local storage');
  }

  return getLocalPool();
}

/**
 * Reservar un link disponible para un cliente por denominación
 */
export async function reservePaymentLink(amountUsd, userId) {
  const targetAmount = Number(amountUsd);

  // 1. Intentar con Supabase
  try {
    const { data: avail, error } = await supabase
      .from('payment_links_pool')
      .select('*')
      .eq('amount_usd', targetAmount)
      .eq('status', 'available')
      .order('created_at', { ascending: true })
      .limit(1);

    if (!error && avail && avail.length > 0) {
      const chosen = avail[0];
      const { data: updated } = await supabase
        .from('payment_links_pool')
        .update({
          status: 'reserved',
          assigned_to_user_id: userId,
          reserved_at: new Date().toISOString()
        })
        .eq('id', chosen.id)
        .select()
        .single();

      if (updated) return updated;
    }
  } catch (e) {}

  // 2. Fallback Local Storage
  const localList = getLocalPool();
  const index = localList.findIndex(l => Number(l.amount_usd) === targetAmount && l.status === 'available');

  if (index !== -1) {
    localList[index] = {
      ...localList[index],
      status: 'reserved',
      assigned_to_user_id: userId,
      reserved_at: new Date().toISOString()
    };
    saveLocalPool(localList);
    return localList[index];
  }

  return null;
}

/**
 * Quemar / Marcar link como utilizado (usado permanentemente tras aprobación)
 */
export async function burnPaymentLink(linkId, orderId = null) {
  if (!linkId) return;

  try {
    await supabase
      .from('payment_links_pool')
      .update({
        status: 'used',
        assigned_order_id: orderId,
        used_at: new Date().toISOString()
      })
      .eq('id', linkId);
  } catch (e) {}

  const localList = getLocalPool();
  const updated = localList.map(l => l.id === linkId ? {
    ...l,
    status: 'used',
    assigned_order_id: orderId,
    used_at: new Date().toISOString()
  } : l);
  saveLocalPool(updated);
}

/**
 * Liberar link de vuelta a disponible (en caso de rechazo o cancelación)
 */
export async function releasePaymentLink(linkId) {
  if (!linkId) return;

  try {
    await supabase
      .from('payment_links_pool')
      .update({
        status: 'available',
        assigned_to_user_id: null,
        assigned_order_id: null,
        reserved_at: null
      })
      .eq('id', linkId);
  } catch (e) {}

  const localList = getLocalPool();
  const updated = localList.map(l => l.id === linkId ? {
    ...l,
    status: 'available',
    assigned_to_user_id: null,
    assigned_order_id: null,
    reserved_at: null
  } : l);
  saveLocalPool(updated);
}

/**
 * Agregar lote masivo de enlaces desde el panel Admin
 */
export async function addBulkPaymentLinks(amountUsd, rawText, provider = 'Recurrente') {
  const numAmount = Number(amountUsd);
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  if (lines.length === 0) return { count: 0, error: 'No se ingresaron enlaces válidos.' };

  const newLinks = lines.map(line => {
    // Extraer tag (ej. https://app.recurrente.com/.../5usdc1 -> 5usdc1)
    let tag = '';
    try {
      const parts = line.split('/');
      tag = parts[parts.length - 1] || `tag-${Date.now()}`;
    } catch (e) {
      tag = `tag-${Date.now()}`;
    }

    return {
      id: `pl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      amount_usd: numAmount,
      url: line,
      identifier_tag: tag,
      provider: provider || 'Recurrente',
      status: 'available',
      created_at: new Date().toISOString()
    };
  });

  // 1. Guardar en Supabase si es posible
  try {
    await supabase.from('payment_links_pool').insert(newLinks);
  } catch (e) {}

  // 2. Guardar en LocalStorage
  const localList = getLocalPool();
  const merged = [...newLinks, ...localList];
  saveLocalPool(merged);

  return { count: newLinks.length, newLinks };
}

/**
 * Eliminar un link del pool
 */
export async function deletePaymentLink(linkId) {
  try {
    await supabase.from('payment_links_pool').delete().eq('id', linkId);
  } catch (e) {}

  const localList = getLocalPool();
  const filtered = localList.filter(l => l.id !== linkId);
  saveLocalPool(filtered);
}

/**
 * Resumen de Stock y Alertas (<= 5 links)
 */
export function calculateStockSummary(linksList) {
  const summary = {};
  const standardDenominations = [5, 10, 20, 30, 50];

  standardDenominations.forEach(denom => {
    summary[denom] = { total: 0, available: 0, reserved: 0, used: 0, isLowStock: false };
  });

  linksList.forEach(l => {
    const amt = Number(l.amount_usd);
    if (!summary[amt]) {
      summary[amt] = { total: 0, available: 0, reserved: 0, used: 0, isLowStock: false };
    }
    summary[amt].total += 1;
    if (l.status === 'available') summary[amt].available += 1;
    else if (l.status === 'reserved') summary[amt].reserved += 1;
    else if (l.status === 'used') summary[amt].used += 1;
  });

  let hasAnyLowStock = false;
  const lowStockAlerts = [];

  Object.entries(summary).forEach(([amt, data]) => {
    if (data.available <= 5) {
      data.isLowStock = true;
      hasAnyLowStock = true;
      lowStockAlerts.push({
        amount: Number(amt),
        available: data.available,
        message: `Quedan solo ${data.available} links de $${amt} USD disponibles.`
      });
    }
  });

  return {
    summary,
    hasAnyLowStock,
    lowStockAlerts
  };
}
