import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';

export default function Profile() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'orders';

  const { user, profile, role, walletBalance, config, fetchProfile } = useApp();
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

  const normalizedRole = role ? String(role).trim().toLowerCase() : '';
  const isAdminOrAdvisor = normalizedRole === 'admin' || normalizedRole === 'asesor';

  // Load User Orders
  useEffect(() => {
    async function loadOrders() {
      if (!user) return;
      setLoadingOrders(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(name, image_url))')
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
  }, [user]);

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

  // Handle Wallet Recharge Request
  const handleRequestDeposit = async (e) => {
    e.preventDefault();
    if (!depositAmount || Number(depositAmount) <= 0) return;
    setDepositLoading(true);

    try {
      const { data, error } = await supabase.from('orders').insert({
        user_id: user.id,
        total_usdt: Number(depositAmount),
        total_gtq: Number((Number(depositAmount) * 7.8).toFixed(2)),
        status: 'Verification',
        payment_method: 'Manual',
        customer_notes: 'Recarga de Billetera Interna'
      }).select().single();

      if (error) throw error;
      alert('¡Solicitud de recarga enviada! Realiza la transferencia en Quetzales y un asesor acreditará tus USDT.');
      setDepositAmount('');
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
              fontSize: '0.8rem',
              marginBottom: '16px'
            }}>
              ⚠️ {authError}
            </div>
          )}

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {isSignUp && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Jonathan Álvarez"
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="+502 1234 5678"
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Código de Referido (Opcional)</label>
                  <input
                    type="text"
                    placeholder="ALV-XXXX"
                    value={referralInput}
                    onChange={(e) => setReferralInput(e.target.value)}
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
        <div style={{
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.5) 0%, rgba(6, 182, 212, 0.25) 100%)',
          border: '1px solid var(--border-cyan)',
          boxShadow: '0 4px 20px rgba(6, 182, 212, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>👑</span> Panel de Control (Backoffice)
            </div>
            <div style={{ fontSize: '0.78rem', color: '#a5f3fc', marginTop: '2px' }}>
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

      {/* Profile Subtabs */}
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

      {/* Tab: Orders History */}
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
                Verification: 'En Verificación',
                Pending: 'Pendiente',
                Rejected: 'Rechazado'
              };

              return (
                <div key={ord.id} className="glass-panel" style={{
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  border: '1px solid var(--border-glass)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Orden #{ord.id.slice(0, 8)} • {new Date(ord.created_at).toLocaleDateString()}
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: `${statusColors[ord.status]}22`,
                      color: statusColors[ord.status],
                      border: `1px solid ${statusColors[ord.status]}44`
                    }}>
                      {statusLabels[ord.status] || ord.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      {ord.order_items?.map((item) => (
                        <div key={item.id} style={{ fontWeight: '700', fontSize: '0.9rem' }}>
                          {item.products?.name || 'Recarga Digital'} (x{item.quantity})
                        </div>
                      ))}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Método: {ord.payment_method === 'Wallet' ? 'Billetera USDT' : 'Transferencia Quetzales'}
                      </div>
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--accent-cyan)' }}>
                      ${Number(ord.total_usdt).toFixed(2)} USDT
                    </div>
                  </div>

                  {/* Credentials delivery display (for streaming accounts) */}
                  {ord.order_items?.some(i => i.credentials_delivered) && (
                    <div style={{
                      marginTop: '10px',
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(6, 182, 212, 0.1)',
                      border: '1px solid var(--border-cyan)',
                      fontSize: '0.8rem'
                    }}>
                      <strong>Credenciales Entregadas:</strong> {ord.order_items.find(i => i.credentials_delivered)?.credentials_delivered}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Wallet Top-Up Request */}
      {activeTab === 'wallet' && (
        <div className="glass-panel" style={{
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          border: '1px solid var(--border-cyan)'
        }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Solicitar Recarga a Billetera</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Las recargas a tu billetera base se acreditan en USDT al realizar una transferencia bancaria equivalente en Quetzales.
          </p>

          <form onSubmit={handleRequestDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Monto a Recargar (en USDT):
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                required
                placeholder="Ej. 10.00"
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
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem'
              }}>
                <div>Total a transferir en Quetzales: <strong>Q{(Number(depositAmount) * 7.8).toFixed(2)} GTQ</strong></div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Cuenta Banrural: 4313076359 (Jonathan Alvares)
                </div>
              </div>
            )}

            <button type="submit" disabled={depositLoading} className="btn-cyan" style={{ padding: '12px' }}>
              {depositLoading ? 'Enviando...' : 'Solicitar Recarga ➔'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
