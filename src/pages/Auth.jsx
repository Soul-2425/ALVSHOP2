import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const { fetchProfile } = useApp();
  const navigate = useNavigate();

  // Auth Form State
  const [isSignUp, setIsSignUp] = useState(true); // Default to registration
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Handle Authentication
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: {
              full_name: authFullName,
              phone: authPhone
            }
          }
        });
        if (error) {
          if (error.message.includes('already registered')) throw new Error('Este correo ya está registrado. Inicia sesión en su lugar.');
          if (error.message.includes('Password')) throw new Error('La contraseña debe tener al menos 6 caracteres.');
          throw error;
        }
        alert('¡Cuenta creada con éxito! Ya puedes iniciar sesión.');
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword
        });
        if (error) {
          if (error.message.includes('Invalid login credentials')) throw new Error('Correo o contraseña incorrectos. Verifica tus datos.');
          if (error.message.includes('Email not confirmed')) throw new Error('Debes confirmar tu correo electrónico antes de iniciar sesión.');
          throw error;
        }
        if (data.user) {
          fetchProfile(data.user.id);
          navigate('/'); // Redirigir al inicio después de iniciar sesión
        }
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!authEmail) {
      setAuthError('Por favor, ingresa tu correo electrónico en el campo superior para recuperar la contraseña.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
        redirectTo: window.location.origin + '/profile?type=recovery'
      });
      if (error) throw error;
      alert('Se ha enviado un enlace a tu correo para restablecer la contraseña.');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '30px', maxWidth: '440px', margin: '0 auto' }}>
      <div className="glass-panel" style={{
        borderRadius: 'var(--radius-lg)',
        padding: '28px 24px',
        border: '1px solid var(--border-cyan)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '6px' }}>💎</div>
          <h2 style={{ fontSize: '1.4rem' }}>{isSignUp ? 'Crear Cuenta en ALVSHOP' : 'Bienvenido a ALVSHOP'}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {isSignUp ? 'Regístrate para comprar y recargar con saldo' : 'Accede a tu billetera e historial de compras'}
          </p>
        </div>

        {authError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '16px'
          }}>
            {authError}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isSignUp && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Tu Nombre"
                  value={authFullName}
                  onChange={(e) => setAuthFullName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Número de WhatsApp</label>
                <input
                  type="tel"
                  required
                  placeholder="502 1234 5678"
                  value={authPhone}
                  onChange={(e) => setAuthPhone(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                />
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Correo Electrónico</label>
            <input
              type="email"
              required
              placeholder="tu@correo.com"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contraseña</label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '600' }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
            />
          </div>

          <button type="submit" disabled={authLoading} className="btn-cyan" style={{ marginTop: '8px', padding: '12px' }}>
            {authLoading ? 'Procesando...' : (isSignUp ? 'Crear Cuenta 🚀' : 'Iniciar Sesión 🚀')}
          </button>
        </form>

        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.85rem' }}>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {isSignUp ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate'}
          </button>
        </div>
      </div>
    </div>
  );
}
