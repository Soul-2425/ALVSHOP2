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
    feed: (active) => (
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
      id: 'feed',
      to: '/feed',
      label: 'Feed',
      iconKey: 'feed',
      checkActive: (loc) => loc.pathname === '/feed'
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
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      width: '100%',
      maxWidth: '100vw',
      zIndex: 50,
      backgroundColor: 'rgba(10, 13, 20, 0.98)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: '6px',
      paddingBottom: 'max(10px, env(safe-area-inset-bottom, 12px))',
      paddingLeft: '4px',
      paddingRight: '4px',
      boxSizing: 'border-box',
      overflow: 'hidden',
      boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.7)'
    }}>
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
              padding: '0 2px',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
          >
            {/* Active Squircle Container */}
            <div style={{
              width: 'clamp(36px, 10vw, 44px)',
              height: 'clamp(32px, 8.5vw, 36px)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.25s ease',
              border: isActive ? '1px solid rgba(6, 182, 212, 0.6)' : '1px solid transparent',
              backgroundColor: isActive ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
              boxShadow: isActive ? '0 0 14px rgba(6, 182, 212, 0.35)' : 'none',
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
  );
}
