import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function AdminStreaming() {
  const [stockList, setStockList] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [profileName, setProfileName] = useState('');
  const [extraInfo, setExtraInfo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadStreamingData() {
      setLoading(true);
      const { data: prodData } = await supabase.from('products').select('id, name');
      const { data: credData } = await supabase.from('credentials_stock').select('*, products(name)');

      if (prodData) setProducts(prodData);
      if (credData && credData.length > 0) {
        setStockList(credData);
      } else {
        setStockList([
          { id: '1', products: { name: 'Netflix 1 Pantalla HD' }, account_email: 'netflix_acc01@alvshop.com', account_password: '••••••••', pin: '4455', profile_name: 'Perfil 2', is_sold: false },
          { id: '2', products: { name: 'Disney+ / Star+ Premium' }, account_email: 'disney_vip99@alvshop.com', account_password: '••••••••', pin: '1234', profile_name: 'Perfil 1', is_sold: true, sold_at: '2026-08-18T14:00:00Z' }
        ]);
      }
      setLoading(false);
    }

    loadStreamingData();
  }, []);

  const handleAddCredential = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data, error } = await supabase.from('credentials_stock').insert({
        product_id: selectedProduct || (products[0]?.id || null),
        account_email: email,
        account_password: password,
        pin,
        profile_name: profileName,
        extra_info: extraInfo
      }).select('*, products(name)').single();

      if (error) throw error;

      setStockList([data, ...stockList]);
      setShowModal(false);
      setEmail('');
      setPassword('');
      setPin('');
      setProfileName('');
      alert('¡Cuenta agregada al inventario de streaming exitosamente!');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Módulo de Streaming & Cuentas Digitales</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Inventario de credenciales (correos, contraseñas y PINs) para despacho automático
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-cyan" style={{ fontSize: '0.85rem' }}>
          ➕ Agregar Cuenta al Stock
        </button>
      </div>

      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '10px 8px' }}>Servicio</th>
              <th style={{ padding: '10px 8px' }}>Correo de Cuenta</th>
              <th style={{ padding: '10px 8px' }}>Contraseña</th>
              <th style={{ padding: '10px 8px' }}>PIN / Perfil</th>
              <th style={{ padding: '10px 8px' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {stockList.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                <td style={{ padding: '12px 8px', fontWeight: '700' }}>{item.products?.name || 'Servicio Streaming'}</td>
                <td style={{ padding: '12px 8px', color: 'var(--accent-cyan)' }}>{item.account_email}</td>
                <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>••••••••</td>
                <td style={{ padding: '12px 8px' }}>
                  {item.profile_name} (PIN: {item.pin || 'Sin PIN'})
                </td>
                <td style={{ padding: '12px 8px' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: item.is_sold ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: item.is_sold ? '#f87171' : '#34d399',
                    border: item.is_sold ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)'
                  }}>
                    {item.is_sold ? '🔴 Vendido / Entregado' : '🟢 Disponible en Stock'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Credential Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          backgroundColor: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel animate-fade" style={{
            width: '100%',
            maxWidth: '500px',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            border: '1px solid var(--border-cyan)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Cargar Cuenta al Stock</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleAddCredential} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Servicio</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                >
                  <option value="">Seleccionar Servicio / Producto</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Correo Electrónico de la Cuenta</label>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@netflix.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Contraseña</label>
                <input
                  type="text"
                  required
                  placeholder="Clave123*"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Nombre de Perfil</label>
                  <input
                    type="text"
                    placeholder="Ej. Perfil 3"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>PIN de Perfil</label>
                  <input
                    type="text"
                    placeholder="Ej. 1234"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                  />
                </div>
              </div>

              <button type="submit" disabled={saving} className="btn-cyan" style={{ padding: '12px', marginTop: '6px' }}>
                {saving ? 'Guardando...' : 'Guardar en Stock Inmediato ➔'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
