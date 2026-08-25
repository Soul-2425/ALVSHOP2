import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import ProductCard from '../components/ProductCard';

const CACHE_KEY_CATS = 'alv_cache_categories_v2';
const CACHE_KEY_SUBS = 'alv_cache_subcategories_v2';
const CACHE_KEY_PRODS = 'alv_cache_products_v2';

const DEFAULT_FALLBACK_CATEGORIES = [
  {
    id: 'c4e3fbcf-e74f-4d64-912c-569df4be476b',
    name: 'Diamantes FF',
    icon: '💎',
    image_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
    product_count: 6
  },
  {
    id: 'likes-ff-id',
    name: 'Likes FF',
    icon: '👍',
    image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
    product_count: 7
  },
  {
    id: 'pines-ff-id',
    name: 'Pines FF',
    icon: '🎟️',
    image_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
    product_count: 3
  },
  {
    id: 'regalos-ff-id',
    name: 'REGALOS POR ID',
    icon: '🎁',
    image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
    product_count: 4
  },
  {
    id: 'bio-larga-id',
    name: 'Bio Larga FF',
    icon: '📝',
    image_url: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=600&q=80',
    product_count: 1
  }
];

const DEFAULT_SEED_PRODUCTS = [
  {
    id: 'ef5c0946-de86-428e-97f1-2222b5913184',
    name: '100 + 10 Diamantes Free Fire (Recarga Directa)',
    price_public: 1.09,
    price_reseller: 0.99,
    stock: 999,
    is_active: true,
    validation_type: 'Free Fire',
    image_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Recarga Directa', category_id: 'c4e3fbcf-e74f-4d64-912c-569df4be476b' }
  },
  {
    id: '86b169a9-65a8-4248-97c2-e9c0f2a4a832',
    name: '310 + 31 Diamantes Free Fire (Recarga Directa)',
    price_public: 3.29,
    price_reseller: 3.09,
    stock: 999,
    is_active: true,
    validation_type: 'Free Fire',
    image_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Recarga Directa', category_id: 'c4e3fbcf-e74f-4d64-912c-569df4be476b' }
  },
  {
    id: '4f7bb6b9-c17f-4bcb-84c2-a2b88d11d369',
    name: '520 + 52 Diamantes Free Fire (Recarga Directa)',
    price_public: 5.39,
    price_reseller: 4.99,
    stock: 999,
    is_active: true,
    validation_type: 'Free Fire',
    image_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Recarga Directa', category_id: 'c4e3fbcf-e74f-4d64-912c-569df4be476b' }
  },
  {
    id: '8f8537eb-98a2-4fef-a632-acf010cb3c85',
    name: '1060 + 106 Diamantes Free Fire (Recarga Directa)',
    price_public: 10.79,
    price_reseller: 9.99,
    stock: 999,
    is_active: true,
    validation_type: 'Free Fire',
    image_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Recarga Directa', category_id: 'c4e3fbcf-e74f-4d64-912c-569df4be476b' }
  },
  {
    id: '923c52eb-07af-4725-9f0a-bec1f705fddc',
    name: '2180 + 218 Diamantes Free Fire (Recarga Directa)',
    price_public: 21.49,
    price_reseller: 19.99,
    stock: 999,
    is_active: true,
    validation_type: 'Free Fire',
    image_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Recarga Directa', category_id: 'c4e3fbcf-e74f-4d64-912c-569df4be476b' }
  },
  {
    id: '17b06f94-9608-40e2-96a5-d24e207ddbb9',
    name: '5600 + 560 Diamantes Free Fire (Recarga Directa)',
    price_public: 52.99,
    price_reseller: 49.99,
    stock: 999,
    is_active: true,
    validation_type: 'Free Fire',
    image_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Recarga Directa', category_id: 'c4e3fbcf-e74f-4d64-912c-569df4be476b' }
  },
  {
    id: 'ac987ed2-e023-473a-9297-68ec32fc7d6b',
    name: 'Pin Digital Free Fire 100 Diamantes',
    price_public: 1.15,
    price_reseller: 1.05,
    stock: 999,
    is_active: true,
    validation_type: 'PIN',
    image_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Pines Digitales', category_id: 'pines-ff-id' }
  },
  {
    id: '9d7b55d3-f25e-411a-bc53-3894a79b9a70',
    name: 'Pin Digital Free Fire 310 Diamantes',
    price_public: 3.35,
    price_reseller: 3.15,
    stock: 999,
    is_active: true,
    validation_type: 'PIN',
    image_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Pines Digitales', category_id: 'pines-ff-id' }
  },
  {
    id: '773f16aa-1944-48cd-b511-395042d656ad',
    name: 'Pin Digital Free Fire 520 Diamantes',
    price_public: 5.45,
    price_reseller: 5.15,
    stock: 999,
    is_active: true,
    validation_type: 'PIN',
    image_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Pines Digitales', category_id: 'pines-ff-id' }
  },
  {
    id: '7ab4da9e-df66-4711-a77a-7e8d0b4365f7',
    name: '99 CAJAS EVO',
    price_public: 4.00,
    price_reseller: 3.50,
    stock: 999,
    is_active: true,
    validation_type: 'Free Fire',
    image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Regalos FF', category_id: 'regalos-ff-id' }
  },
  {
    id: 'e2bacb18-3220-4c13-b134-04a87e8cf034',
    name: '99 Cajas de Fragmentos',
    price_public: 3.00,
    price_reseller: 2.50,
    stock: 999,
    is_active: true,
    validation_type: 'Free Fire',
    image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Regalos FF', category_id: 'regalos-ff-id' }
  },
  {
    id: '672c5c36-414d-4e1e-a050-523a2809fadc',
    name: 'Skin - 6k 💎',
    price_public: 6.00,
    price_reseller: 5.50,
    stock: 999,
    is_active: true,
    validation_type: 'Free Fire',
    image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Regalos FF', category_id: 'regalos-ff-id' }
  },
  {
    id: 'f33d04f0-643d-4511-a72a-d40cf7f64960',
    name: 'Pase FF',
    price_public: 2.00,
    price_reseller: 1.80,
    stock: 999,
    is_active: true,
    validation_type: 'Free Fire',
    image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Regalos FF', category_id: 'regalos-ff-id' }
  },
  {
    id: '9f4137b0-70af-449c-97e9-520d7a105bbf',
    name: 'Bio Larga FF',
    price_public: 2.50,
    price_reseller: 2.00,
    stock: 999,
    is_active: true,
    validation_type: 'Free Fire',
    image_url: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Bio Larga', category_id: 'bio-larga-id' }
  }
];

export default function CategoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatPrice, currency } = useApp();

  // Instant In-Memory Cache Initialization
  const [allCategories, setAllCategories] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_CATS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_FALLBACK_CATEGORIES;
  });

  const [allSubcategories, setAllSubcategories] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_SUBS);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  const [allProducts, setAllProducts] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_PRODS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_SEED_PRODUCTS;
  });

  const [loading, setLoading] = useState(false);

  // Filters inside category
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fast Flat Parallel Fetch (No slow nested joins)
  useEffect(() => {
    let isMounted = true;

    async function loadStoreData() {
      try {
        const [catsRes, subsRes, prodsRes] = await Promise.all([
          supabase.from('categories').select('*').order('name'),
          supabase.from('subcategories').select('*').order('name'),
          supabase.from('products').select('*').eq('is_active', true).order('price_public', { ascending: true })
        ]);

        if (!isMounted) return;

        const cats = (catsRes.data && catsRes.data.length > 0) ? catsRes.data : DEFAULT_FALLBACK_CATEGORIES;
        const subs = subsRes.data || [];
        const rawProds = (prodsRes.data && prodsRes.data.length > 0) ? prodsRes.data : DEFAULT_SEED_PRODUCTS;

        // In-Memory Fast Join (0.1ms)
        const catMap = new Map(cats.map(c => [c.id, c]));
        const subMap = new Map(subs.map(s => [s.id, { ...s, categories: catMap.get(s.category_id) }]));

        const prods = rawProds.map(p => ({
          ...p,
          subcategories: subMap.get(p.subcategory_id) || p.subcategories
        }));

        setAllCategories(cats);
        setAllSubcategories(subs);
        setAllProducts(prods);

        try {
          localStorage.setItem(CACHE_KEY_CATS, JSON.stringify(cats));
          localStorage.setItem(CACHE_KEY_SUBS, JSON.stringify(subs));
          localStorage.setItem(CACHE_KEY_PRODS, JSON.stringify(prods));
        } catch (e) {}

      } catch (err) {
        console.warn('Error cargando datos de categoría:', err);
      }
    }

    loadStoreData();
    return () => { isMounted = false; };
  }, []);

  // Find active category by ID or name
  const currentCategory = useMemo(() => {
    const directMatch = allCategories.find(c => String(c.id) === String(id));
    if (directMatch) return directMatch;

    // Fuzzy matching by slug/name
    const nameMatch = allCategories.find(c => {
      const cName = (c.name || '').toLowerCase();
      const target = String(id).toLowerCase();
      return cName.includes(target) || target.includes(cName);
    });
    if (nameMatch) return nameMatch;

    return {
      id: id,
      name: 'Categoría de Productos',
      icon: '🛍️',
      description: 'Explora todos los productos disponibles en esta sección.'
    };
  }, [allCategories, id]);

  // Subcategories for this category (from database or extracted from products)
  const categorySubcategories = useMemo(() => {
    const fromTable = allSubcategories.filter(s => String(s.category_id) === String(currentCategory?.id));
    if (fromTable.length > 0) return fromTable;

    // Auto extract unique subcategories from products in this category
    const subMap = new Map();
    allProducts.forEach(p => {
      const pCatId = String(p.subcategories?.category_id || p.subcategory_id || '');
      const isMatch = pCatId === String(currentCategory?.id) || 
                      (currentCategory?.name && p.name && p.name.toLowerCase().includes(currentCategory.name.toLowerCase().replace(/ff/g, '').trim()));
      
      if (isMatch && p.subcategories?.name) {
        subMap.set(p.subcategories.name, {
          id: p.subcategory_id || p.subcategories.name,
          name: p.subcategories.name,
          category_id: currentCategory?.id
        });
      }
    });

    return Array.from(subMap.values());
  }, [allSubcategories, currentCategory, allProducts]);

  // Products belonging to this category
  const categoryProducts = useMemo(() => {
    if (!currentCategory) return [];

    const isLikesCat = currentCategory.name?.toLowerCase().includes('like');
    if (isLikesCat) return [];

    const catIdStr = String(currentCategory.id);
    const catNameClean = (currentCategory.name || '').toLowerCase().replace(/ff/g, '').trim();

    return allProducts.filter(p => {
      if (p.is_active === false) return false;

      const pSubId = String(p.subcategory_id || p.subcategories?.id || '');
      const pCatId = String(p.subcategories?.category_id || p.subcategories?.categories?.id || '');

      const matchesCatId = pCatId === catIdStr || pSubId === catIdStr;
      const matchesName = catNameClean && p.name && p.name.toLowerCase().includes(catNameClean);

      // Special fallback category matches
      const isPinMatch = (catIdStr === 'pines-ff-id' || catNameClean.includes('pin')) && (p.validation_type === 'PIN' || p.name?.toLowerCase().includes('pin'));
      const isDiamantesMatch = (catIdStr.includes('c4e3') || catNameClean.includes('diamante')) && p.name?.toLowerCase().includes('diamante');
      const isRegalosMatch = (catIdStr === 'regalos-ff-id' || catNameClean.includes('regalo')) && (p.name?.toLowerCase().includes('caja') || p.name?.toLowerCase().includes('skin') || p.name?.toLowerCase().includes('pase'));
      const isBioMatch = (catIdStr === 'bio-larga-id' || catNameClean.includes('bio')) && p.name?.toLowerCase().includes('bio');

      return matchesCatId || matchesName || isPinMatch || isDiamantesMatch || isRegalosMatch || isBioMatch;
    });
  }, [currentCategory, allProducts]);

  // Search Filtering
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return categoryProducts;
    const q = searchQuery.toLowerCase().trim();
    return categoryProducts.filter(p => {
      const nameMatch = p.name?.toLowerCase().includes(q);
      const subMatch = p.subcategories?.name?.toLowerCase().includes(q);
      return nameMatch || subMatch;
    });
  }, [categoryProducts, searchQuery]);

  const isLikesCategory = currentCategory?.name?.toLowerCase().includes('like');

  return (
    <div className="container" style={{ paddingTop: '20px', paddingBottom: '60px' }}>
      
      {/* Top Back Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <button
          onClick={() => navigate('/')}
          className="btn-glass"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: '800',
            cursor: 'pointer'
          }}
        >
          <span>⬅</span>
          <span>Volver a Categorías</span>
        </button>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Link to="/" style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>Inicio</Link>
          <span style={{ margin: '0 6px' }}>/</span>
          <span style={{ color: '#fff', fontWeight: '700' }}>{currentCategory?.name || 'Categoría'}</span>
        </div>
      </div>

      {/* Category Hero Banner */}
      {currentCategory && (
        <div style={{
          position: 'relative',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          padding: '28px 24px',
          marginBottom: '28px',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(30, 58, 138, 0.3) 50%, rgba(13, 17, 26, 0.95) 100%)',
          border: '1px solid var(--border-cyan)',
          boxShadow: '0 0 30px rgba(6, 182, 212, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div style={{ maxWidth: '540px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(6, 182, 212, 0.2)',
              border: '1px solid var(--border-cyan)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              color: 'var(--accent-cyan)',
              fontSize: '0.72rem',
              fontWeight: '800',
              marginBottom: '10px'
            }}>
              <span>{currentCategory.icon || '🛍️'}</span>
              <span>CATEGORÍA OFICIAL</span>
            </div>

            <h1 style={{
              fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)',
              fontWeight: '900',
              margin: '0 0 8px 0',
              color: '#fff'
            }}>
              {currentCategory.name}
            </h1>

            <p style={{
              color: 'var(--text-muted)',
              fontSize: '0.88rem',
              lineHeight: 1.4,
              margin: 0
            }}>
              {currentCategory.description || `Explora todos los paquetes y productos disponibles para ${currentCategory.name} con entrega rápida y segura.`}
            </p>
          </div>

          {currentCategory.image_url && (
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              border: '2px solid var(--border-cyan)',
              boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)',
              background: '#000'
            }}>
              <img
                src={currentCategory.image_url}
                alt={currentCategory.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}
        </div>
      )}

      {/* Special Case: Likes Module */}
      {isLikesCategory ? (
        <div className="glass-panel" style={{
          borderRadius: 'var(--radius-lg)',
          padding: '40px 24px',
          textAlign: 'center',
          border: '1px solid var(--border-cyan)',
          boxShadow: '0 0 30px rgba(6, 182, 212, 0.2)'
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>👍</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fff', marginBottom: '8px' }}>
            Módulo Exclusivo de Likes Free Fire
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto 24px auto' }}>
            Sube tus likes de 2,000 hasta 100,000 con validación directa de tu cuenta, nivel y likes actuales en tiempo real.
          </p>
          <Link to="/likes" className="btn-cyan" style={{ padding: '14px 28px', fontSize: '0.95rem', fontWeight: '900' }}>
            🚀 Ir al Módulo de Likes ➔
          </Link>
        </div>
      ) : (
        <>
          {/* Header & Quick Search Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '24px'
          }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '900', margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🛍️</span>
                <span>Todos los Productos ({filteredProducts.length})</span>
              </h2>
            </div>

            {/* Quick In-Category Search */}
            <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 220px', maxWidth: '320px' }}>
              <input
                type="text"
                placeholder="Buscar en esta categoría..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 14px 9px 36px',
                  borderRadius: 'var(--radius-full)',
                  background: '#0d111a',
                  border: '1px solid var(--border-glass)',
                  color: '#fff',
                  fontSize: '0.82rem'
                }}
              />
              <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                🔍
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '9px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.75rem'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
              <p>Cargando productos...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="glass-panel" style={{
              textAlign: 'center',
              padding: '60px 20px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-glass)',
              margin: '20px 0'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🛍️</div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No se encontraron productos</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto 16px auto' }}>
                {searchQuery
                  ? `No hay resultados que coincidan con "${searchQuery}".`
                  : 'Aún no hay productos registrados en esta sección.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="btn-cyan"
                  style={{ padding: '8px 18px', fontSize: '0.82rem' }}
                >
                  Ver Todos los Productos de {currentCategory?.name}
                </button>
              )}
            </div>
          ) : (
            <div
              className="products-grid-responsive"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '16px'
              }}
            >
              {filteredProducts.map(prod => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Responsive 2-column styling for Mobile */}
      <style>{`
        @media (max-width: 640px) {
          .products-grid-responsive {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
          }
        }
      `}</style>

    </div>
  );
}
