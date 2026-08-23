import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import BinancePayModal from '../components/BinancePayModal';
import { requestPushPermission, getPushPermissionStatus } from '../../notificaciones y apis/notificaciones/pushService';

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

  // Wallet Top-up State
  const [depositAmount, setDepositAmount] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [showBinanceModal, setShowBinanceModal] = useState(false);
  const [binanceDepositAmount, setBinanceDepositAmount] = useState('10');
  const [receiptPreview, setReceiptPreview] = useState('');
  const [receiptRef, setReceiptRef] = useState('');

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
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            unit_price,
            credentials_delivered,
            fields_data,
            products (id, name, image_url)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data && !error) {
        setOrders(data);
      }
      setLoadingOrders(false);
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

  // Handle Wallet Recharge Request (Manual Quetzales)
  const handleRequestDeposit = async (e) => {
    e.preventDefault();
    const amount = Number(depositAmount);
    if (!depositAmount || isNaN(amount) || amount < 5) {
      alert('⚠️ El monto mínimo para recargar saldo es de $5.00 USDT.');
      return;
    }
    setDepositLoading(true);

    try {
      const currentRate = Number(config?.usdt_gtq_rate || 7.80);
      const totalGtq = Number((amount * currentRate).toFixed(2));
      const noteDetails = receiptRef.trim() ? `Recarga de Billetera Interna | Ref: ${receiptRef.trim()}` : 'Recarga de Billetera Interna';

      const { data, error } = await supabase.from('orders').insert({
        user_id: user.id,
        total_usdt: amount,
        total_gtq: totalGtq,
        status: 'Verification',
        payment_method: 'Manual',
        customer_notes: noteDetails,
        bank_receipt_url: receiptPreview || null
      }).select().single();

      if (error) throw error;
      alert(`¡Solicitud de recarga por $${amount.toFixed(2)} USDT (Q${totalGtq.toFixed(2)} GTQ) enviada con éxito!\nUn asesor validará tu comprobante para acreditar tu saldo de inmediato.`);
      setDepositAmount('');
      setReceiptPreview('');
      setReceiptRef('');
      setActiveTab('orders');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setDepositLoading(false);
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Binance Pay Automated Instant Recharge */}
          <div className="glass-panel" style={{
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            border: '1px solid #f0b90b',
            background: 'linear-gradient(135deg, rgba(240, 185, 11, 0.08) 0%, rgba(13, 17, 26, 0.8) 100%)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.5rem' }}>🟡</span>
              <div>
                <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#f0b90b' }}>Recarga Instantánea con Binance Pay (USDT)</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Acreditación automática en menos de 1 minuto</div>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Ingresa el monto que deseas recargar a tu billetera (mínimo $5.00 USDT) y escanea el código con tu App de Binance:
            </p>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '150px' }}>
                <input
                  type="number"
                  step="1"
                  min="5"
                  value={binanceDepositAmount}
                  onChange={(e) => setBinanceDepositAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#0d111a',
                    border: '1px solid var(--border-glass)',
                    color: '#f0b90b',
                    fontSize: '1.1rem',
                    fontWeight: '800'
                  }}
                />
                <span style={{ position: 'absolute', right: '12px', top: '10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  USDT
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const amt = Number(binanceDepositAmount);
                  if (!binanceDepositAmount || isNaN(amt) || amt < 5) {
                    alert('⚠️ El monto mínimo para recargar con Binance Pay es de $5.00 USDT.');
                    return;
                  }
                  setShowBinanceModal(true);
                }}
                className="btn-cyan"
                style={{
                  background: '#f0b90b',
                  color: '#000',
                  fontWeight: '800',
                  padding: '11px 20px',
                  boxShadow: '0 0 15px rgba(240, 185, 11, 0.4)'
                }}
              >
                ⚡ Recargar con Binance Pay ➔
              </button>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              ⚠️ Monto mínimo de recarga: $5.00 USDT
            </div>
          </div>

          {/* Manual Bank Transfer Deposit */}
          <div className="glass-panel" style={{
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            border: '1px solid var(--border-cyan)'
          }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Recarga con Transferencia Bancaria (Quetzales)</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Transfiere en Quetzales a nuestras cuentas y un asesor validará tu boleta para acreditar tus USDT inmediatamente.
            </p>

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
                  value={depositAmount}
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

              {depositAmount && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total a transferir:</span>
                    <strong style={{ fontSize: '1.1rem', color: '#fbbf24' }}>
                      Q{(Number(depositAmount) * Number(config?.usdt_gtq_rate || exchangeRate || 7.80)).toFixed(2)} GTQ
                    </strong>
                  </div>
                  
                  <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <div style={{ fontWeight: '700', color: '#fff', marginBottom: '4px' }}>Cuentas Disponibles para Transferir:</div>
                    {config?.bank_accounts && config.bank_accounts.length > 0 ? (
                      config.bank_accounts.map((acc, idx) => (
                        <div key={idx} style={{ marginBottom: '4px', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '4px' }}>
                          🏦 <strong>{acc.bank}</strong> ({acc.type || 'Ahorro'}): <span style={{ color: 'var(--accent-cyan)' }}>{acc.account_number}</span> — {acc.name}
                        </div>
                      ))
                    ) : (
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '4px' }}>
                        🏦 <strong>Banrural Cuenta de Ahorro:</strong> <span style={{ color: 'var(--accent-cyan)' }}>4313076359</span> (Jonathan Alvares)
                      </div>
                    )}
                  </div>
                </div>
              )}

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

      {/* Binance Pay Deposit Modal */}
      <BinancePayModal
        isOpen={showBinanceModal}
        onClose={() => setShowBinanceModal(false)}
        orderData={{ id: `WALLET-DEP-${Date.now()}` }}
        amountUsdt={Number(binanceDepositAmount || 10)}
        description="Recarga de Billetera ALVSHOP"
        isWalletDeposit={true}
        onPaymentSuccess={({ amount }) => {
          alert(`¡Recarga de $${amount} USDT acreditada a tu billetera con éxito!`);
          setShowBinanceModal(false);
          if (user?.id) fetchProfile(user.id);
        }}
      />
    </div>
  );
}
