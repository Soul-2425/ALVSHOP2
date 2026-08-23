import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { validatePlayerUid } from '../../notificaciones y apis/apis/index';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';

export default function Likes() {
  const { user, profile, config, updateUserWalletBalance } = useApp();
  const navigate = useNavigate();

  // Exchange rate & Wallet
  const exchangeRate = Number(config?.exchange_rate_gtq || 7.80);
  const walletBalance = Number(profile?.wallet_balance || 0);

  // Tab: 'fixed' (Paquetes Fijos) vs 'scheduled' (Programado Diario)
  const [activeTab, setActiveTab] = useState('fixed');

  // Fixed Packages Config
  const fixedPackages = [
    {
      id: '2k',
      title: '2K LIKES',
      quantity: 2000,
      likesLabel: '2,000 LIKES',
      priceUsdt: 1.50,
      deliveryDays: '1-2 Días',
      badge: 'POPULAR 🔥'
    },
    {
      id: '4k',
      title: '4K LIKES',
      quantity: 4000,
      likesLabel: '4,000 LIKES',
      priceUsdt: 2.80,
      deliveryDays: '2-3 Días',
      badge: 'MEJOR VALOR ⭐'
    },
    {
      id: '10k',
      title: '10K LIKES',
      quantity: 10000,
      likesLabel: '10,000 LIKES',
      priceUsdt: 6.00,
      deliveryDays: '4-5 Días',
      badge: 'PAQUETE PRO 👑'
    }
  ];

  const [selectedPackage, setSelectedPackage] = useState(fixedPackages[0]);

  // Input & Player State
  const [targetUid, setTargetUid] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [playerData, setPlayerData] = useState(null);
  const [validationError, setValidationError] = useState('');

  // Scheduled / Daily Form State
  const [autoQtyPerDay, setAutoQtyPerDay] = useState(2000);
  const [autoDays, setAutoDays] = useState(7);
  const [autoHour, setAutoHour] = useState('14');
  const [autoMinute, setAutoMinute] = useState('00');

  // Checkout & Dispatch State
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Active Price Calculation
  const currentPriceUsdt = activeTab === 'fixed'
    ? selectedPackage.priceUsdt
    : (autoQtyPerDay / 1000 * 0.70 * autoDays);
  const currentPriceGtq = (currentPriceUsdt * exchangeRate).toFixed(2);
  const hasSufficientBalance = walletBalance >= currentPriceUsdt;

  // Real Validation using official API
  const handleValidateUid = async (uidToValidate) => {
    const cleanUid = (uidToValidate || targetUid).trim().replace(/\D/g, '');
    if (!cleanUid || cleanUid.length < 5) {
      setValidationError('Ingresa un UID válido de al menos 5 dígitos.');
      setPlayerData(null);
      return;
    }

    setIsValidating(true);
    setValidationError('');

    try {
      // Direct call to official validator API (Garena / Recargas América)
      const res = await validatePlayerUid(cleanUid, 'Free Fire');

      if (res && res.success && res.nickname) {
        setPlayerData({
          nickname: res.nickname,
          region: res.region || 'LATAM',
          isVerified: true,
          source: res.source || 'Garena / Recargas América Oficial'
        });
        setValidationError('');
      } else {
        setPlayerData(null);
        setValidationError(res?.error || 'ID incorrecta. Por favor, verifica el ID ingresado.');
      }
    } catch (err) {
      console.warn('Error validando UID:', err);
      setPlayerData(null);
      setValidationError('ID incorrecta o no encontrada en los servidores de Free Fire.');
    } finally {
      setIsValidating(false);
    }
  };

  // Submit Order & Pay with Wallet
  const handleProceedPayment = async () => {
    if (!user) {
      alert('Debes iniciar sesión para realizar la compra.');
      navigate('/profile');
      return;
    }

    if (!targetUid.trim() || targetUid.trim().length < 5) {
      alert('Por favor ingresa un ID (UID) de Free Fire válido.');
      return;
    }

    if (!playerData || !playerData.nickname) {
      alert('Por favor valida primero el ID de jugador antes de continuar.');
      return;
    }

    if (!hasSufficientBalance) {
      alert('Saldo insuficiente en tu billetera. Por favor recarga saldo antes de continuar.');
      navigate('/profile?tab=wallet');
      return;
    }

    setIsProcessing(true);

    try {
      const likesToAdd = activeTab === 'fixed' ? selectedPackage.quantity : (autoQtyPerDay * autoDays);
      const deliveryTime = activeTab === 'fixed' ? selectedPackage.deliveryDays : `${autoDays} Días`;
      const playerNick = playerData.nickname;

      // 1. Deduct user wallet balance immediately
      const newBalance = Math.max(0, walletBalance - currentPriceUsdt);
      await updateUserWalletBalance(user.id, newBalance, user.email);

      // 2. Dispatch with backend Likes service
      let dispatchResult = { mode: 'MANUAL', txId: null };
      try {
        const dispRes = await fetch('http://localhost:5000/api/v1/likes/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: `LIKES-${Date.now()}`,
            uid: targetUid.trim(),
            likesToAdd: likesToAdd,
            nickname: playerNick
          })
        });
        if (dispRes.ok) {
          dispatchResult = await dispRes.json();
        }
      } catch (e) {
        console.warn('Microservicio de despacho no disponible, fallback a manual:', e);
      }

      // 3. Register Order in Supabase
      const isAutoDispatched = dispatchResult.mode === 'API';
      const orderStatus = isAutoDispatched ? 'Completed' : 'Pending';

      const orderPayload = {
        user_id: user.id,
        total_usdt: currentPriceUsdt,
        total_gtq: Number(currentPriceGtq),
        status: orderStatus,
        payment_method: 'Wallet',
        bank_receipt_url: isAutoDispatched ? `LIKES_API | Tx: ${dispatchResult.txId}` : 'WALLET_PAY',
        customer_notes: JSON.stringify({
          service_type: 'Free Fire Likes',
          mode: activeTab,
          target_uid: targetUid.trim(),
          player_nickname: playerNick,
          region: playerData.region || 'LATAM',
          likes_to_add: likesToAdd,
          delivery_estimated: deliveryTime,
          dispatch_mode: dispatchResult.mode || 'MANUAL',
          scheduled_hour: activeTab === 'scheduled' ? `${autoHour}:${autoMinute}` : 'Inmediato'
        })
      };

      const { data: createdOrder } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single();

      if (createdOrder) {
        try {
          await supabase.from('order_items').insert({
            order_id: createdOrder.id,
            product_id: null,
            quantity: 1,
            price_usdt: currentPriceUsdt,
            cost_usdt: currentPriceUsdt * 0.5,
            fields_data: {
              target_uid: targetUid.trim(),
              player_nickname: playerNick,
              likes_quantity: likesToAdd,
              delivery_days: deliveryTime
            }
          });
        } catch (e) {}
      }

      setOrderSuccess({
        id: createdOrder?.id || `ORD-${Date.now()}`,
        likesToAdd,
        playerNick,
        targetUid: targetUid.trim(),
        priceUsdt: currentPriceUsdt,
        deliveryTime,
        isAutoDispatched
      });
    } catch (err) {
      alert('Error procesando el pedido de likes: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '20px', paddingBottom: '60px', maxWidth: '780px' }}>
      
      {/* Title Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 14px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(6, 182, 212, 0.15)',
          border: '1px solid var(--border-cyan)',
          color: 'var(--accent-cyan)',
          fontSize: '0.78rem',
          fontWeight: '900',
          marginBottom: '10px',
          letterSpacing: '0.05em'
        }}>
          ⚡ SERVICIO OFICIAL DE LIKES PARA FREE FIRE
        </div>
        <h1 style={{
          fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
          fontWeight: '900',
          margin: 0,
          background: 'linear-gradient(135deg, #fff 30%, var(--accent-cyan) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Aumenta tus Likes en Free Fire
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '540px', margin: '8px auto 0 auto' }}>
          Entrega 100% segura por UID oficial. Validación directa de cuenta y entrega garantizada.
        </p>
      </div>

      {orderSuccess ? (
        /* SUCCESS RECEIPT CARD */
        <div className="glass-panel" style={{
          borderRadius: 'var(--radius-lg)',
          padding: '36px 24px',
          textAlign: 'center',
          border: '1px solid #34d399',
          boxShadow: '0 0 35px rgba(52, 211, 153, 0.2)'
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>🎉</div>
          <h2 style={{ fontSize: '1.5rem', color: '#34d399', fontWeight: '900', marginBottom: '6px' }}>
            ¡Pedido de Likes Confirmado con Éxito!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '24px' }}>
            {orderSuccess.isAutoDispatched
              ? '⚡ La API del proveedor ha iniciado el envío de likes automáticamente.'
              : '📋 Tu orden ha sido registrada en el panel. El administrador realizará el envío en el plazo estimado.'}
          </p>

          {/* Audit Card Summary */}
          <div style={{
            background: '#0d111a',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            maxWidth: '480px',
            margin: '0 auto 24px auto',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontSize: '0.88rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Jugador Verificado:</span>
              <strong style={{ color: '#fff' }}>{orderSuccess.playerNick}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>ID / UID Oficial:</span>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{orderSuccess.targetUid}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Likes Añadidos:</span>
              <strong style={{ color: '#34d399' }}>+{orderSuccess.likesToAdd.toLocaleString()} LIKES</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Cobrado:</span>
              <strong style={{ color: '#fbbf24' }}>${orderSuccess.priceUsdt.toFixed(2)} USDT</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tiempo Estimado de Entrega:</span>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>{orderSuccess.deliveryTime}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setOrderSuccess(null);
                setTargetUid('');
                setPlayerData(null);
              }}
              className="btn-cyan"
              style={{ padding: '10px 20px', fontSize: '0.88rem' }}
            >
              ➕ Solicitar Otro Paquete
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="btn-glass"
              style={{ padding: '10px 20px', fontSize: '0.88rem' }}
            >
              👤 Ver en Mi Perfil
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* TAB SELECTOR: Fixed vs Scheduled */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '4px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-glass)',
            marginBottom: '28px'
          }}>
            <button
              onClick={() => setActiveTab('fixed')}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.88rem',
                fontWeight: '800',
                cursor: 'pointer',
                background: activeTab === 'fixed' ? 'var(--accent-cyan)' : 'transparent',
                color: activeTab === 'fixed' ? '#000' : 'var(--text-muted)',
                border: 'none',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'fixed' ? '0 0 15px rgba(6, 182, 212, 0.3)' : 'none'
              }}
            >
              🔥 Paquetes Fijos de Likes
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.88rem',
                fontWeight: '800',
                cursor: 'pointer',
                background: activeTab === 'scheduled' ? 'var(--accent-cyan)' : 'transparent',
                color: activeTab === 'scheduled' ? '#000' : 'var(--text-muted)',
                border: 'none',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'scheduled' ? '0 0 15px rgba(6, 182, 212, 0.3)' : 'none'
              }}
            >
              ⏰ Likes Diarios Programados
            </button>
          </div>

          {/* PASO 1: SELECCIÓN DE PAQUETE */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--accent-cyan)', marginBottom: '12px' }}>
              PASO 1: SELECCIONA TU PAQUETE DE LIKES
            </div>

            {activeTab === 'fixed' ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '14px'
              }}>
                {fixedPackages.map((pkg) => {
                  const isSelected = selectedPackage.id === pkg.id;
                  const priceGtq = (pkg.priceUsdt * exchangeRate).toFixed(2);

                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg)}
                      style={{
                        borderRadius: 'var(--radius-lg)',
                        padding: '18px 16px',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected ? '2px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                        boxShadow: isSelected ? '0 0 20px rgba(6, 182, 212, 0.25)' : 'none',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: isSelected ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.08)',
                        color: isSelected ? '#000' : 'var(--text-muted)',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.68rem',
                        fontWeight: '800'
                      }}>
                        {pkg.badge}
                      </div>

                      <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fff', marginBottom: '4px' }}>
                        {pkg.title}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>🚚</span> Entrega: {pkg.deliveryDays}
                      </div>

                      <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-glass)' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--accent-cyan)' }}>
                          ${pkg.priceUsdt.toFixed(2)} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>USDT</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: '600' }}>
                          Q{priceGtq} GTQ
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Scheduled Custom Pack Config */
              <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '700' }}>
                      Likes por Día:
                    </label>
                    <select
                      value={autoQtyPerDay}
                      onChange={(e) => setAutoQtyPerDay(Number(e.target.value))}
                      style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                    >
                      <option value={1000}>1,000 Likes / día</option>
                      <option value={2000}>2,000 Likes / día</option>
                      <option value={3000}>3,000 Likes / día</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '700' }}>
                      Duración (Días):
                    </label>
                    <select
                      value={autoDays}
                      onChange={(e) => setAutoDays(Number(e.target.value))}
                      style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                    >
                      <option value={7}>7 Días (1 Semana)</option>
                      <option value={15}>15 Días (Quincena)</option>
                      <option value={30}>30 Días (1 Mes)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '700' }}>
                      Hora de Envío Diario:
                    </label>
                    <input
                      type="time"
                      value={`${autoHour}:${autoMinute}`}
                      onChange={(e) => {
                        const [h, m] = e.target.value.split(':');
                        setAutoHour(h || '14');
                        setAutoMinute(m || '00');
                      }}
                      style={{ width: '100%', padding: '9px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                    />
                  </div>
                </div>

                <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-cyan)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total de Likes Acumulados: </span>
                    <strong style={{ color: '#fff' }}>{(autoQtyPerDay * autoDays).toLocaleString()} Likes</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: '1.2rem', color: 'var(--accent-cyan)' }}>${currentPriceUsdt.toFixed(2)} USDT</strong>
                    <span style={{ fontSize: '0.75rem', color: '#fbbf24', marginLeft: '6px' }}>(Q{currentPriceGtq} GTQ)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PASO 2: ID DEL OBJETIVO */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--accent-cyan)', marginBottom: '10px' }}>
              PASO 2: INGRESA EL ID DEL OBJETIVO (UID DE FREE FIRE)
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Ej. 816331100"
                value={targetUid}
                onChange={(e) => {
                  setTargetUid(e.target.value);
                  setValidationError('');
                }}
                onBlur={() => {
                  if (targetUid.trim().length >= 5) handleValidateUid();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleValidateUid();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: '#0d111a',
                  border: validationError ? '1px solid #f87171' : (playerData ? '1px solid #34d399' : '1px solid var(--border-glass)'),
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: '700',
                  letterSpacing: '0.04em'
                }}
              />
              <button
                type="button"
                onClick={() => handleValidateUid()}
                disabled={isValidating}
                className="btn-cyan"
                style={{ padding: '0 24px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
              >
                {isValidating ? 'Validando...' : '🔍 Validar ID'}
              </button>
            </div>

            {validationError && (
              <div style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '6px', fontWeight: '600' }}>
                ⚠️ {validationError}
              </div>
            )}
          </div>

          {/* PASO 3: TARJETA DE PERFIL OFICIAL (100% REAL DE LA API) */}
          {isValidating && (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              <div className="spinner-medium" style={{ margin: '0 auto 12px auto' }} />
              Consultando cuenta oficial de Free Fire en Garena...
            </div>
          )}

          {playerData && !isValidating && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#34d399', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>✅</span> CUENTA OFICIAL VERIFICADA EN GARENA
              </div>

              <div style={{
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #0f172a 0%, #0d111a 100%)',
                border: '1px solid var(--border-cyan)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7), 0 0 25px rgba(6, 182, 212, 0.15)',
                position: 'relative'
              }}>
                {/* Header Banner */}
                <div style={{
                  height: '70px',
                  background: 'linear-gradient(90deg, #1e3a8a 0%, #06b6d4 100%)',
                  position: 'relative',
                  padding: '12px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(0, 0, 0, 0.65)', padding: '4px 10px', borderRadius: '12px', color: '#fff', fontWeight: '800' }}>
                    🌍 Región {playerData.region || 'LATAM'}
                  </span>
                  <span style={{ fontSize: '0.72rem', background: '#34d399', color: '#000', padding: '4px 10px', borderRadius: '12px', fontWeight: '900' }}>
                    Garena Verified ✅
                  </span>
                </div>

                {/* Profile Body */}
                <div style={{ padding: '0 20px 20px 20px', marginTop: '-30px', display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {/* Avatar Icon */}
                  <div style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '16px',
                    border: '3px solid var(--accent-cyan)',
                    background: '#0d111a',
                    overflow: 'hidden',
                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem'
                  }}>
                    🎮
                  </div>

                  {/* Player Info */}
                  <div style={{ flex: 1, paddingTop: '34px', minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '1.35rem', color: '#fff', fontWeight: '900' }}>
                        {playerData.nickname}
                      </h3>
                    </div>

                    <div style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: '700', marginTop: '2px' }}>
                      ID / UID: {targetUid.trim()}
                    </div>
                  </div>
                </div>

                {/* Service Details Box */}
                <div style={{
                  margin: '0 20px 20px 20px',
                  padding: '14px 18px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-md)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '12px',
                  textAlign: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', fontWeight: '700' }}>LIKES A ENVIAR</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#34d399', marginTop: '2px' }}>
                      +{(activeTab === 'fixed' ? selectedPackage.quantity : (autoQtyPerDay * autoDays)).toLocaleString()} LIKES
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '700' }}>ENTREGA ESTIMADA</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
                      {activeTab === 'fixed' ? selectedPackage.deliveryDays : `${autoDays} Días`}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '700' }}>ESTADO DE CUENTA</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#34d399', marginTop: '4px' }}>
                      Lista para Recibir ⚡
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASO 4: PAGO CON BILLETERA */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>TU SALDO DISPONIBLE EN BILLETERA:</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: hasSufficientBalance ? 'var(--accent-cyan)' : '#f87171' }}>
                  ${walletBalance.toFixed(2)} USDT <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(Q{(walletBalance * exchangeRate).toFixed(2)} GTQ)</span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>TOTAL A PAGAR:</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fff' }}>
                  ${currentPriceUsdt.toFixed(2)} USDT
                </div>
              </div>
            </div>

            {!hasSufficientBalance && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <span style={{ color: '#f87171', fontSize: '0.85rem', fontWeight: '700' }}>
                  ⚠️ Saldo insuficiente para realizar esta orden.
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/profile?tab=wallet')}
                  className="btn-cyan"
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                >
                  ➕ Recargar Billetera ➔
                </button>
              </div>
            )}

            <button
              onClick={handleProceedPayment}
              disabled={isProcessing || !hasSufficientBalance || !playerData}
              className="btn-cyan"
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '1rem',
                fontWeight: '900',
                letterSpacing: '0.04em'
              }}
            >
              {isProcessing
                ? 'Procesando Envío de Likes...'
                : !playerData
                ? 'Valida tu ID de Jugador para Continuar'
                : !hasSufficientBalance
                ? 'Saldo Insuficiente (Recarga tu Billetera)'
                : `💎 Pagar con Billetera ($${currentPriceUsdt.toFixed(2)} USDT)`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
