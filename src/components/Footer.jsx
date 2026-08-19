import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Footer() {
  const { config } = useApp();
  const socials = config?.social_links || {};

  return (
    <footer style={{
      backgroundColor: 'rgba(10, 13, 20, 0.95)',
      borderTop: '1px solid var(--border-glass)',
      paddingTop: '40px',
      paddingBottom: '30px',
      marginTop: 'auto',
      color: 'var(--text-muted)',
      fontSize: '0.85rem'
    }}>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '32px', marginBottom: '32px' }}>
        
        {/* Brand Column */}
        <div>
          <div style={{
            fontSize: '1.3rem',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #fff 40%, var(--accent-cyan) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '10px'
          }}>
            {config?.site_title || 'ALVSHOP'}
          </div>
          <p style={{ lineHeight: '1.6', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Tu plataforma de confianza para recargas gamer, cuentas de streaming premium y licencias digitales con entrega inmediata.
          </p>

          {/* Social Links */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            {socials.whatsapp && (
              <a href={`https://wa.me/${socials.whatsapp}`} target="_blank" rel="noreferrer" style={{ fontSize: '1.2rem', transition: 'transform 0.2s' }}>
                💬
              </a>
            )}
            {socials.instagram && (
              <a href={socials.instagram} target="_blank" rel="noreferrer" style={{ fontSize: '1.2rem', transition: 'transform 0.2s' }}>
                📸
              </a>
            )}
            {socials.tiktok && (
              <a href={socials.tiktok} target="_blank" rel="noreferrer" style={{ fontSize: '1.2rem', transition: 'transform 0.2s' }}>
                🎵
              </a>
            )}
            {socials.facebook && (
              <a href={socials.facebook} target="_blank" rel="noreferrer" style={{ fontSize: '1.2rem', transition: 'transform 0.2s' }}>
                📘
              </a>
            )}
          </div>
        </div>

        {/* Column 2: Atención & Ayuda */}
        <div>
          <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '14px', fontWeight: '700' }}>
            Atención & Ayuda
          </h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', padding: 0 }}>
            <li>
              <Link to="/support" style={{ color: 'var(--text-muted)', transition: 'color 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🎧</span> Soporte Técnico
              </Link>
            </li>
            <li>
              <Link to="/about" style={{ color: 'var(--text-muted)', transition: 'color 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>ℹ️</span> Sobre Nosotros
              </Link>
            </li>
            <li>
              <Link to="/contact" style={{ color: 'var(--text-muted)', transition: 'color 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📞</span> Contactos
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Legal & Seguridad */}
        <div>
          <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '14px', fontWeight: '700' }}>
            Legal & Seguridad
          </h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', padding: 0 }}>
            <li>
              <Link to="/terms" style={{ color: 'var(--text-muted)', transition: 'color 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📜</span> Términos y Condiciones
              </Link>
            </li>
            <li>
              <Link to="/privacy" style={{ color: 'var(--text-muted)', transition: 'color 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🔒</span> Políticas de Privacidad
              </Link>
            </li>
          </ul>
        </div>

      </div>

      {/* Copyright & Disclaimer */}
      <div className="container" style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        paddingTop: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '10px',
        fontSize: '0.78rem'
      }}>
        <div>© 2026 ALVSHOP. Todos los derechos reservados.</div>
        <div style={{ color: 'var(--accent-cyan)' }}>Recargas & Bienes Digitales</div>
      </div>
    </footer>
  );
}
