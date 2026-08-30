import React from 'react';
import { useApp } from '../context/AppContext';

export default function Maintenance() {
  const { config } = useApp();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'var(--bg-carbon)',
      color: '#fff',
      textAlign: 'center'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '500px',
        width: '100%',
        padding: '40px 30px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-cyan)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)'
      }}>
        {config?.logo_url && (
          <img src={config.logo_url} alt="Logo" style={{ height: '60px', marginBottom: '20px', objectFit: 'contain' }} />
        )}
        <h1 style={{ fontSize: '2rem', margin: '0 0 16px 0', color: 'var(--accent-cyan)' }}>
          🛠️ Mantenimiento
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '24px' }}>
          La tienda se encuentra temporalmente apagada por labores de mantenimiento o actualizaciones del sistema.
          Por favor, regresa más tarde.
        </p>
        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.85rem' }}>
          Si necesitas soporte urgente, puedes contactarnos mediante nuestras redes oficiales.
        </div>
      </div>
    </div>
  );
}
