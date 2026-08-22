import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Header({ onToggleSidebar }) {
  const {
    walletBalance,
    currency,
    toggleCurrency,
    config,
    user,
    profile,
    role,
    notifications,
    unreadCount,
    clearAllNotifications
  } = useApp();

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);
  const navigate = useNavigate();

  // Helper to get notification type label & badge styling
  const getTypeBadge = (type) => {
    switch (type) {
      case 'order_created':
        return { label: 'PEDIDO CREADO', icon: '🛒', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)' };
      case 'order_completed':
        return { label: 'ENTREGA EXITOSA', icon: '🎉', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' };
      case 'admin_new_order':
        return { label: 'VENTA EN TIENDA', icon: '💰', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' };
      case 'support_reply':
      case 'admin_support_message':
        return { label: 'SOPORTE TÉCNICO', icon: '💬', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)' };
      case 'feed_interaction':
        return { label: 'COMUNIDAD', icon: '❤️', color: '#f472b6', bg: 'rgba(244, 114, 182, 0.15)' };
      default:
        return { label: 'NOTIFICACIÓN', icon: '🔔', color: 'var(--accent-cyan)', bg: 'rgba(6, 182, 212, 0.15)' };
    }
  };

  return (
    <>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backgroundColor: 'rgba(10, 13, 20, 0.94)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-glass)'
      }}>
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '62px',
          gap: '8px'
        }}>
          {/* Left: Hamburger & Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <button
              onClick={onToggleSidebar}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-main)',
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                flexShrink: 0,
                transition: 'all 0.2s ease'
              }}
              title="Abrir Menú"
            >
              ☰
            </button>

            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
              {config.logo_url ? (
                <img 
                  src={config.logo_url} 
                  alt={config.site_title} 
                  style={{ height: '32px', objectFit: 'contain' }} 
                />
              ) : (
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: '900',
                  letterSpacing: '-0.03em',
                  background: 'linear-gradient(135deg, #fff 40%, var(--accent-cyan) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap'
                }}>
                  <span style={{ color: 'var(--accent-cyan)', WebkitTextFillColor: 'var(--accent-cyan)' }}>ALV</span>SHOP
                </div>
              )}
            </Link>
          </div>

          {/* Right: Notifications, Currency Toggle & Wallet */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>

            {/* Notification Bell with Badge */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotificationsDrawer(!showNotificationsDrawer)}
                style={{
                  background: unreadCount > 0 ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: unreadCount > 0 ? '1px solid var(--border-cyan)' : '1px solid var(--border-glass)',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  position: 'relative'
                }}
                title="Notificaciones en Tiempo Real"
              >
                🔔
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-3px',
                    right: '-3px',
                    background: '#f87171',
                    color: '#fff',
                    borderRadius: '50%',
                    fontSize: '0.6rem',
                    fontWeight: '800',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 8px rgba(248, 113, 113, 0.6)'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Responsive Notifications Dropdown with Backdrop */}
              {showNotificationsDrawer && (
                <>
                  <div
                    onClick={() => setShowNotificationsDrawer(false)}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 90,
                      background: 'rgba(0,0,0,0.4)'
                    }}
                  />

                  <div className="glass-panel animate-fade" style={{
                    position: 'absolute',
                    top: '44px',
                    right: 0,
                    width: 'min(340px, 90vw)',
                    maxHeight: '460px',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-cyan)',
                    boxShadow: '0 12px 35px rgba(0,0,0,0.8)',
                    padding: '16px',
                    zIndex: 100,
                    background: 'rgba(13, 17, 26, 0.97)',
                    backdropFilter: 'blur(20px)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
                      <div style={{ fontWeight: '800', fontSize: '0.88rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🔔</span> Notificaciones & Alertas
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {notifications.length > 0 && (
                          <button
                            onClick={clearAllNotifications}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer' }}
                          >
                            Limpiar
                          </button>
                        )}
                        <button
                          onClick={() => setShowNotificationsDrawer(false)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, paddingRight: '4px' }}>
                      {notifications.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                          <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>🔕</div>
                          <div style={{ fontSize: '0.82rem' }}>No tienes notificaciones pendientes</div>
                        </div>
                      ) : (
                        notifications.map((notif) => {
                          const badge = getTypeBadge(notif.type);
                          return (
                            <div
                              key={notif.id}
                              style={{
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-md)',
                                background: notif.is_read ? 'rgba(255, 255, 255, 0.02)' : 'rgba(6, 182, 212, 0.08)',
                                border: notif.is_read ? '1px solid var(--border-glass)' : '1px solid var(--border-cyan)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: '800',
                                  color: badge.color,
                                  background: badge.bg,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <span>{badge.icon}</span> {badge.label}
                                </span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                  {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#fff' }}>
                                {notif.title}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                                {notif.body}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Currency Pill Switcher */}
            <div
              onClick={toggleCurrency}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.06)',
                borderRadius: 'var(--radius-full)',
                padding: '2px',
                border: '1px solid var(--border-glass)',
                cursor: 'pointer',
                fontSize: '0.68rem'
              }}
              title="Cambiar moneda (USDT / GTQ Quetzales)"
            >
              <div style={{
                padding: '3px 7px',
                borderRadius: 'var(--radius-full)',
                fontWeight: '800',
                background: currency === 'USDT' ? 'var(--accent-cyan)' : 'transparent',
                color: currency === 'USDT' ? '#000' : 'var(--text-muted)',
                transition: 'all 0.2s ease'
              }}>
                USDT
              </div>
              <div style={{
                padding: '3px 7px',
                borderRadius: 'var(--radius-full)',
                fontWeight: '800',
                background: currency === 'GTQ' ? 'var(--accent-cyan)' : 'transparent',
                color: currency === 'GTQ' ? '#000' : 'var(--text-muted)',
                transition: 'all 0.2s ease'
              }}>
                GTQ
              </div>
            </div>

            {/* Permanent Wallet Balance Indicator (Responsive Compact) */}
            <button
              onClick={() => user ? setShowWalletModal(true) : navigate('/profile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.5) 0%, rgba(6, 182, 212, 0.2) 100%)',
                border: '1px solid var(--border-cyan)',
                borderRadius: 'var(--radius-full)',
                padding: '5px 10px',
                cursor: 'pointer',
                color: 'var(--text-main)',
                transition: 'all 0.2s ease',
                boxShadow: '0 0 10px rgba(6, 182, 212, 0.15)',
                whiteSpace: 'nowrap'
              }}
              title="Saldo de tu Billetera"
            >
              <span style={{ fontSize: '0.9rem' }}>💎</span>
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--accent-cyan)' }}>
                ${walletBalance.toFixed(2)}
              </span>
            </button>

          </div>
        </div>
      </header>

      {/* Wallet Info Modal */}
      {showWalletModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          backgroundColor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel animate-fade" style={{
            width: '100%',
            maxWidth: '420px',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            border: '1px solid var(--border-cyan)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>💎</span> Billetera ALV
              </h3>
              <button 
                onClick={() => setShowWalletModal(false)}
                style={{ background: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{
              background: 'rgba(30, 58, 138, 0.25)',
              border: '1px solid var(--border-cyan)',
              borderRadius: 'var(--radius-md)',
              padding: '18px',
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Saldo Disponible</div>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--accent-cyan)' }}>
                ${walletBalance.toFixed(2)} <span style={{ fontSize: '1rem' }}>USDT</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Equivalente aproximado: Q{(walletBalance * 7.8).toFixed(2)} GTQ
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                className="btn-cyan"
                onClick={() => {
                  setShowWalletModal(false);
                  navigate('/profile?tab=wallet');
                }}
                style={{ width: '100%' }}
              >
                ➕ Recargar Saldo Billetera
              </button>
              <button
                className="btn-glass"
                onClick={() => {
                  setShowWalletModal(false);
                  navigate('/profile?tab=orders');
                }}
                style={{ width: '100%' }}
              >
                📦 Ver Historial de Pedidos
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
