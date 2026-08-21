import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import { validatePlayerUid, processGameRecharge } from '../../notificaciones y apis/apis/index';
import { notifyAdminNewOrder, notifyOrderCompleted } from '../../notificaciones y apis/notificaciones/pushService';
import BinancePayModal from '../components/BinancePayModal';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatPrice, user, profile, walletBalance, currency, exchangeRate, config } = useApp();

  const [product, setProduct] = useState(null);
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Live UID Validation state (For Free Fire / Games)
  const [validatingUid, setValidatingUid] = useState(false);
  const [playerNickname, setPlayerNickname] = useState(null);
  const [playerLevel, setPlayerLevel] = useState(null);
  const [playerRegion, setPlayerRegion] = useState(null);
  const [validationError, setValidationError] = useState('');

  // Checkout modal
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Wallet'); // 'Wallet', 'Manual', 'Binance'
  const [receiptFile, setReceiptFile] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [showBinanceModal, setShowBinanceModal] = useState(false);
  const [createdOrderForBinance, setCreatedOrderForBinance] = useState(null);

  // New Review Form
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    async function loadProductData() {
      setLoading(true);

      // 1. Fetch Product
      const { data: prodData } = await supabase
        .from('products')
        .select('*, subcategories(name, categories(name))')
        .eq('id', id)
        .single();

      if (prodData) {
        setProduct(prodData);
      } else {
        // Sample fallback product
        setProduct({
          id: id,
          name: '100 + 10 Diamantes Free Fire (Directo UID)',
          description: 'Recarga rápida directa a tu cuenta de Free Fire por UID. Entrega 100% garantizada en minutos. Compatible con servidores de Latinoamérica (LATAM).',
          price_public: 1.10,
          price_reseller: 0.95,
          stock: 999,
          requires_validation: true,
          validation_type: 'Free Fire',
          button_action_text: 'Solicitar',
          image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=700&auto=format&fit=crop&q=80'
        });
      }

      // 2. Fetch Form Fields
      const { data: fieldsData } = await supabase
        .from('product_fields')
        .select('*')
        .eq('product_id', id)
        .order('sort_order');

      if (fieldsData && fieldsData.length > 0) {
        setFields(fieldsData);
      } else if (id.includes('ff') || id === 'sample-ff-100') {
        setFields([
          { id: 'f1', field_name: 'ID de Jugador (UID)', field_type: 'text', is_required: true },
          { id: 'f2', field_name: 'Región / Servidor', field_type: 'text', is_required: true }
        ]);
      }

      // 3. Fetch Reviews
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*, profiles(full_name)')
        .eq('product_id', id)
        .order('created_at', { ascending: false });

      if (reviewsData && reviewsData.length > 0) {
        setReviews(reviewsData);
      } else {
        setReviews([
          { id: 'r1', rating: 5, comment: 'Llegó en menos de 2 minutos, excelente servicio ALVSHOP!', profiles: { full_name: 'Carlos M.' }, created_at: '2026-08-18T10:00:00Z' },
          { id: 'r2', rating: 5, comment: 'Súper confiable para revendedores, precios top.', profiles: { full_name: 'GamerGT' }, created_at: '2026-08-17T15:30:00Z' }
        ]);
      }

      setLoading(false);
    }

    loadProductData();
  }, [id]);

  // Handle Free Fire UID Real-time validation
  const handleUidValidation = async (uidValue) => {
    if (!uidValue || uidValue.length < 5) {
      setPlayerNickname(null);
      setPlayerLevel(null);
      setPlayerRegion(null);
      setValidationError('');
      return;
    }

    setValidatingUid(true);
    setValidationError('');

    try {
      // Calls Free Fire UID validation service
      const result = await validatePlayerUid(uidValue, product?.validation_type || 'Free Fire');
      if (result.success && result.nickname) {
        setPlayerNickname(result.nickname);
        setPlayerLevel(result.account_level || 50);
        setPlayerRegion(result.region || 'LATAM');
        setValidationError('');
      } else {
        setPlayerNickname(null);
        setValidationError(result.error || 'ID de jugador no encontrado');
      }
    } catch (err) {
      setValidationError('Error conectando con la API de validación');
    } finally {
      setValidatingUid(false);
    }
  };

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));

    // Check if this is the UID field
    if (fieldName.toLowerCase().includes('uid') || fieldName.toLowerCase().includes('id')) {
      handleUidValidation(value);
    }
  };

  // Coupon Verification
  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponCode) return;

    try {
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase().trim())
        .eq('is_active', true)
        .single();

      if (error || !coupon) {
        setCouponError('Cupón inválido o inactivo');
        return;
      }

      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        setCouponError('Este cupón ha vencido');
        return;
      }

      setAppliedCoupon(coupon);
    } catch (err) {
      setCouponError('Error al validar cupón');
    }
  };

  // Calculate Final Order Totals
  const rawPriceUsdt = Number(product?.price_public || 0);
  let discountUsdt = 0;

  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'percentage') {
      discountUsdt = (rawPriceUsdt * appliedCoupon.discount_value) / 100;
    } else {
      discountUsdt = Number(appliedCoupon.discount_value);
    }
  }

  const finalPriceUsdt = Math.max(0, rawPriceUsdt - discountUsdt);
  const finalPriceGtq = (finalPriceUsdt * exchangeRate).toFixed(2);

  // Submit Order Checkout
  const handleProceedPayment = async () => {
    if (!user) {
      navigate('/profile');
      return;
    }

    setIsProcessing(true);

    try {
      // If Binance Pay selected, create pending order and launch modal
      if (paymentMethod === 'Binance') {
        const { data: orderData, error: orderErr } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            total_usdt: finalPriceUsdt,
            total_gtq: Number(finalPriceGtq),
            status: 'Pending',
            payment_method: 'Manual',
            coupon_id: appliedCoupon?.id || null,
            discount_amount_usdt: discountUsdt,
            customer_notes: JSON.stringify({ ...formData, payment_gateway: 'Binance Pay' })
          })
          .select()
          .single();

        if (orderErr) throw orderErr;

        await supabase.from('order_items').insert({
          order_id: orderData.id,
          product_id: product.id,
          quantity: 1,
          price_usdt: finalPriceUsdt,
          cost_usdt: product.cost || 0,
          fields_data: {
            ...formData,
            validated_nickname: playerNickname || ''
          }
        });

        // Notify Admins
        notifyAdminNewOrder({
          orderId: orderData.id,
          amount: finalPriceUsdt,
          customerName: profile?.full_name || user.email,
          paymentMethod: 'Binance Pay'
        });

        setCreatedOrderForBinance(orderData);
        setShowCheckout(false);
        setShowBinanceModal(true);
        return;
      }

      // 1. Create Order in Supabase
      const newOrderStatus = paymentMethod === 'Wallet' ? 'Completed' : 'Verification';

      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_usdt: finalPriceUsdt,
          total_gtq: Number(finalPriceGtq),
          status: newOrderStatus,
          payment_method: paymentMethod,
          coupon_id: appliedCoupon?.id || null,
          discount_amount_usdt: discountUsdt,
          customer_notes: JSON.stringify(formData)
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      // 2. Create Order Item
      await supabase.from('order_items').insert({
        order_id: orderData.id,
        product_id: product.id,
        quantity: 1,
        price_usdt: finalPriceUsdt,
        cost_usdt: product.cost || 0,
        fields_data: {
          ...formData,
          validated_nickname: playerNickname || ''
        }
      });

      // 3. If Paid with Wallet, deduct balance
      if (paymentMethod === 'Wallet') {
        const newBal = walletBalance - finalPriceUsdt;
        await supabase.from('profiles').update({ wallet_balance: newBal }).eq('id', user.id);
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'Purchase',
          amount_usdt: finalPriceUsdt,
          order_id: orderData.id
        });

        // Instant notification to customer
        notifyOrderCompleted({ orderId: orderData.id, userId: user.id, amount: finalPriceUsdt });

        // Trigger Supplier automated recharge
        processGameRecharge({
          id: orderData.id,
          uid: formData['ID de Jugador (UID)'] || formData.uid || '',
          nickname: playerNickname || '',
          product_name: product.name,
          total_usdt: finalPriceUsdt
        });
      }

      // Notify Admins
      notifyAdminNewOrder({
        orderId: orderData.id,
        amount: finalPriceUsdt,
        customerName: profile?.full_name || user.email,
        paymentMethod: paymentMethod === 'Wallet' ? 'Billetera ALV' : 'Transferencia GTQ'
      });

      setOrderSuccess(orderData);
    } catch (err) {
      alert('Error al procesar el pedido: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit Review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Debes iniciar sesión para dejar una reseña.');
      return;
    }
    setSubmittingReview(true);
    try {
      const { data, error } = await supabase.from('reviews').insert({
        product_id: product.id,
        user_id: user.id,
        rating: newRating,
        comment: newComment
      }).select('*, profiles(full_name)').single();

      if (data && !error) {
        setReviews(prev => [data, ...prev]);
        setNewComment('');
        alert('¡Gracias por tu reseña!');
      }
    } catch (err) {
      alert('Error guardando reseña');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading || !product) {
    return <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>Cargando producto...</div>;
  }

  const defaultBank = config.bank_accounts?.[0] || {
    bank: 'Banrural',
    account_number: '4313076359',
    type: 'Ahorro',
    name: 'Jonathan Alvares'
  };

  return (
    <div className="container" style={{ paddingTop: '20px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
        <Link to="/" style={{ color: 'var(--accent-cyan)' }}>Inicio</Link>
        <span>/</span>
        <span>{product.subcategories?.categories?.name || 'Gaming'}</span>
        <span>/</span>
        <span style={{ color: 'var(--text-main)' }}>{product.name}</span>
      </div>

      {/* Main Product Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px', marginBottom: '40px' }}>
        {/* Left: Product Image Showcase */}
        <div className="glass-panel" style={{
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          padding: '16px',
          border: '1px solid var(--border-glass)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <img
            src={product.image_url}
            alt={product.name}
            style={{ width: '100%', maxHeight: '340px', objectFit: 'contain', borderRadius: 'var(--radius-md)' }}
          />
        </div>

        {/* Right: Info & Form Builder */}
        <div className="glass-panel" style={{
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          border: '1px solid var(--border-cyan)'
        }}>
          <div className="badge-cyan" style={{ marginBottom: '8px' }}>
            {product.subcategories?.name || 'Recarga Inmediata'}
          </div>
          <h1 style={{ fontSize: '1.6rem', marginBottom: '8px', lineHeight: 1.25 }}>
            {product.name}
          </h1>

          <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
            {formatPrice(product.price_public)}
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: 1.6 }}>
            {product.description}
          </p>

          {/* Dynamic Form Builder (UID, PIN, Account fields) */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            border: '1px solid var(--border-glass)',
            marginBottom: '20px'
          }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📝</span> Datos para la Recarga / Entrega
            </h4>

            {fields.map((field) => (
              <div key={field.id} style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600' }}>
                  {field.field_name} {field.is_required && <span style={{ color: '#f87171' }}>*</span>}
                </label>
                <input
                  type={field.field_type || 'text'}
                  required={field.is_required}
                  placeholder={`Ingresa tu ${field.field_name}`}
                  value={formData[field.field_name] || ''}
                  onChange={(e) => handleInputChange(field.field_name, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#0d111a',
                    border: '1px solid var(--border-glass)',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            ))}

            {/* Live Nickname Validation Alert (Free Fire) */}
            {validatingUid && (
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', marginTop: '8px' }}>
                🔍 Consultando Nickname en tiempo real...
              </div>
            )}

            {playerNickname && (
              <div style={{
                marginTop: '10px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                fontSize: '0.85rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>✅</span> Jugador Verificado: <span style={{ color: '#fff' }}>{playerNickname}</span>
              </div>
            )}

            {validationError && (
              <div style={{
                marginTop: '10px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.8rem'
              }}>
                ⚠️ {validationError}
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={() => setShowCheckout(true)}
            className="btn-cyan"
            style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
          >
            {product.button_action_text || 'Comprar Ahora'} ➔
          </button>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="glass-panel" style={{
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        border: '1px solid var(--border-glass)',
        marginBottom: '40px'
      }}>
        <h3 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⭐</span> Reseñas y Calificaciones de Clientes
        </h3>

        {/* Leave a review form */}
        <form onSubmit={handleSubmitReview} style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-glass)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Deja tu comentario sobre este producto:</h4>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Calificación:</span>
            <select
              value={newRating}
              onChange={(e) => setNewRating(Number(e.target.value))}
              style={{
                background: '#0d111a',
                color: '#fbbf24',
                border: '1px solid var(--border-glass)',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: '700'
              }}
            >
              <option value="5">★★★★★ (5 Estrellas)</option>
              <option value="4">★★★★☆ (4 Estrellas)</option>
              <option value="3">★★★☆☆ (3 Estrellas)</option>
              <option value="2">★★☆☆☆ (2 Estrellas)</option>
              <option value="1">★☆☆☆☆ (1 Estrella)</option>
            </select>
          </div>
          <textarea
            rows="3"
            required
            placeholder="Escribe tu experiencia con la recarga o servicio..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              background: '#0d111a',
              border: '1px solid var(--border-glass)',
              color: '#fff',
              marginBottom: '10px',
              fontSize: '0.85rem'
            }}
          />
          <button type="submit" disabled={submittingReview} className="btn-cyan" style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
            {submittingReview ? 'Publicando...' : 'Publicar Reseña'}
          </button>
        </form>

        {/* Reviews List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reviews.map((r) => (
            <div key={r.id} style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              border: '1px solid var(--border-glass)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
                  {r.profiles?.full_name || 'Cliente ALVSHOP'}
                </div>
                <div style={{ color: '#fbbf24', fontSize: '0.8rem' }}>
                  {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{r.comment}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
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
            maxWidth: '520px',
            maxHeight: '90vh',
            overflowY: 'auto',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            border: '1px solid var(--border-cyan)'
          }}>
            {!orderSuccess ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.25rem' }}>Finalizar Compra</h3>
                  <button onClick={() => setShowCheckout(false)} style={{ background: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                </div>

                {/* Product Summary */}
                <div style={{
                  background: 'rgba(30, 58, 138, 0.2)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '4px' }}>{product.name}</div>
                  {playerNickname && (
                    <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: '600' }}>
                      Nick: {playerNickname}
                    </div>
                  )}
                  <div style={{ fontSize: '1.3rem', fontWeight: '900', color: 'var(--accent-cyan)', marginTop: '8px' }}>
                    ${finalPriceUsdt.toFixed(2)} USDT <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>(Q{finalPriceGtq} GTQ)</span>
                  </div>
                </div>

                {/* Coupon Code Input */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>¿Tienes un cupón de descuento?</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="CÓDIGO"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: '#0d111a',
                        border: '1px solid var(--border-glass)',
                        color: '#fff',
                        fontSize: '0.85rem'
                      }}
                    />
                    <button type="button" onClick={handleApplyCoupon} className="btn-glass" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                      Aplicar
                    </button>
                  </div>
                  {appliedCoupon && (
                    <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px' }}>
                      ✅ Cupón {appliedCoupon.code} aplicado (-${discountUsdt.toFixed(2)} USDT)
                    </div>
                  )}
                  {couponError && (
                    <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '4px' }}>
                      ⚠️ {couponError}
                    </div>
                  )}
                </div>

                {/* Payment Method Selector */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', display: 'block', marginBottom: '8px' }}>Selecciona Método de Pago:</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    <div
                      onClick={() => setPaymentMethod('Wallet')}
                      style={{
                        padding: '12px 8px',
                        borderRadius: 'var(--radius-md)',
                        background: paymentMethod === 'Wallet' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: paymentMethod === 'Wallet' ? '1px solid var(--border-cyan)' : '1px solid var(--border-glass)',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '1.2rem' }}>💎</div>
                      <div style={{ fontSize: '0.78rem', fontWeight: '700', marginTop: '4px' }}>Billetera Interna</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Saldo: ${walletBalance.toFixed(2)}</div>
                    </div>

                    <div
                      onClick={() => setPaymentMethod('Binance')}
                      style={{
                        padding: '12px 8px',
                        borderRadius: 'var(--radius-md)',
                        background: paymentMethod === 'Binance' ? 'rgba(240, 185, 11, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                        border: paymentMethod === 'Binance' ? '1px solid #f0b90b' : '1px solid var(--border-glass)',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '1.2rem' }}>🟡</div>
                      <div style={{ fontSize: '0.78rem', fontWeight: '700', marginTop: '4px', color: '#f0b90b' }}>Binance Pay</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Auto QR / Instantáneo</div>
                    </div>

                    <div
                      onClick={() => setPaymentMethod('Manual')}
                      style={{
                        padding: '12px 8px',
                        borderRadius: 'var(--radius-md)',
                        background: paymentMethod === 'Manual' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: paymentMethod === 'Manual' ? '1px solid var(--border-cyan)' : '1px solid var(--border-glass)',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '1.2rem' }}>🏦</div>
                      <div style={{ fontSize: '0.78rem', fontWeight: '700', marginTop: '4px' }}>Transferencia GTQ</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Banrural / Quetzales</div>
                    </div>
                  </div>
                </div>

                {/* Manual Bank Details (if manual transfer selected) */}
                {paymentMethod === 'Manual' && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                    marginBottom: '20px',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{ fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                      Datos Bancarios para Transferencia:
                    </div>
                    <div><strong>Banco:</strong> {defaultBank.bank}</div>
                    <div><strong>No. Cuenta:</strong> {defaultBank.account_number}</div>
                    <div><strong>Tipo de Cuenta:</strong> {defaultBank.type}</div>
                    <div><strong>Titular:</strong> {defaultBank.name}</div>
                    <div style={{ marginTop: '8px', color: '#fbbf24', fontSize: '0.8rem' }}>
                      Monto a depositar: <strong>Q{finalPriceGtq} GTQ</strong>
                    </div>

                    <div style={{ marginTop: '12px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-muted)' }}>
                        Adjuntar Comprobante de Pago (Foto / Screenshot):
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setReceiptFile(e.target.files[0])}
                        style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
                      />
                    </div>
                  </div>
                )}

                {/* Confirm Button */}
                <button
                  onClick={handleProceedPayment}
                  disabled={isProcessing || (paymentMethod === 'Wallet' && walletBalance < finalPriceUsdt)}
                  className="btn-cyan"
                  style={{ width: '100%', padding: '14px' }}
                >
                  {isProcessing ? 'Procesando...' : (
                    paymentMethod === 'Wallet' && walletBalance < finalPriceUsdt 
                      ? 'Saldo insuficiente en Billetera' 
                      : `Confirmar Pago (${paymentMethod === 'Wallet' ? `$${finalPriceUsdt.toFixed(2)} USDT` : `Q${finalPriceGtq} GTQ`})`
                  )}
                </button>
              </>
            ) : (
              /* Success Screen */
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎉</div>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-cyan)', marginBottom: '8px' }}>¡Pedido Registrado con Éxito!</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  {orderSuccess.status === 'Completed'
                    ? 'Tu recarga ha sido procesada de inmediato.'
                    : 'Tu pedido manual ha pasado a fase de verificación. Un asesor confirmará tu depósito en breve.'}
                </p>

                {/* WhatsApp Notification Shortcut */}
                {config.social_links?.whatsapp && (
                  <a
                    href={`https://wa.me/${config.social_links.whatsapp.replace(/\+/g, '')}?text=${encodeURIComponent(
                      `¡Hola ALVSHOP! Acabo de hacer un pedido de "${product.name}" (ID: ${orderSuccess.id.slice(0, 8)}). Datos: ${JSON.stringify(formData)}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-cyan"
                    style={{ display: 'inline-flex', width: '100%', marginBottom: '12px', background: '#25D366', color: '#fff' }}
                  >
                    💬 Enviar Comprobante por WhatsApp
                  </a>
                )}

                <button
                  onClick={() => {
                    setShowCheckout(false);
                    navigate('/profile');
                  }}
                  className="btn-glass"
                  style={{ width: '100%' }}
                >
                  Ver Estado en Mi Perfil
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Automated Binance Pay Modal */}
      <BinancePayModal
        isOpen={showBinanceModal}
        onClose={() => setShowBinanceModal(false)}
        orderData={createdOrderForBinance}
        amountUsdt={finalPriceUsdt}
        description={product?.name || 'Recarga ALVSHOP'}
        onPaymentSuccess={() => {
          if (createdOrderForBinance?.id) {
            processGameRecharge({
              id: createdOrderForBinance.id,
              uid: formData['ID de Jugador (UID)'] || formData.uid || '',
              nickname: playerNickname || '',
              product_name: product.name,
              total_usdt: finalPriceUsdt
            });
          }
          setShowBinanceModal(false);
          setOrderSuccess({ ...createdOrderForBinance, status: 'Completed' });
          setShowCheckout(true);
        }}
      />
    </div>
  );
}
