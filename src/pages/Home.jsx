import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const { config, profile } = useApp();
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const ITEMS_PER_PAGE = 12; // Cuadrícula estricta de 2 columnas x 6 filas (12 productos)

  // Fetch only categories and subcategories that have ACTIVE products
  useEffect(() => {
    async function loadActiveTaxonomy() {
      try {
        // 1. Fetch all active products with their category & subcategory info
        const { data: activeProds, error } = await supabase
          .from('products')
          .select('subcategory_id, subcategories(id, name, category_id, categories(id, name, icon, image_url))')
          .eq('is_active', true);

        if (error || !activeProds) {
          // Fallback query
          const { data: catData } = await supabase.from('categories').select('*').order('name');
          const { data: subcatData } = await supabase.from('subcategories').select('*').order('name');
          if (catData) setCategories(catData);
          if (subcatData) setSubcategories(subcatData);
          return;
        }

        // 2. Extract unique categories that actually have active products
        const catMap = new Map();
        const subcatMap = new Map();

        activeProds.forEach((p) => {
          const sub = p.subcategories;
          const cat = sub?.categories;

          if (cat && cat.id) {
            if (!catMap.has(cat.id)) {
              catMap.set(cat.id, cat);
            }
          }

          if (sub && sub.id && sub.name) {
            // Group and deduplicate subcategories by clean name
            const cleanSubName = sub.name.trim();
            if (!subcatMap.has(cleanSubName)) {
              subcatMap.set(cleanSubName, {
                id: sub.id,
                name: cleanSubName,
                category_id: sub.category_id,
                image_url: sub.image_url,
                all_ids: [sub.id]
              });
            } else {
              subcatMap.get(cleanSubName).all_ids.push(sub.id);
            }
          }
        });

        // If no categories found from products, load all
        if (catMap.size === 0) {
          const { data: catData } = await supabase.from('categories').select('*').order('name');
          if (catData) setCategories(catData);
        } else {
          setCategories(Array.from(catMap.values()));
        }

        setSubcategories(Array.from(subcatMap.values()));
      } catch (err) {
        console.warn('Error loading taxonomy:', err);
      }
    }

    loadActiveTaxonomy();
  }, []);

  // Filtered subcategories for current active category (only unique and active)
  const activeSubcategories = selectedCategory === 'all'
    ? []
    : subcategories.filter(s => s.category_id === selectedCategory);

  // Fetch Products with Strict Filtering
  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      try {
        let query = supabase
          .from('products')
          .select('*, subcategories(id, name, category_id, categories(id, name, icon, image_url))', { count: 'exact' })
          .eq('is_active', true)
          .order('price_public', { ascending: true })
          .range(from, to);

        if (selectedCategory !== 'all') {
          const targetSubcatObj = subcategories.find(s => s.name === selectedSubcategory || s.id === selectedSubcategory);

          if (selectedSubcategory !== 'all' && targetSubcatObj) {
            // Match all subcategory IDs with this name
            query = query.in('subcategory_id', targetSubcatObj.all_ids || [targetSubcatObj.id]);
          } else {
            const matchingSubcats = subcategories.filter(s => s.category_id === selectedCategory);
            const allSubIds = matchingSubcats.flatMap(s => s.all_ids || [s.id]);

            if (allSubIds.length > 0) {
              query = query.in('subcategory_id', allSubIds);
            }
          }
        }

        const { data, count, error } = await query;
        if (data && !error) {
          setProducts(data);
          setTotalCount(count || 0);
        } else {
          setProducts([]);
          setTotalCount(0);
        }
      } catch (err) {
        console.warn('Error fetching products:', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [selectedCategory, selectedSubcategory, currentPage, subcategories]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 1;

  const handleCategoryChange = (catId) => {
    setSelectedCategory(catId);
    setSelectedSubcategory('all');
    setCurrentPage(1);
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
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 20px rgba(6, 182, 212, 0.7))',
          position: 'relative',
          zIndex: 2
        }}>
          {config?.site_title || 'ALVSHOP'}
        </h1>
      </div>

      {/* Main Category Filter Bar */}
      <div id="catalogo" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <span>🎮</span> Catálogo Oficial
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Mostrando {products.length} de {totalCount} productos
          </span>
        </div>

        {/* Primary Categories Scrollable Carousel */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          scrollbarWidth: 'none'
        }}>
          <button
            onClick={() => handleCategoryChange('all')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: selectedCategory === 'all' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
              color: selectedCategory === 'all' ? '#000' : 'var(--text-main)',
              border: selectedCategory === 'all' ? 'none' : '1px solid var(--border-glass)',
              transition: 'all 0.2s ease',
              boxShadow: selectedCategory === 'all' ? '0 0 15px rgba(6, 182, 212, 0.3)' : 'none'
            }}
          >
            <span>🔥</span> Todos los Productos
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: isSelected ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
                  color: isSelected ? '#000' : 'var(--text-main)',
                  border: isSelected ? 'none' : '1px solid var(--border-glass)',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 0 15px rgba(6, 182, 212, 0.3)' : 'none'
                }}
              >
                {cat.image_url ? (
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      objectFit: 'cover',
                      flexShrink: 0
                    }}
                  />
                ) : (
                  <span>{cat.icon || '💎'}</span>
                )}
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Clean Subcategory Filter (Only unique active subcategories) */}
        {selectedCategory !== 'all' && activeSubcategories.length > 1 && (
          <div style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            marginTop: '8px',
            paddingBottom: '4px',
            scrollbarWidth: 'none'
          }}>
            <button
              onClick={() => { setSelectedSubcategory('all'); setCurrentPage(1); }}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                background: selectedSubcategory === 'all' ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                color: selectedSubcategory === 'all' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                border: selectedSubcategory === 'all' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)'
              }}
            >
              Todos en {categories.find(c => c.id === selectedCategory)?.name || ''}
            </button>

            {activeSubcategories.map((sub) => {
              const isSubSelected = selectedSubcategory === sub.name || selectedSubcategory === sub.id;
              return (
                <button
                  key={sub.name}
                  onClick={() => { setSelectedSubcategory(sub.name); setCurrentPage(1); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: isSubSelected ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                    color: isSubSelected ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    border: isSubSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)'
                  }}
                >
                  {sub.image_url && <img src={sub.image_url} alt="" style={{ width: '12px', height: '12px', borderRadius: '2px', objectFit: 'cover' }} />}
                  <span>{sub.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Strict 2x3 Grid (6 items) */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div className="spinner-large" style={{ margin: '0 auto 16px auto' }} />
          Cargando productos oficiales...
        </div>
      ) : products.length === 0 ? (
        <div className="glass-panel" style={{
          textAlign: 'center',
          padding: '60px 20px',
          borderRadius: 'var(--radius-lg)',
          margin: '20px 0',
          border: '1px solid var(--border-glass)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🛍️</div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No hay productos disponibles por el momento</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto' }}>
            Estamos preparando nuevas ofertas y paquetes para esta sección. ¡Vuelve a consultar pronto!
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '12px',
          marginBottom: '32px'
        }}>
          {products.map((product) => (
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
              setCurrentPage(p => Math.max(1, p - 1));
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
              setCurrentPage(p => Math.min(totalPages, p + 1));
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
  );
}
