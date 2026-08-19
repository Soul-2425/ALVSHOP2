import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useApp } from '../../context/AppContext';

export default function AdminFinance() {
  const { config, loadConfig } = useApp();

  const [rate, setRate] = useState('7.80');
  const [discountOffer, setDiscountOffer] = useState('5');
  const [discountSpecial, setDiscountSpecial] = useState('10');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      if (config.usdt_gtq_rate) setRate(String(config.usdt_gtq_rate));
      if (config.discount_offer_pct) setDiscountOffer(String(config.discount_offer_pct));
      if (config.discount_special_pct) setDiscountSpecial(String(config.discount_special_pct));
      if (config.bank_accounts) setBankAccounts(config.bank_accounts);
    }
  }, [config]);

  const handleAddAccount = () => {
    setBankAccounts([...bankAccounts, { bank: '', account_number: '', type: 'Ahorro', name: '' }]);
  };

  const handleAccountChange = (index, field, value) => {
    const updated = [...bankAccounts];
    updated[index][field] = value;
    setBankAccounts(updated);
  };

  const handleSaveFinance = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase.from('config').update({
        usdt_gtq_rate: Number(rate),
        discount_offer_pct: Number(discountOffer),
        discount_special_pct: Number(discountSpecial),
        bank_accounts: bankAccounts
      }).eq('id', 1);

      if (error) throw error;

      await loadConfig();
      alert('¡Configuración financiera y tasa de cambio guardada con éxito!');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '720px' }}>
      <div>
        <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Configuración Financiera & Tasa de Cambio</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Gestiona la tasa de conversión USDT a Quetzales (GTQ) y cuentas bancarias receptoras
        </p>
      </div>

      <form onSubmit={handleSaveFinance} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Exchange Rate Card */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-cyan)' }}>
          <h4 style={{ fontSize: '1.05rem', marginBottom: '8px', color: 'var(--accent-cyan)' }}>
            💱 Tasa de Cambio Dinámica (1 USDT = X Quetzales)
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Esta tasa recalculará automáticamente todos los precios en la tienda cuando el cliente active la vista en Quetzales (GTQ).
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>1.00 USDT =</div>
            <input
              type="number"
              step="0.01"
              required
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              style={{
                width: '120px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: '#0d111a',
                border: '1px solid var(--border-cyan)',
                color: '#fff',
                fontSize: '1.2rem',
                fontWeight: '900'
              }}
            />
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--accent-cyan)' }}>GTQ (Quetzales)</div>
          </div>
        </div>

        {/* Role Discounts Card */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
          <h4 style={{ fontSize: '1.05rem', marginBottom: '8px' }}>
            🏷️ Descuentos Automáticos por Rol (% sobre Precio Público)
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Descuento Rol "Cliente Oferta" (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={discountOffer}
                onChange={(e) => setDiscountOffer(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Descuento Rol "Cliente Especial" (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={discountSpecial}
                onChange={(e) => setDiscountSpecial(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
              />
            </div>
          </div>
        </div>

        {/* Bank Accounts Card */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '1.05rem', margin: 0 }}>🏦 Cuentas Bancarias para Transferencias Manuales</h4>
            <button type="button" onClick={handleAddAccount} className="btn-glass" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
              ➕ Agregar Cuenta
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bankAccounts.map((acc, idx) => (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr',
                gap: '8px'
              }}>
                <input
                  type="text"
                  placeholder="Banco (Ej. Banrural)"
                  value={acc.bank}
                  onChange={(e) => handleAccountChange(idx, 'bank', e.target.value)}
                  style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                />
                <input
                  type="text"
                  placeholder="No. de Cuenta"
                  value={acc.account_number}
                  onChange={(e) => handleAccountChange(idx, 'account_number', e.target.value)}
                  style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                />
                <input
                  type="text"
                  placeholder="Tipo (Ahorro / Monetario)"
                  value={acc.type}
                  onChange={(e) => handleAccountChange(idx, 'type', e.target.value)}
                  style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                />
                <input
                  type="text"
                  placeholder="Nombre Titular"
                  value={acc.name}
                  onChange={(e) => handleAccountChange(idx, 'name', e.target.value)}
                  style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                />
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-cyan" style={{ padding: '14px', fontSize: '0.95rem' }}>
          {saving ? 'Guardando...' : '💾 Guardar Configuración Financiera'}
        </button>
      </form>
    </div>
  );
}
