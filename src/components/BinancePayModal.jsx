import React, { useState, useEffect } from 'react';
import { createBinancePayOrder, queryBinancePayOrder, completeBinancePayment, processGameRecharge } from '../../notificaciones y apis/apis/index';
import { soundEffects } from '../services/soundEffects';
import { useApp } from '../context/AppContext';
import { notifyOrderCompleted } from '../../notificaciones y apis/notificaciones/pushService';
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
  const { user, fetchProfile } = useApp();
  const [loading, setLoading] = useState(true);
  const [payOrder, setPayOrder] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutos
  const [status, setStatus] = useState('PENDING'); // 'PENDING', 'VERIFYING', 'PAID', 'EXPIRED'
  const [copied, setCopied] = useState(false);
  const [rechargeStatus, setRechargeStatus] = useState(null);

  // Inicializar orden de Binance Pay
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function initBinance() {
      setLoading(true);
      setStatus('PENDING');
      setTimeLeft(15 * 60);
      setRechargeStatus(null);

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
    }

    if (user?.id) {
      await fetchProfile(user.id);
      if (finalOrderId) {
        notifyOrderCompleted({ orderId: finalOrderId, userId: user.id, amount: amountUsdt });
      }
    }

    if (onPaymentSuccess) {
      onPaymentSuccess({ txId, amount: amountUsdt });
    }
  };

  const formatMinutes = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      backgroundColor: 'rgba(0, 0, 0, 0.82)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '460px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid #f0b90b',
        boxShadow: '0 0 35px rgba(240, 185, 11, 0.25)',
        padding: '24px',
        position: 'relative',
        animation: 'fadeInUp 0.3s ease'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: '#f0b90b',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
              fontSize: '1.1rem'
            }}>
              🟡
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f0b90b' }}>Binance Pay Checkout</h3>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cobro & Despacho Automatizado por USDT</div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Generando orden de pago en Binance Pay...</p>
          </div>
        ) : status === 'PAID' ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '12px', animation: 'bounce 0.6s ease' }}>🎉</div>
            <h3 style={{ color: '#10b981', fontSize: '1.3rem', marginBottom: '6px' }}>¡Pago Confirmado & Procesado!</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Tu pago de <strong>${Number(amountUsdt).toFixed(2)} USDT</strong> ha sido acreditado y enviado a procesar con la API del proveedor.
            </p>
            
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid #10b981',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              fontSize: '0.8rem',
              color: '#10b981',
              marginBottom: '16px',
              textAlign: 'left'
            }}>
              <div>✅ Estado del Pago: <strong>PAGADO (USDT)</strong></div>
              <div>⚡ Despacho de Recarga: <strong>{rechargeStatus?.mappedData?.status || 'DELIVERED'}</strong></div>
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
            {/* Amount Banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(240, 185, 11, 0.15) 0%, rgba(30, 58, 138, 0.2) 100%)',
              border: '1px solid rgba(240, 185, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Monto a Pagar:</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#f0b90b' }}>
                  ${Number(amountUsdt).toFixed(2)} <span style={{ fontSize: '0.85rem' }}>USDT</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Expira en:</div>
                <div style={{ fontSize: '1rem', fontWeight: '800', color: timeLeft < 120 ? '#ef4444' : 'var(--text-main)' }}>
                  ⏱️ {formatMinutes(timeLeft)}
                </div>
              </div>
            </div>

            {/* QR Code and App Deep Link */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{
                display: 'inline-block',
                background: '#fff',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                marginBottom: '12px'
              }}>
                <img
                  src={payOrder?.qrContent}
                  alt="Binance Pay QR Code"
                  style={{ width: '180px', height: '180px', display: 'block' }}
                />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Escanea con la app de Binance (Binance Pay)
              </div>
            </div>

            {/* Direct Open in App Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <a
                href={payOrder?.universalUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#f0b90b',
                  color: '#000',
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  textAlign: 'center',
                  boxShadow: '0 0 15px rgba(240, 185, 11, 0.4)'
                }}
              >
                <span>🟡</span> Abrir en App de Binance
              </a>

              {/* Simulated Auto-Verification Button for Testing / Sandbox */}
              <button
                type="button"
                onClick={() => handleConfirmSuccess('BPAY-SIMULATED-' + Date.now())}
                className="btn-glass"
                style={{ fontSize: '0.75rem', padding: '8px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
              >
                ⚡ Simular Aprobación Instantánea (Prueba de Pago y Despacho)
              </button>
            </div>

            {/* Trade Info / Order ID */}
            <div style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border-glass)',
              paddingTop: '10px'
            }}>
              <div>Ref: <span style={{ color: 'var(--text-main)' }}>{payOrder?.merchantTradeNo}</span></div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(payOrder?.merchantTradeNo || '');
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '0.72rem' }}
              >
                {copied ? '✓ Copiado' : 'Copiar Ref'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
