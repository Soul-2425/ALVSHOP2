import React, { useState, useEffect } from 'react';
import { createBinancePayOrder, queryBinancePayOrder, completeBinancePayment, processGameRecharge } from '../../notificaciones y apis/apis/index';
import { soundEffects } from '../services/soundEffects';
import { useApp } from '../context/AppContext';
import { notifyOrderCompleted, notifyAdminNewOrder } from '../../notificaciones y apis/notificaciones/pushService';
import { supabase } from '../supabaseClient';

export default function BinancePayModal({
  isOpen,
  onClose,
  orderData,
  amountUsdt,
  description = 'Recarga ALVSHOP',
  isWalletDeposit = false,
  onPaymentSuccess
}) {
  const { user, fetchProfile, config } = useApp();
  const [loading, setLoading] = useState(true);
  const [payOrder, setPayOrder] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutos
  const [status, setStatus] = useState('PENDING'); // 'PENDING', 'VERIFYING', 'PAID', 'EXPIRED'
  const [copiedId, setCopiedId] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [rechargeStatus, setRechargeStatus] = useState(null);
  const [userTxId, setUserTxId] = useState('');
  const [isManualConfirming, setIsManualConfirming] = useState(false);

  const binancePayId = config?.binance_pay_id || '527653920';
  const binanceName = config?.binance_name || 'AlvJona';
  const binanceQr = config?.binance_qr_url || '/binance-qr.jpg';

  // Inicializar orden de Binance Pay
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function initBinance() {
      setLoading(true);
      setStatus('PENDING');
      setTimeLeft(15 * 60);
      setRechargeStatus(null);
      setUserTxId('');

      try {
        const orderId = orderData?.id || `DEP-${Date.now()}`;
        const res = await createBinancePayOrder({
          orderId: orderId,
          amount: amountUsdt,
          currency: 'USDT',
          description: description,
          customerEmail: user?.email || ''
        });

        if (isMounted && res.success) {
          setPayOrder(res);
        }
      } catch (err) {
        console.error('Error iniciando Binance Pay:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initBinance();

    return () => {
      isMounted = false;
    };
  }, [isOpen, orderData, amountUsdt, description, user]);

  // Contador regresivo
  useEffect(() => {
    if (!isOpen || status === 'PAID') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus('EXPIRED');
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, status]);

  // Polling automático de verificación de pago cada 4 segundos
  useEffect(() => {
    if (!isOpen || !payOrder || status === 'PAID' || status === 'EXPIRED') return;

    const interval = setInterval(async () => {
      try {
        const check = await queryBinancePayOrder(payOrder.prepayId, payOrder.merchantTradeNo);
        if (check && check.status === 'PAID') {
          handleConfirmSuccess(check.transactionId || 'BPAY-' + Date.now());
        }
      } catch (err) {
        console.warn('Error verificando pago:', err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, payOrder, status]);

  // Procesar pago y disparar API del Proveedor de Recargas
  const handleConfirmSuccess = async (txId) => {
    if (status === 'PAID') return;
    setStatus('PAID');
    soundEffects.playBinancePaidSound();

    const finalOrderId = orderData?.id || null;

    // 1. Acreditar pago en Supabase
    await completeBinancePayment({
      orderId: finalOrderId,
      userId: user?.id,
      amount: amountUsdt,
      binanceTxId: txId,
      isWalletDeposit: isWalletDeposit
    });

    // 2. Si no es depósito simple de billetera, disparar API de recarga con el proveedor y descontar stock
    if (!isWalletDeposit && finalOrderId) {
      try {
        const { data: orderItems } = await supabase.from('order_items').select('product_id, quantity').eq('order_id', finalOrderId);
        if (orderItems) {
          for (const it of orderItems) {
            if (it.product_id) {
              const { data: curP } = await supabase.from('products').select('stock').eq('id', it.product_id).single();
              if (curP) {
                const newStock = Math.max(0, (curP.stock || 0) - (it.quantity || 1));
                await supabase.from('products').update({ stock: newStock }).eq('id', it.product_id);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Error descontando stock:', e);
      }

      let parsedNotes = {};
      try {
        parsedNotes = typeof orderData.customer_notes === 'string' ? JSON.parse(orderData.customer_notes) : orderData.customer_notes || {};
      } catch (e) {}

      const rechargeResult = await processGameRecharge({
        order_id: finalOrderId,
        uid: parsedNotes['ID de Jugador (UID)'] || parsedNotes.uid || '',
        nickname: parsedNotes.nickname || parsedNotes.validated_nickname || '',
        product_name: description || 'Recarga Digital',
        total_usdt: amountUsdt
      });

      setRechargeStatus(rechargeResult);

      if (rechargeResult?.mappedData?.supplier_transaction_id) {
        await supabase
          .from('orders')
          .update({
            bank_receipt_url: `BINANCE_PAY:${txId} | SUPPLIER:${rechargeResult.mappedData.supplier_transaction_id}`
          })
          .eq('id', finalOrderId);
      }

      if (user?.id) {
        notifyOrderCompleted({
          orderId: finalOrderId,
          userId: user.id,
          product: description || 'Recarga de Diamantes',
          amount: amountUsdt
        });
      }

      notifyAdminNewOrder({
        orderId: finalOrderId,
        amount: amountUsdt,
        customerName: user?.email || 'Cliente',
        paymentMethod: 'Binance Pay (USDT)'
      });
    }

    if (user?.id) {
      fetchProfile(user.id);
    }

    if (onPaymentSuccess) {
      onPaymentSuccess({ amount: amountUsdt, txId });
    }
  };

  const handleManualCustomerConfirm = async (e) => {
    e.preventDefault();
    setIsManualConfirming(true);
    const confirmedTxId = userTxId.trim() || `BPAY-MANUAL-${Date.now()}`;
    await handleConfirmSuccess(confirmedTxId);
    setIsManualConfirming(false);
  };

  const formatMinutes = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const copyPayId = () => {
    navigator.clipboard.writeText(binancePayId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const copyAmount = () => {
    navigator.clipboard.writeText(Number(amountUsdt).toFixed(2));
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const dynamicDeeplink = `${(config?.binance_deeplink_url || 'https://app.binance.com/uni-qr/T567z1pn')}?amount=${Number(amountUsdt).toFixed(2)}&currency=USDT&note=${encodeURIComponent(`ALVSHOP-${orderData?.id?.slice(0, 8) || ''}`)}`;

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      backgroundColor: 'rgba(3, 7, 18, 0.88)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div className="glass-panel animate-fade" style={{
        width: '100%',
        maxWidth: '440px',
        maxHeight: '95vh',
        overflowY: 'auto',
        borderRadius: '24px',
        border: '1px solid rgba(6, 182, 212, 0.4)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85), 0 0 35px rgba(6, 182, 212, 0.2)',
        background: 'linear-gradient(180deg, #0d1322 0%, #080c16 100%)',
        padding: '24px 20px',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid var(--border-glass)',
            color: 'var(--text-muted)',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          ✕
        </button>

        {/* Top Official Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '18px', paddingTop: '4px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '4px'
          }}>
            {/* Binance Official Diamond Icon */}
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <path d="M16 0L20.8 4.8L8 17.6L3.2 12.8L16 0Z" fill="#F0B90B" />
              <path d="M28.8 12.8L32 16L27.2 20.8L24 17.6L28.8 12.8Z" fill="#F0B90B" />
              <path d="M16 9.6L20.8 14.4L16 19.2L11.2 14.4L16 9.6Z" fill="#F0B90B" />
              <path d="M3.2 19.2L8 24L20.8 11.2L25.6 16L16 25.6L3.2 12.8" fill="#F0B90B" />
              <path d="M16 22.4L20.8 27.2L16 32L11.2 27.2L16 22.4Z" fill="#F0B90B" />
            </svg>
            <span style={{
              fontSize: '1.4rem',
              fontWeight: '900',
              letterSpacing: '0.12em',
              color: '#F0B90B',
              textTransform: 'uppercase'
            }}>
              BINANCE
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: '700', letterSpacing: '0.04em' }}>
            PASARELA OFICIAL DE PAGO ALVSHOP
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Conectando con Binance Pay...</p>
          </div>
        ) : status === 'PAID' ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>🎉</div>
            <h3 style={{ color: '#10b981', fontSize: '1.3rem', marginBottom: '6px' }}>¡Pago Confirmado con Éxito!</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Se han verificado <strong>${Number(amountUsdt).toFixed(2)} USDT</strong> para tu cuenta.
            </p>
            
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              marginBottom: '20px',
              fontSize: '0.85rem'
            }}>
              <div style={{ fontWeight: '700', color: '#10b981' }}>
                🚀 Despacho Automático Activado
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {rechargeStatus?.message || 'Tu recarga ha sido procesada de inmediato con el proveedor.'}
              </div>
              {rechargeStatus?.mappedData?.supplier_transaction_id && (
                <div style={{ fontSize: '0.75rem', marginTop: '4px', color: '#6ee7b7' }}>
                  ID Proveedor: {rechargeStatus.mappedData.supplier_transaction_id}
                </div>
              )}
            </div>

            <button className="btn-cyan" onClick={onClose} style={{ width: '100%' }}>
              Finalizar y Ver Pedido ➔
            </button>
          </div>
        ) : status === 'EXPIRED' ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⏳</div>
            <h3 style={{ color: '#ef4444', fontSize: '1.2rem', marginBottom: '6px' }}>Orden de Pago Expirada</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              El tiempo límite de 15 minutos para completar el pago ha concluido.
            </p>
            <button className="btn-cyan" onClick={onClose} style={{ width: '100%' }}>
              Cerrar y Reintentar
            </button>
          </div>
        ) : (
          <div>
            
            {/* Main Cyber Scan Card (Layout matching Binance QR) */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '18px',
              padding: '20px 16px',
              marginBottom: '16px',
              textAlign: 'center',
              boxShadow: 'inset 0 0 20px rgba(6, 182, 212, 0.05)'
            }}>
              <h4 style={{
                fontSize: '0.92rem',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '14px',
                letterSpacing: '0.01em'
              }}>
                Escanea con la app de Binance para pagar
              </h4>

              {/* White QR Code Container with Center Binance Logo */}
              <div style={{
                display: 'inline-block',
                background: '#ffffff',
                padding: '10px',
                borderRadius: '16px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)',
                position: 'relative',
                marginBottom: '12px'
              }}>
                <img
                  src={binanceQr}
                  alt="Código QR Oficial Binance Pay"
                  style={{
                    width: '185px',
                    height: '185px',
                    objectFit: 'contain',
                    display: 'block',
                    borderRadius: '8px'
                  }}
                />
              </div>

              {/* Account Receiver Name */}
              <div style={{
                fontSize: '1.05rem',
                fontWeight: '900',
                color: '#ffffff',
                letterSpacing: '0.04em'
              }}>
                {binanceName}
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '4px',
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'rgba(240, 185, 11, 0.12)',
                border: '1px solid rgba(240, 185, 11, 0.3)',
                fontSize: '0.72rem',
                color: '#F0B90B',
                fontWeight: '800'
              }}>
                <span>ID: {binancePayId}</span>
                <button
                  type="button"
                  onClick={copyPayId}
                  style={{ background: 'none', border: 'none', color: copiedId ? '#10b981' : '#F0B90B', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '800' }}
                >
                  {copiedId ? '✓ Copiado' : '📋 Copiar'}
                </button>
              </div>
            </div>

            {/* Exact Locked Amount Banner with 1-Click Copy */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(240, 185, 11, 0.1) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              borderRadius: '14px',
              padding: '12px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Monto Exacto Bloqueado:</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>${Number(amountUsdt).toFixed(2)}</span>
                  <span style={{ fontSize: '0.8rem', color: '#F0B90B' }}>USDT</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <button
                  type="button"
                  onClick={copyAmount}
                  style={{
                    background: copiedAmount ? '#10b981' : 'rgba(6, 182, 212, 0.2)',
                    color: copiedAmount ? '#fff' : 'var(--accent-cyan)',
                    border: '1px solid var(--accent-cyan)',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {copiedAmount ? '✅ Copiado' : '📋 Copiar Monto'}
                </button>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  ⏱️ Expira en {formatMinutes(timeLeft)}
                </div>
              </div>
            </div>

            {/* Direct Open in App Button & Deeplink */}
            <a
              href={dynamicDeeplink}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #F0B90B 0%, #d97706 100%)',
                color: '#000',
                padding: '12px 16px',
                borderRadius: '12px',
                fontWeight: '900',
                fontSize: '0.88rem',
                textDecoration: 'none',
                textAlign: 'center',
                boxShadow: '0 0 20px rgba(240, 185, 11, 0.35)',
                marginBottom: '14px'
              }}
            >
              <span>🟡</span> Abrir App de Binance (${Number(amountUsdt).toFixed(2)} USDT) ➔
            </a>

            {/* Bottom Card Footer Matching Binance Visual */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-glass)',
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '14px'
            }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: '#0d111a',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                flexShrink: 0
              }}>
                📱
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#fff' }}>
                  Paga en cualquier lugar
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Abre tu cámara o app de Binance para escanear y pagar al instante
                </div>
              </div>
            </div>

            {/* Customer Manual Confirm Form */}
            <form onSubmit={handleManualCustomerConfirm} style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-glass)',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                ¿Ya completaste la transferencia? Ingresa tu TxID o Pay ID (Opcional):
              </label>
              <input
                type="text"
                placeholder="Ej. 527653920 o TxID de Binance"
                value={userTxId}
                onChange={(e) => setUserTxId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: '#0d111a',
                  border: '1px solid var(--border-glass)',
                  color: '#fff',
                  fontSize: '0.8rem'
                }}
              />
              <button
                type="submit"
                disabled={isManualConfirming}
                className="btn-cyan"
                style={{
                  padding: '10px',
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                  border: 'none',
                  color: '#000',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                {isManualConfirming ? 'Verificando...' : '✅ Ya Realicé el Pago en Binance ➔'}
              </button>
            </form>

            {/* Trade Reference Footer */}
            <div style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '10px',
              paddingTop: '8px',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <div>Ref: <span style={{ color: 'var(--accent-cyan)' }}>{payOrder?.merchantTradeNo || orderData?.id}</span></div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(payOrder?.merchantTradeNo || orderData?.id || '');
                  setCopiedRef(true);
                  setTimeout(() => setCopiedRef(false), 2000);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '0.7rem' }}
              >
                {copiedRef ? '✓ Copiado' : 'Copiar Ref'}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
