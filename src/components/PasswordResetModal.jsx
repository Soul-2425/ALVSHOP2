import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function PasswordResetModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // 1. Detect if URL has recovery parameters in hash or search
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (hash.includes('type=recovery') || search.includes('type=recovery') || hash.includes('access_token')) {
        setIsOpen(true);
      }
    }

    // 2. Listen to Supabase PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsOpen(true);
      }
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, []);

  if (!isOpen) return null;

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor verifica.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setSuccess(true);
      
      // Clean URL hash/params
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setNewPassword('');
        setConfirmPassword('');
      }, 2500);
    } catch (err) {
      setError('Error al actualizar la contraseña: ' + (err.message || err.error_description || 'Intenta de nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      backgroundColor: 'rgba(0, 0, 0, 0.88)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div className="glass-panel animate-fade" style={{
        width: '100%',
        maxWidth: '420px',
        borderRadius: 'var(--radius-lg)',
        padding: '28px',
        border: '2px solid var(--accent-cyan)',
        background: 'linear-gradient(145deg, #0d111a 0%, #1e1b4b 100%)',
        boxShadow: '0 12px 40px rgba(6, 182, 212, 0.35)',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '2.8rem', marginBottom: '8px' }}>🔐</div>
          <h3 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--accent-cyan)', fontWeight: '800' }}>
            Restablecer Contraseña
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Ingresa tu nueva contraseña para acceder a tu cuenta ALVSHOP.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.82rem',
            marginBottom: '16px'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Success Alert */}
        {success ? (
          <div style={{
            background: 'rgba(52, 211, 153, 0.15)',
            border: '1px solid #34d399',
            color: '#34d399',
            padding: '18px',
            borderRadius: 'var(--radius-sm)',
            textAlign: 'center',
            fontWeight: '700',
            fontSize: '0.95rem'
          }}>
            ✅ ¡Contraseña actualizada exitosamente!
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Iniciando sesión en tu cuenta...
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600' }}>
                Nueva Contraseña:
              </label>
              <input
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#0a0d14',
                  border: '1px solid var(--border-cyan)',
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600' }}>
                Confirmar Nueva Contraseña:
              </label>
              <input
                type="password"
                required
                placeholder="Repite la nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#0a0d14',
                  border: '1px solid var(--border-cyan)',
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-cyan"
              style={{
                marginTop: '6px',
                padding: '14px',
                fontSize: '0.92rem',
                fontWeight: '800'
              }}
            >
              {loading ? 'Guardando...' : 'Guardar Nueva Contraseña ➔'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
