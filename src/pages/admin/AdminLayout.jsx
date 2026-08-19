import React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export default function AdminLayout() {
  const { role, user, isLoading } = useApp();

  if (isLoading) {
    return <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>Cargando panel...</div>;
  }

  // Not logged in
  if (!user) {
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '480px' }}>
        <div className="glass-panel" style={{ padding: '32px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-cyan)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔑</div>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Iniciar Sesión Requerido</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
            Debes iniciar sesión con tu cuenta de Administrador para gestionar la tienda.
          </p>
          <Link to="/profile" className="btn-cyan" style={{ padding: '12px 24px', fontSize: '0.9rem' }}>
            Ir a Iniciar Sesión ➔
          </Link>
        </div>
      </div>
    );
  }

  // Protect Admin Route (Case-insensitive check for Admin / Asesor)
  const normalizedRole = role ? String(role).trim().toLowerCase() : '';
  const isAdminOrAdvisor = normalizedRole === 'admin' || normalizedRole === 'asesor';

  if (!isAdminOrAdvisor) {
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '500px' }}>
        <div className="glass-panel" style={{ padding: '30px', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🔒</div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Acceso Restringido</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '12px' }}>
            Esta sección es exclusiva para el equipo de Administración y Asesores de ALVSHOP.
          </p>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Tu usuario actual: <strong>{user.email}</strong> (Rol: <span style={{ color: 'var(--accent-cyan)' }}>{role || 'Sin Rol'}</span>)
          </div>
          <Link to="/" className="btn-cyan">
            Volver a la Tienda
          </Link>
        </div>
      </div>
    );
  }

  const adminMenu = [
    { to: '/admin', end: true, label: '📊 Dashboard & Analítica', icon: '📈' },
    { to: '/admin/users', label: '👥 Usuarios y Roles', icon: '👤' },
    { to: '/admin/products', label: '📦 Productos & 3 Precios', icon: '🏷️' },
    { to: '/admin/streaming', label: '🎬 Stock Streaming', icon: '🔑' },
    { to: '/admin/coupons', label: '🎁 Cupones & Promos', icon: '🎟️' },
    { to: '/admin/finance', label: '💰 Finanzas & Tasa GTQ', icon: '💵' },
    { to: '/admin/branding', label: '🎨 Branding, Colores & SEO', icon: '✨' },
  ];

  return (
    <div className="container" style={{ paddingTop: '20px', paddingBottom: '60px' }}>
      {/* Admin Top Header */}
      <div className="glass-panel" style={{
        borderRadius: 'var(--radius-lg)',
        padding: '16px 24px',
        marginBottom: '20px',
        border: '1px solid var(--border-cyan)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.5rem' }}>👑</span>
          <div>
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Panel de Control Backoffice</h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>ALVSHOP Management System</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="badge-cyan">{role}</span>
          <NavLink to="/" className="btn-glass" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
            🏪 Ver Tienda
          </NavLink>
        </div>
      </div>

      {/* Admin Horizontal Tabs Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '12px',
        marginBottom: '20px',
        scrollbarWidth: 'none'
      }}>
        {adminMenu.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={({ isActive }) => ({
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: '700',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              background: isActive ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.04)',
              color: isActive ? '#000' : 'var(--text-main)',
              border: isActive ? 'none' : '1px solid var(--border-glass)',
              boxShadow: isActive ? '0 0 15px rgba(6, 182, 212, 0.4)' : 'none'
            })}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* Admin Subpage Outlet */}
      <Outlet />
    </div>
  );
}
