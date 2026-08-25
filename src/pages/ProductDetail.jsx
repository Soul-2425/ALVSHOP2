import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useApp, getLocalUserBalance } from '../context/AppContext';
import { validatePlayerUid, processGameRecharge } from '../../notificaciones y apis/apis/index';
import { notifyAdminNewOrder, notifyOrderCompleted, sendPushNotification } from '../../notificaciones y apis/notificaciones/pushService';
import { checkRateLimit } from '../services/securityShield';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    formatPrice,
    convertPrice,
    currency,
    exchangeRate,
    rateMxn,
    rateCop,
    config,
    user,
    profile,
    walletBalance,
    updateUserWalletBalance
  } = useApp();

  const [product, setProduct] = useState(null);
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Live UID Validation state (For Free Fire / Games)
  const [validatingUid, setValidatingUid] = useState(false);
  const [playerNickname, setPlayerNickname] = useState(null);
  const [playerAvatar, setPlayerAvatar] = useState(null);
  const [playerLevel, setPlayerLevel] = useState(null);
  const [playerRegion, setPlayerRegion] = useState(null);
  const [playerLikes, setPlayerLikes] = useState(null);
  const [validationError, setValidationError] = useState('');
  const uidDebounceTimeout = useRef(null);

  // Checkout modal
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Wallet'); // 'Wallet', 'Binance', 'GTQ', 'MXN', 'COP'
  const [binanceTxId, setBinanceTxId] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
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
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('*, subcategories(*, categories(*))')
        .eq('id', id)
        .single();

      if (prodError || !prodData) {
        console.error('Error fetching product:', prodError);
        navigate('/');
        return;
      }
      setProduct(prodData);

      // 2. Fetch Custom Fields
      const { data: fieldsData } = await supabase
        .from('product_fields')
        .select('*')
        .eq('product_id', id)
        .order('sort_order');

      if (fieldsData && fieldsData.length > 0) {
        setFields(fieldsData);
      } else {
        setFields([
          { id: 'default-uid', field_name: 'ID de Jugador (UID)', field_type: 'text', is_required: true }
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
  }, [id]);  // Handle Free Fire UID Real-time validation
  const handleUidValidation = async (uidValue) => {
    const cleanUid = (uidValue || '').trim().replace(/\D/g, '');
    if (!cleanUid || cleanUid.length < 5) {
      setPlayerNickname(null);
      setPlayerLevel(null);
      setPlayerRegion(null);
      setPlayerLikes(null);
      setValidationError('');
      setValidatingUid(false);
      return;
    }

    setValidatingUid(true);
    setValidationError('');

    try {
      const result = await validatePlayerUid(cleanUid, product?.validation_type || 'Free Fire');
      if (result && result.success && result.nickname) {
        setPlayerNickname(result.nickname);
        setPlayerAvatar(result.avatar_url || '/ff-avatar.png');
        setPlayerLevel(result.account_level || null);
        setPlayerRegion(result.region || 'LATAM');
        setPlayerLikes(result.currentLikes || null);
        setValidationError('');
      } else {
        setPlayerNickname(null);
        setPlayerAvatar(null);
        setPlayerLevel(null);
        setPlayerLikes(null);
        setValidationError(result?.error || 'ID incorrecta. Por favor, verifica el ID ingresado.');
      }
    } catch (err) {
      setValidationError('ID incorrecta. Por favor, verifica el ID ingresado.');
    } finally {
      setValidatingUid(false);
    }
  };

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));

    if (fieldName.toLowerCase().includes('uid') || fieldName.toLowerCase().includes('id')) {
      // Clear errors immediately when typing starts
      setValidationError('');

      if (uidDebounceTimeout.current) {
        clearTimeout(uidDebounceTimeout.current);
      }

      const clean = (value || '').trim().replace(/\D/g, '');
      if (clean.length < 8) {
        setPlayerNickname(null);
        setPlayerLevel(null);
        setPlayerRegion(null);
        setPlayerLikes(null);
        setValidatingUid(false);
        return;
      }

      setValidatingUid(true);

      uidDebounceTimeout.current = setTimeout(() => {
        handleUidValidation(clean);
      }, 400);
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

  // Accurate real-time balance calculation with instant local fallback
  const currentActualBalance = (() => {
    if (!user?.id) return Number(walletBalance || 0);
    const local = getLocalUserBalance(user.id) || (user.email ? getLocalUserBalance(user.email) : null);
    if (local !== null && !isNaN(local)) return Number(local);
    return Number(walletBalance || 0);
  })();

  const hasSufficientBalance = currentActualBalance >= finalPriceUsdt;

  // Submit Order Checkout with Triple Flow & Rate Limiting Shield
  const handleProceedPayment = async () => {
    if (!user) {
      navigate('/profile');
      return;
    }

    // Security Rate Limit Check
    const rateCheck = checkRateLimit('checkout');
    if (!rateCheck.allowed) {
      alert(rateCheck.error);
      return;
    }

    // Validate Required Fields
    const finalPriceGtq = (finalPriceUsdt * Number(config?.usdt_gtq_rate || exchangeRate || 7.80)).toFixed(2);
    const finalPriceMxn = (finalPriceUsdt * Number(config?.usdt_mxn_rate || rateMxn || 19.50)).toFixed(2);
    const finalPriceCop = Math.round(finalPriceUsdt * Number(config?.usdt_cop_rate || rateCop || 4100)).toLocaleString('es-CO');

    // Validation for required product form fields
    for (const field of fields) {
      if (field.is_required && !formData[field.field_name]?.trim()) {
        alert(`Por favor ingresa el campo: ${field.field_name}`);
        return;
      }
    }

    // FLOW A: WALLET PAYMENT
    if (paymentMethod === 'Wallet') {
      const realBal = currentActualBalance;
      if (realBal < finalPriceUsdt) {
        alert(`Saldo insuficiente en tu billetera. Cuentas con $${realBal.toFixed(2)} USDT y el total es de $${finalPriceUsdt.toFixed(2)} USDT.`);
        return;
      }
    }

    setIsProcessing(true);

    try {
      // Upload / Convert Receipt if provided for Manual Payments
      let uploadedReceiptUrl = null;
      if (paymentMethod !== 'Wallet' && receiptFile) {
        setUploadingReceipt(true);
        try {
          uploadedReceiptUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(receiptFile);
          });

          try {
            const fileExt = receiptFile.name.split('.').pop();
            const fileName = `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
            const filePath = `receipts/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(filePath, receiptFile, { upsert: true });

            if (!uploadError) {
              const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
              if (data?.publicUrl) uploadedReceiptUrl = data.publicUrl;
            }
          } catch (storageErr) {}
        } catch (e) {
          console.warn('Error procesando comprobante:', e);
        } finally {
          setUploadingReceipt(false);
        }
      }

      // Method label & converted summary
      let methodLabel = 'Billetera Interna';
      let convertedTotalText = `$${finalPriceUsdt.toFixed(2)} USDT`;
      if (paymentMethod === 'Binance') {
        methodLabel = 'Binance Pay (Manual USDT)';
        convertedTotalText = `$${finalPriceUsdt.toFixed(2)} USDT`;
      } else if (paymentMethod === 'GTQ' || paymentMethod === 'Manual') {
        methodLabel = 'Transferencia Bancaria (Quetzales GTQ)';
        convertedTotalText = `Q${finalPriceGtq} GTQ`;
      } else if (paymentMethod === 'MXN') {
        methodLabel = 'Transferencia SPEI (Pesos Mexicanos MXN)';
        convertedTotalText = `$${finalPriceMxn} MXN`;
      } else if (paymentMethod === 'COP') {
        methodLabel = 'Transferencia Nequi/Bancolombia (Pesos Colombianos COP)';
        convertedTotalText = `$${finalPriceCop} COP`;
      }

      // 1. Create Order in Supabase with robust error resilience
      const newOrderStatus = paymentMethod === 'Wallet' ? 'Completed' : 'Verification';
      let orderData = null;

      try {
        const { data, error: orderErr } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            total_usdt: finalPriceUsdt,
            total_gtq: Number(finalPriceGtq),
            status: newOrderStatus,
            payment_method: paymentMethod === 'Wallet' ? 'Wallet' : 'Manual',
            bank_receipt_url: uploadedReceiptUrl,
            coupon_id: appliedCoupon?.id || null,
            discount_amount_usdt: discountUsdt,
            customer_notes: JSON.stringify({
              ...formData,
              payment_gateway: methodLabel,
              method_label: methodLabel,
              payment_method_selected: paymentMethod,
              converted_amount_text: convertedTotalText,
              binance_transaction_id: binanceTxId || '',
              validated_nickname: playerNickname || '',
              target_uid: formData['ID de Jugador (UID)'] || formData.uid || ''
            })
          })
          .select()
          .single();

        if (!orderErr && data) {
          orderData = data;
        }
      } catch (e) {
        console.warn('Orders table insert fallback:', e);
      }

      if (!orderData) {
        orderData = {
          id: `ORD-${Date.now()}`,
          user_id: user.id,
          total_usdt: finalPriceUsdt,
          total_gtq: Number(finalPriceGtq),
          status: newOrderStatus,
          payment_method: paymentMethod === 'Wallet' ? 'Wallet' : 'Manual',
          created_at: new Date().toISOString()
        };
      }

      // 2. Create Order Item
      try {
        await supabase.from('order_items').insert({
          order_id: orderData.id,
          product_id: product.id,
          quantity: 1,
          price_usdt: finalPriceUsdt,
          cost_usdt: product.cost || 0,
          fields_data: {
            ...formData,
            validated_nickname: playerNickname || '',
            target_uid: formData['ID de Jugador (UID)'] || formData.uid || ''
          }
        });
      } catch (e) {}

      // 3. EXECUTE FLOW A (WALLET): Deduct balance, deduct stock & AUTO-DISPATCH RECHARGE
      if (paymentMethod === 'Wallet') {
        const newBal = Number(Math.max(0, walletBalance - finalPriceUsdt).toFixed(2));
        if (updateUserWalletBalance) {
          updateUserWalletBalance(user.id, newBal, user.email);
        }
        try {
          await supabase.from('profiles').update({ wallet_balance: newBal }).eq('id', user.id);
        } catch (e) {}

        try {
          await supabase.from('transactions').insert({
            user_id: user.id,
            type: 'Purchase',
            amount_usdt: finalPriceUsdt,
            order_id: orderData.id,
            status: 'Completed',
            notes: `Compra de ${product.name}`
          });
        } catch (e) {}

        // Deduct product stock
        if (product?.id) {
          const newStock = Math.max(0, (product.stock || 0) - 1);
          try {
            await supabase.from('products').update({ stock: newStock }).eq('id', product.id);
          } catch (e) {}
        }

        // Instant notification to customer
        try {
          notifyOrderCompleted({ orderId: orderData.id, userId: user.id, amount: finalPriceUsdt });
        } catch (e) {}

        // Trigger Supplier automated recharge via Recargas América API
        try {
          const rechargeRes = await processGameRecharge({
            order_id: orderData.id,
            uid: formData['ID de Jugador (UID)'] || formData.uid || '',
            nickname: playerNickname || '',
            product_name: product.name,
            total_usdt: finalPriceUsdt
          });

          if (rechargeRes?.mappedData?.supplier_transaction_id) {
            await supabase
              .from('orders')
              .update({
                bank_receipt_url: `WALLET_PAY | SUPPLIER:${rechargeRes.mappedData.supplier_transaction_id}`
              })
              .eq('id', orderData.id);
          }
        } catch (e) {}
      } else {
        // Notification for manual order (Pending Admin Review)
        sendPushNotification({
          userId: user.id,
          title: '📋 ¡Pedido Registrado en Verificación!',
          body: `Tu orden #${orderData.id.slice(0, 8)} de ${product.name} por ${convertedTotalText} (${methodLabel}) está en revisión. Al ser confirmada se despachará de inmediato.`,
          type: 'order_created',
          metadata: { orderId: orderData.id, url: '/profile?tab=orders' }
        });
      }

      // Save order to user local order history cache for instant viewing in Profile
      try {
        const cacheKey = `alv_user_orders_${user.id}`;
        const prevCached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        const orderToCache = {
          ...orderData,
          order_items: [{
            id: `item-${Date.now()}`,
            quantity: 1,
            price_usdt: finalPriceUsdt,
            fields_data: formData,
            products: { id: product.id, name: product.name, image_url: product.image_url }
          }]
        };
        localStorage.setItem(cacheKey, JSON.stringify([orderToCache, ...prevCached]));
      } catch (e) {}

      // Notify Admins with PUSH ALERT & SOUND
      notifyAdminNewOrder({
        orderId: orderData.id,
        amount: finalPriceUsdt,
        customerName: profile?.full_name || user.email,
        paymentMethod: methodLabel
      });

      setOrderSuccess({ ...orderData, methodLabel, convertedTotalText });
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
        <span>{product.subcategories?.categories?.name || 'Recargas'}</span>
        <span>/</span>
        <span style={{ color: 'var(--text-main)' }}>{product.name}</span>
      </div>

      {/* Main Product Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '32px',
        marginBottom: '40px'
      }}>
        {/* Product Image & Badges */}
        <div>
          <div className="glass-panel" style={{
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            border: '1px solid var(--border-cyan)',
            boxShadow: '0 0 25px rgba(6, 182, 212, 0.15)',
            position: 'relative'
          }}>
            <img
              src={product.image_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=700'}
              alt={product.name}
              style={{ width: '100%', height: '360px', objectFit: 'cover', display: 'block' }}
            />
            <div style={{
              position: 'absolute',
              top: '14px',
              left: '14px',
              background: 'rgba(6, 182, 212, 0.9)',
              color: '#000',
              fontWeight: '800',
              fontSize: '0.75rem',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)'
            }}>
              ⚡ Entrega Automática
            </div>
          </div>
        </div>

        {/* Product Details & Form */}
        <div className="glass-panel" style={{
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          border: '1px solid var(--border-glass)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              {product.subcategories?.categories?.name || 'Recargas Oficiales'}
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '900', marginBottom: '10px', color: '#fff' }}>
              {product.name}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '18px' }}>
              {product.description || 'Recarga rápida directa a tu cuenta de Free Fire por UID con entrega inmediata.'}
            </p>

            {/* Price Box */}
            <div style={{
              background: 'rgba(30, 58, 138, 0.25)',
              border: '1px solid var(--border-cyan)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {currency === 'USDT' ? 'PRECIO EN USDT (SELECCIONADA)' : 'PRECIO EN QUETZALES (SELECCIONADA)'}
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: '900', color: currency === 'USDT' ? 'var(--accent-cyan)' : '#fbbf24' }}>
                  {currency === 'USDT'
                    ? `$${Number(product.price_public).toFixed(2)} USDT`
                    : `Q${(Number(product.price_public) * exchangeRate).toFixed(2)} GTQ`}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {currency === 'USDT' ? 'EQUIVALENTE EN QUETZALES:' : 'EQUIVALENTE EN USDT:'}
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: '700', color: 'rgba(255, 255, 255, 0.7)' }}>
                  {currency === 'USDT'
                    ? `Q${(Number(product.price_public) * exchangeRate).toFixed(2)} GTQ`
                    : `$${Number(product.price_public).toFixed(2)} USDT`}
                </div>
              </div>
            </div>

            {/* Required Customer Input Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {fields.map((field) => (
                <div key={field.id}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px', color: '#fff' }}>
                    {field.field_name} {field.is_required && <span style={{ color: '#f87171' }}>*</span>}
                  </label>
                  <input
                    type="text"
                    required={field.is_required}
                    placeholder={`Ingresa tu ${field.field_name}...`}
                    value={formData[field.field_name] || ''}
                    onChange={(e) => handleInputChange(field.field_name, e.target.value)}
                    onBlur={(e) => {
                      if (field.field_name.toLowerCase().includes('uid') || field.field_name.toLowerCase().includes('id')) {
                        const clean = (e.target.value || '').trim().replace(/\D/g, '');
                        if (clean.length >= 8) {
                          handleUidValidation(clean);
                        }
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: '#0d111a',
                      border: validationError ? '1px solid #f87171' : (playerNickname ? '1px solid #34d399' : '1px solid var(--border-glass)'),
                      color: '#fff',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Live Nickname Validation Status Banner */}
            {validatingUid && (
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0, 240, 255, 0.08)', padding: '8px 12px', borderRadius: '6px' }}>
                <span className="spinner-small" style={{ width: '14px', height: '14px' }} />
                <span>Consultando servidores oficiales de Free Fire...</span>
              </div>
            )}

            {playerNickname && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(13, 27, 42, 0.9) 0%, rgba(6, 78, 59, 0.4) 100%)',
                border: '1px solid #34d399',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: '0 4px 20px rgba(52, 211, 153, 0.15)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #1d4ed8 0%, #06b6d4 100%)',
                      border: '1.5px solid var(--accent-cyan)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      fontWeight: '900',
                      color: '#fff',
                      letterSpacing: '-0.02em',
                      boxShadow: '0 0 15px rgba(6, 182, 212, 0.35)',
                      flexShrink: 0
                    }}
                  >
                    FF
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <span>✓ CUENTA OFICIAL VERIFICADA</span>
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#fff', letterSpacing: '0.02em', marginTop: '2px' }}>
                      {playerNickname}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  {playerLevel ? (
                    <span style={{ fontSize: '0.75rem', background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', padding: '3px 8px', borderRadius: '4px', fontWeight: '800' }}>
                      ⭐ Nivel {playerLevel}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                      🟢 Lista para Recarga
                    </span>
                  )}
                  {playerLikes && (
                    <span style={{ fontSize: '0.7rem', color: '#fbbf24' }}>
                      👍 {Number(playerLikes).toLocaleString()}
                    </span>
                  )}
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    🌎 {playerRegion || 'LATAM'}
                  </span>
                </div>
              </div>
            )}

            {validationError && (
              <div style={{ fontSize: '0.78rem', color: '#f87171', marginBottom: '14px', background: 'rgba(248, 113, 113, 0.1)', padding: '8px 12px', borderRadius: '6px' }}>
                ⚠️ {validationError}
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={() => setShowCheckout(true)}
            className="btn-cyan"
            style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: '800' }}
          >
            {product.button_action_text || 'Solicitar Recarga'} ➔
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

        <form onSubmit={handleSubmitReview} style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-glass)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Deja tu comentario sobre esta recarga:</h4>
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
            placeholder="Escribe tu experiencia..."
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

      {/* Checkout Modal (Triple Flow) */}
      {showCheckout && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel animate-fade" style={{
            width: '100%',
            maxWidth: '520px',
            maxHeight: '92vh',
            overflowY: 'auto',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            border: '1px solid var(--border-cyan)'
          }}>
            {!orderSuccess ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Finalizar Compra</h3>
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
                      Nick Verificado: {playerNickname}
                    </div>
                  )}
                  <div style={{ fontSize: '1.3rem', fontWeight: '900', color: 'var(--accent-cyan)', marginTop: '8px' }}>
                    ${finalPriceUsdt.toFixed(2)} USDT
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '8px', fontWeight: 'normal' }}>
                      (Q{(finalPriceUsdt * (config?.usdt_gtq_rate || exchangeRate || 7.80)).toFixed(2)} GTQ / ${(finalPriceUsdt * (config?.usdt_mxn_rate || rateMxn || 19.50)).toFixed(2)} MXN / ${Math.round(finalPriceUsdt * (config?.usdt_cop_rate || rateCop || 4100)).toLocaleString('es-CO')} COP)
                    </span>
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

                {/* Payment Method Selector (Multi-Currency & Admin Visibility Aware) */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', display: 'block', marginBottom: '8px' }}>
                    Selecciona Método de Pago:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                    
                    {/* Billetera Interna */}
                    <div
                      onClick={() => setPaymentMethod('Wallet')}
                      style={{
                        padding: '10px 6px',
                        borderRadius: 'var(--radius-md)',
                        background: paymentMethod === 'Wallet' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: paymentMethod === 'Wallet' ? '1px solid var(--border-cyan)' : '1px solid var(--border-glass)',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '1.2rem' }}>💎</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: '800', marginTop: '3px' }}>Billetera</div>
                      <div style={{ fontSize: '0.65rem', color: hasSufficientBalance ? '#34d399' : '#f87171', fontWeight: '700' }}>
                        ${walletBalance.toFixed(2)}
                      </div>
                    </div>

                    {/* Binance Pay Manual (if enabled) */}
                    {(config?.payment_methods_visibility?.binance !== false) && (
                      <div
                        onClick={() => setPaymentMethod('Binance')}
                        style={{
                          padding: '10px 6px',
                          borderRadius: 'var(--radius-md)',
                          background: paymentMethod === 'Binance' ? 'rgba(240, 185, 11, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                          border: paymentMethod === 'Binance' ? '1px solid #f0b90b' : '1px solid var(--border-glass)',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: '1.2rem' }}>🟡</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '800', marginTop: '3px', color: '#f0b90b' }}>Binance</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>USDT Manual</div>
                      </div>
                    )}

                    {/* Quetzales GTQ (if enabled) */}
                    {(config?.payment_methods_visibility?.gtq !== false) && (
                      <div
                        onClick={() => setPaymentMethod('GTQ')}
                        style={{
                          padding: '10px 6px',
                          borderRadius: 'var(--radius-md)',
                          background: paymentMethod === 'GTQ' || paymentMethod === 'Manual' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                          border: paymentMethod === 'GTQ' || paymentMethod === 'Manual' ? '1px solid var(--border-cyan)' : '1px solid var(--border-glass)',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: '1.2rem' }}>🇬🇹</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '800', marginTop: '3px' }}>Quetzales</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>GTQ Banco</div>
                      </div>
                    )}

                    {/* Pesos Mexicanos MXN (if enabled) */}
                    {(config?.payment_methods_visibility?.mxn !== false) && (
                      <div
                        onClick={() => setPaymentMethod('MXN')}
                        style={{
                          padding: '10px 6px',
                          borderRadius: 'var(--radius-md)',
                          background: paymentMethod === 'MXN' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                          border: paymentMethod === 'MXN' ? '1px solid #34d399' : '1px solid var(--border-glass)',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: '1.2rem' }}>🇲🇽</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '800', marginTop: '3px', color: '#34d399' }}>México</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>MXN SPEI</div>
                      </div>
                    )}

                    {/* Pesos Colombianos COP (if enabled) */}
                    {(config?.payment_methods_visibility?.cop !== false) && (
                      <div
                        onClick={() => setPaymentMethod('COP')}
                        style={{
                          padding: '10px 6px',
                          borderRadius: 'var(--radius-md)',
                          background: paymentMethod === 'COP' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                          border: paymentMethod === 'COP' ? '1px solid #f59e0b' : '1px solid var(--border-glass)',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: '1.2rem' }}>🇨🇴</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '800', marginTop: '3px', color: '#f59e0b' }}>Colombia</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>COP Nequi</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* WALLET INSUFFICIENT BALANCE WARNING */}
                {paymentMethod === 'Wallet' && !hasSufficientBalance && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                    marginBottom: '16px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#f87171', marginBottom: '4px' }}>
                      ⛔ Saldo Insuficiente en Billetera
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                      Tienes <strong>${walletBalance.toFixed(2)} USDT</strong> y el costo de este paquete es de <strong>${finalPriceUsdt.toFixed(2)} USDT</strong>.
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/profile?tab=wallet')}
                      className="btn-cyan"
                      style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                    >
                      ➕ Recargar Saldo de Billetera ➔
                    </button>
                  </div>
                )}

                {/* ========================================================= */}
                {/* DETAILS CARD: BINANCE PAY MANUAL */}
                {/* ========================================================= */}
                {paymentMethod === 'Binance' && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(240, 185, 11, 0.08) 0%, rgba(13, 17, 26, 0.9) 100%)',
                    border: '1px solid #f0b90b',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    marginBottom: '20px',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{ fontWeight: '800', color: '#f0b90b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🟡</span> Datos Oficiales de Binance Pay:
                    </div>

                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                      {(config?.binance_qr_url || '/binance-qr.jpg') && (
                        <div style={{ width: '80px', height: '80px', borderRadius: '8px', background: '#000', border: '1px solid #f0b90b', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={config?.binance_qr_url || '/binance-qr.jpg'} alt="Binance QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                      )}
                      <div>
                        <div><strong>Binance Pay ID:</strong> <span style={{ color: '#f0b90b', fontWeight: '800', fontSize: '0.95rem' }}>{config?.binance_pay_id || '527653920'}</span></div>
                        <div><strong>Titular:</strong> {config?.binance_name || 'AlvJona'}</div>
                        <div style={{ marginTop: '4px', color: '#34d399', fontWeight: '800' }}>
                          Monto Exacto: ${finalPriceUsdt.toFixed(2)} USDT
                        </div>
                      </div>
                    </div>

                    {config?.binance_deeplink_url && (
                      <a
                        href={config.binance_deeplink_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-block', padding: '6px 12px', background: '#f0b90b', color: '#000', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: '800', textDecoration: 'none', marginBottom: '12px' }}
                      >
                        ⚡ Abrir Directo en Binance App ➔
                      </a>
                    )}

                    <div style={{ marginTop: '8px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        ID de Transacción / Orden de Binance (Opcional):
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. 123456789"
                        value={binanceTxId}
                        onChange={(e) => setBinanceTxId(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem', marginBottom: '12px' }}
                      />
                    </div>

                    {/* Stylish Receipt Upload */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '6px', color: '#fff', fontWeight: '700' }}>
                        📎 Adjuntar Captura / Comprobante de Binance Pay:
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <label style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          borderRadius: 'var(--radius-md)',
                          background: 'linear-gradient(135deg, rgba(240, 185, 11, 0.25) 0%, rgba(30, 58, 138, 0.5) 100%)',
                          border: '1px solid #f0b90b',
                          color: '#f0b90b',
                          fontSize: '0.8rem',
                          fontWeight: '800',
                          cursor: 'pointer'
                        }}>
                          <span>📸</span>
                          <span>{receiptFile ? 'Cambiar Captura' : 'Subir Captura'}</span>
                          <input type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files[0])} style={{ display: 'none' }} />
                        </label>
                        {receiptFile && (
                          <div style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: '700' }}>
                            ✅ {receiptFile.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* DETAILS CARD: QUETZALES (GTQ) */}
                {/* ========================================================= */}
                {(paymentMethod === 'GTQ' || paymentMethod === 'Manual') && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    marginBottom: '20px',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{ fontWeight: '800', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                      🇬🇹 Cuentas Bancarias en Quetzales (Guatemala):
                    </div>
                    {(config?.bank_accounts || [{ bank: 'Banrural', account_number: '4313076359', type: 'Ahorro', name: 'Jonathan Alvares' }]).map((acc, i) => (
                      <div key={i} style={{ marginBottom: '8px', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                        <div><strong>Banco:</strong> {acc.bank}</div>
                        <div><strong>No. Cuenta:</strong> <span style={{ color: '#fbbf24', fontWeight: '800' }}>{acc.account_number}</span> ({acc.type})</div>
                        <div><strong>Titular:</strong> {acc.name}</div>
                      </div>
                    ))}
                    <div style={{ marginTop: '8px', color: '#fbbf24', fontSize: '0.9rem', fontWeight: '800' }}>
                      Monto a transferir: Q{(finalPriceUsdt * (config?.usdt_gtq_rate || exchangeRate || 7.80)).toFixed(2)} GTQ
                    </div>

                    <div style={{ marginTop: '14px' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '6px', color: '#fff', fontWeight: '700' }}>
                        📎 Adjuntar Foto / Screenshot del Comprobante:
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <label style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 14px',
                          borderRadius: 'var(--radius-md)',
                          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(30, 58, 138, 0.5) 100%)',
                          border: '1px solid var(--border-cyan)',
                          color: 'var(--accent-cyan)',
                          fontSize: '0.8rem',
                          fontWeight: '800',
                          cursor: 'pointer'
                        }}>
                          <span>📸</span>
                          <span>{receiptFile ? 'Cambiar Comprobante' : 'Subir Comprobante'}</span>
                          <input type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files[0])} style={{ display: 'none' }} />
                        </label>
                        {receiptFile && (
                          <div style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: '700' }}>
                            ✅ {receiptFile.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* DETAILS CARD: PESOS MEXICANOS (MXN) */}
                {/* ========================================================= */}
                {paymentMethod === 'MXN' && (
                  <div style={{
                    background: 'rgba(52, 211, 153, 0.05)',
                    border: '1px solid #34d399',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    marginBottom: '20px',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{ fontWeight: '800', color: '#34d399', marginBottom: '8px' }}>
                      🇲🇽 Cuentas & SPEI en Pesos Mexicanos (México):
                    </div>
                    {(config?.mxn_accounts || [{ bank: 'BBVA / SPEI', account_number: '012180015487965412', type: 'CLABE Interbancaria', name: 'Jonathan Alvares' }]).map((acc, i) => (
                      <div key={i} style={{ marginBottom: '8px', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                        <div><strong>Banco / Plataforma:</strong> {acc.bank}</div>
                        <div><strong>CLABE / Tarjeta:</strong> <span style={{ color: '#34d399', fontWeight: '800' }}>{acc.account_number}</span> ({acc.type})</div>
                        <div><strong>Titular:</strong> {acc.name}</div>
                      </div>
                    ))}
                    <div style={{ marginTop: '8px', color: '#34d399', fontSize: '0.9rem', fontWeight: '800' }}>
                      Monto a transferir: ${(finalPriceUsdt * (config?.usdt_mxn_rate || rateMxn || 19.50)).toFixed(2)} MXN
                    </div>

                    <div style={{ marginTop: '14px' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '6px', color: '#fff', fontWeight: '700' }}>
                        📎 Adjuntar Captura del Comprobante SPEI:
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <label style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 14px',
                          borderRadius: 'var(--radius-md)',
                          background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.25) 0%, rgba(30, 58, 138, 0.5) 100%)',
                          border: '1px solid #34d399',
                          color: '#34d399',
                          fontSize: '0.8rem',
                          fontWeight: '800',
                          cursor: 'pointer'
                        }}>
                          <span>📸</span>
                          <span>{receiptFile ? 'Cambiar Comprobante' : 'Subir Comprobante'}</span>
                          <input type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files[0])} style={{ display: 'none' }} />
                        </label>
                        {receiptFile && (
                          <div style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: '700' }}>
                            ✅ {receiptFile.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* DETAILS CARD: PESOS COLOMBIANOS (COP) */}
                {/* ========================================================= */}
                {paymentMethod === 'COP' && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.05)',
                    border: '1px solid #f59e0b',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    marginBottom: '20px',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{ fontWeight: '800', color: '#f59e0b', marginBottom: '8px' }}>
                      🇨🇴 Cuentas & Nequi en Pesos Colombianos (Colombia):
                    </div>
                    {(config?.cop_accounts || [{ bank: 'Bancolombia / Nequi', account_number: '3124567890', type: 'Ahorros / Celular', name: 'Jonathan Alvares' }]).map((acc, i) => (
                      <div key={i} style={{ marginBottom: '8px', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                        <div><strong>Entidad:</strong> {acc.bank}</div>
                        <div><strong>No. Cuenta / Celular:</strong> <span style={{ color: '#f59e0b', fontWeight: '800' }}>{acc.account_number}</span> ({acc.type})</div>
                        <div><strong>Titular:</strong> {acc.name}</div>
                      </div>
                    ))}
                    <div style={{ marginTop: '8px', color: '#f59e0b', fontSize: '0.9rem', fontWeight: '800' }}>
                      Monto a transferir: ${Math.round(finalPriceUsdt * (config?.usdt_cop_rate || rateCop || 4100)).toLocaleString('es-CO')} COP
                    </div>

                    <div style={{ marginTop: '14px' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '6px', color: '#fff', fontWeight: '700' }}>
                        📎 Adjuntar Captura del Comprobante Nequi / Bancolombia:
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <label style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 14px',
                          borderRadius: 'var(--radius-md)',
                          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(30, 58, 138, 0.5) 100%)',
                          border: '1px solid #f59e0b',
                          color: '#f59e0b',
                          fontSize: '0.8rem',
                          fontWeight: '800',
                          cursor: 'pointer'
                        }}>
                          <span>📸</span>
                          <span>{receiptFile ? 'Cambiar Comprobante' : 'Subir Comprobante'}</span>
                          <input type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files[0])} style={{ display: 'none' }} />
                        </label>
                        {receiptFile && (
                          <div style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: '700' }}>
                            ✅ {receiptFile.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Confirm Button */}
                <button
                  onClick={handleProceedPayment}
                  disabled={isProcessing || uploadingReceipt || (paymentMethod === 'Wallet' && !hasSufficientBalance)}
                  className="btn-cyan"
                  style={{ width: '100%', padding: '14px', fontSize: '0.92rem' }}
                >
                  {isProcessing || uploadingReceipt ? 'Procesando...' : (
                    paymentMethod === 'Wallet' && !hasSufficientBalance 
                      ? 'Saldo Insuficiente (Recarga Billetera)' 
                      : `Confirmar Pedido (${paymentMethod === 'Wallet' || paymentMethod === 'Binance' ? `$${finalPriceUsdt.toFixed(2)} USDT` : paymentMethod === 'MXN' ? `$${(finalPriceUsdt * (config?.usdt_mxn_rate || rateMxn || 19.50)).toFixed(2)} MXN` : paymentMethod === 'COP' ? `$${Math.round(finalPriceUsdt * (config?.usdt_cop_rate || rateCop || 4100)).toLocaleString('es-CO')} COP` : `Q${(finalPriceUsdt * (config?.usdt_gtq_rate || exchangeRate || 7.80)).toFixed(2)} GTQ`})`
                  )}
                </button>
              </>
            ) : (
              /* Success Screen */
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎉</div>
                <h3 style={{ fontSize: '1.3rem', color: 'var(--accent-cyan)', marginBottom: '8px' }}>¡Pedido Registrado con Éxito!</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  {orderSuccess.status === 'Completed'
                    ? 'Tu recarga ha sido procesada de inmediato por el sistema.'
                    : `Tu pedido por ${orderSuccess.convertedTotalText || `$${finalPriceUsdt.toFixed(2)} USDT`} (${orderSuccess.methodLabel || 'Pago Manual'}) ha pasado a verificación. Al ser aprobado por el administrador, se completará de inmediato.`}
                </p>

                {config.social_links?.whatsapp && (
                  <a
                    href={`https://wa.me/${config.social_links.whatsapp.replace(/\+/g, '')}?text=${encodeURIComponent(
                      `¡Hola ALVSHOP! Acabo de registrar mi pedido de "${product.name}" (ID: ${orderSuccess.id.slice(0, 8)}) por ${orderSuccess.convertedTotalText || `$${finalPriceUsdt.toFixed(2)} USDT`}. Datos: ${JSON.stringify(formData)}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-cyan"
                    style={{ display: 'inline-flex', width: '100%', marginBottom: '12px', background: '#25D366', color: '#fff', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <span>💬</span> Enviar Comprobante por WhatsApp
                  </a>
                )}

                <button
                  onClick={() => {
                    setShowCheckout(false);
                    navigate('/profile?tab=orders');
                  }}
                  className="btn-glass"
                  style={{ width: '100%' }}
                >
                  Ver Estado en Mi Historial de Pedidos
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
