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
    clearAllNotifications,
    isMuted,
    toggleMute
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
        backgroundColor: 'rgba(10, 13, 20, 0.88)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-glass)'
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '68px',
          gap: '12px'
        }}>
          {/* Left: Hamburger & Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={onToggleSidebar}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-main)',
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                transition: 'all 0.2s ease'
              }}
              title="Abrir Menú"
            >
              ☰
            </button>

            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {config.logo_url ? (
                <img 
                  src={config.logo_url} 
                  alt={config.site_title} 
                  style={{ height: '38px', objectFit: 'contain' }} 
                />
              ) : (
                <div style={{
                  fontSize: '1.4rem',
                  fontWeight: '900',
                  letterSpacing: '-0.03em',
                  background: 'linear-gradient(135deg, #fff 40%, var(--accent-cyan) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ color: 'var(--accent-cyan)', WebkitTextFillColor: 'var(--accent-cyan)' }}>ALV</span>SHOP
                </div>
              )}
            </Link>
          </div>

          {/* Right: Sound, Notifications, Currency Toggle & Wallet */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            
            {/* Audio Mute/Unmute Toggle */}
            <button
              onClick={toggleMute}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-glass)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.9rem',
                color: isMuted ? 'var(--text-muted)' : 'var(--accent-cyan)'
              }}
              title={isMuted ? 'Activar Sonidos de Alerta' : 'Silenciar Sonidos'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>

            {/* Notification Bell with Badge */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotificationsDrawer(!showNotificationsDrawer)}
                style={{
                  background: unreadCount > 0 ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: unreadCount > 0 ? '1px solid var(--border-cyan)' : '1px solid var(--border-glass)',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
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
                    fontSize: '0.65rem',
                    fontWeight: '800',
                    width: '18px',
                    height: '18px',
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
                  {/* Backdrop Click Outside */}
                  <div
                    onClick={() => setShowNotificationsDrawer(false)}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 90,
                      background: 'rgba(0,0,0,0.3)'
                    }}
                  />

                  {/* Dropdown Panel */}
                  <div className="glass-panel animate-fade" style={{
                    position: 'absolute',
                    top: '46px',
                    right: 0,
                    width: 'min(360px, 92vw)',
                    maxHeight: '480px',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-cyan)',
                    boxShadow: '0 12px 35px rgba(0,0,0,0.75)',
                    padding: '16px',
                    zIndex: 100,
                    background: 'rgba(13, 17, 26, 0.96)',
                    backdropFilter: 'blur(20px)'
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
                      <div style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
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

                    {/* Notifications List */}
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
                      {notifications.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>📭</div>
                          No tienes notificaciones pendientes.
                        </div>
                      ) : (
                        notifications.map((n) => {
                          const badge = getTypeBadge(n.type);
                          return (
                            <div
                              key={n.id}
                              onClick={() => {
                                if (n.metadata?.url) {
                                  navigate(n.metadata.url);
                                  setShowNotificationsDrawer(false);
                                }
                              }}
                              style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: 'var(--radius-md)',
                                padding: '10px 12px',
                                cursor: n.metadata?.url ? 'pointer' : 'default',
                                border: '1px solid var(--border-glass)',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: '800',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: badge.bg,
                                  color: badge.color
                                }}>
                                  {badge.icon} {badge.label}
                                </span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                  {new Date(n.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#fff', marginTop: '2px' }}>
                                {n.title}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                                {n.body}
                              </div>

                              {n.metadata?.url && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: '700', marginTop: '4px', textAlign: 'right' }}>
                                  Ver detalle ➔
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer link to Profile Notifications */}
                    <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '10px', marginTop: '8px', textAlign: 'center' }}>
                      <Link
                        to="/profile?tab=notifications"
                        onClick={() => setShowNotificationsDrawer(false)}
                        style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: '700' }}
                      >
                        Ver todas mis notificaciones ➔
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Currency Selector (Toggle USDT / GTQ) */}
            <div
              onClick={toggleCurrency}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(17, 24, 39, 0.9)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-full)',
                padding: '3px',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.25s ease'
              }}
              title="Cambiar moneda de visualización"
            >
              <div style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: '700',
                background: currency === 'USDT' ? 'var(--accent-cyan)' : 'transparent',
                color: currency === 'USDT' ? '#000' : 'var(--text-muted)',
                transition: 'all 0.2s ease'
              }}>
                USDT
              </div>
              <div style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: '700',
                background: currency === 'GTQ' ? 'var(--accent-cyan)' : 'transparent',
                color: currency === 'GTQ' ? '#000' : 'var(--text-muted)',
                transition: 'all 0.2s ease'
              }}>
                GTQ
              </div>
            </div>

            {/* Permanent Wallet Balance Indicator */}
            <button
              onClick={() => user ? setShowWalletModal(true) : navigate('/profile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(6, 182, 212, 0.15) 100%)',
                border: '1px solid var(--border-cyan)',
                borderRadius: 'var(--radius-full)',
                padding: '6px 14px',
                cursor: 'pointer',
                color: 'var(--text-main)',
                transition: 'all 0.2s ease',
                boxShadow: '0 0 10px rgba(6, 182, 212, 0.15)'
              }}
              title="Saldo de tu Billetera - Haz clic para ver pedidos y recargas"
            >
              <span style={{ fontSize: '1rem' }}>💎</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '600', lineHeight: 1 }}>SALDO</div>
                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--accent-cyan)', lineHeight: 1.2 }}>
                  ${walletBalance.toFixed(2)} <span style={{ fontSize: '0.7rem' }}>USDT</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Wallet Info / Order History Modal */}
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
            maxWidth: '440px',
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
