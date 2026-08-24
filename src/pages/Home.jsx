import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import ProductCard from '../components/ProductCard';

// Local storage cache keys
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

export default function Home() {
  const { config, profile } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Initialize state with cache or default seed
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

  const [initialLoading, setInitialLoading] = useState(false);

  // Active Category & Subcategory Selection
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'categories');
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 12;

  // 1. FAST SINGLE PARALLEL FLAT FETCH + SWR CACHING
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

        // Fast In-Memory Join
        const catMap = new Map(cats.map(c => [c.id, c]));
        const subMap = new Map(subs.map(s => [s.id, { ...s, categories: catMap.get(s.category_id) }]));

        const prods = rawProds.map(p => ({
          ...p,
          subcategories: subMap.get(p.subcategory_id) || p.subcategories
        }));

        // Enrich categories with accurate product counts
        const enrichedCats = cats.map((c) => {
          const isLikes = c.name?.toLowerCase().includes('like');
          if (isLikes) {
            return { ...c, product_count: 7 };
          }

          const catSubIds = subs.filter((s) => s.category_id === c.id).map((s) => s.id);
          const count = prods.filter((p) => {
            const pSubId = p.subcategory_id || p.subcategories?.id;
            const pCatId = p.subcategories?.category_id || p.subcategories?.categories?.id;
            const nameMatch = c.name && p.name && p.name.toLowerCase().includes(c.name.toLowerCase().replace(/ff/g, '').trim());
            return catSubIds.includes(pSubId) || pCatId === c.id || nameMatch;
          }).length;

          return { ...c, product_count: count > 0 ? count : (c.product_count || 4) };
        });

        setAllCategories(enrichedCats);
        setAllSubcategories(subs);
        setAllProducts(prods);

        try {
          localStorage.setItem(CACHE_KEY_CATS, JSON.stringify(enrichedCats));
          localStorage.setItem(CACHE_KEY_SUBS, JSON.stringify(subs));
          localStorage.setItem(CACHE_KEY_PRODS, JSON.stringify(prods));
        } catch (e) {}

      } catch (err) {
        console.warn('Error loading store data:', err);
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    }

    loadStoreData();
    return () => { isMounted = false; };
  }, []);

  // 2. INSTANT IN-MEMORY FILTERING
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'categories') return [];
    if (selectedCategory === 'all') return allProducts.filter(p => p.is_active !== false);

    const currentCatObj = allCategories.find((c) => c.id === selectedCategory);
    const isLikesCat = currentCatObj?.name?.toLowerCase().includes('like');
    if (isLikesCat) return [];

    const targetSubIds = allSubcategories
      .filter((s) => s.category_id === selectedCategory)
      .map((s) => s.id);

    const catNameClean = (currentCatObj?.name || '').toLowerCase().replace(/ff/g, '').trim();

    return allProducts.filter((p) => {
      if (p.is_active === false) return false;
      const pSubId = p.subcategory_id || p.subcategories?.id;
      const pCatId = p.subcategories?.category_id || p.subcategories?.categories?.id;

      const matchesSubId = targetSubIds.includes(pSubId);
      const matchesCatId = pCatId === selectedCategory;
      const matchesName = catNameClean && p.name && p.name.toLowerCase().includes(catNameClean);

      return matchesSubId || matchesCatId || matchesName;
    });
  }, [allProducts, selectedCategory, allCategories, allSubcategories]);

  // Pagination on filtered products
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const paginatedProducts = useMemo(() => {
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(from, from + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const activeCategoryObj = allCategories.find((c) => c.id === selectedCategory);
  const isLikesActive = activeCategoryObj?.name?.toLowerCase().includes('like');

  const handleCategoryClick = (catId) => {
    const targetCat = allCategories.find((c) => c.id === catId);
    if (targetCat?.name?.toLowerCase().includes('like')) {
      navigate('/likes');
      return;
    }
    setSelectedCategory(catId);
    setCurrentPage(1);
    if (catId !== 'categories') {
      document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="container" style={{ paddingTop: '16px' }}>
      
      {/* Immersive Gamer Banner */}
      <div style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        padding: '32px 24px',
        marginBottom: '28px',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(30, 58, 138, 0.25) 50%, rgba(13, 17, 26, 0.95) 100%)',
        border: '1px solid var(--border-cyan)',
        boxShadow: '0 0 35px rgba(6, 182, 212, 0.2)'
      }}>
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '580px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid var(--border-cyan)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            color: 'var(--accent-cyan)',
            fontSize: '0.78rem',
            fontWeight: '800',
            marginBottom: '12px'
          }}>
            <span>⚡</span> RECARGAS DIGITALES & GAMING STORE
          </div>

          <h1 style={{
            fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
            fontWeight: '900',
            lineHeight: 1.15,
            margin: '0 0 10px 0',
            color: '#fff'
          }}>
            Tienda Oficial ALVSHOP
          </h1>

          <p style={{
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            lineHeight: 1.5,
            margin: '0 0 20px 0'
          }}>
            Diamantes Free Fire, Pines Digitales, Cuentas Streaming y Aumento de Likes con entrega 100% garantizada.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link
              to="/likes"
              className="btn-cyan"
              style={{
                padding: '10px 20px',
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>👍</span>
              <span>Subir Likes FF</span>
            </Link>

            <button
              onClick={() => handleCategoryClick('all')}
              className="btn-glass"
              style={{
                padding: '10px 18px',
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>🛒</span>
              <span>Ver Todos los Productos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Catalog Filter Navigation */}
      <div id="catalogo" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '900', margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{selectedCategory === 'categories' ? '📁' : '🛍️'}</span>
            <span>
              {selectedCategory === 'categories'
                ? 'Catálogo de Categorías'
                : selectedCategory === 'all'
                ? 'Todos los Productos'
                : activeCategoryObj?.name || 'Productos'}
            </span>
          </h2>

          {selectedCategory !== 'categories' && (
            <button
              onClick={() => handleCategoryClick('categories')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8rem',
                fontWeight: '800',
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid var(--border-cyan)',
                color: 'var(--accent-cyan)',
                cursor: 'pointer'
              }}
            >
              <span>⬅</span>
              <span>Ver Categorías</span>
            </button>
          )}
        </div>

        {/* Categories Tab Bar */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          scrollbarWidth: 'none'
        }}>
          <button
            onClick={() => handleCategoryClick('categories')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              fontWeight: '800',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: selectedCategory === 'categories' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.04)',
              color: selectedCategory === 'categories' ? '#000' : 'var(--text-main)',
              border: selectedCategory === 'categories' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
              transition: 'all 0.15s ease'
            }}
          >
            <span>📁</span>
            <span>Categorías</span>
          </button>

          <button
            onClick={() => handleCategoryClick('all')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              fontWeight: '800',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: selectedCategory === 'all' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.04)',
              color: selectedCategory === 'all' ? '#000' : 'var(--text-main)',
              border: selectedCategory === 'all' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
              transition: 'all 0.15s ease'
            }}
          >
            <span>🔥</span>
            <span>Todos los Productos ({allProducts.length})</span>
          </button>

          {allCategories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const isLikes = cat.name?.toLowerCase().includes('like');

            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.85rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: isSelected ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.04)',
                  color: isSelected ? '#000' : 'var(--text-main)',
                  border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat.image_url ? (
                  <img
                    src={cat.image_url}
                    alt=""
                    style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'cover' }}
                  />
                ) : (
                  <span>{cat.icon || (isLikes ? '👍' : '💎')}</span>
                )}
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* VIEW 1: CATEGORIES SHOWCASE GRID */}
      {selectedCategory === 'categories' ? (
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '14px'
          }}>
            {allCategories.map((cat) => {
              const isLikes = cat.name?.toLowerCase().includes('like');
              const defaultCatImg = isLikes
                ? 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80'
                : 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80';

              return (
                <div
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-glass)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{ height: '130px', position: 'relative', overflow: 'hidden' }}>
                    <img
                      src={cat.image_url || defaultCatImg}
                      alt={cat.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, rgba(13, 17, 26, 0.9) 100%)'
                    }} />
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'rgba(0, 0, 0, 0.65)',
                      backdropFilter: 'blur(4px)',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      color: 'var(--accent-cyan)',
                      fontWeight: '800',
                      border: '1px solid rgba(6, 182, 212, 0.4)'
                    }}>
                      {isLikes ? '7 Paquetes' : `${cat.product_count || 4} disponibles`}
                    </div>
                  </div>

                  <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '1.3rem' }}>{cat.icon || (isLikes ? '👍' : '💎')}</span>
                      <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: '800' }}>
                        {cat.name}
                      </h4>
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                      <button
                        type="button"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(30, 58, 138, 0.4) 100%)',
                          border: '1px solid var(--border-cyan)',
                          color: 'var(--accent-cyan)',
                          fontWeight: '800',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>{isLikes ? 'Ver Paquetes de Likes' : 'Explorar Productos'}</span>
                        <span>➔</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : isLikesActive ? (
        /* SPECIAL VIEW FOR LIKES CATEGORY */
        <div className="glass-panel" style={{
          borderRadius: 'var(--radius-lg)',
          padding: '36px 20px',
          textAlign: 'center',
          border: '1px solid var(--border-cyan)',
          boxShadow: '0 0 30px rgba(6, 182, 212, 0.2)',
          marginBottom: '40px'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>👍</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fff', marginBottom: '8px' }}>
            Servicio Oficial de Likes Free Fire
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '480px', margin: '0 auto 20px auto' }}>
            Paquetes desde 2K hasta 100K Likes con validación en vivo de cuenta (Nivel, Likes actuales) y entrega segura por UID.
          </p>
          <Link to="/likes" className="btn-cyan" style={{ padding: '12px 24px', fontSize: '0.92rem' }}>
            🚀 Abrir Módulo de Likes (2K a 100K) ➔
          </Link>
        </div>
      ) : (
        /* VIEW 2: INSTANT PRODUCTS GRID */
        <div style={{ marginBottom: '40px' }}>
          {paginatedProducts.length === 0 ? (
            <div className="glass-panel" style={{
              textAlign: 'center',
              padding: '60px 20px',
              borderRadius: 'var(--radius-lg)',
              margin: '20px 0',
              border: '1px solid var(--border-glass)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🛍️</div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No hay productos en esta categoría</h3>
              <button
                onClick={() => handleCategoryClick('categories')}
                className="btn-cyan"
                style={{ marginTop: '12px', padding: '8px 16px', fontSize: '0.85rem' }}
              >
                ⬅️ Ver Otras Categorías
              </button>
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '14px',
                marginBottom: '24px'
              }}>
                {paginatedProducts.map((prod) => (
                  <ProductCard key={prod.id} product={prod} />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="btn-glass"
                    style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                  >
                    ◀ Anterior
                  </button>

                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 12px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Página {currentPage} de {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-glass"
                    style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                  >
                    Siguiente ▶
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
}
