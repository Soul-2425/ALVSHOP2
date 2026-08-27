import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { validatePlayerUid } from '../../notificaciones y apis/apis/index';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import { getLikesPackages, DEFAULT_LIKES_PACKAGES } from '../services/likesPackagesService';
import { notifyAdminNewOrder } from '../../notificaciones y apis/notificaciones/pushService';

export default function Likes() {
  const { user, profile, config, updateUserWalletBalance, formatPrice, currency, exchangeRate } = useApp();
  const navigate = useNavigate();
  const topSectionRef = useRef(null);

  // Rate & Wallet
  const currentRateGtq = Number(config?.usdt_gtq_rate || exchangeRate || 7.80);
  const walletBalance = Number(profile?.wallet_balance || 0);

  // Packages list & Selection
  const [packagesList, setPackagesList] = useState(DEFAULT_LIKES_PACKAGES);
  const [selectedPackage, setSelectedPackage] = useState(DEFAULT_LIKES_PACKAGES[0]);

  useEffect(() => {
    getLikesPackages().then(list => {
      if (list && list.length > 0) {
        const visible = list.filter(p => p.isActive !== false);
        setPackagesList(visible);
        setSelectedPackage(visible[0] || list[0]);
      }
    });
  }, []);

  // Input & Player State (Top Verification)
  const [targetUid, setTargetUid] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [playerData, setPlayerData] = useState(null);
  const [validationError, setValidationError] = useState('');

  // Checkout & Dispatch State
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Active Price Calculation
  const currentPriceUsdt = Number(selectedPackage?.priceUsdt || 7.09);
  const currentPriceGtq = (currentPriceUsdt * currentRateGtq).toFixed(2);
  const hasSufficientBalance = walletBalance >= currentPriceUsdt;

  // Real Validation using SiamBhau Free Fire API
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
          level: res.account_level || 1,
          liked: Number(res.currentLikes || 0),
          rankingPoints: res.rankingPoints || 0,
          rank: res.rank || 0,
          region: res.region || 'US',
          badgeCnt: res.badgeCnt || 0,
          releaseVersion: res.releaseVersion || 'OB54',
          isVerified: true,
          source: res.source || 'Free Fire Official / SiamBhau Premium'
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

  // When clicking a package: Select and scroll smoothly back up to the top buy/verified section
  const handleSelectPackage = (pkg) => {
    setSelectedPackage(pkg);
    if (topSectionRef.current) {
      topSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // WhatsApp Quote / Order Handler
  const handleWhatsAppQuote = (pkg) => {
    const p = pkg || selectedPackage;
    const supportPhone = (config?.whatsapp_number || '50200000000').replace(/\D/g, '');
    const uidStr = targetUid.trim() ? `UID: ${targetUid.trim()}` : 'UID: (Por ingresar)';
    const nickStr = playerData?.nickname ? `Jugador: ${playerData.nickname}` : '';

    const text = encodeURIComponent(
      `👋 Hola ALVSHOP, deseo cotizar/comprar el siguiente paquete de Likes para Free Fire:\n\n` +
      `🔥 *Paquete:* ${p.title} (${Number(p.quantity).toLocaleString()} Likes)\n` +
      `⏱️ *Entrega:* ${p.deliveryDays}\n` +
      `💰 *Precio:* $${Number(p.priceUsdt).toFixed(2)} USDT (Q${(Number(p.priceUsdt) * currentRateGtq).toFixed(2)} GTQ)\n` +
      `🎮 *${uidStr}*\n` +
      (nickStr ? `👤 *${nickStr}*\n\n` : '\n') +
      `¿Podrían confirmarme los métodos de pago disponibles?`
    );

    window.open(`https://wa.me/${supportPhone}?text=${text}`, '_blank');
  };

  // Submit Order & Pay with Wallet
  const handleProceedPayment = async () => {
    if (!user) {
      alert('Debes iniciar sesión para realizar la compra.');
      navigate('/profile');
      return;
    }

    if (!targetUid.trim() || targetUid.trim().length < 5) {
      alert('Por favor ingresa un ID (UID) de Free Fire válido en la parte superior.');
      if (topSectionRef.current) topSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (!playerData || !playerData.nickname) {
      alert('Por favor valida primero el ID de jugador antes de continuar.');
      if (topSectionRef.current) topSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (!hasSufficientBalance) {
      alert('Saldo insuficiente en tu billetera. Por favor recarga saldo antes de continuar.');
      navigate('/profile?tab=wallet');
      return;
    }

    setIsProcessing(true);

    try {
      const likesToAdd = Number(selectedPackage.quantity);
      const deliveryTime = selectedPackage.deliveryDays;
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
          mode: 'fixed',
          target_uid: targetUid.trim(),
          player_nickname: playerNick,
          player_level: playerData.level,
          likes_before: likesBefore,
          likes_to_add: likesToAdd,
          target_likes_final: targetLikesFinal,
          region: playerData.region || 'US',
          delivery_estimated: deliveryTime,
          dispatch_mode: dispatchResult.mode || 'MANUAL'
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
            products: {
              name: `Paquete de ${likesToAdd.toLocaleString()} Likes Free Fire`,
              image_url: selectedPackage?.imageUrl || '/likes-badge.jpg'
            }
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
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
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
        /* SUCCESS RECEIPT CARD */
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
                <span>👑</span> {orderSuccess.playerNick}
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
          {/* ========================================================================= */}
          {/* PASO 1: VERIFICACIÓN DE ID EN LA PARTE SUPERIOR DE LA PANTALLA */}
          {/* ========================================================================= */}
          <div ref={topSectionRef} style={{ marginBottom: '24px', scrollMarginTop: '20px' }}>
            <div className="glass-panel" style={{
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              border: '1px solid var(--border-cyan)',
              background: 'linear-gradient(135deg, rgba(13, 17, 26, 0.95) 0%, rgba(30, 58, 138, 0.25) 100%)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--accent-cyan)', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎯</span> PASO 1: VERIFICA TU CUENTA (UID DE FREE FIRE)
                </div>
                <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: '800', background: 'rgba(52, 211, 153, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                  ⚡ Validación en Vivo Oficial
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Ingresa tu ID / UID (Ej. 29386038)"
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
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: '#0d111a',
                    border: validationError ? '1px solid #f87171' : (playerData ? '1px solid #34d399' : '1px solid var(--border-glass)'),
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: '800',
                    letterSpacing: '0.04em'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleValidateUid()}
                  disabled={isValidating}
                  className="btn-cyan"
                  style={{ padding: '0 20px', fontSize: '0.88rem', fontWeight: '800', whiteSpace: 'nowrap' }}
                >
                  {isValidating ? 'Validando...' : '🔍 Validar UID'}
                </button>
              </div>

              {validationError && (
                <div style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '8px', fontWeight: '600' }}>
                  ⚠️ {validationError}
                </div>
              )}

              {isValidating && (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>
                  <div className="spinner-medium" style={{ margin: '0 auto 8px auto' }} />
                  Consultando base de datos oficial de Free Fire...
                </div>
              )}

              {/* CARD DE JUGADOR VERIFICADO (BIEN DISTRIBUIDA SIN RECORTES) */}
              {playerData && !isValidating && (
                <div style={{
                  marginTop: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid #34d399',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>✓ CUENTA OFICIAL VERIFICADA</span>
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#fff', letterSpacing: '0.02em', marginTop: '2px' }}>
                        {playerData.nickname}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: '700' }}>
                        UID: {targetUid.trim()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', padding: '4px 10px', borderRadius: '6px', fontWeight: '800', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                        ⭐ Nivel {playerData.level}
                      </span>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', padding: '4px 10px', borderRadius: '6px', fontWeight: '800', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                        👍 {playerData.liked.toLocaleString()} Likes
                      </span>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.08)', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontWeight: '800' }}>
                        🌎 Región: {playerData.region}
                      </span>
                    </div>
                  </div>

                  {/* Likes Progression Summary */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    padding: '10px',
                    textAlign: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '700' }}>LIKES ACTUALES</div>
                      <div style={{ fontSize: '1rem', fontWeight: '900', color: '#fff' }}>{playerData.liked.toLocaleString()} ❤️</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', fontWeight: '700' }}>A AÑADIR</div>
                      <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--accent-cyan)' }}>+{Number(selectedPackage?.quantity || 2000).toLocaleString()} ⚡</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: '700' }}>META FINAL</div>
                      <div style={{ fontSize: '1rem', fontWeight: '900', color: '#34d399' }}>{(playerData.liked + Number(selectedPackage?.quantity || 2000)).toLocaleString()} 🎯</div>
                    </div>
                  </div>

                  {/* Top Action Box: Buy Button or WhatsApp Quote Button */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <button
                      onClick={handleProceedPayment}
                      disabled={isProcessing || !hasSufficientBalance}
                      className="btn-cyan"
                      style={{
                        flex: 1,
                        padding: '14px 20px',
                        fontSize: '0.95rem',
                        fontWeight: '900',
                        letterSpacing: '0.03em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        minWidth: '220px'
                      }}
                    >
                      {isProcessing
                        ? 'Procesando Envío de Likes...'
                        : !hasSufficientBalance
                        ? 'Saldo Insuficiente (Recargar Billetera)'
                        : `💎 Comprar ${selectedPackage?.title} ($${currentPriceUsdt.toFixed(2)} USDT)`}
                    </button>

                    {selectedPackage?.whatsappBtnEnabled && (
                      <button
                        onClick={() => handleWhatsAppQuote(selectedPackage)}
                        style={{
                          padding: '14px 18px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.9rem',
                          fontWeight: '800',
                          background: '#25D366',
                          color: '#000',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>📲 Cotizar por WhatsApp</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PASO 2: SELECCIONA TU PAQUETE DE LIKES */}
          {/* ========================================================================= */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--accent-cyan)', letterSpacing: '0.04em' }}>
                PASO 2: SELECCIONA LA CANTIDAD DE LIKES
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Toca cualquier paquete para seleccionarlo
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {packagesList.map((pkg) => {
                const isSelected = selectedPackage?.id === pkg.id;

                return (
                  <div
                    key={pkg.id}
                    onClick={() => handleSelectPackage(pkg)}
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
                      gap: '14px'
                    }}
                  >
                    {/* Left: Custom Photo Container (with working default fallback) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '54px',
                        height: '54px',
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
                        <img
                          src={pkg.imageUrl || '/likes-badge.jpg'}
                          alt={pkg.title}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/likes-badge.jpg';
                          }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>

                      {/* Title, Delivery & Badge */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#fff', letterSpacing: '0.03em' }}>
                            {pkg.title}
                          </span>
                          {pkg.badge && (
                            <span style={{
                              fontSize: '0.68rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'rgba(251, 191, 36, 0.15)',
                              color: '#fbbf24',
                              fontWeight: '800',
                              border: '1px solid rgba(251, 191, 36, 0.3)'
                            }}>
                              {pkg.badge}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)', fontWeight: '700', marginTop: '2px' }}>
                          ⏱️ Entrega: {pkg.deliveryDays}
                        </div>
                      </div>
                    </div>

                    {/* Right: Price & WhatsApp Button if active */}
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#34d399', letterSpacing: '0.02em' }}>
                        {formatPrice(pkg.priceUsdt)}
                      </div>
                      {currency !== 'USDT' && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          (${pkg.priceUsdt.toFixed(2)} USDT)
                        </div>
                      )}

                      {pkg.whatsappBtnEnabled && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWhatsAppQuote(pkg);
                          }}
                          style={{
                            marginTop: '4px',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            background: '#25D366',
                            color: '#000',
                            fontWeight: '800',
                            fontSize: '0.72rem',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>📲 Cotizar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PASO 3: RESUMEN DE COMPRA & PAGO */}
          {/* ========================================================================= */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>TU SALDO EN BILLETERA:</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: hasSufficientBalance ? 'var(--accent-cyan)' : '#f87171' }}>
                  ${walletBalance.toFixed(2)} USDT <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({formatPrice(walletBalance)})</span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>TOTAL DE ESTE PAQUETE:</div>
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

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleProceedPayment}
                disabled={isProcessing || !hasSufficientBalance || !playerData}
                className="btn-cyan"
                style={{
                  flex: 1,
                  padding: '16px',
                  fontSize: '1rem',
                  fontWeight: '900',
                  letterSpacing: '0.04em',
                  minWidth: '220px'
                }}
              >
                {isProcessing
                  ? 'Procesando Envío de Likes...'
                  : !playerData
                  ? '👆 Valida tu UID Arriba para Continuar'
                  : !hasSufficientBalance
                  ? 'Saldo Insuficiente (Recarga tu Billetera)'
                  : `💎 Comprar ${selectedPackage?.title} ($${currentPriceUsdt.toFixed(2)} USDT)`}
              </button>

              {selectedPackage?.whatsappBtnEnabled && (
                <button
                  type="button"
                  onClick={() => handleWhatsAppQuote(selectedPackage)}
                  style={{
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: '#25D366',
                    color: '#000',
                    fontWeight: '900',
                    fontSize: '0.95rem',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>📲 Comprar por WhatsApp</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
