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

    // 2. Si no es depósito simple de billetera, disparar API de recarga con el proveedor
    if (!isWalletDeposit && finalOrderId) {
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

      // Guardar ID de transacción del proveedor en el pedido
      if (rechargeResult?.mappedData?.supplier_transaction_id) {
        await supabase
          .from('orders')
          .update({
            bank_receipt_url: `BINANCE_PAY:${txId} | SUPPLIER:${rechargeResult.mappedData.supplier_transaction_id}`
          })
          .eq('id', finalOrderId);
      }

      // Notificación instantánea de entrega al cliente
      if (user?.id) {
        notifyOrderCompleted({
          orderId: finalOrderId,
          userId: user.id,
          product: description || 'Recarga de Diamantes',
          amount: amountUsdt
        });
      }

      // Notificación al Administrador
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
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '480px',
        maxHeight: '94vh',
        overflowY: 'auto',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid #f0b90b',
        boxShadow: '0 0 35px rgba(240, 185, 11, 0.25)',
        padding: '24px',
        position: 'relative',
        animation: 'fadeInUp 0.3s ease'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '1.2rem',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{
            background: '#f0b90b',
            color: '#000',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '900',
            fontSize: '1.1rem'
          }}>
            B
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f0b90b' }}>Pasarela Binance Pay</h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Pago 100% Directo a Cuenta Oficial ALVSHOP
            </div>
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
            {/* Exact Amount Banner with 1-Click Copy */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(240, 185, 11, 0.15) 0%, rgba(30, 58, 138, 0.2) 100%)',
              border: '1px solid rgba(240, 185, 11, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Monto Exacto a Transferir:</div>
                <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#f0b90b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>${Number(amountUsdt).toFixed(2)}</span>
                  <span style={{ fontSize: '0.85rem' }}>USDT</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <button
                  type="button"
                  onClick={copyAmount}
                  style={{
                    background: copiedAmount ? '#10b981' : 'rgba(240, 185, 11, 0.2)',
                    color: copiedAmount ? '#fff' : '#f0b90b',
                    border: '1px solid rgba(240, 185, 11, 0.4)',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {copiedAmount ? '✅ Monto Copiado' : '📋 Copiar Monto'}
                </button>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  ⏱️ {formatMinutes(timeLeft)}
                </div>
              </div>
            </div>

            {/* Anti-Fraud / Price Lock Notice */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              marginBottom: '14px',
              fontSize: '0.73rem',
              color: '#93c5fd',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>🔒</span>
              <span>
                <strong>Monto bloqueado por la tienda:</strong> La recarga solo se despacha si el importe transferido coincide exactamente con <strong>${Number(amountUsdt).toFixed(2)} USDT</strong>.
              </span>
            </div>

            {/* Official Binance Pay ID Box */}
            <div style={{
              background: 'rgba(240, 185, 11, 0.06)',
              border: '1px solid rgba(240, 185, 11, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              marginBottom: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Binance Pay ID (Receptor):</div>
                <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#f0b90b', letterSpacing: '0.05em' }}>
                  {binancePayId}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Titular: <strong style={{ color: '#fff' }}>{binanceName}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={copyPayId}
                className="btn-cyan"
                style={{
                  background: copiedId ? '#10b981' : '#f0b90b',
                  color: '#000',
                  padding: '8px 14px',
                  fontSize: '0.78rem',
                  fontWeight: '800',
                  border: 'none'
                }}
              >
                {copiedId ? '✅ ¡Copiado!' : '📋 Copiar Pay ID'}
              </button>
            </div>

            {/* QR Code */}
            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <div style={{
                display: 'inline-block',
                background: '#0d111a',
                border: '1px solid rgba(240, 185, 11, 0.4)',
                padding: '8px',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                marginBottom: '8px'
              }}>
                <img
                  src={binanceQr}
                  alt="Código QR de Binance Pay"
                  style={{
                    width: '200px',
                    height: '200px',
                    objectFit: 'contain',
                    display: 'block',
                    borderRadius: '6px'
                  }}
                />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Escanea con la app de Binance para transferir <strong>${Number(amountUsdt).toFixed(2)} USDT</strong> a <strong>{binanceName}</strong>
              </div>
            </div>

            {/* Direct Open in App Button & Deeplink */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              <a
                href={dynamicDeeplink}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#f0b90b',
                  color: '#000',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: '900',
                  fontSize: '0.88rem',
                  textDecoration: 'none',
                  textAlign: 'center',
                  boxShadow: '0 0 15px rgba(240, 185, 11, 0.3)'
                }}
              >
                <span>🟡</span> Abrir en App de Binance (${Number(amountUsdt).toFixed(2)} USDT) ➔
              </a>
            </div>

            {/* Customer Manual Confirm Form */}
            <form onSubmit={handleManualCustomerConfirm} style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                ¿Ya enviaste los USDT? Ingresa tu ID de Orden o Pay ID (Opcional):
              </label>
              <input
                type="text"
                placeholder="Ej. 527653920 o TxID de Binance"
                value={userTxId}
                onChange={(e) => setUserTxId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '4px',
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
                  color: '#000'
                }}
              >
                {isManualConfirming ? 'Verificando...' : '✅ Ya Realicé el Pago en Binance ➔'}
              </button>
            </form>

            {/* Trade Info */}
            <div style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '10px',
              paddingTop: '8px',
              borderTop: '1px solid var(--border-glass)'
            }}>
              <div>Ref: <span style={{ color: 'var(--text-main)' }}>{payOrder?.merchantTradeNo || orderData?.id}</span></div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(payOrder?.merchantTradeNo || orderData?.id || '');
                  setCopiedRef(true);
                  setTimeout(() => setCopiedRef(false), 2000);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '0.72rem' }}
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
