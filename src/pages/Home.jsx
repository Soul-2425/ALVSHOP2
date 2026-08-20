import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const { config } = useApp();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const ITEMS_PER_PAGE = 6; // Strict 2 columns x 3 rows

  // Fetch Categories from Supabase
  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (data && !error) {
        setCategories(data);
      } else {
        setCategories([]);
      }
    }
    loadCategories();
  }, []);

  // Fetch Products from Supabase
  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('products')
        .select('*, subcategories(name, category_id)', { count: 'exact' })
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (selectedCategory !== 'all') {
        const { data: subcats } = await supabase
          .from('subcategories')
          .select('id')
          .eq('category_id', selectedCategory);

        if (subcats && subcats.length > 0) {
          const subcatIds = subcats.map(s => s.id);
          query = query.in('subcategory_id', subcatIds);
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
      setLoading(false);
    }

    loadProducts();
  }, [selectedCategory, currentPage]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 1;

  return (
    <div className="container" style={{ paddingTop: '16px' }}>
      
      {/* Immersive Gamer Banner (Name Only + Gamer Background) */}
      <div style={{
        borderRadius: 'var(--radius-lg)',
        padding: '36px 20px',
        marginBottom: '24px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 13, 20, 0.98) 100%)',
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.18) 0%, transparent 60%),
          radial-gradient(circle at 10% 20%, rgba(30, 58, 138, 0.35) 0%, transparent 50%),
          linear-gradient(180deg, rgba(13, 17, 26, 0.8) 0%, rgba(10, 13, 20, 0.95) 100%)
        `,
        border: '1px solid rgba(6, 182, 212, 0.3)',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6), inset 0 0 30px rgba(6, 182, 212, 0.06)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
        {/* Subtle Cyber Gamer Glow Line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '20%',
          right: '20%',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, var(--accent-cyan), transparent)',
          boxShadow: '0 0 12px var(--accent-cyan)'
        }} />

        {/* Dynamic Store Title (Configurable from Backoffice) */}
        <h1 style={{
          fontSize: 'clamp(1.8rem, 6vw, 2.6rem)',
          fontWeight: '900',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          margin: 0,
          background: 'linear-gradient(135deg, #ffffff 30%, var(--accent-cyan) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 25px rgba(6, 182, 212, 0.45)',
          position: 'relative',
          zIndex: 2
        }}>
          {config?.site_title || 'ALVSHOP'}
        </h1>

        {/* Ambient Glow Orbs */}
        <div style={{
          position: 'absolute',
          right: '-40px',
          bottom: '-40px',
          width: '180px',
          height: '180px',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.25) 0%, transparent 70%)',
          filter: 'blur(25px)',
          zIndex: 1
        }} />
        <div style={{
          position: 'absolute',
          left: '-40px',
          top: '-40px',
          width: '180px',
          height: '180px',
          background: 'radial-gradient(circle, rgba(30, 58, 138, 0.35) 0%, transparent 70%)',
          filter: 'blur(25px)',
          zIndex: 1
        }} />
      </div>

      {/* Category Pills Filter */}
      <div id="catalogo" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎮</span> Catálogo Principal
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Mostrando {products.length} productos
          </span>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          scrollbarWidth: 'none'
        }}>
          <button
            onClick={() => { setSelectedCategory('all'); setCurrentPage(1); }}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: selectedCategory === 'all' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
              color: selectedCategory === 'all' ? '#000' : 'var(--text-main)',
              border: selectedCategory === 'all' ? 'none' : '1px solid var(--border-glass)',
              transition: 'all 0.2s ease'
            }}
          >
            🔥 Todos los Productos
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.id); setCurrentPage(1); }}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: selectedCategory === cat.id ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
                color: selectedCategory === cat.id ? '#000' : 'var(--text-main)',
                border: selectedCategory === cat.id ? 'none' : '1px solid var(--border-glass)',
                transition: 'all 0.2s ease'
              }}
            >
              {cat.icon || '💎'} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Strict 2x3 Grid (6 items) */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Cargando catálogo...
        </div>
      ) : products.length === 0 ? (
        <div className="glass-panel" style={{
          padding: '40px 20px',
          textAlign: 'center',
          borderRadius: 'var(--radius-lg)',
          margin: '20px 0'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🛍️</div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>No hay productos disponibles actualmente</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto 16px auto' }}>
            El administrador aún no ha publicado productos en esta categoría. Puedes agregarlos desde el Backoffice.
          </p>
          <Link to="/admin/products" className="btn-glass" style={{ fontSize: '0.85rem' }}>
            👑 Ir al Gestor de Productos
          </Link>
        </div>
      ) : (
        <div className="store-grid-2x3">
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
          marginTop: '32px',
          marginBottom: '24px'
        }}>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="btn-glass"
            style={{ padding: '8px 14px', fontSize: '0.85rem', opacity: currentPage === 1 ? 0.4 : 1 }}
          >
            ◀ Anterior
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: currentPage === pageNum ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
                color: currentPage === pageNum ? '#000' : 'var(--text-main)',
                border: currentPage === pageNum ? 'none' : '1px solid var(--border-glass)',
                transition: 'all 0.2s ease'
              }}
            >
              {pageNum}
            </button>
          ))}

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="btn-glass"
            style={{ padding: '8px 14px', fontSize: '0.85rem', opacity: currentPage === totalPages ? 0.4 : 1 }}
          >
            Siguiente ▶
          </button>
        </div>
      )}

      {/* Referral & Promo Banner */}
      <div className="glass-panel" style={{
        marginTop: '32px',
        padding: '20px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-cyan)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        <div>
          <h4 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '4px' }}>
            🎁 ¿Tienes un Código de Referido o Cupón?
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Gana saldo automático en tu billetera invitando a tus amigos a recargar en ALVSHOP.
          </p>
        </div>
        <Link to="/profile" className="btn-cyan" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
          Ver Mi Código de Referido ➔
        </Link>
      </div>
    </div>
  );
}
