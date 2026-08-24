import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import ProductCard from '../components/ProductCard';

const CACHE_KEY_CATS = 'alv_cache_categories_v2';
const CACHE_KEY_SUBS = 'alv_cache_subcategories_v2';
const CACHE_KEY_PRODS = 'alv_cache_products_v2';

export default function CategoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatPrice, currency } = useApp();

  const [category, setCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters inside category
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;

    // Load from cache first for instant render
    try {
      const cachedCats = JSON.parse(localStorage.getItem(CACHE_KEY_CATS) || '[]');
      const cachedSubs = JSON.parse(localStorage.getItem(CACHE_KEY_SUBS) || '[]');
      const cachedProds = JSON.parse(localStorage.getItem(CACHE_KEY_PRODS) || '[]');

      const foundCat = cachedCats.find(c => String(c.id) === String(id));
      if (foundCat) {
        setCategory(foundCat);
        setSubcategories(cachedSubs.filter(s => String(s.category_id) === String(id)));
        setProducts(cachedProds);
        setLoading(false);
      }
    } catch (e) {}

    async function fetchCategoryData() {
      try {
        const [catRes, subsRes, prodsRes] = await Promise.all([
          supabase.from('categories').select('*').eq('id', id).single(),
          supabase.from('subcategories').select('*').eq('category_id', id).order('name'),
          supabase.from('products').select('*, subcategories(*)').eq('is_active', true).order('price_public', { ascending: true })
        ]);

        if (!isMounted) return;

        if (catRes.data) {
          setCategory(catRes.data);
        }
        if (subsRes.data) {
          setSubcategories(subsRes.data);
        }
        if (prodsRes.data) {
          setProducts(prodsRes.data);
        }
      } catch (err) {
        console.warn('Error cargando categoría:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchCategoryData();
    return () => { isMounted = false; };
  }, [id]);

  // Filter products belonging to this category
  const categoryProducts = useMemo(() => {
    if (!category) return [];

    const isLikesCat = category.name?.toLowerCase().includes('like');
    if (isLikesCat) return [];

    const subIds = subcategories.map(s => String(s.id));
    const catNameClean = (category.name || '').toLowerCase().replace(/ff/g, '').trim();

    return products.filter(p => {
      if (p.is_active === false) return false;

      const pSubId = String(p.subcategory_id || p.subcategories?.id || '');
      const pCatId = String(p.subcategories?.category_id || p.subcategories?.categories?.id || '');

      const matchesSubId = subIds.includes(pSubId);
      const matchesCatId = pCatId === String(id);
      const matchesName = catNameClean && p.name && p.name.toLowerCase().includes(catNameClean);

      return matchesSubId || matchesCatId || matchesName;
    });
  }, [category, subcategories, products, id]);

  // Subcategory & Search Filtering
  const filteredProducts = useMemo(() => {
    return categoryProducts.filter(p => {
      // Subcategory filter
      if (selectedSubcategory !== 'all') {
        const pSubId = String(p.subcategory_id || p.subcategories?.id || '');
        if (pSubId !== selectedSubcategory) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = p.name?.toLowerCase().includes(q);
        const subMatch = p.subcategories?.name?.toLowerCase().includes(q);
        return nameMatch || subMatch;
      }

      return true;
    });
  }, [categoryProducts, selectedSubcategory, searchQuery]);

  const isLikesCategory = category?.name?.toLowerCase().includes('like');

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
          <span style={{ color: '#fff', fontWeight: '700' }}>{category?.name || 'Categoría'}</span>
        </div>
      </div>

      {/* Category Hero Banner */}
      {category && (
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
              <span>{category.icon || '🛍️'}</span>
              <span>CATEGORÍA OFICIAL</span>
            </div>

            <h1 style={{
              fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)',
              fontWeight: '900',
              margin: '0 0 8px 0',
              color: '#fff'
            }}>
              {category.name}
            </h1>

            <p style={{
              color: 'var(--text-muted)',
              fontSize: '0.88rem',
              lineHeight: 1.4,
              margin: 0
            }}>
              {category.description || `Explora todos los paquetes y productos disponibles para ${category.name} con entrega rápida y segura.`}
            </p>
          </div>

          {category.image_url && (
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
                src={category.image_url}
                alt={category.name}
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
          {/* Subcategories Filter & Search Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '24px'
          }}>
            {/* Subcategories Pills */}
            <div style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              paddingBottom: '4px'
            }}>
              <button
                type="button"
                onClick={() => setSelectedSubcategory('all')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: selectedSubcategory === 'all' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.04)',
                  color: selectedSubcategory === 'all' ? '#000' : 'var(--text-main)',
                  border: selectedSubcategory === 'all' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                  transition: 'all 0.15s ease'
                }}
              >
                Todos ({categoryProducts.length})
              </button>

              {subcategories.map(sub => {
                const isSelected = selectedSubcategory === String(sub.id);
                const subCount = categoryProducts.filter(p => String(p.subcategory_id || p.subcategories?.id) === String(sub.id)).length;

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSubcategory(String(sub.id))}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.82rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      background: isSelected ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.04)',
                      color: isSelected ? '#000' : 'var(--text-main)',
                      border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {sub.name} {subCount > 0 && `(${subCount})`}
                  </button>
                );
              })}
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
                  padding: '8px 12px 8px 34px',
                  borderRadius: 'var(--radius-full)',
                  background: '#0d111a',
                  border: '1px solid var(--border-glass)',
                  color: '#fff',
                  fontSize: '0.82rem'
                }}
              />
              <span style={{ position: 'absolute', left: '12px', top: '9px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                🔍
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '8px',
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
              {(searchQuery || selectedSubcategory !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubcategory('all');
                    setSearchQuery('');
                  }}
                  className="btn-cyan"
                  style={{ padding: '8px 18px', fontSize: '0.82rem' }}
                >
                  Ver Todos los Productos de {category?.name}
                </button>
              )}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '16px'
            }}>
              {filteredProducts.map(prod => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          )}
        </>
      )}

    </div>
  );
}
