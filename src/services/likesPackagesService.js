import { supabase } from '../supabaseClient';

const STORAGE_KEY = 'alv_likes_packages_custom';

export const DEFAULT_LIKES_PACKAGES = [
  {
    id: 'pkg-2000-likes',
    title: '2,000 LIKES',
    quantity: 2000,
    deliveryDays: '1 DÍA',
    priceUsdt: 7.09,
    badge: 'POPULAR 🔥',
    imageUrl: '/likes-badge.jpg',
    isActive: true,
    whatsappBtnEnabled: false,
    sortOrder: 1
  },
  {
    id: 'pkg-3000-likes',
    title: '3,000 LIKES',
    quantity: 3000,
    deliveryDays: '1-2 DÍAS',
    priceUsdt: 8.09,
    badge: '',
    imageUrl: '/likes-badge.jpg',
    isActive: true,
    whatsappBtnEnabled: false,
    sortOrder: 2
  },
  {
    id: 'pkg-4000-likes',
    title: '4,000 LIKES',
    quantity: 4000,
    deliveryDays: '2 DÍAS',
    priceUsdt: 9.09,
    badge: '',
    imageUrl: '/likes-badge.jpg',
    isActive: true,
    whatsappBtnEnabled: false,
    sortOrder: 3
  },
  {
    id: 'pkg-5000-likes',
    title: '5,000 LIKES',
    quantity: 5000,
    deliveryDays: '2-3 DÍAS',
    priceUsdt: 10.09,
    badge: 'MÁS VENDIDO ⚡',
    imageUrl: '/likes-badge.jpg',
    isActive: true,
    whatsappBtnEnabled: false,
    sortOrder: 4
  },
  {
    id: 'pkg-10000-likes',
    title: '10,000 LIKES',
    quantity: 10000,
    deliveryDays: '4-5 DÍAS',
    priceUsdt: 18.09,
    badge: '',
    imageUrl: '/likes-badge.jpg',
    isActive: true,
    whatsappBtnEnabled: false,
    sortOrder: 5
  },
  {
    id: 'pkg-20000-likes',
    title: '20,000 LIKES',
    quantity: 20000,
    deliveryDays: '8-10 DÍAS',
    priceUsdt: 34.09,
    badge: '',
    imageUrl: '/likes-badge.jpg',
    isActive: true,
    whatsappBtnEnabled: false,
    sortOrder: 6
  },
  {
    id: 'pkg-30000-likes',
    title: '30,000 LIKES',
    quantity: 30000,
    deliveryDays: '12-15 DÍAS',
    priceUsdt: 49.09,
    badge: 'PRO ⭐',
    imageUrl: '/likes-badge.jpg',
    isActive: true,
    whatsappBtnEnabled: false,
    sortOrder: 7
  },
  {
    id: 'pkg-50000-likes',
    title: '50,000 LIKES',
    quantity: 50000,
    deliveryDays: '20-25 DÍAS',
    priceUsdt: 79.09,
    badge: 'TITÁN 👑',
    imageUrl: '/likes-badge.jpg',
    isActive: true,
    whatsappBtnEnabled: false,
    sortOrder: 8
  }
];

export function safeSetStorage(key, data) {
  try {
    let dataToStore = data;
    if (Array.isArray(data)) {
      dataToStore = data.map(item => {
        if (item && item.imageUrl && item.imageUrl.startsWith('data:') && item.imageUrl.length > 20000) {
          return { ...item, imageUrl: '/likes-badge.jpg' };
        }
        return item;
      });
    }

    const serialized = JSON.stringify(dataToStore);
    localStorage.setItem(key, serialized);
  } catch (err) {
    try {
      const volatileKeys = ['alv_cache_products_v2', 'alv_products', 'alv_feed_posts', 'alv_temp_receipt', 'alv_likes_packages_custom'];
      volatileKeys.forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
    } catch (finalErr) {}
  }
}

export async function getLikesPackages(includeInactive = false) {
  const map = new Map();

  // 1. Intentar cargar desde Supabase PRIMERO para que sea la fuente de la verdad
  try {
    const [likesRes, prodsRes, subsRes, catsRes] = await Promise.allSettled([
      supabase.from('likes_packages').select('*').order('sort_order', { ascending: true }),
      supabase.from('products').select('*'),
      supabase.from('subcategories').select('*'),
      supabase.from('categories').select('*')
    ]);

    // Procesar likes_packages de Supabase (Nueva tabla maestra)
    if (likesRes.status === 'fulfilled' && likesRes.value.data && likesRes.value.data.length > 0) {
      likesRes.value.data.forEach(p => {
        map.set(p.id, {
          id: p.id,
          title: p.title || `${(Number(p.quantity || 2000) / 1000).toFixed(0)}K LIKES`,
          quantity: Number(p.quantity || 2000),
          deliveryDays: p.delivery_days || p.deliveryDays || '1 DÍA',
          priceUsdt: Number(p.price_usdt || p.priceUsdt || 7.09),
          badge: p.badge || '',
          imageUrl: (p.image_url || p.imageUrl || '/likes-badge.jpg'),
          isActive: p.is_active !== undefined ? p.is_active : true,
          whatsappBtnEnabled: Boolean(p.whatsapp_btn_enabled || p.whatsappBtnEnabled),
          sortOrder: Number(p.sort_order || p.sortOrder || 1)
        });
      });
    }

    // Procesar products de Supabase que sean de categoría Likes
    if (prodsRes.status === 'fulfilled' && prodsRes.value.data && prodsRes.value.data.length > 0) {
      const subs = (subsRes.status === 'fulfilled' && subsRes.value.data) ? subsRes.value.data : [];
      const cats = (catsRes.status === 'fulfilled' && catsRes.value.data) ? catsRes.value.data : [];

      const catMap = new Map(cats.map(c => [String(c.id), c.name]));
      const subCatMap = new Map(subs.map(s => [String(s.id), { name: s.name, catName: catMap.get(String(s.category_id)) || '' }]));

      prodsRes.value.data.forEach(p => {
        const subInfo = subCatMap.get(String(p.subcategory_id)) || {};
        const catName = (subInfo.catName || subInfo.name || '').toLowerCase();
        const prodName = (p.name || '').toLowerCase();

        const isLikesProduct = catName.includes('like') || prodName.includes('like') || String(p.subcategory_id).includes('like');

        if (isLikesProduct) {
          let parsedQty = 2000;
          const qtyMatch = p.name.match(/(\d+[\d,\.]*)\s*(k|mil|likes)?/i);
          if (qtyMatch) {
            let num = parseFloat(qtyMatch[1].replace(/,/g, ''));
            if (qtyMatch[0].toLowerCase().includes('k') || qtyMatch[0].toLowerCase().includes('mil')) {
              num *= 1000;
            }
            if (!isNaN(num) && num > 0) parsedQty = Math.round(num);
          }

          if (!map.has(p.id)) {
            map.set(p.id, {
              id: p.id,
              title: p.name,
              quantity: parsedQty,
              deliveryDays: p.delivery_days || (parsedQty >= 50000 ? '25 DÍAS' : parsedQty >= 20000 ? '10 DÍAS' : parsedQty >= 10000 ? '5 DÍAS' : '1 DÍA'),
              priceUsdt: Number(p.price_public || p.price_reseller || 7.09),
              badge: p.badge || 'NUEVO 🔥',
              imageUrl: (p.image_url && p.image_url !== 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=60') ? p.image_url : '/likes-badge.jpg',
              isActive: p.is_active !== false,
              whatsappBtnEnabled: false,
              sortOrder: 100
            });
          }
        }
      });
    }
  } catch (e) {}

  // 2. Si la DB falla y el map está vacío, intentar recuperar del LocalStorage (Solo como Fallback)
  if (map.size === 0) {
    try {
      const rawCustom = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('alv_likes_packages');
      if (rawCustom) {
        const customList = JSON.parse(rawCustom);
        if (Array.isArray(customList)) {
          customList.forEach(p => {
            if (p && p.id) {
              map.set(p.id, {
                ...p,
                priceUsdt: Number(p.priceUsdt || p.price_usdt || 7.09),
                quantity: Number(p.quantity || 2000),
                isActive: p.isActive !== false
              });
            }
          });
        }
      }
    } catch (e) {}
  }

  // 3. Si aún está vacío, usar DEFAULT_LIKES_PACKAGES para nunca devolver vacío
  if (map.size === 0 && DEFAULT_LIKES_PACKAGES && DEFAULT_LIKES_PACKAGES.length > 0) {
    DEFAULT_LIKES_PACKAGES.forEach(p => {
      map.set(p.id, { ...p });
    });
  }

  // 4. Convertir a Array y ordenar
  const allStored = Array.from(map.values());
  
  // Refrescar caché local con la verdad de la BD
  safeSetStorage(STORAGE_KEY, allStored);
  safeSetStorage('alv_likes_packages', allStored);
  
  // Filtrar y ordenar
  const result = includeInactive ? allStored : allStored.filter(p => p.isActive !== false);
  result.sort((a, b) => Number(a.quantity) - Number(b.quantity));
  
  return result;
}

export async function saveLikesPackage(pkg, includeInactive = false) {
  const current = await getLikesPackages(true);
  let updatedList = [];
  const index = current.findIndex(p => p.id === pkg.id);
  
  const payload = {
    id: pkg.id || `pkg-${Date.now()}`,
    title: pkg.title || `${(Number(pkg.quantity || 2000) / 1000).toFixed(0)}K LIKES`,
    quantity: Number(pkg.quantity || 2000),
    deliveryDays: pkg.deliveryDays || '1 DÍA',
    priceUsdt: pkg.priceUsdt !== undefined ? Number(pkg.priceUsdt) : 7.09,
    badge: pkg.badge || '',
    imageUrl: pkg.imageUrl || '/likes-badge.jpg',
    isActive: pkg.isActive !== false,
    whatsappBtnEnabled: Boolean(pkg.whatsappBtnEnabled),
    sortOrder: Number(pkg.sortOrder || current.length + 1)
  };

  if (index >= 0) {
    updatedList = [...current];
    updatedList[index] = payload;
  } else {
    updatedList = [...current, payload];
  }

  // 1. Guardar en Supabase primero
  try {
    await supabase.from('likes_packages').upsert({
      id: payload.id,
      title: payload.title,
      quantity: payload.quantity,
      delivery_days: payload.deliveryDays,
      price_usdt: payload.priceUsdt,
      badge: payload.badge,
      image_url: payload.imageUrl,
      is_active: payload.isActive,
      whatsapp_btn_enabled: payload.whatsappBtnEnabled,
      sort_order: payload.sortOrder
    });
    
    // Si el ID es de un producto de la tienda general (UUID), actualizar su precio ahí también
    if (!payload.id.startsWith('pkg-')) {
      await supabase.from('products').update({
        price_public: payload.priceUsdt,
        price_reseller: payload.priceUsdt,
        name: payload.title,
        is_active: payload.isActive
      }).eq('id', payload.id);
    }
  } catch (e) {
    console.warn('Supabase upsert notice:', e);
  }

  // 2. Guardar en LocalStorage usando storage a prueba de cuotas en ambas claves
  safeSetStorage(STORAGE_KEY, updatedList);
  safeSetStorage('alv_likes_packages', updatedList);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('alv_likes_packages_updated', { detail: includeInactive ? updatedList : updatedList.filter(p => p.isActive !== false) }));
  }

  return includeInactive ? updatedList : updatedList.filter(p => p.isActive !== false);
}

export async function deleteLikesPackage(pkgId, includeInactive = false) {
  let rawList = [];
  try {
    const rawCustom = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('alv_likes_packages');
    if (rawCustom) {
      rawList = JSON.parse(rawCustom);
    }
  } catch (e) {}

  // Hard-delete: eliminar completamente de la lista local
  let updatedList = rawList.filter(p => p.id !== pkgId);

  try {
    // 1. Hard delete en likes_packages
    await supabase.from('likes_packages').delete().eq('id', pkgId);
    
    // 2. Si era un producto global, solo ocultarlo para no romper foreign keys en orders
    if (!pkgId.startsWith('pkg-')) {
      await supabase.from('products').update({ is_active: false }).eq('id', pkgId);
    }
  } catch (e) {
    console.warn('Error eliminando paquete en DB:', e);
  }

  safeSetStorage(STORAGE_KEY, updatedList);
  safeSetStorage('alv_likes_packages', updatedList);
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('alv_likes_packages_updated', { detail: includeInactive ? updatedList : updatedList.filter(p => p.isActive !== false) }));
  }
  
  return includeInactive ? updatedList : updatedList.filter(p => p.isActive !== false);
}
