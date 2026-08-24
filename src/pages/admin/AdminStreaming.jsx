import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';

const CACHE_KEY_STOCK = 'alv_credentials_stock_v3';
const CACHE_KEY_CATS = 'alv_cache_categories_v2';
const CACHE_KEY_PRODS = 'alv_cache_products_v2';

const DEFAULT_SAMPLE_STOCK = [
  {
    id: 'stock-1',
    category_name: 'Streaming',
    subcategory_name: 'Perfil Individual',
    product_name: 'Netflix 1 Pantalla Ultra HD',
    account_email: 'netflix_acc01@alvshop.com',
    account_password: '••••••••',
    pin: '4455',
    profile_name: 'Perfil 2',
    is_sold: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'stock-2',
    category_name: 'Streaming',
    subcategory_name: 'Cuenta Completa',
    product_name: 'Disney+ / Star+ Premium',
    account_email: 'disney_vip99@alvshop.com',
    account_password: '••••••••',
    pin: '1234',
    profile_name: 'Perfil 1',
    is_sold: true,
    sold_at: '2026-08-18T14:00:00Z',
    created_at: new Date().toISOString()
  },
  {
    id: 'stock-3',
    category_name: 'Streaming',
    subcategory_name: 'Perfil Individual',
    product_name: 'Max / HBO Max 4K',
    account_email: 'max_latam02@alvshop.com',
    account_password: '••••••••',
    pin: '9081',
    profile_name: 'Perfil Principal',
    is_sold: false,
    created_at: new Date().toISOString()
  }
];

export default function AdminStreaming() {
  const [stockList, setStockList] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_STOCK);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_SAMPLE_STOCK;
  });

  const [categories, setCategories] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_CATS);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [
      { id: 'cat-streaming', name: 'Streaming' },
      { id: 'cat-pines', name: 'Pines FF' },
      { id: 'cat-licencias', name: 'Licencias & Software' },
      { id: 'cat-otros', name: 'Otras Cuentas Digitales' }
    ];
  });

  const [products, setProducts] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_PRODS);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'AVAILABLE' | 'SOLD'

  // Modal State for Loading Account to Stock
  const [showModal, setShowModal] = useState(false);
  const [categoryName, setCategoryName] = useState('Streaming');
  const [subcategoryName, setSubcategoryName] = useState('Perfil Individual');
  const [productName, setProductName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [profileName, setProfileName] = useState('');
  const [extraInfo, setExtraInfo] = useState('');
  const [saving, setSaving] = useState(false);

  // Load from Supabase + Cache
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const fetchPromise = Promise.all([
          supabase.from('categories').select('id, name'),
          supabase.from('products').select('id, name, subcategory_id'),
          supabase.from('credentials_stock').select('*').order('created_at', { ascending: false })
        ]);

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 4000)
        );

        const [catsRes, prodsRes, credsRes] = await Promise.race([fetchPromise, timeoutPromise]);

        if (!isMounted) return;

        if (catsRes?.data && catsRes.data.length > 0) {
          setCategories(catsRes.data);
        }
        if (prodsRes?.data && prodsRes.data.length > 0) {
          setProducts(prodsRes.data);
        }
        if (credsRes?.data && credsRes.data.length > 0) {
          setStockList(credsRes.data);
          try {
            localStorage.setItem(CACHE_KEY_STOCK, JSON.stringify(credsRes.data));
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Usando stock en memoria por conexión lenta:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, []);

  // Save Credential to Stock (Tolerant to database structure)
  const handleAddCredential = async (e) => {
    e.preventDefault();
    setSaving(true);

    const chosenProduct = productName.trim() || 'Servicio Digital';
    const chosenCat = categoryName.trim() || 'Streaming';
    const chosenSub = subcategoryName.trim() || 'General';

    const newStockItem = {
      id: 'cred-' + Date.now(),
      category_name: chosenCat,
      subcategory_name: chosenSub,
      product_name: chosenProduct,
      account_email: email.trim(),
      account_password: password.trim(),
      pin: pin.trim(),
      profile_name: profileName.trim() || 'Perfil 1',
      extra_info: extraInfo.trim(),
      is_sold: false,
      created_at: new Date().toISOString()
    };

    try {
      // 1. Try to insert into Supabase
      const matchingProduct = products.find(p => p.name?.toLowerCase().includes(chosenProduct.toLowerCase()));
      const payload = {
        product_id: matchingProduct ? matchingProduct.id : null,
        account_email: newStockItem.account_email,
        account_password: newStockItem.account_password,
        pin: newStockItem.pin,
        profile_name: newStockItem.profile_name,
        extra_info: newStockItem.extra_info,
        is_sold: false
      };

      const { data, error } = await supabase.from('credentials_stock').insert(payload).select().single();
      if (!error && data) {
        newStockItem.id = data.id;
      }
    } catch (err) {
      console.warn('Almacenando en caché local seguro:', err);
    }

    // 2. Update local state & localStorage
    const updatedList = [newStockItem, ...stockList];
    setStockList(updatedList);
    try {
      localStorage.setItem(CACHE_KEY_STOCK, JSON.stringify(updatedList));
    } catch (e) {}

    // Reset Form
    setShowModal(false);
    setEmail('');
    setPassword('');
    setPin('');
    setProfileName('');
    setExtraInfo('');
    setSaving(false);
    alert('✅ ¡Cuenta agregada al inventario de stock exitosamente!');
  };

  // Toggle Sold Status
  const handleToggleSold = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    const updatedList = stockList.map(item => {
      if (item.id === id) {
        return {
          ...item,
          is_sold: newStatus,
          sold_at: newStatus ? new Date().toISOString() : null
        };
      }
      return item;
    });

    setStockList(updatedList);
    try {
      localStorage.setItem(CACHE_KEY_STOCK, JSON.stringify(updatedList));
      await supabase.from('credentials_stock').update({ is_sold: newStatus }).eq('id', id);
    } catch (e) {}
  };

  // Delete Stock Item
  const handleDeleteItem = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta cuenta del stock?')) return;
    const updatedList = stockList.filter(i => i.id !== id);
    setStockList(updatedList);
    try {
      localStorage.setItem(CACHE_KEY_STOCK, JSON.stringify(updatedList));
      await supabase.from('credentials_stock').delete().eq('id', id);
    } catch (e) {}
  };

  // Filter Stock List
  const filteredStock = useMemo(() => {
    return stockList.filter(item => {
      const prodName = (item.product_name || item.products?.name || '').toLowerCase();
      const catName = (item.category_name || '').toLowerCase();
      const subName = (item.subcategory_name || '').toLowerCase();
      const mail = (item.account_email || '').toLowerCase();

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesQ = prodName.includes(q) || catName.includes(q) || subName.includes(q) || mail.includes(q);
        if (!matchesQ) return false;
      }

      // Status Filter
      if (filterStatus === 'AVAILABLE' && item.is_sold) return false;
      if (filterStatus === 'SOLD' && !item.is_sold) return false;

      // Category Filter
      if (filterCategory !== 'ALL') {
        if (!catName.includes(filterCategory.toLowerCase())) return false;
      }

      return true;
    });
  }, [stockList, searchQuery, filterStatus, filterCategory]);

  const availableCount = stockList.filter(i => !i.is_sold).length;
  const soldCount = stockList.filter(i => i.is_sold).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: '900', margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📺</span>
            <span>Inventario de Stock (Streaming & Cuentas Digitales)</span>
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Credenciales de correos, contraseñas y PINs para despacho automático e inmediato a clientes
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn-cyan"
          style={{ fontSize: '0.85rem', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <span>➕</span>
          <span>Cargar Cuenta al Stock</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>TOTAL CUENTAS EN SISTEMA</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#fff', marginTop: '4px' }}>{stockList.length}</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
          <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '700' }}>DISPONIBLES PARA ENTREGA</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#34d399', marginTop: '4px' }}>{availableCount}</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(248, 113, 113, 0.3)' }}>
          <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: '700' }}>ENTREGADAS / VENDIDAS</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#f87171', marginTop: '4px' }}>{soldCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterStatus('ALL')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: '800',
              cursor: 'pointer',
              background: filterStatus === 'ALL' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.04)',
              color: filterStatus === 'ALL' ? '#000' : 'var(--text-main)',
              border: filterStatus === 'ALL' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)'
            }}
          >
            Todas ({stockList.length})
          </button>
          <button
            onClick={() => setFilterStatus('AVAILABLE')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: '800',
              cursor: 'pointer',
              background: filterStatus === 'AVAILABLE' ? '#34d399' : 'rgba(255, 255, 255, 0.04)',
              color: filterStatus === 'AVAILABLE' ? '#000' : 'var(--text-main)',
              border: filterStatus === 'AVAILABLE' ? '1px solid #34d399' : '1px solid var(--border-glass)'
            }}
          >
            🟢 Disponibles ({availableCount})
          </button>
          <button
            onClick={() => setFilterStatus('SOLD')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: '800',
              cursor: 'pointer',
              background: filterStatus === 'SOLD' ? '#f87171' : 'rgba(255, 255, 255, 0.04)',
              color: filterStatus === 'SOLD' ? '#000' : 'var(--text-main)',
              border: filterStatus === 'SOLD' ? '1px solid #f87171' : '1px solid var(--border-glass)'
            }}
          >
            🔴 Vendidas ({soldCount})
          </button>
        </div>

        <div style={{ position: 'relative', minWidth: '220px', maxWidth: '300px', flex: 1 }}>
          <input
            type="text"
            placeholder="Buscar por producto, correo o subcategoría..."
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
          <span style={{ position: 'absolute', left: '12px', top: '9px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            🔍
          </span>
        </div>
      </div>

      {/* Stock Table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '10px 8px' }}>Categoría / Subcategoría</th>
              <th style={{ padding: '10px 8px' }}>Producto / Servicio</th>
              <th style={{ padding: '10px 8px' }}>Correo / Usuario</th>
              <th style={{ padding: '10px 8px' }}>Contraseña</th>
              <th style={{ padding: '10px 8px' }}>Perfil & PIN</th>
              <th style={{ padding: '10px 8px' }}>Estado</th>
              <th style={{ padding: '10px 8px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredStock.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No se encontraron cuentas en el inventario con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredStock.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ color: 'var(--accent-cyan)', fontWeight: '800', fontSize: '0.78rem' }}>
                      {item.category_name || 'Streaming'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {item.subcategory_name || 'Perfil'}
                    </div>
                  </td>

                  <td style={{ padding: '12px 8px', fontWeight: '800', color: '#fff' }}>
                    {item.product_name || item.products?.name || 'Servicio Digital'}
                  </td>

                  <td style={{ padding: '12px 8px', color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>
                    {item.account_email}
                  </td>

                  <td style={{ padding: '12px 8px', color: '#cbd5e1', fontFamily: 'monospace' }}>
                    {item.account_password}
                  </td>

                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ fontWeight: '700', color: '#fff' }}>{item.profile_name || 'N/A'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>PIN: {item.pin || 'Sin PIN'}</div>
                  </td>

                  <td style={{ padding: '12px 8px' }}>
                    <button
                      onClick={() => handleToggleSold(item.id, item.is_sold)}
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-full)',
                        cursor: 'pointer',
                        background: item.is_sold ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        color: item.is_sold ? '#f87171' : '#34d399',
                        border: item.is_sold ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)'
                      }}
                    >
                      {item.is_sold ? '🔴 Vendido (Clic p/ liberar)' : '🟢 Disponible'}
                    </button>
                  </td>

                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#f87171',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                      title="Eliminar cuenta"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Credential Modal with Full Categorization */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel animate-fade" style={{
            width: '100%',
            maxWidth: '540px',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            border: '1px solid var(--border-cyan)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '900', margin: 0, color: '#fff' }}>
                Cargar Cuenta al Stock
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCredential} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* 1. Categoría */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                  1. NOMBRE DE LA CATEGORÍA
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Streaming, Pines FF, Licencias..."
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              {/* 2. Subcategoría */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                  2. SUBCATEGORÍA
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Perfil Individual, Cuenta Completa, 1 Mes..."
                  value={subcategoryName}
                  onChange={(e) => setSubcategoryName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              {/* 3. Nombre del Producto / Servicio */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                  3. NOMBRE DEL PRODUCTO / SERVICIO
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Netflix 1 Pantalla Ultra HD, Disney+, Max..."
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              {/* 4. Correo y Contraseña */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Correo / Usuario *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ejemplo@netflix.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Contraseña *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Clave123*"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* 5. Perfil y PIN */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Nombre de Perfil
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Perfil 2"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    PIN de Perfil
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 1234 (opcional)"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* 6. Información Extra */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Instrucciones o Información Extra (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. No cambiar el nombre del perfil, usar VPN si aplica"
                  value={extraInfo}
                  onChange={(e) => setExtraInfo(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn-cyan"
                style={{ padding: '12px', marginTop: '6px', fontSize: '0.9rem', fontWeight: '900' }}
              >
                {saving ? 'Guardando...' : 'Guardar Cuenta en Stock Inmediato ➔'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
