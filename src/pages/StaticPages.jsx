import React from 'react';
import { useApp } from '../context/AppContext';

export function About() {
  return (
    <div className="container" style={{ paddingTop: '20px', maxWidth: '720px' }}>
      <div className="glass-panel" style={{ padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-cyan)' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '14px' }}>Sobre Nosotros - ALVSHOP</h1>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '16px' }}>
          Somos la plataforma líder en Guatemala y Latinoamérica en provisión de recargas de videojuegos, diamantes de Free Fire, cuentas de streaming y tarjetas de regalo digitales.
        </p>
        <h3 style={{ fontSize: '1.2rem', margin: '20px 0 10px 0', color: 'var(--accent-cyan)' }}>Nuestra Misión</h3>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
          Ofrecer entregas inmediatas y seguras a los mejores precios del mercado tanto para clientes finales como para nuestra red de revendedores.
        </p>
      </div>
    </div>
  );
}

export function Contact() {
  const { config } = useApp();
  const phone = config.social_links?.whatsapp || '50250000000';

  return (
    <div className="container" style={{ paddingTop: '20px', maxWidth: '720px' }}>
      <div className="glass-panel" style={{ padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-cyan)' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '14px' }}>Contacto Directo</h1>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '20px' }}>
          ¿Tienes dudas sobre un pedido, recarga o deseas ser revendedor oficial?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)' }}>
            <strong>WhatsApp Oficial:</strong> +{phone}
          </div>
          <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)' }}>
            <strong>Horario de Atención:</strong> Lunes a Domingo de 8:00 AM a 11:00 PM
          </div>
          <a
            href={`https://wa.me/${phone.replace(/\+/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="btn-cyan"
            style={{ marginTop: '10px', textAlign: 'center' }}
          >
            Chatear por WhatsApp Ahora ➔
          </a>
        </div>
      </div>
    </div>
  );
}

export function Terms() {
  return (
    <div className="container" style={{ paddingTop: '20px', maxWidth: '720px' }}>
      <div className="glass-panel" style={{ padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '14px' }}>Términos y Condiciones</h1>
        <div style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.9rem' }}>
          <p style={{ marginBottom: '12px' }}>
            1. <strong>Responsabilidad del ID:</strong> El cliente es responsable de ingresar correctamente su UID o datos de jugador antes de proceder al pago.
          </p>
          <p style={{ marginBottom: '12px' }}>
            2. <strong>Cuentas de Streaming:</strong> Todas las credenciales entregadas cuentan con garantía de reposición durante la vigencia del servicio contratado.
          </p>
          <p style={{ marginBottom: '12px' }}>
            3. <strong>Tiempos de Entrega:</strong> Las recargas automáticas se entregan en minutos tras la confirmación de pago.
          </p>
        </div>
      </div>
    </div>
  );
}

export function Privacy() {
  return (
    <div className="container" style={{ paddingTop: '20px', maxWidth: '720px' }}>
      <div className="glass-panel" style={{ padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '14px' }}>Políticas de Privacidad</h1>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.9rem' }}>
          En ALVSHOP nos comprometemos a resguardar la información confidencial de nuestros clientes. Los datos bancarios y comprobantes sólo se utilizan para la verificación de pedidos y no se comparten con terceros.
        </p>
      </div>
    </div>
  );
}
