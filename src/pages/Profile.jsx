import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import { requestPushPermission, getPushPermissionStatus, notifyAdminNewOrder } from '../../notificaciones y apis/notificaciones/pushService';
import { reservePaymentLink } from '../services/paymentLinksService';

export default function Profile() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'orders';

  const {
    user,
    profile,
    role,
    walletBalance,
    config,
    fetchProfile,
    notifications,
    unreadCount,
    clearAllNotifications
  } = useApp();

  const [activeTab, setActiveTab] = useState(initialTab);

  // Auth Form State
  const [isSignUp, setIsSignUp] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Orders State
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Wallet Top-up State (Manual & Binance)
  const [depositAmount, setDepositAmount] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [showBinanceModal, setShowBinanceModal] = useState(false);
  const [binanceDepositAmount, setBinanceDepositAmount] = useState('10');
  const [receiptPreview, setReceiptPreview] = useState('');
  const [receiptRef, setReceiptRef] = useState('');

  // Single-Use Payment Link Pool State (Recurrente)
  const [linkDepositAmount, setLinkDepositAmount] = useState(5);
  const [reservedLink, setReservedLink] = useState(null);
  const [reservingLink, setReservingLink] = useState(false);
  const [linkReceiptPreview, setLinkReceiptPreview] = useState('');
  const [linkSubmitting, setLinkSubmitting] = useState(false);

  const normalizedRole = role ? String(role).trim().toLowerCase() : '';
  const isAdminOrAdvisor = normalizedRole === 'admin' || normalizedRole === 'asesor';

  // Handle Receipt Image Selection
  const handleReceiptChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleLinkReceiptChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setLinkReceiptPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Sync tab from URL params if present
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Refresh profile balance on mount
  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id);
    }
  }, [user?.id]);

  // Load User Orders
  useEffect(() => {
    async function loadOrders() {
      if (!user) return;
      setLoadingOrders(true);

      const cacheKey = `alv_user_orders_${user.id}`;
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.length > 0) setOrders(parsed);
        }
      } catch (e) {}

      try {
        const fetchPromise = supabase
          .from('orders')
          .select(`
            *,
            order_items (
              id,
              quantity,
              price_usdt,
              credentials_delivered,
              fields_data,
              products (id, name, image_url)
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 4000)
        );

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

        if (data && !error) {
          setOrders(data);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(data));
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Error loading orders in Profile (using memory):', err);
      } finally {
        setLoadingOrders(false);
      }
    }

    if (user) {
      loadOrders();
    }
  }, [user, activeTab]);

  // Handle Authentication
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: {
              full_name: authFullName,
              phone: authPhone
            }
          }
        });
        if (error) throw error;
        alert('¡Cuenta creada con éxito! Ya puedes iniciar sesión.');
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword
        });
        if (error) throw error;
        if (data.user) fetchProfile(data.user.id);
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Selected deposit currency for manual transfer: 'GTQ' | 'MXN' | 'COP' | 'Binance'
  const [depositCurrency, setDepositCurrency] = useState('GTQ');

  // Handle Wallet Recharge Request (Manual Multi-Currency: GTQ, MXN, COP, Binance)
  const handleRequestDeposit = async (e) => {
    e.preventDefault();
    const amount = Number(depositAmount);
    if (!depositAmount || isNaN(amount) || amount < 5) {
      alert('⚠️ El monto mínimo para recargar saldo es de $5.00 USDT.');
      return;
    }
    setDepositLoading(true);

    try {
      let totalConverted = amount;
      let currencyLabel = 'USDT';
      let methodTitle = 'Recarga Manual';

      if (depositCurrency === 'GTQ') {
        const rate = Number(config?.usdt_gtq_rate || 7.80);
        totalConverted = Number((amount * rate).toFixed(2));
        currencyLabel = `Q${totalConverted.toFixed(2)} GTQ`;
        methodTitle = 'Transferencia GTQ (Quetzales)';
      } else if (depositCurrency === 'MXN') {
        const rate = Number(config?.usdt_mxn_rate || 19.50);
        totalConverted = Number((amount * rate).toFixed(2));
        currencyLabel = `$${totalConverted.toFixed(2)} MXN`;
        methodTitle = 'Transferencia MXN (Pesos Mexicanos)';
      } else if (depositCurrency === 'COP') {
        const rate = Number(config?.usdt_cop_rate || 4100);
        totalConverted = Math.round(amount * rate);
        currencyLabel = `$${totalConverted.toLocaleString('es-CO')} COP`;
        methodTitle = 'Transferencia COP (Pesos Colombianos)';
      } else if (depositCurrency === 'Binance') {
        currencyLabel = `$${amount.toFixed(2)} USDT`;
        methodTitle = 'Binance Pay (Manual USDT)';
      }

      const noteDetails = JSON.stringify({
        type: 'wallet_deposit',
        deposit_currency: depositCurrency,
        amount_usdt: amount,
        converted_text: currencyLabel,
        reference_id: receiptRef.trim() || '',
        user_email: user.email
      });

      let orderData = null;
      try {
        const { data, error } = await supabase.from('orders').insert({
          user_id: user.id,
          total_usdt: amount,
          total_gtq: depositCurrency === 'GTQ' ? totalConverted : Number((amount * (config?.usdt_gtq_rate || 7.80)).toFixed(2)),
          status: 'Verification',
          payment_method: 'Manual',
          customer_notes: noteDetails,
          bank_receipt_url: receiptPreview || null
        }).select().single();

        if (!error && data) {
          orderData = data;
        }
      } catch (e) {
        console.warn('Orders insert notice:', e);
      }

      if (!orderData) {
        orderData = {
          id: `ORD-DEP-${Date.now()}`,
          user_id: user.id,
          total_usdt: amount,
          total_gtq: depositCurrency === 'GTQ' ? totalConverted : Number((amount * (config?.usdt_gtq_rate || 7.80)).toFixed(2)),
          status: 'Verification',
          payment_method: 'Manual',
          customer_notes: noteDetails,
          bank_receipt_url: receiptPreview || null,
          created_at: new Date().toISOString(),
          profiles: {
            id: user.id,
            full_name: profile?.full_name || user.email,
            email: user.email
          }
        };
      }

      // Save to client user orders cache and global admin sync pool
      try {
        const userKey = `alv_user_orders_${user.id}`;
        const prevUser = JSON.parse(localStorage.getItem(userKey) || '[]');
        localStorage.setItem(userKey, JSON.stringify([orderData, ...prevUser.filter(o => o.id !== orderData.id)]));

        const prevAll = JSON.parse(localStorage.getItem('alv_all_orders') || '[]');
        localStorage.setItem('alv_all_orders', JSON.stringify([orderData, ...prevAll.filter(o => o.id !== orderData.id)]));
      } catch (e) {}

      // Push notification to Admin
      try {
        notifyAdminNewOrder({
          orderId: orderData.id,
          amount: amount,
          customerName: profile?.full_name || user.email,
          paymentMethod: `Recarga Billetera: ${methodTitle} (${currencyLabel})`
        });
      } catch (e) {}

      alert(`¡Solicitud de recarga por $${amount.toFixed(2)} USDT (${currencyLabel}) enviada con éxito!\nUn asesor validará tu comprobante para acreditar tu saldo de inmediato.`);
      setDepositAmount('');
      setReceiptPreview('');
      setReceiptRef('');
      await loadUserOrders();
      setActiveTab('orders');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setDepositLoading(false);
    }
  };

  // Handle Single-Use Payment Link Reservation (Recurrente Pool)
  const handleGetPaymentLink = async () => {
    setReservingLink(true);
    try {
      const link = await reservePaymentLink(linkDepositAmount, user?.id);
      if (!link) {
        alert(`⚠️ En este momento no hay enlaces de pago disponibles para $${linkDepositAmount} USD.\nPor favor intenta con otra cantidad ($5, $10, $20, $30) o usa Binance Pay / Transferencia.`);
        setReservedLink(null);
      } else {
        setReservedLink(link);
        setLinkReceiptPreview('');
      }
    } catch (err) {
      alert('Error obteniendo link de pago: ' + err.message);
    } finally {
      setReservingLink(false);
    }
  };

  // Submit Payment Link Receipt for Admin Verification & Burn
  const handleSubmitLinkPayment = async (e) => {
    e.preventDefault();
    if (!reservedLink) {
      alert('Por favor solicita un link de pago primero.');
      return;
    }
    if (!linkReceiptPreview) {
      alert('⚠️ Por favor adjunta la captura o comprobante de tu pago.');
      return;
    }

    setLinkSubmitting(true);
    try {
      const currentRate = Number(config?.usdt_gtq_rate || exchangeRate || 7.80);
      const amtUsd = Number(reservedLink.amount_usd);
      const totalGtq = Number((amtUsd * currentRate).toFixed(2));

      const customerNotesObj = {
        service_type: 'Wallet Deposit (Link Recurrente)',
        payment_method_detail: 'Recurrente / Link',
        link_id: reservedLink.id,
        link_tag: reservedLink.identifier_tag,
        link_url: reservedLink.url,
        amount_usd: amtUsd
      };

      let newOrder = null;
      try {
        const { data, error } = await supabase.from('orders').insert({
          user_id: user.id,
          total_usdt: amtUsd,
          total_gtq: totalGtq,
          status: 'Verification',
          payment_method: 'Manual',
          customer_notes: JSON.stringify(customerNotesObj),
          bank_receipt_url: linkReceiptPreview
        }).select().single();

        if (!error && data) {
          newOrder = data;
        }
      } catch (e) {
        console.warn('Orders table fallback for link payment:', e);
      }

      if (!newOrder) {
        newOrder = {
          id: `ORD-LINK-${Date.now()}`,
          user_id: user.id,
          total_usdt: amtUsd,
          total_gtq: totalGtq,
          status: 'Verification',
          payment_method: 'Manual',
          customer_notes: JSON.stringify(customerNotesObj),
          bank_receipt_url: linkReceiptPreview,
          created_at: new Date().toISOString()
        };
      }

      // Add to local orders list immediately
      setOrders(prev => [newOrder, ...prev]);
      try {
        const cacheKey = `alv_user_orders_${user.id}`;
        const prevCached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        localStorage.setItem(cacheKey, JSON.stringify([newOrder, ...prevCached.filter(o => o.id !== newOrder.id)]));

        const prevAll = JSON.parse(localStorage.getItem('alv_all_orders') || '[]');
        localStorage.setItem('alv_all_orders', JSON.stringify([newOrder, ...prevAll.filter(o => o.id !== newOrder.id)]));
      } catch (e) {}

      // Push notification to Admin
      try {
        notifyAdminNewOrder({
          orderId: newOrder.id,
          amount: amtUsd,
          customerName: profile?.full_name || user.email,
          paymentMethod: `Recarga Billetera: Enlace de Pago (${reservedLink.identifier_tag})`
        });
      } catch (e) {}

      alert(`✅ ¡Comprobante enviado con éxito para el enlace ${reservedLink.identifier_tag}!\nUn asesor verificará tu pago y tu saldo de $${amtUsd} USD será acreditado inmediatamente.`);
      setReservedLink(null);
      setLinkReceiptPreview('');
      setActiveTab('orders');
    } catch (err) {
      alert('Error enviando comprobante: ' + err.message);
    } finally {
      setLinkSubmitting(false);
    }
  };

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 2000);
    }
  };

  // If NOT Logged In: Show Auth Screen
  if (!user) {
    return (
      <div className="container" style={{ paddingTop: '30px', maxWidth: '440px' }}>
        <div className="glass-panel" style={{
          borderRadius: 'var(--radius-lg)',
          padding: '28px 24px',
          border: '1px solid var(--border-cyan)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '6px' }}>💎</div>
            <h2 style={{ fontSize: '1.4rem' }}>{isSignUp ? 'Crear Cuenta en ALVSHOP' : 'Bienvenido a ALVSHOP'}</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {isSignUp ? 'Regístrate para comprar y recargar con saldo' : 'Accede a tu billetera e historial de compras'}
            </p>
          </div>

          {authError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              marginBottom: '16px'
            }}>
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {isSignUp && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Tu Nombre"
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Número de WhatsApp</label>
                  <input
                    type="tel"
                    required
                    placeholder="502 1234 5678"
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                  />
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Correo Electrónico</label>
              <input
                type="email"
                required
                placeholder="tu@correo.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Contraseña</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
              />
            </div>

            <button type="submit" disabled={authLoading} className="btn-cyan" style={{ marginTop: '8px', padding: '12px' }}>
              {authLoading ? 'Procesando...' : (isSignUp ? 'Crear Cuenta ➔' : 'Iniciar Sesión ➔')}
            </button>
          </form>

          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.85rem' }}>
            <button
              onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }}
              style={{ background: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: '600' }}
            >
              {isSignUp ? '¿Ya tienes cuenta? Inicia sesión aquí' : '¿No tienes cuenta? Regístrate aquí'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '20px', maxWidth: '780px' }}>
      
      {/* Profile Header Card */}
      <div className="glass-panel" style={{
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        border: '1px solid var(--border-cyan)',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary-navy) 0%, var(--accent-cyan) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            color: '#fff',
            fontWeight: '900'
          }}>
            {(profile?.full_name || user.email)[0]}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{profile?.full_name || user.email}</h2>
              <span className="badge-cyan">{role}</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{user.email}</div>
          </div>
        </div>

        {/* Wallet Balance Widget & Sign Out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            background: 'rgba(30, 58, 138, 0.3)',
            border: '1px solid var(--border-cyan)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 18px',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Saldo Disponible</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--accent-cyan)' }}>
              ${walletBalance.toFixed(2)} <span style={{ fontSize: '0.8rem' }}>USDT</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🚪 Salir
          </button>
        </div>
      </div>

      {/* Admin Backoffice Direct Action Banner (If Admin / Asesor) */}
      {isAdminOrAdvisor && (
        <div className="glass-panel" style={{
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          marginBottom: '20px',
          border: '1px solid var(--border-cyan)',
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(6, 182, 212, 0.15) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--accent-cyan)' }}>
              👑 Panel de Control (Backoffice)
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Acceso exclusivo para administrar pedidos, productos, cupones y finanzas
            </div>
          </div>
          <Link to="/admin" className="btn-cyan" style={{ padding: '10px 20px', fontSize: '0.88rem', fontWeight: '800' }}>
            Acceder al Panel ➔
          </Link>
        </div>
      )}

      {/* Referral Code Box */}
      {profile?.referral_code && (
        <div className="glass-panel" style={{
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          marginBottom: '20px',
          border: '1px solid var(--border-glass)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tu Código de Referido:</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--accent-cyan)' }}>
              {profile.referral_code}
            </div>
          </div>
          <button onClick={copyReferralCode} className="btn-glass" style={{ fontSize: '0.8rem' }}>
            {copiedReferral ? '✅ ¡Copiado!' : '📋 Copiar Código'}
          </button>
        </div>
      )}

      {/* Profile Subtabs Navigation Bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            fontWeight: '700',
            fontSize: '0.85rem',
            cursor: 'pointer',
            background: activeTab === 'orders' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'orders' ? '#000' : 'var(--text-main)',
            border: activeTab === 'orders' ? 'none' : '1px solid var(--border-glass)'
          }}
        >
          📦 Mis Pedidos ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            fontWeight: '700',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: activeTab === 'notifications' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'notifications' ? '#000' : 'var(--text-main)',
            border: activeTab === 'notifications' ? 'none' : '1px solid var(--border-glass)'
          }}
        >
          <span>🔔</span> Mis Notificaciones
          {unreadCount > 0 && (
            <span style={{
              background: '#f87171',
              color: '#fff',
              borderRadius: '50%',
              fontSize: '0.7rem',
              padding: '2px 6px',
              fontWeight: '900'
            }}>
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('wallet')}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            fontWeight: '700',
            fontSize: '0.85rem',
            cursor: 'pointer',
            background: activeTab === 'wallet' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'wallet' ? '#000' : 'var(--text-main)',
            border: activeTab === 'wallet' ? 'none' : '1px solid var(--border-glass)'
          }}
        >
          ➕ Recargar Billetera
        </button>

        {isAdminOrAdvisor && (
          <Link
            to="/admin"
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              fontWeight: '700',
              fontSize: '0.85rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #06b6d4 100%)',
              color: '#fff',
              border: '1px solid var(--border-cyan)',
              boxShadow: '0 2px 10px rgba(6, 182, 212, 0.25)'
            }}
          >
            👑 Panel de Control
          </Link>
        )}
      </div>

      {/* Tab 1: Orders History */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loadingOrders ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Cargando pedidos...</div>
          ) : orders.length === 0 ? (
            <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🛒</div>
              <p style={{ color: 'var(--text-muted)' }}>Aún no has realizado ninguna compra.</p>
              <Link to="/" className="btn-cyan" style={{ display: 'inline-block', marginTop: '12px', fontSize: '0.85rem' }}>
                Ir al Catálogo ➔
              </Link>
            </div>
          ) : (
            orders.map((ord) => {
              const statusColors = {
                Completed: '#34d399',
                Verification: '#fbbf24',
                Pending: '#60a5fa',
                Rejected: '#f87171'
              };

              const statusLabels = {
                Completed: 'Completado / Entregado',
                Verification: 'En Verificación de Pago',
                Pending: 'Pendiente de Pago',
                Rejected: 'Rechazado'
              };

              return (
                <div key={ord.id} className="glass-panel" style={{
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  border: '1px solid var(--border-glass)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Orden: </span>
                      <strong style={{ color: 'var(--accent-cyan)' }}>#{ord.id.slice(0, 8)}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '10px' }}>
                        {new Date(ord.created_at).toLocaleString()}
                      </span>
                    </div>

                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      background: `${statusColors[ord.status] || '#60a5fa'}22`,
                      color: statusColors[ord.status] || '#60a5fa',
                      border: `1px solid ${statusColors[ord.status] || '#60a5fa'}55`
                    }}>
                      {statusLabels[ord.status] || ord.status}
                    </span>
                  </div>

                  {/* Order Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {ord.order_items?.map((item) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <div>
                          <strong>{item.products?.name || 'Recarga Digital'}</strong>
                          {item.fields_data && Object.keys(item.fields_data).length > 0 && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {Object.entries(item.fields_data).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                            </div>
                          )}
                        </div>
                        <div style={{ fontWeight: '700', color: 'var(--accent-cyan)' }}>
                          ${Number(item.price_usdt).toFixed(2)} USDT
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total & Payment Method */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid var(--border-glass)',
                    paddingTop: '8px',
                    fontSize: '0.85rem'
                  }}>
                    <span style={{ color: 'var(--text-muted)' }}>Método: {ord.payment_method}</span>
                    <div>Total: <strong>${Number(ord.total_usdt).toFixed(2)} USDT</strong> (Q{Number(ord.total_gtq).toFixed(2)} GTQ)</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Notifications History */}
      {activeTab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Historial de Alertas & Notificaciones</h3>
            {notifications.length > 0 && (
              <button onClick={clearAllNotifications} className="btn-glass" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                🧹 Limpiar
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="glass-panel" style={{ padding: '36px', textAlign: 'center', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔔</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No tienes notificaciones pendientes.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div key={notif.id} className="glass-panel" style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                border: notif.is_read ? '1px solid var(--border-glass)' : '1px solid var(--border-cyan)',
                background: notif.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(6, 182, 212, 0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.4rem' }}>
                    {notif.type === 'order_completed' ? '🎉' : notif.type === 'order_created' ? '🛒' : notif.type === 'support_reply' ? '💬' : '🔔'}
                  </span>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#fff' }}>{notif.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{notif.body}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', marginTop: '4px' }}>
                      {new Date(notif.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                {notif.metadata?.url && (
                  <Link
                    to={notif.metadata.url}
                    className="btn-glass"
                    style={{ fontSize: '0.75rem', padding: '6px 12px', whiteSpace: 'nowrap' }}
                  >
                    Ver ➔
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Wallet Recharge */}
      {activeTab === 'wallet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* MÉTODO 1: Recarga con Tarjeta de Crédito / Débito (Enlace Seguro Recurrente) */}
          {(config?.payment_methods_visibility?.payment_links !== false) && (
            <div className="glass-panel" style={{
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              border: '2px solid var(--border-cyan)',
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(13, 17, 26, 0.95) 100%)',
              boxShadow: '0 0 25px rgba(6, 182, 212, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <span style={{ fontSize: '1.8rem' }}>💳</span>
                <div>
                  <h3 style={{ fontSize: '1.2rem', margin: 0, color: '#fff', fontWeight: '900' }}>
                    Recarga con Tarjeta de Crédito / Débito (Enlace Seguro)
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>
                    Acepta Visa, Mastercard y tarjetas internacionales vía Recurrente
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Elige el monto que deseas recargar. El sistema te generará un enlace de pago único y exclusivo de un solo uso:
              </p>

              {/* Presets Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                {[5, 10, 20, 30, 50].map((amt) => {
                  const isSelected = linkDepositAmount === amt;
                  const gtqVal = (amt * Number(config?.usdt_gtq_rate || 7.80)).toFixed(2);

                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setLinkDepositAmount(amt);
                        setReservedLink(null);
                        setLinkReceiptPreview('');
                      }}
                      style={{
                        padding: '12px 8px',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.04)',
                        color: isSelected ? '#000' : '#fff',
                        border: isSelected ? 'none' : '1px solid var(--border-glass)',
                        fontWeight: '900',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 0 15px rgba(6, 182, 212, 0.4)' : 'none'
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>${amt} USD</span>
                      <span style={{ fontSize: '0.68rem', color: isSelected ? '#111' : '#fbbf24', fontWeight: 'bold' }}>Q{gtqVal} GTQ</span>
                    </button>
                  );
                })}
              </div>

              {!reservedLink ? (
                <button
                  type="button"
                  onClick={handleGetPaymentLink}
                  disabled={reservingLink}
                  className="btn-cyan"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '0.95rem',
                    fontWeight: '900',
                    letterSpacing: '0.03em'
                  }}
                >
                  {reservingLink ? 'Obteniendo enlace disponible...' : `🔗 Obtener Enlace de Pago por $${linkDepositAmount}.00 USD ➔`}
                </button>
              ) : (
                /* Reserved Payment Link Interactive Box */
                <div style={{
                  background: '#0d111a',
                  border: '1px solid var(--border-cyan)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enlace asignado (Uso Único): </span>
                      <strong style={{ color: '#fbbf24', fontSize: '0.95rem' }}>{reservedLink.identifier_tag || 'Link Activo'}</strong>
                    </div>
                    <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#34d399' }}>
                      ${reservedLink.amount_usd}.00 USD
                    </span>
                  </div>

                  {/* Step 1: Open Payment Link */}
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                      PASO 1: HAZ CLIC PARA PAGAR EN EL ENLACE SEGURO
                    </div>
                    <a
                      href={reservedLink.url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-cyan"
                      style={{
                        display: 'block',
                        textAlign: 'center',
                        padding: '14px',
                        textDecoration: 'none',
                        fontSize: '0.95rem',
                        fontWeight: '900',
                        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                        color: '#fff',
                        boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      💳 Abrir Enlace y Pagar ${reservedLink.amount_usd}.00 USD ➔
                    </a>
                  </div>

                  {/* Step 2: Upload Screenshot */}
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                      PASO 2: SUBE LA CAPTURA DEL COMPROBANTE DE PAGO
                    </div>

                    {linkReceiptPreview ? (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img
                          src={linkReceiptPreview}
                          alt="Comprobante enlace"
                          style={{
                            maxWidth: '220px',
                            maxHeight: '160px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid #34d399',
                            padding: '4px',
                            background: '#000'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setLinkReceiptPreview('')}
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            background: '#f87171',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            fontWeight: '900'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px dashed var(--border-cyan)',
                        background: 'rgba(6, 182, 212, 0.05)',
                        cursor: 'pointer',
                        gap: '6px'
                      }}>
                        <span style={{ fontSize: '1.4rem' }}>📸</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                          Adjuntar captura de pantalla del pago
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLinkReceiptChange}
                          style={{ display: 'none' }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Optional WhatsApp Button */}
                  <a
                    href={`https://wa.me/${(config?.social_links?.whatsapp || '50243130763').replace(/\+/g, '')}?text=${encodeURIComponent(`Hola ALVSHOP, acabo de pagar mi recarga de $${reservedLink.amount_usd} USD en el enlace ${reservedLink.identifier_tag || ''}. Adjunto comprobante. Mi cuenta: ${user.email}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      background: '#25D366',
                      color: '#fff',
                      textDecoration: 'none',
                      fontWeight: '800',
                      fontSize: '0.85rem'
                    }}
                  >
                    <span>💬</span> Enviar también por WhatsApp al Asesor
                  </a>

                  {/* Step 3: Confirm and Send */}
                  <button
                    type="button"
                    onClick={handleSubmitLinkPayment}
                    disabled={linkSubmitting || !linkReceiptPreview}
                    className="btn-cyan"
                    style={{
                      padding: '14px',
                      fontSize: '0.95rem',
                      fontWeight: '900'
                    }}
                  >
                    {linkSubmitting ? 'Registrando Solicitud...' : '📤 Enviar Comprobante y Acreditar Saldo ➔'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MÉTODO 2: Binance Pay Manual USDT Recharge */}
          {(config?.payment_methods_visibility?.binance !== false) && (
            <div className="glass-panel" style={{
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              border: '1px solid #f0b90b',
              background: 'linear-gradient(135deg, rgba(240, 185, 11, 0.08) 0%, rgba(13, 17, 26, 0.8) 100%)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.5rem' }}>🟡</span>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#f0b90b' }}>Recarga Manual con Binance Pay (USDT)</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Transfiere a nuestro Pay ID o QR y sube tu comprobante</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px', background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                {(config?.binance_qr_url || '/binance-qr.jpg') && (
                  <div style={{ width: '90px', height: '90px', borderRadius: '8px', background: '#000', border: '1px solid #f0b90b', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={config?.binance_qr_url || '/binance-qr.jpg'} alt="Binance QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                )}
                <div>
                  <div><strong>Binance Pay ID:</strong> <span style={{ color: '#f0b90b', fontWeight: '800', fontSize: '1rem' }}>{config?.binance_pay_id || '527653920'}</span></div>
                  <div><strong>Titular:</strong> {config?.binance_name || 'AlvJona'}</div>
                  {config?.binance_deeplink_url && (
                    <a
                      href={config.binance_deeplink_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-block', marginTop: '6px', padding: '4px 10px', background: '#f0b90b', color: '#000', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800', textDecoration: 'none' }}
                    >
                      ⚡ Abrir en Binance App ➔
                    </a>
                  )}
                </div>
              </div>

              <form onSubmit={(e) => {
                setDepositCurrency('Binance');
                handleRequestDeposit(e);
              }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Monto en USDT a Recargar:
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="5"
                    required
                    placeholder="Mínimo 5.00 USDT"
                    value={depositCurrency === 'Binance' ? depositAmount : ''}
                    onChange={(e) => {
                      setDepositCurrency('Binance');
                      setDepositAmount(e.target.value);
                    }}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#f0b90b', fontSize: '1rem', fontWeight: '800' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    ID de Transacción / Orden Binance (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 12938475"
                    value={receiptRef}
                    onChange={(e) => setReceiptRef(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.82rem' }}
                  />
                </div>

                {/* Upload Receipt */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    📸 Captura del Pago en Binance:
                  </label>
                  {receiptPreview ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img src={receiptPreview} alt="Comprobante" style={{ maxWidth: '200px', maxHeight: '140px', borderRadius: '6px', border: '1px solid #f0b90b' }} />
                      <button type="button" onClick={() => setReceiptPreview('')} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#f87171', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontWeight: '900' }}>✕</button>
                    </div>
                  ) : (
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(240, 185, 11, 0.15)', border: '1px solid #f0b90b', color: '#f0b90b', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer' }}>
                      <span>📸</span> Subir Captura
                      <input type="file" accept="image/*" onChange={handleReceiptChange} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={depositLoading}
                  className="btn-cyan"
                  style={{ background: '#f0b90b', color: '#000', fontWeight: '900', padding: '12px', boxShadow: '0 0 15px rgba(240, 185, 11, 0.3)' }}
                >
                  {depositLoading ? 'Enviando Solicitud...' : '📤 Enviar Comprobante Binance y Acreditar Saldo ➔'}
                </button>
              </form>
            </div>
          )}

          {/* MÉTODO 3: Multi-Currency Bank Transfers (GTQ, MXN, COP) */}
          <div className="glass-panel" style={{
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            border: '1px solid var(--border-cyan)'
          }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Recarga con Transferencia Bancaria Directa</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Transfiere en tu moneda local y un asesor validará tu comprobante para acreditar tu saldo de inmediato.
            </p>

            {/* Currency Selector Pills for Recharge */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {(config?.payment_methods_visibility?.gtq !== false) && (
                <button
                  type="button"
                  onClick={() => setDepositCurrency('GTQ')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-full)',
                    background: depositCurrency === 'GTQ' ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                    color: depositCurrency === 'GTQ' ? '#000' : '#fff',
                    border: '1px solid var(--border-glass)',
                    fontWeight: '800',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  🇬🇹 Guatemala (Quetzales GTQ)
                </button>
              )}

              {(config?.payment_methods_visibility?.mxn !== false) && (
                <button
                  type="button"
                  onClick={() => setDepositCurrency('MXN')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-full)',
                    background: depositCurrency === 'MXN' ? '#34d399' : 'rgba(255,255,255,0.05)',
                    color: depositCurrency === 'MXN' ? '#000' : '#fff',
                    border: '1px solid var(--border-glass)',
                    fontWeight: '800',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  🇲🇽 México (Pesos MXN / SPEI)
                </button>
              )}

              {(config?.payment_methods_visibility?.cop !== false) && (
                <button
                  type="button"
                  onClick={() => setDepositCurrency('COP')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-full)',
                    background: depositCurrency === 'COP' ? '#f59e0b' : 'rgba(255,255,255,0.05)',
                    color: depositCurrency === 'COP' ? '#000' : '#fff',
                    border: '1px solid var(--border-glass)',
                    fontWeight: '800',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  🇨🇴 Colombia (Pesos COP / Nequi)
                </button>
              )}
            </div>

            {/* Cuentas Bancarias Oficiales - SIEMPRE VISIBLES */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(13, 17, 26, 0.95) 100%)',
              border: '1px solid var(--border-cyan)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#fff' }}>
                  {depositCurrency === 'GTQ' && '🇬🇹 Cuentas Bancarias en Guatemala (Quetzales):'}
                  {depositCurrency === 'MXN' && '🇲🇽 Cuentas de Transferencia en México (SPEI):'}
                  {depositCurrency === 'COP' && '🇨🇴 Cuentas en Colombia (Nequi / Bancolombia):'}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.15)', padding: '3px 8px', borderRadius: '4px', fontWeight: '700' }}>
                  Tasa: 1 USDT = {depositCurrency === 'GTQ' ? `Q${Number(config?.usdt_gtq_rate || 7.80).toFixed(2)} GTQ` : depositCurrency === 'MXN' ? `$${Number(config?.usdt_mxn_rate || 19.50).toFixed(2)} MXN` : `$${Number(config?.usdt_cop_rate || 4100).toLocaleString('es-CO')} COP`}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {depositCurrency === 'GTQ' && (
                  (config?.bank_accounts && config.bank_accounts.length > 0
                    ? config.bank_accounts
                    : [
                        { bank: 'Banrural', account_number: '4313076359', type: 'Cuenta de Ahorro', name: 'Jonathan Alvares' },
                        { bank: 'Banco Industrial', account_number: '0854921003', type: 'Cuenta Monetaria', name: 'Jonathan Alvares' }
                      ]
                  ).map((acc, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(0, 0, 0, 0.4)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <div>
                        <div style={{ fontWeight: '800', color: '#fff', fontSize: '0.88rem' }}>
                          🏦 {acc.bank} — <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{acc.type}</span>
                        </div>
                        <div style={{ fontSize: '0.95rem', color: 'var(--accent-cyan)', fontWeight: '900', letterSpacing: '0.04em', marginTop: '2px' }}>
                          {acc.account_number}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Titular: <strong>{acc.name}</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(acc.account_number);
                          alert(`Número de cuenta ${acc.bank} copiado: ${acc.account_number}`);
                        }}
                        className="btn-glass"
                        style={{ fontSize: '0.75rem', padding: '6px 12px', borderColor: 'var(--border-cyan)' }}
                      >
                        📋 Copiar No.
                      </button>
                    </div>
                  ))
                )}

                {depositCurrency === 'MXN' && (
                  (config?.mxn_accounts && config.mxn_accounts.length > 0
                    ? config.mxn_accounts
                    : [{ bank: 'BBVA / SPEI', account_number: '012180015487965412', type: 'CLABE Interbancaria', name: 'Jonathan Alvares' }]
                  ).map((acc, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(0, 0, 0, 0.4)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <div>
                        <div style={{ fontWeight: '800', color: '#fff', fontSize: '0.88rem' }}>
                          🇲🇽 {acc.bank} — <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{acc.type}</span>
                        </div>
                        <div style={{ fontSize: '0.95rem', color: '#34d399', fontWeight: '900', letterSpacing: '0.04em', marginTop: '2px' }}>
                          {acc.account_number}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Titular: <strong>{acc.name}</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(acc.account_number);
                          alert(`CLABE / Cuenta ${acc.bank} copiada: ${acc.account_number}`);
                        }}
                        className="btn-glass"
                        style={{ fontSize: '0.75rem', padding: '6px 12px', borderColor: '#34d399' }}
                      >
                        📋 Copiar No.
                      </button>
                    </div>
                  ))
                )}

                {depositCurrency === 'COP' && (
                  (config?.cop_accounts && config.cop_accounts.length > 0
                    ? config.cop_accounts
                    : [{ bank: 'Bancolombia / Nequi', account_number: '3124567890', type: 'Nequi / Celular', name: 'Jonathan Alvares' }]
                  ).map((acc, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(0, 0, 0, 0.4)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <div>
                        <div style={{ fontWeight: '800', color: '#fff', fontSize: '0.88rem' }}>
                          🇨🇴 {acc.bank} — <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{acc.type}</span>
                        </div>
                        <div style={{ fontSize: '0.95rem', color: '#f59e0b', fontWeight: '900', letterSpacing: '0.04em', marginTop: '2px' }}>
                          {acc.account_number}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Titular: <strong>{acc.name}</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(acc.account_number);
                          alert(`Cuenta / Nequi ${acc.bank} copiada: ${acc.account_number}`);
                        }}
                        className="btn-glass"
                        style={{ fontSize: '0.75rem', padding: '6px 12px', borderColor: '#f59e0b' }}
                      >
                        📋 Copiar No.
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <form onSubmit={handleRequestDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Monto a Recargar (en USDT):
                  </label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>
                    Mínimo: $5.00 USDT
                  </span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="5"
                  required
                  placeholder="Mínimo 5.00 USDT"
                  value={depositCurrency !== 'Binance' ? depositAmount : ''}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#0d111a',
                    border: '1px solid var(--border-glass)',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: '700'
                  }}
                />
              </div>

              {depositAmount && depositCurrency !== 'Binance' && (
                <div style={{
                  background: 'rgba(6, 182, 212, 0.08)',
                  border: '1px solid var(--border-cyan)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.9rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: '700' }}>Total a transferir:</span>
                  <strong style={{ fontSize: '1.2rem', color: depositCurrency === 'MXN' ? '#34d399' : depositCurrency === 'COP' ? '#f59e0b' : '#fbbf24' }}>
                    {depositCurrency === 'GTQ' && `Q${(Number(depositAmount) * Number(config?.usdt_gtq_rate || 7.80)).toFixed(2)} GTQ`}
                    {depositCurrency === 'MXN' && `$${(Number(depositAmount) * Number(config?.usdt_mxn_rate || 19.50)).toFixed(2)} MXN`}
                    {depositCurrency === 'COP' && `$${Math.round(Number(depositAmount) * Number(config?.usdt_cop_rate || 4100)).toLocaleString('es-CO')} COP`}
                  </strong>
                </div>
              )}

              {/* WhatsApp Support Direct Button */}
              <div style={{
                background: 'rgba(37, 211, 102, 0.1)',
                border: '1px solid rgba(37, 211, 102, 0.3)',
                padding: '10px 14px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                  💬 <strong>¿Dudas con tu transferencia o recarga?</strong>
                </div>
                <a
                  href={`https://wa.me/${(config?.social_links?.whatsapp || '50243130763').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola soporte de ALVSHOP, necesito ayuda con mi recarga de saldo por ${depositCurrency}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#25D366',
                    color: '#000',
                    fontWeight: '800',
                    fontSize: '0.78rem',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    textDecoration: 'none'
                  }}
                >
                  <span>💬</span> Contactar por WhatsApp
                </a>
              </div>

              {/* Upload Payment Receipt (Boleta) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  📸 Comprobante de Pago / Boleta (Foto o Captura):
                </label>
                
                {receiptPreview ? (
                  <div style={{ position: 'relative', display: 'inline-block', marginBottom: '8px' }}>
                    <img
                      src={receiptPreview}
                      alt="Vista previa boleta"
                      style={{
                        width: '100%',
                        maxWidth: '220px',
                        maxHeight: '160px',
                        objectFit: 'contain',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-cyan)',
                        background: '#0d111a',
                        padding: '4px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setReceiptPreview('')}
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        background: '#f87171',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        fontWeight: '900',
                        fontSize: '0.8rem'
                      }}
                      title="Eliminar comprobante"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--border-cyan)',
                    background: 'rgba(6, 182, 212, 0.03)',
                    cursor: 'pointer',
                    gap: '6px'
                  }}>
                    <span style={{ fontSize: '1.4rem' }}>📎</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                      Toca aquí para seleccionar tu comprobante
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      (Formatos: JPG, PNG, captura de pantalla)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>

              {/* Reference Number Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  No. de Boleta o Referencia (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej. 12938475"
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#0d111a',
                    border: '1px solid var(--border-glass)',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <button type="submit" disabled={depositLoading} className="btn-cyan" style={{ padding: '12px', fontWeight: '800' }}>
                {depositLoading ? 'Enviando Solicitud...' : 'Solicitar Recarga Manual ➔'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
