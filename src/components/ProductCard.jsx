import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function ProductCard({ product }) {
  const { formatPrice } = useApp();

  const isFreeFire = product.validation_type === 'Free Fire' || product.name?.toLowerCase().includes('free fire');
  const actionButtonText = product.button_action_text || (isFreeFire ? 'Solicitar' : 'Comprar');

  return (
    <div className="glass-panel-interactive" style={{
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* Product Image & Badges */}
      <div style={{
        position: 'relative',
        width: '100%',
        paddingTop: '65%',
        background: 'linear-gradient(180deg, rgba(30, 58, 138, 0.4) 0%, rgba(10, 13, 20, 0.8) 100%)',
        overflow: 'hidden'
      }}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.4s ease'
            }}
          />
        ) : (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem'
          }}>
            {isFreeFire ? '🔥' : '💎'}
          </div>
        )}

        {/* Stock / Type Badge */}
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-glass)',
          borderRadius: 'var(--radius-full)',
          padding: '2px 8px',
          fontSize: '0.65rem',
          fontWeight: '700',
          color: product.stock > 0 ? '#34d399' : '#f87171'
        }}>
          {product.stock > 0 ? '⚡ Entrega Inmediata' : '⏳ Disponible'}
        </div>
      </div>

      {/* Product Info */}
      <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
            {product.subcategories?.name || 'Recarga Digital'}
          </div>
          <h4 style={{
            fontSize: '0.95rem',
            fontWeight: '700',
            lineHeight: 1.3,
            marginBottom: '6px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {product.name}
          </h4>

          {/* Rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '10px' }}>
            <span style={{ color: '#fbbf24', fontSize: '0.8rem' }}>★</span>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-main)' }}>4.9</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(+40)</span>
          </div>
        </div>

        {/* Price & Action Button */}
        <div>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Desde</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--accent-cyan)' }}>
              {formatPrice(product.price_public)}
            </div>
          </div>

          <Link
            to={`/product/${product.id}`}
            className="btn-cyan"
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '0.85rem',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none'
            }}
          >
            {actionButtonText} ➔
          </Link>
        </div>
      </div>
    </div>
  );
}
