import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export default function BottomBar() {
  const location = useLocation();

  // Clean SVG Icons tailored to reference
  const icons = {
    home: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#06b6d4' : '#8e9aa8'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    shop: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#06b6d4' : '#8e9aa8'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
    wallet: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#06b6d4' : '#8e9aa8'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="3" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <path d="M16 14h2" />
      </svg>
    ),
    likes: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#06b6d4' : '#8e9aa8'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
      </svg>
    ),
    profile: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#06b6d4' : '#8e9aa8'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    )
  };

  const navItems = [
    {
      id: 'inicio',
      to: '/',
      label: 'Inicio',
      iconKey: 'home',
      checkActive: (loc) => loc.pathname === '/' && !loc.hash.includes('catalogo')
    },
    {
      id: 'tienda',
      to: '/#catalogo',
      label: 'Tienda',
      iconKey: 'shop',
      checkActive: (loc) => loc.pathname.startsWith('/product') || loc.hash === '#catalogo'
    },
    {
      id: 'billetera',
      to: '/profile?tab=wallet',
      label: 'Billetera',
      iconKey: 'wallet',
      checkActive: (loc) => loc.pathname === '/profile' && loc.search.includes('tab=wallet')
    },
    {
      id: 'likes',
      to: '/likes',
      label: 'Likes',
      iconKey: 'likes',
      checkActive: (loc) => loc.pathname === '/likes'
    },
    {
      id: 'perfil',
      to: '/profile',
      label: 'Perfil',
      iconKey: 'profile',
      checkActive: (loc) => loc.pathname === '/profile' && !loc.search.includes('tab=wallet')
    }
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: 'max(14px, env(safe-area-inset-bottom, 14px))',
      left: '12px',
      right: '12px',
      maxWidth: '480px',
      margin: '0 auto',
      zIndex: 50,
      pointerEvents: 'none'
    }}>
      <nav style={{
        pointerEvents: 'auto',
        width: '100%',
        backgroundColor: 'rgba(13, 17, 26, 0.88)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        borderRadius: '26px',
        border: '1px solid rgba(6, 182, 212, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 6px 8px 6px',
        boxSizing: 'border-box',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.75), 0 0 25px rgba(6, 182, 212, 0.12)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle Top Glowing Line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '15%',
          right: '15%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.6), transparent)'
        }} />

        {navItems.map((item) => {
          const isActive = item.checkActive ? item.checkActive(location) : location.pathname === item.to;

          return (
            <NavLink
              key={item.id}
              to={item.to}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: '1 1 0',
                minWidth: 0,
                textDecoration: 'none',
                padding: '2px 1px',
                transition: 'all 0.25s ease',
                boxSizing: 'border-box'
              }}
            >
              {/* Active Squircle Container */}
              <div style={{
                width: 'clamp(38px, 11vw, 44px)',
                height: 'clamp(32px, 9vw, 36px)',
                borderRadius: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.25s ease',
                border: isActive ? '1px solid rgba(6, 182, 212, 0.65)' : '1px solid transparent',
                backgroundColor: isActive ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                boxShadow: isActive ? '0 0 16px rgba(6, 182, 212, 0.4)' : 'none',
                boxSizing: 'border-box'
              }}>
                {icons[item.iconKey](isActive)}
              </div>

              {/* Glowing Dot */}
              <div style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: isActive ? '#06b6d4' : 'transparent',
                boxShadow: isActive ? '0 0 6px #06b6d4, 0 0 10px #06b6d4' : 'none',
                marginTop: '2px',
                marginBottom: '1px',
                transition: 'all 0.2s ease'
              }} />

              {/* Responsive Text Label */}
              <span style={{
                fontSize: 'clamp(0.62rem, 2.4vw, 0.72rem)',
                fontWeight: isActive ? '700' : '500',
                color: isActive ? '#06b6d4' : '#8e9aa8',
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
                textAlign: 'center'
              }}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
