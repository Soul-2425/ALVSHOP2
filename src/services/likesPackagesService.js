import { supabase } from '../supabaseClient';

const STORAGE_KEY = 'alv_likes_packages_custom';

export const DEFAULT_LIKES_PACKAGES = [
  {
    id: 'pkg-2k',
    title: '2K LIKES',
    quantity: 2000,
    deliveryDays: '1 DÍA',
    priceUsdt: 7.09,
    badge: 'POPULAR 🔥',
    imageUrl: 'https://raw.githubusercontent.com/hexated/freefire-data/main/icons/avatars/avatar_1.png',
    isActive: true,
    sortOrder: 1
  },
  {
    id: 'pkg-4k',
    title: '4K LIKES',
    quantity: 4000,
    deliveryDays: '2 DÍAS',
    priceUsdt: 13.59,
    badge: 'RECOMENDADO ⭐',
    imageUrl: 'https://raw.githubusercontent.com/hexated/freefire-data/main/icons/avatars/avatar_1.png',
    isActive: true,
    sortOrder: 2
  },
  {
    id: 'pkg-10k',
    title: '10K LIKES',
    quantity: 10000,
    deliveryDays: '5 DÍAS',
    priceUsdt: 34.87,
    badge: 'MEJOR VALOR 👑',
    imageUrl: 'https://raw.githubusercontent.com/hexated/freefire-data/main/icons/avatars/avatar_1.png',
    isActive: true,
    sortOrder: 3
  },
  {
    id: 'pkg-20k',
    title: '20K LIKES',
    quantity: 20000,
    deliveryDays: '10 DÍAS',
    priceUsdt: 70.34,
    badge: 'PRO 🔥',
    imageUrl: 'https://raw.githubusercontent.com/hexated/freefire-data/main/icons/avatars/avatar_1.png',
    isActive: true,
    sortOrder: 4
  },
  {
    id: 'pkg-50k',
    title: '50K LIKES',
    quantity: 50000,
    deliveryDays: '25 DÍAS',
    priceUsdt: 176.73,
    badge: 'SUPER PACK ⚡',
    imageUrl: 'https://raw.githubusercontent.com/hexated/freefire-data/main/icons/avatars/avatar_1.png',
    isActive: true,
    sortOrder: 5
  },
  {
    id: 'pkg-75k',
    title: '75K LIKES',
    quantity: 75000,
    deliveryDays: '38 DÍAS',
    priceUsdt: 265.39,
    badge: 'MASTER 💎',
    imageUrl: 'https://raw.githubusercontent.com/hexated/freefire-data/main/icons/avatars/avatar_1.png',
    isActive: true,
    sortOrder: 6
  },
  {
    id: 'pkg-100k',
    title: '100K LIKES',
    quantity: 100000,
    deliveryDays: '50 DÍAS',
    priceUsdt: 354.04,
    badge: 'TITÁN 🏆',
    imageUrl: 'https://raw.githubusercontent.com/hexated/freefire-data/main/icons/avatars/avatar_1.png',
    isActive: true,
    sortOrder: 7
  }
];

export async function getLikesPackages() {
  // 1. Intentar con Supabase
  try {
    const { data, error } = await supabase
      .from('likes_packages')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!error && data && data.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (e) {}

  // 2. Fallback Local Storage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_LIKES_PACKAGES));
  return DEFAULT_LIKES_PACKAGES;
}

export async function saveLikesPackage(pkg) {
  const current = await getLikesPackages();
  let updatedList = [];

  const payload = {
    id: pkg.id || `pkg-${Date.now()}`,
    title: pkg.title || `${(pkg.quantity / 1000).toFixed(0)}K LIKES`,
    quantity: Number(pkg.quantity || 2000),
    deliveryDays: pkg.deliveryDays || '1 DÍA',
    priceUsdt: Number(pkg.priceUsdt || 7.09),
    badge: pkg.badge || 'POPULAR 🔥',
    imageUrl: pkg.imageUrl || 'https://raw.githubusercontent.com/hexated/freefire-data/main/icons/avatars/avatar_1.png',
    isActive: pkg.isActive !== false,
    sortOrder: Number(pkg.sortOrder || current.length + 1)
  };

  const existingIndex = current.findIndex(p => p.id === payload.id);
  if (existingIndex >= 0) {
    updatedList = current.map(p => p.id === payload.id ? payload : p);
  } else {
    updatedList = [...current, payload];
  }

  // 1. Guardar en Supabase si la tabla existe
  try {
    await supabase.from('likes_packages').upsert(payload);
  } catch (e) {}

  // 2. Guardar en LocalStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
  return updatedList;
}

export async function deleteLikesPackage(pkgId) {
  const current = await getLikesPackages();
  const filtered = current.filter(p => p.id !== pkgId);

  try {
    await supabase.from('likes_packages').delete().eq('id', pkgId);
  } catch (e) {}

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return filtered;
}
