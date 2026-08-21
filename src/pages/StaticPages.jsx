import React from 'react';
import { useApp } from '../context/AppContext';

export function About() {
  return (
    <div className="container" style={{ paddingTop: '20px', maxWidth: '780px' }}>
      <div className="glass-panel" style={{ padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-cyan)' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '14px' }}>Sobre Nosotros - ALVSHOP</h1>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '16px' }}>
          Somos la plataforma líder en Guatemala y Latinoamérica en provisión de recargas de videojuegos, diamantes de Free Fire, cuentas de streaming y productos digitales.
        </p>
        <h3 style={{ fontSize: '1.2rem', margin: '20px 0 10px 0', color: 'var(--accent-cyan)' }}>Nuestra Misión</h3>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
          Ofrecer entregas seguras y confiables a los mejores precios del mercado tanto para clientes finales como para nuestra red de revendedores.
        </p>
      </div>
    </div>
  );
}

export function Contact() {
  const { config } = useApp();
  const phone = config.social_links?.whatsapp || '50250000000';

  return (
    <div className="container" style={{ paddingTop: '20px', maxWidth: '780px' }}>
      <div className="glass-panel" style={{ padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-cyan)' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '14px' }}>Contacto Directo</h1>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '20px' }}>
          ¿Tienes dudas sobre un pedido, recarga o deseas atención personalizada?
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
            style={{ marginTop: '10px', textAlign: 'center', textDecoration: 'none' }}
          >
            Chatear por WhatsApp Ahora ➔
          </a>
        </div>
      </div>
    </div>
  );
}

export function Terms() {
  const termsList = [
    {
      num: 1,
      title: 'Condiciones de la Cuenta y Billetera Interna',
      items: [
        { label: 'Requisito de Edad', text: 'Al registrarse y utilizar nuestros servicios, se asume y confirma que el usuario tiene 18 años de edad cumplidos o, en su defecto, cuenta con la autorización expresa y la supervisión de un adulto responsable para realizar transacciones financieras en la plataforma.' },
        { label: 'Registro de Usuarios', text: 'Todo usuario debe registrarse con información veraz y mantener sus datos actualizados en el sistema.' },
        { label: 'Naturaleza del Saldo', text: 'La Billetera Interna opera estrictamente con un valor referencial en USDT para mantener la estabilidad del catálogo.' },
        { label: 'Restricción Absoluta de Retiros y Reembolsos', text: 'El saldo depositado o recargado en la cuenta es de uso exclusivo para la adquisición de bienes digitales dentro de la tienda. Bajo ninguna circunstancia este saldo podrá ser canjeado, retirado, transferido a dinero fiduciario o reembolsado. Desde el momento en que se efectúa un depósito en la página, el dinero no es retornable.' }
      ]
    },
    {
      num: 2,
      title: 'Política de Recargas de Free Fire',
      items: [
        { label: 'Tiempos de Entrega y Urgencias', text: 'Solicitamos paciencia a todos nuestros usuarios. El tiempo estimado para procesar y completar una recarga abarca desde 5 minutos hasta un máximo de 24 horas tras la confirmación del pago. Por la naturaleza del servicio y la logística de procesamiento, no atendemos pedidos con carácter de urgencia.' },
        { label: 'Validación de Identidad en el Juego', text: 'Es responsabilidad absoluta del usuario verificar que el Nickname mostrado por el sistema coincida con su cuenta antes de confirmar el pago utilizando su Player ID (UID). Si el usuario ingresa un UID incorrecto y el pedido se procesa, la plataforma no se hace responsable por la pérdida.' },
        { label: 'Irreversibilidad', text: 'Una vez que se efectúa el pago de una recarga, la transacción se considera definitiva. Por la naturaleza digital del servicio, no existen devoluciones, cancelaciones ni reembolsos de ningún tipo.' },
        { label: 'Despacho y Notificaciones', text: 'El usuario recibirá una notificación en la plataforma una vez que el proceso haya concluido exitosamente dentro del margen de tiempo establecido.' }
      ]
    },
    {
      num: 3,
      title: 'Gestión de Pagos',
      intro: 'El flujo de procesamiento de transacciones manuales a través de entidades bancarias define nuestras políticas de confirmación:',
      items: [
        { label: 'En Verificación', text: 'El usuario debe esperar la confirmación del comprobante bancario. Todo fondo depositado es final y no reembolsable.' },
        { label: 'Rechazado', text: 'Se enviará un aviso explicando el motivo. Si el comprobante es inválido, no se acreditará el saldo.' },
        { label: 'Entregado', text: 'Transacción finalizada de manera exitosa. No admite disputas ni reclamos posteriores.' }
      ]
    },
    {
      num: 4,
      title: 'Limitación de Responsabilidad Legal',
      items: [
        { label: 'Independencia de Marca', text: 'La plataforma actúa exclusivamente como un servicio de intermediación comercial y no está afiliada, patrocinada ni respaldada oficialmente por Garena.' },
        { label: 'Suspensión de Cuentas', text: 'No nos hacemos responsables por baneos, bloqueos o penalizaciones en las cuentas de Free Fire derivadas de comportamientos del usuario ajenos a nuestro servicio legítimo de recarga.' },
        { label: 'Modificaciones Financieras', text: 'Nos reservamos el derecho de ajustar la tasa de cambio dinámica y los precios del catálogo en cualquier momento y sin previo aviso.' }
      ]
    },
    {
      num: 5,
      title: 'Prevención de Fraude y Conducta Prohibida',
      intro: 'Nos reservamos el derecho de suspender, retener fondos o eliminar permanentemente cualquier cuenta sin previo aviso ante:',
      items: [
        { label: 'Falsificación de Comprobantes', text: 'El envío de recibos bancarios editados, alterados, duplicados o fraudulentos.' },
        { label: 'Abuso del Sistema', text: 'La explotación de vulnerabilidades técnicas, uso de herramientas automatizadas o intentos de alterar el saldo.' },
        { label: 'Comportamiento Hostil', text: 'El uso de lenguaje abusivo, amenazas o acoso hacia nuestro personal de soporte técnico.' }
      ]
    },
    {
      num: 6,
      title: 'Disponibilidad del Servicio y Fuerza Mayor',
      items: [
        { label: 'Exención de Garantías', text: 'Los servicios se proporcionan "tal cual" y "según disponibilidad". No garantizamos que el acceso sea ininterrumpido o libre de errores.' },
        { label: 'Fuerza Mayor', text: 'No asumimos responsabilidad por retrasos causados por caídas de servidores de terceros, mantenimientos, fallas bancarias o interrupciones de internet.' }
      ]
    },
    {
      num: 7,
      title: 'Propiedad Intelectual',
      items: [
        { label: 'Derechos de la Plataforma', text: 'Todo el código, diseño, logotipos, textos y arquitectura son propiedad exclusiva de la administración. Queda prohibida su reproducción sin autorización.' },
        { label: 'Marcas de Terceros', text: 'Las marcas registradas de terceros pertenecen a sus respectivos dueños y se utilizan exclusivamente con fines descriptivos.' }
      ]
    },
    {
      num: 8,
      title: 'Legislación Aplicable y Modificaciones',
      items: [
        { label: 'Jurisdicción Legal', text: 'Estos términos se regirán por las leyes del país donde residen las cuentas bancarias receptoras.' },
        { label: 'Derecho de Modificación', text: 'Nos reservamos el derecho unilateral de actualizar estos términos mediante su publicación en la plataforma.' }
      ]
    },
    {
      num: 9,
      title: 'Consecuencias por Incumplimiento de Indicaciones',
      items: [
        { label: 'Errores de Formulario', text: 'Si un usuario ignora advertencias o proporciona datos erróneos (como un UID incorrecto), asume el 100% de la responsabilidad. No se realizarán correcciones ni devoluciones.' },
        { label: 'Saturación de Soporte', text: 'El incumplimiento de los tiempos de espera mediante el envío de spam o reclamos antes del plazo máximo derivará en la restricción temporal del acceso al soporte.' }
      ]
    },
    {
      num: 10,
      title: 'Uso Indebido y Explotación del Sistema (Cláusula de Indemnidad)',
      items: [
        { label: 'Prohibición de Explotación', text: 'Queda prohibido alterar la estructura de precios, manipular el saldo o aprovechar errores técnicos.' },
        { label: 'Indemnización y Daños', text: 'El usuario acepta indemnizar a la plataforma ante reclamos o daños financieros causados por su uso indebido, reservándonos el derecho a tomar acciones legales.' }
      ]
    },
    {
      num: 11,
      title: 'Derecho de Admisión y Terminación Unilateral',
      items: [
        { label: 'Cancelación del Servicio', text: 'Nos reservamos el derecho de admisión. Podemos suspender cuentas y confiscar el saldo restante (como penalidad por fraude) sin previo aviso ante la violación de estos términos.' }
      ]
    },
    {
      num: 12,
      title: 'Titularidad de Pagos y Prevención de Contracargos',
      items: [
        { label: 'Identidad Financiera', text: 'Los depósitos deben realizarse desde cuentas bancarias de origen lícito y autorizado.' },
        { label: 'Gestión de Contracargos', text: 'Ante reclamos o contracargos tras la acreditación de saldo o despacho, la cuenta será bloqueada irreversiblemente y la información podrá ser entregada a las autoridades.' }
      ]
    },
    {
      num: 13,
      title: 'Cláusula de Errores Tipográficos y Fallos de Sistema (Bugs)',
      items: [
        { label: 'Precios Erróneos y Corrección', text: 'Nos reservamos el derecho de cancelar transacciones derivadas de precios listados incorrectamente. Si un usuario explota una falla para beneficio propio, se anularán las transacciones y ajustarán los saldos correspondientes.' }
      ]
    },
    {
      num: 14,
      title: 'Política de Cuentas Únicas y Promociones',
      items: [
        { label: 'Cuentas Múltiples y Penalización', text: 'Se permite una sola cuenta por persona física. La creación de multicuentas para abusar de beneficios, códigos o auto-referidos resultará en la eliminación de los perfiles y confiscación de saldos.' }
      ]
    },
    {
      num: 15,
      title: 'Intransferibilidad de la Cuenta y el Saldo',
      items: [
        { label: 'Uso Personal', text: 'Las cuentas y saldos son estrictamente personales e intransferibles. Queda prohibida la venta o préstamo de perfiles a terceros; cualquier reclamo por esto será desestimado.' }
      ]
    },
    {
      num: 16,
      title: 'Cumplimiento Internacional y Prevención de Lavado de Dinero (AML)',
      items: [
        { label: 'Origen Lícito', text: 'El usuario garantiza que los fondos provienen de fuentes lícitas. La plataforma bloqueará usuarios en listas de sanciones internacionales o jurisdicciones embargadas.' }
      ]
    },
    {
      num: 17,
      title: 'Renuncia al Derecho de Desistimiento (Normativa de Bienes Digitales)',
      items: [
        { label: 'Excepción Internacional', text: 'Al tratarse de bienes digitales intangibles de ejecución inmediata, el usuario pierde irrevocablemente su derecho de desistimiento, cancelación o retracto una vez iniciado el proceso.' }
      ]
    },
    {
      num: 18,
      title: 'Integración de la Política de Privacidad y Manejo de Datos (GDPR/CCPA)',
      items: [
        { label: 'Consentimiento y Colaboración', text: 'El usuario otorga su consentimiento para el procesamiento de datos. La plataforma cooperará con autoridades policiales o judiciales entregando información si existe una orden por sospecha de fraude.' }
      ]
    },
    {
      num: 19,
      title: 'Cláusula de Divisibilidad y Acuerdo Completo',
      items: [
        { label: 'Validez e Independencia', text: 'Si alguna cláusula es considerada nula o inaplicable legalmente, las demás mantendrán su plena vigencia. Estos términos constituyen el acuerdo completo entre el usuario y la plataforma.' }
      ]
    }
  ];

  return (
    <div className="container" style={{ paddingTop: '24px', paddingBottom: '60px', maxWidth: '860px' }}>
      <div className="glass-panel" style={{
        padding: '36px 28px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-cyan)',
        background: 'linear-gradient(135deg, rgba(13, 17, 26, 0.95) 0%, rgba(30, 58, 138, 0.15) 100%)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>📜</div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: '900', color: '#fff', margin: '0 0 6px 0' }}>
            Términos y Condiciones de Uso
          </h1>
          <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--accent-cyan)' }}>
            ALVSHOP - Plataforma de Recargas & Bienes Digitales
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Última actualización: Agosto 2026 | Documento Legal Oficial
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {termsList.map((sec) => (
            <div
              key={sec.num}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                padding: '20px 22px'
              }}
            >
              <h2 style={{
                fontSize: '1.08rem',
                fontWeight: '800',
                color: '#fff',
                margin: '0 0 12px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{
                  background: 'var(--accent-cyan)',
                  color: '#000',
                  fontSize: '0.75rem',
                  fontWeight: '900',
                  padding: '3px 8px',
                  borderRadius: '4px'
                }}>
                  {sec.num}
                </span>
                {sec.title}
              </h2>

              {sec.intro && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.5 }}>
                  {sec.intro}
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sec.items.map((item, i) => (
                  <div key={i} style={{ fontSize: '0.86rem', lineHeight: 1.6, color: 'var(--text-main)' }}>
                    <strong style={{ color: 'var(--accent-cyan)' }}>{item.label}: </strong>
                    <span style={{ color: 'var(--text-muted)' }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Privacy() {
  return (
    <div className="container" style={{ paddingTop: '24px', maxWidth: '780px' }}>
      <div className="glass-panel" style={{ padding: '36px 28px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-cyan)' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '14px', color: '#fff' }}>Políticas de Privacidad & Protección de Datos</h1>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.9rem', marginBottom: '14px' }}>
          En ALVSHOP nos comprometemos a resguardar la información confidencial de nuestros clientes. Los datos personales, números de contacto y comprobantes de pago sólo se utilizan estrictamente para la verificación y despacho de pedidos.
        </p>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.9rem' }}>
          No compartimos, vendemos ni distribuimos información de usuarios a terceros, con estricto apego a normativas internacionales de protección al consumidor y prevención de fraude.
        </p>
      </div>
    </div>
  );
}
