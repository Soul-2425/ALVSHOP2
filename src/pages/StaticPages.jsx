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
  const privacyList = [
    {
      num: 1,
      title: 'Información que Recopilamos',
      intro: 'Para garantizar la seguridad de las transacciones y la correcta entrega de los bienes digitales, recopilamos las siguientes categorías de datos:',
      items: [
        { label: 'Datos de Registro y Perfil', text: 'Nombre, dirección de correo electrónico y número de teléfono proporcionados al crear la cuenta.' },
        { label: 'Datos Transaccionales y Financieros', text: 'Imágenes de comprobantes de pago, números de referencia bancaria, nombre del titular de la cuenta emisora y montos depositados para la acreditación de la Billetera Interna.' },
        { label: 'Datos de Ejecución de Servicio', text: 'Identificadores de jugador (UID) suministrados voluntariamente por el usuario para la entrega de las recargas.' },
        { label: 'Datos de Seguridad y Navegación', text: 'Direcciones IP, patrones de conexión y huellas de dispositivo. Esta información se recopila de manera automatizada de forma estricta para la prevención de fraudes y la detección de cuentas múltiples (multicuentas).' }
      ]
    },
    {
      num: 2,
      title: 'Uso de la Información',
      intro: 'La información recopilada se utiliza de manera exclusiva para fines operativos, administrativos y de seguridad de la plataforma, incluyendo:',
      items: [
        { label: 'Validación de Fondos', text: 'Procesar, validar y confirmar las transferencias bancarias manuales para la acreditación de saldos.' },
        { label: 'Despacho de Pedidos', text: 'Ejecutar y despachar los pedidos de bienes digitales a las cuentas correspondientes.' },
        { label: 'Comunicaciones', text: 'Enviar notificaciones de estado sobre los pedidos y comunicaciones de soporte técnico.' },
        { label: 'Prevención de Fraudes', text: 'Monitorear el uso de la plataforma para hacer cumplir nuestros Términos y Condiciones, específicamente para prevenir abusos de promociones, fraudes financieros, contracargos y lavado de dinero.' }
      ]
    },
    {
      num: 3,
      title: 'Retención y Almacenamiento de Datos',
      items: [
        { label: 'Historial Inmutable', text: 'Por la naturaleza de la venta de bienes digitales y para mantener un registro contable y auditable, los historiales de pedidos, los identificadores de jugador (UID) asociados a cada compra y los comprobantes de pago enviados se almacenarán en nuestros servidores de forma segura.' },
        { label: 'Protección del Sistema', text: 'Los datos se mantendrán almacenados durante el tiempo que la cuenta del usuario permanezca activa y por un período adicional determinado por las necesidades legales, de resolución de disputas o auditorías financieras.' }
      ]
    },
    {
      num: 4,
      title: 'Compartición de Información con Terceros y Autoridades',
      intro: 'La plataforma garantiza que los datos personales de los usuarios no serán vendidos, alquilados ni comercializados a terceros para fines publicitarios. Sin embargo, la información podrá ser compartida bajo las siguientes circunstancias:',
      items: [
        { label: 'Proveedores de Destino', text: 'Se compartirá el identificador de jugador (UID) única y exclusivamente con los sistemas de destino necesarios para poder inyectar y procesar la recarga de manera exitosa.' },
        { label: 'Cumplimiento de la Ley y Prevención de Fraudes', text: 'La plataforma cooperará plenamente con autoridades policiales, judiciales o gubernamentales. Nos reservamos el derecho absoluto de entregar datos de registro, direcciones IP, registros de transacciones y comprobantes bancarios si existe sospecha de fraude electrónico, contracargos ilícitos, uso de fondos de origen dudoso o si es requerido mediante una orden legal.' }
      ]
    },
    {
      num: 5,
      title: 'Responsabilidad del Usuario sobre sus Datos',
      items: [
        { label: 'Exactitud de la Información', text: 'El usuario es el único responsable de la exactitud de los datos proporcionados, especialmente en lo referente a su Identificador de Jugador (UID). La plataforma no editará, modificará ni auditará estos identificadores antes del despacho, limitándose a ejecutar la orden tal como fue ingresada.' },
        { label: 'Seguridad de Credenciales', text: 'Es responsabilidad absoluta del usuario mantener la confidencialidad de su contraseña y el acceso a su cuenta. La plataforma no se hace responsable por transacciones no autorizadas resultantes de la negligencia del usuario en la protección de sus credenciales, ni por ventas o préstamos de cuentas a terceros.' }
      ]
    },
    {
      num: 6,
      title: 'Uso de Cookies y Tecnologías de Rastreo',
      items: [
        { label: 'Cookies Esenciales y Seguridad', text: 'La plataforma utiliza cookies esenciales y tecnologías de seguimiento en el navegador del usuario para mantener la sesión activa, recordar preferencias de visualización y recopilar datos de seguridad (como la detección de direcciones IP duplicadas) para hacer cumplir nuestra política de cuentas únicas.' }
      ]
    },
    {
      num: 7,
      title: 'Requisito de Edad Legal',
      items: [
        { label: 'Supervisión de Menores', text: 'En consonancia con nuestros Términos y Condiciones, nuestra plataforma no recopila intencionadamente datos de personas menores de 18 años que no cuenten con la autorización de un adulto responsable. Si detectamos que una cuenta ha sido creada por un menor sin supervisión para realizar transacciones financieras, nos reservamos el derecho de bloquear la cuenta y retener los datos estrictamente para fines de auditoría.' }
      ]
    },
    {
      num: 8,
      title: 'Modificaciones a las Políticas de Privacidad',
      items: [
        { label: 'Actualizaciones Periódicas', text: 'Nos reservamos el derecho de actualizar, modificar o enmendar esta Política de Privacidad en cualquier momento para reflejar cambios en nuestras prácticas operativas o normativas legales. Las modificaciones entrarán en vigor inmediatamente después de su publicación en la plataforma. El uso continuado de los servicios constituye la aceptación de dichas actualizaciones.' }
      ]
    },
    {
      num: 9,
      title: 'Cumplimiento de Normativas Internacionales (GDPR, CCPA y equivalentes)',
      items: [
        { label: 'Alineación Global', text: 'Aunque nuestra plataforma opera bajo jurisdicción local, nos esforzamos por alinear nuestras prácticas de privacidad con los estándares internacionales aceptados, tales como el Reglamento General de Protección de Datos (GDPR) y la Ley de Privacidad del Consumidor de California (CCPA).' },
        { label: 'Limitación Jurisdiccional', text: 'La mención de estas normativas no constituye una sumisión voluntaria a jurisdicciones extranjeras. Cualquier disputa relacionada con el manejo de datos deberá resolverse exclusivamente en los tribunales competentes definidos en nuestros Términos y Condiciones, renunciando el usuario a iniciar demandas colectivas (class actions) o litigios en cortes internacionales.' }
      ]
    },
    {
      num: 10,
      title: 'Transferencia Transfronteriza de Datos (Cross-Border Data Transfer)',
      items: [
        { label: 'Alojamiento Internacional', text: 'Para proporcionar un servicio rápido y seguro, nuestra infraestructura de servidores, bases de datos y servicios de procesamiento pueden estar ubicados en diferentes países. Al utilizar nuestra plataforma, el usuario autoriza expresamente la transferencia transfronteriza, el procesamiento y el almacenamiento de sus datos fuera de su país de residencia.' },
        { label: 'Legislación Aplicable a los Datos', text: 'El usuario comprende que sus datos pueden estar sujetos a las leyes de las jurisdicciones donde se alojan nuestros servidores.' }
      ]
    },
    {
      num: 11,
      title: 'Cumplimiento KYC y AML (Retención Legal de Datos Financieros)',
      items: [
        { label: 'Conoce a tu Cliente (KYC) y Anti-Lavado de Dinero (AML)', text: 'En cumplimiento con las normativas financieras internacionales para la prevención de delitos electrónicos y el lavado de capitales, la plataforma tiene la obligación legal de conservar los registros transaccionales (incluyendo comprobantes bancarios, números de referencia, montos e IPs de conexión).' },
        { label: 'Imposibilidad de Borrado Financiero', text: 'El usuario reconoce que, incluso si solicita la eliminación de su cuenta o la supresión de sus datos personales ("Derecho al Olvido"), la plataforma retendrá de manera obligatoria y segura todo el historial financiero y transaccional por el período exigido por las leyes internacionales de prevención de fraude.' }
      ]
    },
    {
      num: 12,
      title: 'Exención de Responsabilidad por Brechas de Seguridad (Safe Harbor)',
      items: [
        { label: 'Seguridad Razonable', text: 'La plataforma implementa medidas de seguridad técnicas y administrativas estándar de la industria para proteger los datos personales y transaccionales contra el acceso no autorizado o la alteración.' },
        { label: 'Fuerza Mayor Cibernética', text: 'Ningún sistema de transmisión por internet o de almacenamiento electrónico es 100% seguro. El usuario reconoce que proporciona su información bajo su propio riesgo. En el evento de una brecha de seguridad masiva, ataque de piratas informáticos (hackers) o vulneración de nuestros servidores que escape a nuestro control razonable, la plataforma y sus administradores quedan eximidos de toda responsabilidad legal, civil o penal por la filtración de datos, siempre que se haya actuado con la debida diligencia.' }
      ]
    },
    {
      num: 13,
      title: 'Normativa COPPA (Protección de la Privacidad Infantil en Internet)',
      items: [
        { label: 'Restricción Estricta', text: 'En estricto cumplimiento con normativas globales, nuestra plataforma no está dirigida a niños menores de 13 años, ni recopilamos intencionadamente información personal de menores de dicha edad.' },
        { label: 'Eliminación de Datos', text: 'Si descubrimos o se nos informa que hemos recopilado datos de un menor de edad sin el consentimiento verificable del adulto responsable, procederemos a bloquear la cuenta y retener los datos únicamente para fines de auditoría de fraude, eximiendo a la plataforma de cualquier demanda relacionada con las acciones del menor en la tienda.' }
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
          <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>🛡️</div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: '900', color: '#fff', margin: '0 0 6px 0' }}>
            Políticas de Privacidad y Tratamiento de Datos
          </h1>
          <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--accent-cyan)' }}>
            ALVSHOP - Plataforma de Recargas & Bienes Digitales
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '640px', margin: '12px auto 0 auto', lineHeight: 1.6 }}>
            La presente Política de Privacidad describe cómo ALVSHOP recopila, utiliza, almacena y protege la información personal de los usuarios que acceden y realizan transacciones en nuestra plataforma. Al registrarse y utilizar nuestros servicios, el usuario otorga su consentimiento expreso e informado para el tratamiento de sus datos conforme a los siguientes lineamientos.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {privacyList.map((sec) => (
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
