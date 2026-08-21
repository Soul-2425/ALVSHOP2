import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useApp } from '../../context/AppContext';

export default function AdminFinance() {
  const { config, loadConfig } = useApp();

  const [rate, setRate] = useState('7.80');
  const [discountOffer, setDiscountOffer] = useState('5');
  const [discountSpecial, setDiscountSpecial] = useState('10');
  const [bankAccounts, setBankAccounts] = useState([]);

  // Binance Pay Configuration
  const [binancePayId, setBinancePayId] = useState('527653920');
  const [binanceName, setBinanceName] = useState('AlvJona');
  const [binanceQrUrl, setBinanceQrUrl] = useState('/binance-qr.jpg');
  const [binanceDeeplinkUrl, setBinanceDeeplinkUrl] = useState('https://app.binance.com/uni-qr/T567z1pn');
  const [binanceUsdtAddress, setBinanceUsdtAddress] = useState('');
  const [uploadingQr, setUploadingQr] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      if (config.usdt_gtq_rate) setRate(String(config.usdt_gtq_rate));
      if (config.discount_offer_pct) setDiscountOffer(String(config.discount_offer_pct));
      if (config.discount_special_pct) setDiscountSpecial(String(config.discount_special_pct));
      if (config.bank_accounts) setBankAccounts(config.bank_accounts);

      if (config.binance_pay_id) setBinancePayId(config.binance_pay_id);
      if (config.binance_name) setBinanceName(config.binance_name);
      if (config.binance_qr_url) setBinanceQrUrl(config.binance_qr_url);
      if (config.binance_deeplink_url) setBinanceDeeplinkUrl(config.binance_deeplink_url);
      if (config.binance_usdt_address) setBinanceUsdtAddress(config.binance_usdt_address);
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

  const handleRemoveAccount = (index) => {
    setBankAccounts(bankAccounts.filter((_, idx) => idx !== index));
  };

  // Subir nueva imagen de Código QR
  const handleUploadQr = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingQr(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `binance-qr-${Date.now()}.${fileExt}`;
      const filePath = `branding/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        // Si no hay bucket avatars, usar base64 local
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          setBinanceQrUrl(uploadEvent.target.result);
          setUploadingQr(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setBinanceQrUrl(data.publicUrl);
    } catch (err) {
      console.warn('Error subiendo QR:', err);
    } finally {
      setUploadingQr(false);
    }
  };

  const handleSaveFinance = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updatedSocial = {
        ...(config?.social_links || {}),
        binance_pay_id: binancePayId.trim(),
        binance_name: binanceName.trim(),
        binance_qr_url: binanceQrUrl.trim(),
        binance_deeplink_url: binanceDeeplinkUrl.trim(),
        binance_usdt_address: binanceUsdtAddress.trim()
      };

      const { error } = await supabase.from('config').update({
        usdt_gtq_rate: Number(rate),
        discount_offer_pct: Number(discountOffer),
        discount_special_pct: Number(discountSpecial),
        bank_accounts: bankAccounts,
        social_links: updatedSocial
      }).eq('id', 1);

      if (error) throw error;

      await loadConfig();
      alert('¡Configuración financiera y datos de Binance Pay guardados con éxito!');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '760px' }}>
      <div>
        <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Configuración Financiera, Binance Pay & Cuentas Bancarias</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Gestiona la tasa de conversión USDT a Quetzales, los datos receptores de Binance Pay (ID y QR) y cuentas de banco.
        </p>
      </div>

      <form onSubmit={handleSaveFinance} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* ========================================================================= */}
        {/* BINANCE PAY RECEPTOR CONFIGURATION */}
        {/* ========================================================================= */}
        <div className="glass-panel" style={{
          padding: '24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid #f0b90b',
          background: 'linear-gradient(135deg, rgba(240, 185, 11, 0.08) 0%, rgba(13, 17, 26, 0.9) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '1.6rem' }}>🟡</span>
            <div>
              <h4 style={{ fontSize: '1.1rem', margin: 0, color: '#f0b90b' }}>
                Datos de Recepción Binance Pay (USDT)
              </h4>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Aquí defines la ID de Binance y el Código QR donde tus clientes pagarán con criptomonedas.
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Binance Pay ID (Receptor) *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. 527653920"
                value={binancePayId}
                onChange={(e) => setBinancePayId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#0d111a',
                  border: '1px solid #f0b90b',
                  color: '#f0b90b',
                  fontSize: '1.05rem',
                  fontWeight: '800',
                  letterSpacing: '0.05em'
                }}
              />
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                El número de ID de tu cuenta Binance.
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Nombre / Alias de la Cuenta Binance *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. AlvJona"
                value={binanceName}
                onChange={(e) => setBinanceName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#0d111a',
                  border: '1px solid var(--border-glass)',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: '700'
                }}
              />
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Aparece debajo del QR (Titular de la cuenta).
              </div>
            </div>
          </div>

          {/* QR Code Upload & Preview */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '16px', alignItems: 'center' }}>
            <div style={{
              background: '#0d111a',
              border: '1px solid rgba(240, 185, 11, 0.4)',
              borderRadius: 'var(--radius-md)',
              padding: '6px',
              textAlign: 'center'
            }}>
              <img
                src={binanceQrUrl}
                alt="QR Binance Pay"
                style={{ width: '120px', height: '120px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
              />
              <div style={{ fontSize: '0.65rem', color: '#f0b90b', fontWeight: '700', marginTop: '4px' }}>{binanceName}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  URL de la Imagen del Código QR:
                </label>
                <input
                  type="text"
                  value={binanceQrUrl}
                  onChange={(e) => setBinanceQrUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#0d111a',
                    border: '1px solid var(--border-glass)',
                    color: '#fff',
                    fontSize: '0.8rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  O Subir Nuevo Archivo de Código QR:
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadQr}
                  style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
                />
                {uploadingQr && <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Subiendo QR...</span>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Enlace Universal / Deeplink de Binance App (Abre la app directamente):
                </label>
                <input
                  type="url"
                  placeholder="https://app.binance.com/uni-qr/T567z1pn"
                  value={binanceDeeplinkUrl}
                  onChange={(e) => setBinanceDeeplinkUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#0d111a',
                    border: '1px solid var(--border-glass)',
                    color: '#f0b90b',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* EXCHANGE RATE CARD */}
        {/* ========================================================================= */}
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

        {/* ========================================================================= */}
        {/* ROLE DISCOUNTS CARD */}
        {/* ========================================================================= */}
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

        {/* ========================================================================= */}
        {/* BANK ACCOUNTS CARD */}
        {/* ========================================================================= */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '1.05rem', margin: 0 }}>🏦 Cuentas Bancarias para Transferencias Manuales (GTQ)</h4>
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
                gridTemplateColumns: '1fr 1fr 1fr 1fr 40px',
                gap: '8px',
                alignItems: 'center'
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
                <button
                  type="button"
                  onClick={() => handleRemoveAccount(idx)}
                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '1rem' }}
                  title="Eliminar cuenta"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-cyan" style={{ padding: '14px', fontSize: '0.95rem', fontWeight: '800' }}>
          {saving ? 'Guardando...' : '💾 Guardar Toda la Configuración Financiera'}
        </button>
      </form>
    </div>
  );
}
