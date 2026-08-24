import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useApp } from '../../context/AppContext';

export default function AdminFinance() {
  const { config, loadConfig } = useApp();

  // Exchange Rates vs 1 USDT
  const [rateGtq, setRateGtq] = useState('7.80');
  const [rateMxn, setRateMxn] = useState('19.50');
  const [rateCop, setRateCop] = useState('4100.00');

  // Role Discounts
  const [discountOffer, setDiscountOffer] = useState('5');
  const [discountSpecial, setDiscountSpecial] = useState('10');

  // Payment Methods Visibility Switches
  const [visibility, setVisibility] = useState({
    binance: true,
    gtq: true,
    mxn: true,
    cop: true,
    payment_links: true
  });

  // Bank Accounts
  const [bankAccountsGtq, setBankAccountsGtq] = useState([
    { bank: 'Banrural', account_number: '4313076359', type: 'Ahorro', name: 'Jonathan Alvares' }
  ]);

  const [bankAccountsMxn, setBankAccountsMxn] = useState([
    { bank: 'BBVA / SPEI', account_number: '012180015487965412', type: 'CLABE Interbancaria', name: 'Jonathan Alvares' }
  ]);

  const [bankAccountsCop, setBankAccountsCop] = useState([
    { bank: 'Bancolombia / Nequi', account_number: '3124567890', type: 'Ahorros / Celular', name: 'Jonathan Alvares' }
  ]);

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
      if (config.usdt_gtq_rate) setRateGtq(String(config.usdt_gtq_rate));
      if (config.usdt_mxn_rate) setRateMxn(String(config.usdt_mxn_rate));
      if (config.usdt_cop_rate) setRateCop(String(config.usdt_cop_rate));

      if (config.discount_offer_pct) setDiscountOffer(String(config.discount_offer_pct));
      if (config.discount_special_pct) setDiscountSpecial(String(config.discount_special_pct));

      if (config.payment_methods_visibility) {
        setVisibility(prev => ({ ...prev, ...config.payment_methods_visibility }));
      }

      if (config.bank_accounts && config.bank_accounts.length > 0) setBankAccountsGtq(config.bank_accounts);
      if (config.mxn_accounts && config.mxn_accounts.length > 0) setBankAccountsMxn(config.mxn_accounts);
      if (config.cop_accounts && config.cop_accounts.length > 0) setBankAccountsCop(config.cop_accounts);

      if (config.binance_pay_id) setBinancePayId(config.binance_pay_id);
      if (config.binance_name) setBinanceName(config.binance_name);
      if (config.binance_qr_url) setBinanceQrUrl(config.binance_qr_url);
      if (config.binance_deeplink_url) setBinanceDeeplinkUrl(config.binance_deeplink_url);
      if (config.binance_usdt_address) setBinanceUsdtAddress(config.binance_usdt_address);
    }
  }, [config]);

  // Account Handlers GTQ
  const handleAddAccountGtq = () => {
    setBankAccountsGtq([...bankAccountsGtq, { bank: '', account_number: '', type: 'Ahorro', name: '' }]);
  };
  const handleAccountChangeGtq = (index, field, value) => {
    const updated = [...bankAccountsGtq];
    updated[index][field] = value;
    setBankAccountsGtq(updated);
  };
  const handleRemoveAccountGtq = (index) => {
    setBankAccountsGtq(bankAccountsGtq.filter((_, idx) => idx !== index));
  };

  // Account Handlers MXN
  const handleAddAccountMxn = () => {
    setBankAccountsMxn([...bankAccountsMxn, { bank: 'BBVA / SPEI', account_number: '', type: 'CLABE', name: '' }]);
  };
  const handleAccountChangeMxn = (index, field, value) => {
    const updated = [...bankAccountsMxn];
    updated[index][field] = value;
    setBankAccountsMxn(updated);
  };
  const handleRemoveAccountMxn = (index) => {
    setBankAccountsMxn(bankAccountsMxn.filter((_, idx) => idx !== index));
  };

  // Account Handlers COP
  const handleAddAccountCop = () => {
    setBankAccountsCop([...bankAccountsCop, { bank: 'Nequi / Bancolombia', account_number: '', type: 'Ahorro', name: '' }]);
  };
  const handleAccountChangeCop = (index, field, value) => {
    const updated = [...bankAccountsCop];
    updated[index][field] = value;
    setBankAccountsCop(updated);
  };
  const handleRemoveAccountCop = (index) => {
    setBankAccountsCop(bankAccountsCop.filter((_, idx) => idx !== index));
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
        binance_usdt_address: binanceUsdtAddress.trim(),
        usdt_mxn_rate: Number(rateMxn),
        usdt_cop_rate: Number(rateCop),
        mxn_accounts: bankAccountsMxn,
        cop_accounts: bankAccountsCop,
        payment_methods_visibility: visibility
      };

      const { error } = await supabase.from('config').update({
        usdt_gtq_rate: Number(rateGtq),
        usdt_mxn_rate: Number(rateMxn),
        usdt_cop_rate: Number(rateCop),
        discount_offer_pct: Number(discountOffer),
        discount_special_pct: Number(discountSpecial),
        bank_accounts: bankAccountsGtq,
        mxn_accounts: bankAccountsMxn,
        cop_accounts: bankAccountsCop,
        payment_methods_visibility: visibility,
        social_links: updatedSocial
      }).eq('id', 1);

      if (error) throw error;

      await loadConfig();
      alert('¡Configuración financiera, tasas multi-moneda y métodos de pago guardados con éxito!');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '820px' }}>
      <div>
        <h3 style={{ fontSize: '1.35rem', margin: 0, color: '#fff' }}>Configuración Financiera, Multi-Moneda & Métodos de Pago</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Gestiona las tasas de cambio de USDT a Quetzales (GTQ), Pesos Mexicanos (MXN) y Pesos Colombianos (COP), y activa o desactiva qué métodos aparecen al público.
        </p>
      </div>

      <form onSubmit={handleSaveFinance} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* ========================================================================= */}
        {/* 1. SECCIÓN DE TASAS DE CAMBIO (USDT BASE) */}
        {/* ========================================================================= */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-cyan)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '1.5rem' }}>💱</span>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#fff' }}>Tasas de Conversión Multi-Moneda (Base: 1.00 USDT)</h4>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Los clientes verán los precios convertidos en tiempo real según la moneda que elijan en la barra superior.</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {/* Tasa GTQ */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                🇬🇹 Tasa Quetzales (GTQ):
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#fbbf24', fontWeight: '800' }}>Q</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={rateGtq}
                  onChange={(e) => setRateGtq(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 32px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#0d111a',
                    border: '1px solid var(--border-glass)',
                    color: '#fff',
                    fontWeight: '800',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>1 USDT = Q{Number(rateGtq).toFixed(2)} GTQ</div>
            </div>

            {/* Tasa MXN */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                🇲🇽 Tasa Pesos Mexicanos (MXN):
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#34d399', fontWeight: '800' }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={rateMxn}
                  onChange={(e) => setRateMxn(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 32px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#0d111a',
                    border: '1px solid var(--border-glass)',
                    color: '#fff',
                    fontWeight: '800',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>1 USDT = ${Number(rateMxn).toFixed(2)} MXN</div>
            </div>

            {/* Tasa COP */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                🇨🇴 Tasa Pesos Colombianos (COP):
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#f59e0b', fontWeight: '800' }}>$</span>
                <input
                  type="number"
                  step="1"
                  required
                  value={rateCop}
                  onChange={(e) => setRateCop(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 32px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#0d111a',
                    border: '1px solid var(--border-glass)',
                    color: '#fff',
                    fontWeight: '800',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>1 USDT = ${Math.round(Number(rateCop)).toLocaleString('es-CO')} COP</div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. BINANCE PAY (USDT MANUAL) + SWITCH */}
        {/* ========================================================================= */}
        <div className="glass-panel" style={{
          padding: '24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid #f0b90b',
          background: 'linear-gradient(135deg, rgba(240, 185, 11, 0.08) 0%, rgba(13, 17, 26, 0.9) 100%)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.6rem' }}>🟡</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#f0b90b', fontWeight: '900' }}>
                  Binance Pay (Pago Manual USDT)
                </h4>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  El cliente transfiere a tu Binance Pay ID o escanea tu QR y adjunta captura de comprobante.
                </div>
              </div>
            </div>

            {/* Switch On/Off */}
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-glass)' }}>
              <input
                type="checkbox"
                checked={visibility.binance}
                onChange={(e) => setVisibility({ ...visibility, binance: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#f0b90b', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: visibility.binance ? '#f0b90b' : 'var(--text-muted)' }}>
                {visibility.binance ? '🟢 Visible al público' : '🔴 Oculto al público'}
              </span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Binance Pay ID:
              </label>
              <input
                type="text"
                value={binancePayId}
                onChange={(e) => setBinancePayId(e.target.value)}
                placeholder="Ej. 527653920"
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#f0b90b', fontWeight: '800' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Nombre de Titular en Binance:
              </label>
              <input
                type="text"
                value={binanceName}
                onChange={(e) => setBinanceName(e.target.value)}
                placeholder="Ej. AlvJona"
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontWeight: '700' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Deep Link directo a App de Binance (Opcional):
              </label>
              <input
                type="text"
                value={binanceDeeplinkUrl}
                onChange={(e) => setBinanceDeeplinkUrl(e.target.value)}
                placeholder="https://app.binance.com/uni-qr/..."
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Dirección de Billetera USDT (TRC20 / Polygon - Opcional):
              </label>
              <input
                type="text"
                value={binanceUsdtAddress}
                onChange={(e) => setBinanceUsdtAddress(e.target.value)}
                placeholder="Ej. TLa9..."
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* QR Upload & Preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: 'var(--radius-md)', flexWrap: 'wrap' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '8px', background: '#000', border: '1px solid #f0b90b', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {binanceQrUrl ? (
                <img src={binanceQrUrl} alt="Binance QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: '1.8rem' }}>📱</span>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>Código QR de Binance Pay</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Sube tu imagen de QR para que los clientes puedan escanearlo desde la app móvil.</div>
              <label style={{ display: 'inline-block', padding: '6px 14px', background: '#f0b90b', color: '#000', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer' }}>
                {uploadingQr ? 'Subiendo...' : '📷 Subir Foto de QR'}
                <input type="file" accept="image/*" onChange={handleUploadQr} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. GUATEMALA (GTQ) + SWITCH & CUENTAS */}
        {/* ========================================================================= */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-cyan)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.6rem' }}>🇬🇹</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: '900' }}>
                  Cuentas Bancarias en Quetzales (Guatemala - GTQ)
                </h4>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Banrural, Banco Industrial, G&T, etc.</div>
              </div>
            </div>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-glass)' }}>
              <input
                type="checkbox"
                checked={visibility.gtq}
                onChange={(e) => setVisibility({ ...visibility, gtq: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: visibility.gtq ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                {visibility.gtq ? '🟢 Visible al público' : '🔴 Oculto al público'}
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
            {bankAccountsGtq.map((acc, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 2fr auto', gap: '8px', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                <input
                  type="text"
                  placeholder="Banco (ej. Banrural)"
                  value={acc.bank}
                  onChange={(e) => handleAccountChangeGtq(index, 'bank', e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.82rem' }}
                />
                <input
                  type="text"
                  placeholder="No. de Cuenta"
                  value={acc.account_number}
                  onChange={(e) => handleAccountChangeGtq(index, 'account_number', e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.82rem', fontWeight: '700' }}
                />
                <input
                  type="text"
                  placeholder="Tipo (Ahorro/Monetaria)"
                  value={acc.type}
                  onChange={(e) => handleAccountChangeGtq(index, 'type', e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.82rem' }}
                />
                <input
                  type="text"
                  placeholder="Nombre Titular"
                  value={acc.name}
                  onChange={(e) => handleAccountChangeGtq(index, 'name', e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.82rem' }}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveAccountGtq(index)}
                  style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: '800' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddAccountGtq}
            className="btn-glass"
            style={{ fontSize: '0.78rem', padding: '6px 14px' }}
          >
            ➕ Agregar otra cuenta GTQ
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 4. MÉXICO (MXN) + SWITCH & CUENTAS */}
        {/* ========================================================================= */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid #34d399' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.6rem' }}>🇲🇽</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#34d399', fontWeight: '900' }}>
                  Cuentas & SPEI en Pesos Mexicanos (México - MXN)
                </h4>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BBVA, Santander, Banamex, CLABE Interbancaria, OXXO Pay.</div>
              </div>
            </div>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-glass)' }}>
              <input
                type="checkbox"
                checked={visibility.mxn}
                onChange={(e) => setVisibility({ ...visibility, mxn: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#34d399', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: visibility.mxn ? '#34d399' : 'var(--text-muted)' }}>
                {visibility.mxn ? '🟢 Visible al público' : '🔴 Oculto al público'}
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
            {bankAccountsMxn.map((acc, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 2.5fr 1.5fr 2fr auto', gap: '8px', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                <input
                  type="text"
                  placeholder="Banco/Plataforma (ej. BBVA / SPEI)"
                  value={acc.bank}
                  onChange={(e) => handleAccountChangeMxn(index, 'bank', e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.82rem' }}
                />
                <input
                  type="text"
                  placeholder="CLABE Interbancaria (18 dígitos) o Tarjeta"
                  value={acc.account_number}
                  onChange={(e) => handleAccountChangeMxn(index, 'account_number', e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.82rem', fontWeight: '700' }}
                />
                <input
                  type="text"
                  placeholder="Tipo (CLABE/Tarjeta)"
                  value={acc.type}
                  onChange={(e) => handleAccountChangeMxn(index, 'type', e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.82rem' }}
                />
                <input
                  type="text"
                  placeholder="Nombre Titular"
                  value={acc.name}
                  onChange={(e) => handleAccountChangeMxn(index, 'name', e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.82rem' }}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveAccountMxn(index)}
                  style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: '800' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddAccountMxn}
            className="btn-glass"
            style={{ fontSize: '0.78rem', padding: '6px 14px' }}
          >
            ➕ Agregar otra cuenta México (MXN)
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 5. COLOMBIA (COP) + SWITCH & CUENTAS */}
        {/* ========================================================================= */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.6rem' }}>🇨🇴</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#f59e0b', fontWeight: '900' }}>
                  Cuentas & Nequi en Pesos Colombianos (Colombia - COP)
                </h4>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bancolombia, Nequi, Daviplata, Dale, etc.</div>
              </div>
            </div>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-glass)' }}>
              <input
                type="checkbox"
                checked={visibility.cop}
                onChange={(e) => setVisibility({ ...visibility, cop: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#f59e0b', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: visibility.cop ? '#f59e0b' : 'var(--text-muted)' }}>
                {visibility.cop ? '🟢 Visible al público' : '🔴 Oculto al público'}
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
            {bankAccountsCop.map((acc, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 2.5fr 1.5fr 2fr auto', gap: '8px', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                <input
                  type="text"
                  placeholder="Banco (ej. Nequi / Bancolombia)"
                  value={acc.bank}
                  onChange={(e) => handleAccountChangeCop(index, 'bank', e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.82rem' }}
                />
                <input
                  type="text"
                  placeholder="No. Celular Nequi o No. Cuenta"
                  value={acc.account_number}
                  onChange={(e) => handleAccountChangeCop(index, 'account_number', e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.82rem', fontWeight: '700' }}
                />
                <input
                  type="text"
                  placeholder="Tipo (Ahorro/Celular)"
                  value={acc.type}
                  onChange={(e) => handleAccountChangeCop(index, 'type', e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.82rem' }}
                />
                <input
                  type="text"
                  placeholder="Nombre Titular"
                  value={acc.name}
                  onChange={(e) => handleAccountChangeCop(index, 'name', e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.82rem' }}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveAccountCop(index)}
                  style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: '800' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddAccountCop}
            className="btn-glass"
            style={{ fontSize: '0.78rem', padding: '6px 14px' }}
          >
            ➕ Agregar otra cuenta Colombia (COP)
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 6. POOL DE LINKS DE PAGO + SWITCH */}
        {/* ========================================================================= */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid #a855f7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.6rem' }}>🔗</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#a855f7', fontWeight: '900' }}>
                  Enlaces de Pago Desechables (Recurrente / Tarjetas)
                </h4>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Controla si la opción de recargar por Enlace Seguro aparece en la billetera de los clientes.
                </div>
              </div>
            </div>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-glass)' }}>
              <input
                type="checkbox"
                checked={visibility.payment_links}
                onChange={(e) => setVisibility({ ...visibility, payment_links: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#a855f7', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: visibility.payment_links ? '#a855f7' : 'var(--text-muted)' }}>
                {visibility.payment_links ? '🟢 Visible al público' : '🔴 Oculto al público'}
              </span>
            </label>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 7. DESCUENTOS POR ROL */}
        {/* ========================================================================= */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#fff' }}>Descuentos Automáticos por Rol</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Descuento Rol "Cliente Oferta" (%):
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountOffer}
                onChange={(e) => setDiscountOffer(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontWeight: '800' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Descuento Rol "Cliente Especial" (%):
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountSpecial}
                onChange={(e) => setDiscountSpecial(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontWeight: '800' }}
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={saving}
          className="btn-cyan"
          style={{ padding: '14px', fontSize: '1rem', fontWeight: '900', boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)' }}
        >
          {saving ? '💾 Guardando Cambios...' : '💾 Guardar Configuración Financiera'}
        </button>

      </form>
    </div>
  );
}
