import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import ProductCard from '../components/ProductCard';

// Local storage cache keys
const CACHE_KEY_CATS = 'alv_cache_categories';
const CACHE_KEY_SUBS = 'alv_cache_subcategories';
const CACHE_KEY_PRODS = 'alv_cache_products';

export default function Home() {
  const { config, profile } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Initialize state immediately with cached data if available (0ms instant render)
  const [allCategories, setAllCategories] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_CATS);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
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
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  // If we already have cache in memory, don't show the initial loading spinner!
  const [initialLoading, setInitialLoading] = useState(() => {
    try {
      const cachedCats = localStorage.getItem(CACHE_KEY_CATS);
      const cachedProds = localStorage.getItem(CACHE_KEY_PRODS);
      return !(cachedCats && cachedProds);
    } catch (e) {
      return true;
    }
  });

  // Active Category & Subcategory Selection
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'categories');
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 12;

  // 1. FAST SINGLE PARALLEL FLAT FETCH + SWR CACHING
  useEffect(() => {
    let isMounted = true;

    async function loadStoreData() {
      try {
        // Flat parallel queries (No slow PostgREST nested joins)
        const [catsRes, subsRes, prodsRes] = await Promise.all([
          supabase.from('categories').select('*').order('name'),
          supabase.from('subcategories').select('*').order('name'),
          supabase.from('products').select('*').eq('is_active', true).order('price_public', { ascending: true })
        ]);

        if (!isMounted) return;

        const cats = catsRes.data || [];
        const subs = subsRes.data || [];
        const rawProds = prodsRes.data || [];

        // Fast In-Memory Join (0.1ms)
        const catMap = new Map(cats.map(c => [c.id, c]));
        const subMap = new Map(subs.map(s => [s.id, { ...s, categories: catMap.get(s.category_id) }]));

        const prods = rawProds.map(p => ({
          ...p,
          subcategories: subMap.get(p.subcategory_id)
        }));

        // Enrich categories with accurate product counts
        const enrichedCats = cats.map((c) => {
          const isLikes = c.name?.toLowerCase().includes('like');
          if (isLikes) {
            return { ...c, product_count: 3 };
          }

          const catSubIds = subs.filter((s) => s.category_id === c.id).map((s) => s.id);
          const count = prods.filter((p) => {
            const pSubId = p.subcategory_id || p.subcategories?.id;
            const pCatId = p.subcategories?.category_id || p.subcategories?.categories?.id;
            return catSubIds.includes(pSubId) || pCatId === c.id;
          }).length;

          return { ...c, product_count: count };
        });

        // Update state
        setAllCategories(enrichedCats);
        setAllSubcategories(subs);
        setAllProducts(prods);

        // Update localStorage cache
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

  // 2. INSTANT IN-MEMORY FILTERING (0ms response time on click)
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'categories') return [];
    if (selectedCategory === 'all') return allProducts;

    const currentCatObj = allCategories.find((c) => c.id === selectedCategory);
    const isLikesCat = currentCatObj?.name?.toLowerCase().includes('like');
    if (isLikesCat) return [];

    const targetSubIds = allSubcategories
      .filter((s) => s.category_id === selectedCategory)
      .map((s) => s.id);

    return allProducts.filter((p) => {
      const pSubId = p.subcategory_id || p.subcategories?.id;
      const pCatId = p.subcategories?.category_id || p.subcategories?.categories?.id;
      return targetSubIds.includes(pSubId) || pCatId === selectedCategory;
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
        borderRadius: 'var(--radius-lg)',
        padding: '50px 20px',
        marginBottom: '24px',
        backgroundImage: `
          linear-gradient(180deg, rgba(10, 13, 20, 0.55) 0%, rgba(10, 13, 20, 0.85) 100%),
          url('/gamer-banner.jpg')
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center 40%',
        border: '1px solid rgba(6, 182, 212, 0.4)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(6, 182, 212, 0.15)',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '0.85rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--accent-cyan)',
          fontWeight: '900',
          marginBottom: '8px'
        }}>
          ⚡ RECARGAS & ENTREGAS OFICIALES AUTOMATIZADAS
        </div>
        <h1 style={{
          fontSize: 'clamp(2rem, 7vw, 3.2rem)',
          fontWeight: '900',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          margin: 0,
          background: 'linear-gradient(135deg, #ffffff 40%, var(--accent-cyan) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          ALVSHOP OFICIAL
        </h1>
        <p style={{
          maxWidth: '600px',
          margin: '10px auto 0 auto',
          fontSize: '0.95rem',
          color: 'var(--text-muted)'
        }}>
          La plataforma más rápida y confiable para Diamantes Free Fire, PINs oficiales, Cuentas Streaming y Likes al mejor precio.
        </p>
      </div>

      {/* Modern Catalog Header & Category Selector */}
      <div id="catalogo" style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>
              {selectedCategory === 'categories' ? '📁' : (activeCategoryObj?.icon || '🛍️')}
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '900', margin: 0 }}>
              {selectedCategory === 'categories'
                ? 'Catálogo de Categorías'
                : selectedCategory === 'all'
                ? 'Todos los Productos'
                : activeCategoryObj?.name || 'Catálogo'}
            </h2>
          </div>

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
          {/* Option: Ver Categorías */}
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

          {/* Option: Todos los Productos */}
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
            <span>Todos los Productos</span>
          </button>

          {/* Dynamic Categories */}
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
          {initialLoading && allCategories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div className="spinner-large" style={{ margin: '0 auto 16px auto' }} />
              Cargando categorías...
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
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
                    {/* Category Photo */}
                    <div style={{ height: '120px', position: 'relative', overflow: 'hidden' }}>
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
                        {isLikes ? '3 Paquetes' : `${cat.product_count || 0} disponibles`}
                      </div>
                    </div>

                    {/* Category Content */}
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.3rem' }}>{cat.icon || (isLikes ? '👍' : '💎')}</span>
                        <h4 style={{ margin: 0, color: '#fff', fontSize: '0.95rem', fontWeight: '800' }}>
                          {cat.name}
                        </h4>
                      </div>

                      <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                        <button
                          type="button"
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(30, 58, 138, 0.4) 100%)',
                            border: '1px solid var(--border-cyan)',
                            color: 'var(--accent-cyan)',
                            fontWeight: '800',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>{isLikes ? 'Ver Paquetes de Likes' : 'Explorar'}</span>
                          <span>➔</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : isLikesActive ? (
        /* SPECIAL VIEW FOR LIKES CATEGORY */
        <div className="glass-panel" style={{
          borderRadius: 'var(--radius-lg)',
          padding: '36px 20px',
          textAlign: 'center',
          border: '1px solid var(--border-cyan)',
          boxShadow: '0 0 30px rgba(6, 182, 212, 0.2)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>👍</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fff', marginBottom: '8px' }}>
            Servicio Oficial de Likes Free Fire
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '480px', margin: '0 auto 20px auto' }}>
            Paquetes de 2K, 4K y 10K Likes con validación de ID en tiempo real y tarjeta oficial de jugador.
          </p>
          <Link to="/likes" className="btn-cyan" style={{ padding: '12px 24px', fontSize: '0.92rem' }}>
            🚀 Abrir Módulo de Likes (2K, 4K, 10K) ➔
          </Link>
        </div>
      ) : (
        /* VIEW 2: INSTANT PRODUCTS GRID */
        <div>
          {initialLoading && allProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div className="spinner-large" style={{ margin: '0 auto 16px auto' }} />
              Cargando productos...
            </div>
          ) : paginatedProducts.length === 0 ? (
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
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '12px',
              marginBottom: '32px'
            }}>
              {paginatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginTop: '20px',
              marginBottom: '40px'
            }}>
              <button
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                  document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
                }}
                disabled={currentPage === 1}
                className="btn-glass"
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                ← Anterior
              </button>

              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 8px' }}>
                Página <strong style={{ color: '#fff' }}>{currentPage}</strong> de {totalPages}
              </span>

              <button
                onClick={() => {
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                  document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
                }}
                disabled={currentPage === totalPages}
                className="btn-glass"
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
