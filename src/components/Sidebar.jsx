import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { supabase } from '../supabaseClient';

export default function Sidebar({ isOpen, onClose }) {
  const { user, profile, role } = useApp();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  const navLinks = [
    { label: '🛍️ Catálogo de Productos', path: '/' },
    { label: '👤 Mi Perfil & Billetera', path: '/profile' },
    { label: '🌐 Comunidad & Feed', path: '/feed' },
    { label: '🎧 Soporte Técnico', path: '/support' },
    { label: 'ℹ️ Sobre Nosotros', path: '/about' },
    { label: '📞 Contactos', path: '/contact' },
    { label: '📜 Términos y Condiciones', path: '/terms' },
    { label: '🔒 Políticas de Privacidad', path: '/privacy' },
  ];

  const isAdminOrAdvisor = role === 'Admin' || role === 'Asesor';

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(6px)',
            zIndex: 50,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* Drawer */}
      <aside style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '300px',
        maxWidth: '85vw',
        backgroundColor: '#0d111a',
        borderRight: '1px solid var(--border-glass)',
        boxShadow: '10px 0 30px rgba(0, 0, 0, 0.6)',
        zIndex: 51,
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto'
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid var(--border-glass)',
          background: 'linear-gradient(180deg, rgba(30, 58, 138, 0.3) 0%, transparent 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: '900',
              background: 'linear-gradient(135deg, #fff 40%, var(--accent-cyan) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              ALVSHOP
            </div>
            {user && (
              <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="badge-cyan" style={{ fontSize: '0.65rem' }}>{role}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {profile?.full_name || user.email}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              color: 'var(--text-muted)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* Navigation List */}
        <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navLinks.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-main)',
                  backgroundColor: isActive ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                  border: isActive ? '1px solid var(--border-cyan)' : '1px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                {item.label}
              </Link>
            );
          })}

          {/* Admin Backoffice Section */}
          {isAdminOrAdvisor && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-glass)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', paddingLeft: '16px', marginBottom: '6px', fontWeight: '800', letterSpacing: '0.05em' }}>
                ADMINISTRACIÓN
              </div>
              <Link
                to="/admin"
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  color: '#fff',
                  background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.6) 0%, rgba(6, 182, 212, 0.3) 100%)',
                  border: '1px solid var(--border-cyan)'
                }}
              >
                👑 Panel de Control (Backoffice)
              </Link>
            </div>
          )}
        </nav>

        {/* Footer Login/Logout */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-glass)' }}>
          {user ? (
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '10px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                borderRadius: 'var(--radius-md)',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🚪 Cerrar Sesión
            </button>
          ) : (
            <Link
              to="/profile"
              onClick={onClose}
              className="btn-cyan"
              style={{ width: '100%', textDecoration: 'none' }}
            >
              🔑 Iniciar Sesión / Registro
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
