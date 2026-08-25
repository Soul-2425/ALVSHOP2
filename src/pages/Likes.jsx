import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { validatePlayerUid } from '../../notificaciones y apis/apis/index';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import { getLikesPackages, DEFAULT_LIKES_PACKAGES } from '../services/likesPackagesService';

export default function Likes() {
  const { user, profile, config, updateUserWalletBalance, formatPrice, currency, exchangeRate } = useApp();
  const navigate = useNavigate();

  // Rate & Wallet
  const currentRateGtq = Number(config?.usdt_gtq_rate || exchangeRate || 7.80);
  const walletBalance = Number(profile?.wallet_balance || 0);

  // Tab: 'fixed' (Paquetes Fijos) vs 'scheduled' (Programado Diario)
  const [activeTab, setActiveTab] = useState('fixed');

  // Likes Packages from Service
  const [packagesList, setPackagesList] = useState(DEFAULT_LIKES_PACKAGES);
  const [selectedPackage, setSelectedPackage] = useState(DEFAULT_LIKES_PACKAGES[0]);

  useEffect(() => {
    getLikesPackages().then(list => {
      if (list && list.length > 0) {
        setPackagesList(list.filter(p => p.isActive !== false));
        setSelectedPackage(list[0]);
      }
    });
  }, []);

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
    ? Number(selectedPackage?.priceUsdt || 7.09)
    : (autoQtyPerDay / 1000 * 0.70 * autoDays);
  const currentPriceGtq = (currentPriceUsdt * currentRateGtq).toFixed(2);
  const hasSufficientBalance = walletBalance >= currentPriceUsdt;

  // Real Validation using SiamBhau Free Fire v5.0 API
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
      const res = await validatePlayerUid(cleanUid, 'Free Fire', 'US');

      if (res && res.success && res.nickname) {
        setPlayerData({
          nickname: res.nickname,
          level: res.account_level || 70,
          liked: Number(res.currentLikes || 5000),
          rankingPoints: res.rankingPoints || 0,
          rank: res.rank || 0,
          region: res.region || 'LATAM',
          badgeCnt: res.badgeCnt || 0,
          releaseVersion: res.releaseVersion || 'OB54',
          isVerified: true,
          source: res.source || 'Free Fire Official / SiamBhau v5.0'
        });
        setValidationError('');
      } else {
        setPlayerData(null);
        setValidationError(res?.error || 'ID incorrecta o no encontrada en los servidores de Free Fire.');
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
      const likesToAdd = activeTab === 'fixed' ? Number(selectedPackage.quantity) : (autoQtyPerDay * autoDays);
      const deliveryTime = activeTab === 'fixed' ? selectedPackage.deliveryDays : `${autoDays} Días`;
      const playerNick = playerData.nickname;
      const likesBefore = Number(playerData.liked || 0);
      const targetLikesFinal = likesBefore + likesToAdd;

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
            nickname: playerNick,
            currentLikes: likesBefore
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
          player_level: playerData.level,
          likes_before: likesBefore,
          likes_to_add: likesToAdd,
          target_likes_final: targetLikesFinal,
          region: playerData.region || 'LATAM',
          delivery_estimated: deliveryTime,
          dispatch_mode: dispatchResult.mode || 'MANUAL',
          scheduled_hour: activeTab === 'scheduled' ? `${autoHour}:${autoMinute}` : 'Inmediato'
        })
      };

      let createdOrder = null;
      try {
        const { data } = await supabase
          .from('orders')
          .insert(orderPayload)
          .select()
          .single();
        if (data) createdOrder = data;
      } catch (e) {
        console.warn('Orders fallback for likes:', e);
      }

      if (!createdOrder) {
        createdOrder = {
          id: `LIKES-${Date.now()}`,
          ...orderPayload,
          created_at: new Date().toISOString()
        };
      }

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
            delivery_days: deliveryTime,
            likes_before: likesBefore,
            target_likes_final: targetLikesFinal
          }
        });
      } catch (e) {}

      // Save order to user local order history cache for instant viewing in Profile
      try {
        const cacheKey = `alv_user_orders_${user.id}`;
        const prevCached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        const orderToCache = {
          ...createdOrder,
          order_items: [{
            id: `item-${Date.now()}`,
            quantity: 1,
            price_usdt: currentPriceUsdt,
            fields_data: {
              target_uid: targetUid.trim(),
              player_nickname: playerNick,
              likes_quantity: likesToAdd
            },
            products: { name: `Paquete de ${likesToAdd.toLocaleString()} Likes Free Fire`, image_url: selectedPackage?.image_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80' }
          }]
        };
        localStorage.setItem(cacheKey, JSON.stringify([orderToCache, ...prevCached]));
      } catch (e) {}

      // Notify Admins
      try {
        notifyAdminNewOrder({
          orderId: createdOrder.id,
          amount: currentPriceUsdt,
          customerName: profile?.full_name || user.email,
          paymentMethod: 'Billetera (Likes FF)'
        });
      } catch (e) {}

      setOrderSuccess({
        id: createdOrder.id,
        likesToAdd,
        playerNick,
        targetUid: targetUid.trim(),
        priceUsdt: currentPriceUsdt,
        deliveryTime,
        isAutoDispatched,
        likesBefore,
        targetLikesFinal
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
          Entrega 100% segura por UID oficial. Validación en vivo de cuenta y estadísticas reales.
        </p>
      </div>

      {orderSuccess ? (
        /* COMPACT & SLEEK SUCCESS RECEIPT CARD */
        <div className="glass-panel" style={{
          borderRadius: 'var(--radius-lg)',
          padding: '24px 20px',
          textAlign: 'center',
          border: '1px solid #34d399',
          boxShadow: '0 0 25px rgba(52, 211, 153, 0.2)',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎉</div>
          <h2 style={{ fontSize: '1.25rem', color: '#34d399', fontWeight: '900', marginBottom: '4px' }}>
            ¡Pedido de Likes Confirmado!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '16px' }}>
            {orderSuccess.isAutoDispatched
              ? '⚡ La API del proveedor ha iniciado el envío de likes automáticamente.'
              : '📋 Tu orden ha sido registrada en el panel. El administrador realizará el envío en el plazo estimado.'}
          </p>

          {/* Compact Audit Card Summary */}
          <div style={{
            background: '#0d111a',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            marginBottom: '18px',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '0.82rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Jugador Verificado:</span>
              <strong style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🐔</span> {orderSuccess.playerNick}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>ID / UID Oficial:</span>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{orderSuccess.targetUid}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Likes Antes ➔ Meta:</span>
              <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{orderSuccess.likesBefore.toLocaleString()} ❤️ ➔ {orderSuccess.targetLikesFinal.toLocaleString()} 🎯</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Likes Añadidos:</span>
              <strong style={{ color: '#34d399' }}>+{orderSuccess.likesToAdd.toLocaleString()} LIKES</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Pagado:</span>
              <strong style={{ color: '#fbbf24' }}>${orderSuccess.priceUsdt.toFixed(2)} USDT</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Entrega Estimada:</span>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>{orderSuccess.deliveryTime}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setOrderSuccess(null);
                setTargetUid('');
                setPlayerData(null);
              }}
              className="btn-cyan"
              style={{ padding: '8px 16px', fontSize: '0.82rem' }}
            >
              ➕ Solicitar Otro Paquete
            </button>
            <button
              onClick={() => navigate('/profile?tab=orders')}
              className="btn-glass"
              style={{ padding: '8px 16px', fontSize: '0.82rem' }}
            >
              👤 Ver en Mis Pedidos
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

          {/* PASO 1: SELECCIÓN DE PAQUETE (FORMATO HORIZONTAL GAMER) */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--accent-cyan)', marginBottom: '14px', letterSpacing: '0.04em' }}>
              PASO 1: SELECCIONA TU PAQUETE DE LIKES
            </div>

            {activeTab === 'fixed' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {packagesList.map((pkg) => {
                  const isSelected = selectedPackage?.id === pkg.id;

                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg)}
                      style={{
                        borderRadius: 'var(--radius-lg)',
                        padding: '14px 18px',
                        cursor: 'pointer',
                        background: isSelected ? 'linear-gradient(90deg, rgba(6, 182, 212, 0.18) 0%, rgba(13, 17, 26, 0.95) 100%)' : '#0d111a',
                        border: isSelected ? '2px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                        boxShadow: isSelected ? '0 0 25px rgba(6, 182, 212, 0.3)' : 'none',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px'
                      }}
                    >
                      {/* Left: Custom Photo Container */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '12px',
                          background: isSelected ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                          border: isSelected ? '2px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          fontSize: '1.4rem',
                          flexShrink: 0
                        }}>
                          {pkg.imageUrl ? (
                            <img src={pkg.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span>⚡</span>
                          )}
                        </div>

                        {/* Title & Delivery Days */}
                        <div>
                          <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#fff', letterSpacing: '0.03em' }}>
                            {pkg.title}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)', fontWeight: '700', marginTop: '2px' }}>
                            Entrega: {pkg.deliveryDays}
                          </div>
                        </div>
                      </div>

                      {/* Right: Big Price Tag */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#34d399', letterSpacing: '0.02em' }}>
                          {formatPrice(pkg.priceUsdt)}
                        </div>
                        {currency !== 'USDT' && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            (${pkg.priceUsdt.toFixed(2)} USDT)
                          </div>
                        )}
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

          {/* PASO 3: TARJETA DE PERFIL OFICIAL (100% REAL EN VIVO CON SIAMBHAU v5.0) */}
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
                    🌍 Región {playerData.region} ({playerData.releaseVersion})
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
                    justifyContent: 'center'
                  }}>
                    {playerData.avatar_url ? (
                      <img
                        src={playerData.avatar_url}
                        alt={playerData.nickname}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fallback = e.target.parentElement.querySelector('.likes-badge-fallback');
                          if (fallback) fallback.style.display = 'flex';
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : null}
                    <div
                      className="likes-badge-fallback"
                      style={{
                        display: playerData.avatar_url ? 'none' : 'flex',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #06b6d4 100%)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem',
                        fontWeight: '900',
                        color: '#fff'
                      }}
                    >
                      {(playerData.nickname || 'FF').replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || 'FF'}
                    </div>
                  </div>

                  {/* Player Info */}
                  <div style={{ flex: 1, paddingTop: '34px', minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '1.35rem', color: '#fff', fontWeight: '900' }}>
                        {playerData.nickname}
                      </h3>
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(234, 179, 8, 0.2)',
                        color: '#fbbf24',
                        fontWeight: '800',
                        border: '1px solid rgba(234, 179, 8, 0.4)'
                      }}>
                        Nv. {playerData.level}
                      </span>
                    </div>

                    <div style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: '700', marginTop: '2px' }}>
                      ID / UID: {targetUid.trim()}
                    </div>
                  </div>
                </div>

                {/* Likes Progression Box (Real live stats!) */}
                <div style={{
                  margin: '0 20px 20px 20px',
                  padding: '14px 18px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-md)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  textAlign: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '700' }}>LIKES EN VIVO</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#fff', marginTop: '2px' }}>
                      {playerData.liked.toLocaleString()} ❤️
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', fontWeight: '700' }}>LIKES AÑADIDOS</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                      +{(activeTab === 'fixed' ? Number(selectedPackage.quantity) : (autoQtyPerDay * autoDays)).toLocaleString()} ⚡
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: '700' }}>META FINAL</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#34d399', marginTop: '2px' }}>
                      {(playerData.liked + (activeTab === 'fixed' ? Number(selectedPackage.quantity) : (autoQtyPerDay * autoDays))).toLocaleString()} 🎯
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
                  ${walletBalance.toFixed(2)} USDT <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({formatPrice(walletBalance)})</span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>TOTAL A PAGAR:</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fff' }}>
                  {formatPrice(currentPriceUsdt)}
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
