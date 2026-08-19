import React from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function BottomBar() {
  const { role } = useApp();
  const isAdminOrAdvisor = role === 'Admin' || role === 'Asesor';

  const navItems = [
    { to: '/', label: 'Tienda', icon: '🛍️' },
    { to: '/feed', label: 'Feed', icon: '🌐' },
    { to: '/profile', label: 'Perfil', icon: '👤' },
    ...(isAdminOrAdvisor ? [{ to: '/admin', label: 'Admin', icon: '👑' }] : [])
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 40,
      backgroundColor: 'rgba(10, 13, 20, 0.95)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border-glass)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      height: '64px',
      padding: '0 8px',
      boxShadow: '0 -10px 25px rgba(0, 0, 0, 0.5)'
    }}>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            height: '100%',
            color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            position: 'relative'
          })}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  width: '32px',
                  height: '3px',
                  background: 'var(--accent-cyan)',
                  borderRadius: 'var(--radius-full)',
                  boxShadow: '0 0 10px var(--accent-cyan)'
                }} />
              )}
              <span style={{ fontSize: '1.25rem', marginBottom: '2px' }}>{item.icon}</span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: isActive ? '700' : '500',
                letterSpacing: '-0.01em'
              }}>
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
