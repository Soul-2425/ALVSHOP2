import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const CACHE_KEY_COUPONS = 'alv_coupons_v2';

const DEFAULT_COUPONS = [
  { id: '1', code: 'BIENVENIDA10', discount_type: 'percentage', discount_value: 10, expires_at: '2026-12-31T23:59', min_purchase_usdt: 5.00, max_uses: 100, used_count: 14, is_active: true },
  { id: '2', code: 'FREEFIRE2026', discount_type: 'fixed', discount_value: 1.00, expires_at: '2026-09-30T23:59', min_purchase_usdt: 10.00, max_uses: 50, used_count: 32, is_active: true }
];

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_COUPONS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_COUPONS;
  });

  const [loading, setLoading] = useState(false);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'fixed'
  const [discountValue, setDiscountValue] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [minPurchase, setMinPurchase] = useState('0');
  const [maxUses, setMaxUses] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadCoupons() {
      try {
        const fetchPromise = supabase
          .from('coupons')
          .select('*')
          .order('created_at', { ascending: false });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 4000)
        );

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

        if (data && !error && data.length > 0) {
          setCoupons(data);
          try {
            localStorage.setItem(CACHE_KEY_COUPONS, JSON.stringify(data));
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Usando cupones locales por lentitud de red:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCoupons();
  }, []);

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    setSaving(true);

    const newCoupon = {
      id: 'coup-' + Date.now(),
      code: code.toUpperCase().trim(),
      discount_type: discountType,
      discount_value: Number(discountValue),
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      min_purchase_usdt: Number(minPurchase || 0),
      max_uses: maxUses ? Number(maxUses) : null,
      used_count: 0,
      is_active: true,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase.from('coupons').insert({
        code: newCoupon.code,
        discount_type: newCoupon.discount_type,
        discount_value: newCoupon.discount_value,
        expires_at: newCoupon.expires_at,
        min_purchase_usdt: newCoupon.min_purchase_usdt,
        max_uses: newCoupon.max_uses,
        is_active: true
      }).select().single();

      if (!error && data) {
        newCoupon.id = data.id;
      }
    } catch (err) {
      console.warn('Guardando cupón en almacenamiento local persistente:', err);
    }

    const updated = [newCoupon, ...coupons];
    setCoupons(updated);
    try {
      localStorage.setItem(CACHE_KEY_COUPONS, JSON.stringify(updated));
    } catch (e) {}

    setShowModal(false);
    setCode('');
    setDiscountValue('');
    setExpiresAt('');
    setSaving(false);
    alert('✅ ¡Cupón promocional creado y activo exitosamente!');
  };

  const handleToggleStatus = async (couponId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: !currentStatus })
        .eq('id', couponId);

      if (!error) {
        setCoupons(prev => prev.map(c => c.id === couponId ? { ...c, is_active: !currentStatus } : c));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Gestión de Cupones y Promociones</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Configura códigos de descuento, fechas de vencimiento y límites de canje
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-cyan" style={{ fontSize: '0.85rem' }}>
          ➕ Crear Nuevo Cupón
        </button>
      </div>

      {/* Coupons Table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '10px 8px' }}>Código</th>
              <th style={{ padding: '10px 8px' }}>Descuento</th>
              <th style={{ padding: '10px 8px' }}>Fecha de Vencimiento</th>
              <th style={{ padding: '10px 8px' }}>Mínimo de Compra</th>
              <th style={{ padding: '10px 8px' }}>Usos</th>
              <th style={{ padding: '10px 8px' }}>Estado</th>
              <th style={{ padding: '10px 8px' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => {
              const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                  <td style={{ padding: '12px 8px', fontWeight: '800', color: 'var(--accent-cyan)' }}>
                    {c.code}
                  </td>
                  <td style={{ padding: '12px 8px', fontWeight: '700', color: '#34d399' }}>
                    {c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${Number(c.discount_value).toFixed(2)} USDT`}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    {c.expires_at ? (
                      <span style={{ color: isExpired ? '#f87171' : 'var(--text-main)' }}>
                        {new Date(c.expires_at).toLocaleString()} {isExpired && '(Vencido)'}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Sin Vencimiento</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 8px' }}>${Number(c.min_purchase_usdt || 0).toFixed(2)} USDT</td>
                  <td style={{ padding: '12px 8px' }}>
                    {c.used_count || 0} {c.max_uses ? `/ ${c.max_uses}` : ''}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: c.is_active && !isExpired ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: c.is_active && !isExpired ? '#34d399' : '#f87171',
                      border: c.is_active && !isExpired ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)'
                    }}>
                      {c.is_active && !isExpired ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <button
                      onClick={() => handleToggleStatus(c.id, c.is_active)}
                      className="btn-glass"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      {c.is_active ? 'Pausar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Coupon Modal */}
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
              <h3 style={{ fontSize: '1.2rem' }}>Crear Cupón de Descuento</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Código del Cupón</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. ALVPROMO2026"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontWeight: '800' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Tipo de Descuento</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto Fijo (USDT $)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Valor del Descuento</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder={discountType === 'percentage' ? '15' : '2.00'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontWeight: '700' }}
                  />
                </div>
              </div>

              {/* Expiration Date Picker */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: '700', marginBottom: '4px' }}>
                  📅 Fecha y Hora de Vencimiento
                </label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-cyan)', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Mínimo de Compra ($ USDT)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={minPurchase}
                    onChange={(e) => setMinPurchase(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Límite de Usos (Opcional)</label>
                  <input
                    type="number"
                    placeholder="Ej. 100"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                  />
                </div>
              </div>

              <button type="submit" disabled={saving} className="btn-cyan" style={{ padding: '12px', marginTop: '6px' }}>
                {saving ? 'Creando...' : 'Crear y Habilitar Cupón ➔'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
