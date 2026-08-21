import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getPushPermissionStatus, requestPushPermission } from '../../notificaciones y apis/notificaciones/pushService';

export default function PushPermissionBanner() {
  const { user } = useApp();
  const [permissionStatus, setPermissionStatus] = useState('granted');
  const [dismissed, setDismissed] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  useEffect(() => {
    const status = getPushPermissionStatus();
    setPermissionStatus(status);

    const isDismissed = localStorage.getItem('alv_push_banner_dismissed');
    if (isDismissed) setDismissed(true);
  }, []);

  if (permissionStatus === 'granted' || permissionStatus === 'unsupported' || dismissed) {
    return null;
  }

  const handleEnablePush = async () => {
    setRequesting(true);
    setFeedbackMsg('');

    // Check if on insecure HTTP
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isSecure) {
      alert('⚠️ Las notificaciones Web Push requieren conexión segura (HTTPS) o localhost. En celulares funcionará al desplegar en Netlify con HTTPS.');
      setRequesting(false);
      return;
    }

    try {
      const granted = await requestPushPermission(user?.id);
      setRequesting(false);

      if (granted) {
        setPermissionStatus('granted');
        alert('🎉 ¡Notificaciones activadas exitosamente! Recibirás alertas cuando tus pedidos se completen.');
      } else {
        const current = getPushPermissionStatus();
        setPermissionStatus(current);
        if (current === 'denied') {
          alert('⚠️ Las notificaciones están bloqueadas en tu navegador. Haz clic en el icono del candado 🔒 al lado del enlace (URL) y selecciona "Permitir Notificaciones".');
        } else {
          alert('ℹ️ Debes hacer clic en "Permitir" en la ventana emergente de tu navegador para activar las alertas.');
        }
      }
    } catch (err) {
      setRequesting(false);
      alert('Error activando notificaciones: ' + err.message);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('alv_push_banner_dismissed', 'true');
  };

  return (
    <div style={{
      background: 'linear-gradient(90deg, rgba(30, 58, 138, 0.95) 0%, rgba(6, 182, 212, 0.3) 100%)',
      borderBottom: '1px solid var(--border-cyan)',
      padding: '10px 16px',
      color: '#fff',
      fontSize: '0.85rem',
      position: 'relative',
      zIndex: 40
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2rem' }}>🔔</span>
          <div>
            <strong>¡Activa las Notificaciones de ALVSHOP!</strong> Recibe alertas instantáneas cuando tu pedido de recarga sea completado o te respondan en soporte.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleEnablePush}
            disabled={requesting}
            className="btn-cyan"
            style={{
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: '800',
              cursor: 'pointer'
            }}
          >
            {requesting ? 'Activando...' : 'Activar Alertas ➔'}
          </button>
          <button
            onClick={handleDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              padding: '4px'
            }}
            title="Descartar por ahora"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
