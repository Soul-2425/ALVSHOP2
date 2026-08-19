import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Header({ onToggleSidebar }) {
  const { walletBalance, currency, toggleCurrency, config, user, profile, role } = useApp();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backgroundColor: 'rgba(10, 13, 20, 0.85)',
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

          {/* Right: Currency Toggle & Wallet */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            
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
