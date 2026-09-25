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

export default function Home() {
  const { config, profile } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Initialize state with cache or default fallback categories
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
        if (parsed && Array.isArray(parsed) && parsed.length > 0 && !parsed.some(p => p.id === 'ef5c0946-de86-428e-97f1-2222b5913184')) {
          return parsed;
        }
      }
    } catch (e) {}
    return [];
  });

  const [initialLoading, setInitialLoading] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_CATS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) return false;
      }
    } catch (e) {}
    return true;
  });

  // Clear any corrupted or seed dummy cache on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_PRODS);
      if (cached && cached.includes('ef5c0946-de86-428e-97f1-2222b5913184')) {
        localStorage.removeItem(CACHE_KEY_PRODS);
      }
    } catch (e) {}
  }, []);

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
        const rawProds = prodsRes.data || [];

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
    const targetCat = allCategories.find((c) => String(c.id) === String(catId));
    if (targetCat?.name?.toLowerCase().includes('like') || String(catId) === 'likes-ff-id') {
      navigate('/likes');
      return;
    }
    navigate(`/category/${catId}`);
  };

  return (
    <div className="container" style={{ paddingTop: '16px' }}>
      
      {/* Immersive Gamer Banner */}
      <div style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        padding: '36px 28px',
        marginBottom: '28px',
        backgroundImage: `
          linear-gradient(90deg, rgba(10, 13, 20, 0.95) 0%, rgba(10, 13, 20, 0.75) 50%, rgba(10, 13, 20, 0.35) 100%),
          url('${config?.banner_url || config?.social_links?.banner_url || config?.branding?.banner_url || '/gamer-banner.jpg'}')
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center right',
        border: '1px solid var(--border-cyan)',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.7), 0 0 25px rgba(6, 182, 212, 0.18)'
      }}>
        {/* Subtle Top Cyber Glow */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, var(--accent-cyan), transparent)',
          boxShadow: '0 0 16px var(--accent-cyan)'
        }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '580px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(6, 182, 212, 0.2)',
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
            fontSize: 'clamp(1.7rem, 4.5vw, 2.5rem)',
            fontWeight: '900',
            lineHeight: 1.15,
            margin: '0 0 10px 0',
            color: '#fff',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.9)'
          }}>
            {config?.site_title || 'ALVSHOP - Recargas y Bienes Digitales'}
          </h1>

          <p style={{
            color: '#cbd5e1',
            fontSize: '0.9rem',
            lineHeight: 1.5,
            margin: 0,
            textShadow: '0 1px 6px rgba(0, 0, 0, 0.9)'
          }}>
            {config?.site_tagline || 'Diamantes Free Fire, Pines Digitales, Cuentas Streaming y Aumento de Likes con entrega 100% garantizada.'}
          </p>
        </div>
      </div>


      {/* Primary Section: Diamond Packages */}
      {(() => {
        const diamondCategory = allCategories.find(c => c.name?.toLowerCase().includes('diamante'));
        const diamondProducts = diamondCategory ? allProducts.filter(p => p.subcategories?.category_id === diamondCategory.id) : [];
        
        if (diamondProducts.length === 0) return null;
        
        return (
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: '900', margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>💎</span>
                  <span>Paquetes de Diamantes FF</span>
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Recargas directas a tu cuenta mediante ID
                </div>
              </div>
            </div>
            
            <div
              className="category-grid-responsive"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '16px'
              }}
            >
              {diamondProducts.map(prod => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          </div>
        );
      })()}

      {/* Catalog Categories Showcase */}
      <div id="catalogo" style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '900', margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📁</span>
              <span>Categorías de Productos</span>
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Selecciona una categoría para ver todos los productos y paquetes disponibles
            </div>
          </div>
        </div>

        {/* Categories Showcase Grid (2 columns on mobile) */}
        <div
          className="category-grid-responsive"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '16px'
          }}
        >
          {allCategories.map((cat) => {
            const isLikes = cat.name?.toLowerCase().includes('like');
            const defaultCatImg = isLikes
              ? 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80'
              : 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80';

            const buttonLabel = cat.button_text || (isLikes
              ? 'Ver Likes FF'
              : (config?.category_button_text || config?.social_links?.category_button_text || 'Explorar Productos'));

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
                  transition: 'all 0.25s ease',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                className="glass-panel-interactive"
              >
                <div className="category-card-img" style={{ height: '140px', position: 'relative', overflow: 'hidden' }}>
                  <img
                    src={cat.image_url || defaultCatImg}
                    alt={cat.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, rgba(13, 17, 26, 0.92) 100%)'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(6px)',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.68rem',
                    color: 'var(--accent-cyan)',
                    fontWeight: '800',
                    border: '1px solid rgba(6, 182, 212, 0.4)'
                  }}>
                    {isLikes ? '7 Paquetes' : `${cat.product_count || 4} items`}
                  </div>
                </div>

                <div className="category-card-padding" style={{ padding: '14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>{cat.icon || (isLikes ? '👍' : '💎')}</span>
                    <h3 className="category-card-title" style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: '800' }}>
                      {cat.name}
                    </h3>
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
                    <button
                      type="button"
                      className="category-card-btn"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(30, 58, 138, 0.45) 100%)',
                        border: '1px solid var(--border-cyan)',
                        color: 'var(--accent-cyan)',
                        fontWeight: '800',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span>{buttonLabel}</span>
                      <span>➔</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Responsive columns styling for Mobile */}
      <style>{`
        @media (max-width: 640px) {
          .category-grid-responsive {
            grid-template-columns: repeat(${config?.social_links?.grid_columns_mobile === '3' ? '3' : '2'}, 1fr) !important;
            gap: 10px !important;
          }
          .category-card-img {
            height: ${config?.social_links?.grid_columns_mobile === '3' ? '70px' : '105px'} !important;
          }
          .category-card-padding {
            padding: 10px !important;
          }
          .category-card-title {
            font-size: 0.84rem !important;
          }
          .category-card-btn {
            padding: 6px 8px !important;
            font-size: 0.72rem !important;
          }
        }
      `}</style>

    </div>
  );
}
