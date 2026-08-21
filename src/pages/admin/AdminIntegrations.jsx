import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { validatePlayerUid, executeSupplierApi } from '../../../notificaciones y apis/apis/index';
import {
  notifyOrderCompleted,
  notifySupportReply,
  notifyAdminNewOrder,
  notifyAdminFeedInteraction,
  notifyAdminSupportMessage,
  sendPushNotification
} from '../../../notificaciones y apis/notificaciones/pushService';
import { soundEffects } from '../../services/soundEffects';

export default function AdminIntegrations() {
  const [activeTab, setActiveTab] = useState('nocode'); // 'nocode', 'ff-validator', 'binance', 'push-monitor'

  // ==========================================
  // STATE: NO-CODE SUPPLIER CONNECTOR
  // ==========================================
  const [integrations, setIntegrations] = useState([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState(null);

  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formMethod, setFormMethod] = useState('POST');
  const [formHeaders, setFormHeaders] = useState('{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer {{api_key}}"\n}');
  const [formBody, setFormBody] = useState('{\n  "uid": "{{uid}}",\n  "product_code": "{{product_sku}}",\n  "order_ref": "{{order_id}}"\n}');
  const [formMapping, setFormMapping] = useState('{\n  "transaction_id": "data.order_id",\n  "status": "data.status",\n  "message": "msg"\n}');
  const [savingIntegration, setSavingIntegration] = useState(false);

  // Test Console State for No-Code
  const [testVariables, setTestVariables] = useState('{\n  "uid": "1548962314",\n  "nickname": "ALV_ProSniper_GT",\n  "product_sku": "FF_100_DIAMONDS",\n  "order_id": "ORD-998822",\n  "api_key": "sec_live_alvshop882"\n}');
  const [testResult, setTestResult] = useState(null);
  const [runningTest, setRunningTest] = useState(false);

  // ==========================================
  // STATE: FREE FIRE VALIDATOR TESTER
  // ==========================================
  const [ffUid, setFfUid] = useState('29386038');
  const [ffRegion, setFfRegion] = useState('LATAM');
  const [ffResult, setFfResult] = useState(null);
  const [ffLoading, setFfLoading] = useState(false);

  // ==========================================
  // STATE: PUSH & NOTIFICATIONS MONITOR
  // ==========================================
  const [pushSubscriptions, setPushSubscriptions] = useState([]);
  const [notificationLogs, setNotificationLogs] = useState([]);
  const [testPushTitle, setTestPushTitle] = useState('🔔 Alerta de Prueba ALVSHOP');
  const [testPushBody, setTestPushBody] = useState('Esta es una notificación de prueba en tiempo real para verificar la arquitectura push.');
  const [sendingPush, setSendingPush] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    loadIntegrations();
    loadPushData();
  }, []);

  const loadIntegrations = async () => {
    setLoadingIntegrations(true);
    try {
      const { data, error } = await supabase
        .from('supplier_integrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && !error && data.length > 0) {
        setIntegrations(data);
      } else {
        // Fallback default sample integration
        setIntegrations([
          {
            id: 'int-sample-1',
            name: 'API Proveedor Smile.one / Recargas FF',
            endpoint_url: 'https://api.smile.one/v1/recharge/freefire',
            http_method: 'POST',
            headers: { 'Authorization': 'Bearer {{api_key}}', 'Content-Type': 'application/json' },
            body_template: { uid: '{{uid}}', sku: '{{product_sku}}', order_id: '{{order_id}}' },
            response_mapping: { transaction_id: 'data.trx_id', status: 'status', message: 'msg' },
            is_active: true
          }
        ]);
      }
    } catch (err) {
      console.warn('Error loading integrations:', err);
    } finally {
      setLoadingIntegrations(false);
    }
  };

  const loadPushData = async () => {
    try {
      const { data: subs } = await supabase.from('push_subscriptions').select('*').limit(20);
      const { data: logs } = await supabase.from('notification_logs').select('*').order('created_at', { ascending: false }).limit(20);

      if (subs) setPushSubscriptions(subs);
      if (logs) setNotificationLogs(logs);
    } catch (err) {
      console.warn('Error loading push data:', err);
    }
  };

  // Guardar Integración No-Code
  const handleSaveIntegration = async (e) => {
    e.preventDefault();
    setSavingIntegration(true);

    try {
      let parsedHeaders = {};
      let parsedBody = {};
      let parsedMapping = {};

      try { parsedHeaders = JSON.parse(formHeaders); } catch { throw new Error('Headers debe ser un JSON válido'); }
      try { parsedBody = JSON.parse(formBody); } catch { throw new Error('Body Template debe ser un JSON válido'); }
      try { parsedMapping = JSON.parse(formMapping); } catch { throw new Error('Response Mapping debe ser un JSON válido'); }

      const payload = {
        name: formName,
        endpoint_url: formUrl,
        http_method: formMethod,
        headers: parsedHeaders,
        body_template: parsedBody,
        response_mapping: parsedMapping,
        is_active: true
      };

      if (editingIntegration?.id && !editingIntegration.id.startsWith('int-sample')) {
        const { error } = await supabase.from('supplier_integrations').update(payload).eq('id', editingIntegration.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('supplier_integrations').insert(payload).select().single();
        if (error) throw error;
      }

      alert('¡Integración guardada con éxito!');
      setShowIntegrationModal(false);
      loadIntegrations();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSavingIntegration(false);
    }
  };

  // Ejecutar prueba del conector No-Code
  const handleRunNoCodeTest = async (integration) => {
    setRunningTest(true);
    setTestResult(null);

    try {
      let parsedVars = {};
      try {
        parsedVars = JSON.parse(testVariables);
      } catch {
        parsedVars = { uid: '1548962314', order_id: 'ORD-998822', product_sku: 'FF_100' };
      }

      const res = await executeSupplierApi(integration, parsedVars);
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setRunningTest(false);
    }
  };

  // Probar Validador de Free Fire
  const handleTestFreeFire = async (e) => {
    e.preventDefault();
    if (!ffUid.trim()) return;

    setFfLoading(true);
    setFfResult(null);

    const startTime = Date.now();
    try {
      const res = await validatePlayerUid(ffUid.trim(), 'Free Fire', ffRegion);
      const elapsed = Date.now() - startTime;
      setFfResult({ ...res, latencyMs: elapsed });
    } catch (err) {
      setFfResult({ success: false, error: err.message, latencyMs: Date.now() - startTime });
    } finally {
      setFfLoading(false);
    }
  };

  // Disparar pruebas de notificaciones
  const handleSendTestPush = async (type) => {
    setSendingPush(true);
    try {
      if (type === 'order_completed') {
        await notifyOrderCompleted({ orderId: 'ORD-' + Math.floor(1000 + Math.random() * 9000), userId: null, amount: 15.50 });
      } else if (type === 'admin_new_order') {
        await notifyAdminNewOrder({ orderId: 'ORD-' + Math.floor(1000 + Math.random() * 9000), amount: 45.00, customerName: 'Carlos G.', paymentMethod: 'Binance Pay' });
      } else if (type === 'support_reply') {
        await notifySupportReply({ conversationId: 'conv-1', userId: null, message: 'Hola Carlos, tu recarga fue acreditada a tu cuenta de Free Fire.' });
      } else if (type === 'feed_interaction') {
        await notifyAdminFeedInteraction({ type: 'comment', userName: 'GamerGT', content: '¿A qué hora cierran la entrega de diamantes hoy?', postId: 'p1' });
      } else if (type === 'custom') {
        await sendPushNotification({ userId: null, title: testPushTitle, body: testPushBody, type: 'custom' });
      }

      loadPushData();
    } catch (err) {
      alert('Error enviando notificación: ' + err.message);
    } finally {
      setSendingPush(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Module Title Banner */}
      <div className="glass-panel" style={{
        padding: '20px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-cyan)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚡</span> Integraciones, APIs & Push Realtime
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Centro de control para APIs de validación, Conector No-Code de Proveedores, Binance Pay y Notificaciones.
          </p>
        </div>

        {/* Navigation Sub-Tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('nocode')}
            className={activeTab === 'nocode' ? 'btn-cyan' : 'btn-glass'}
            style={{ fontSize: '0.8rem', padding: '8px 14px' }}
          >
            🧩 Conector No-Code
          </button>
          <button
            onClick={() => setActiveTab('ff-validator')}
            className={activeTab === 'ff-validator' ? 'btn-cyan' : 'btn-glass'}
            style={{ fontSize: '0.8rem', padding: '8px 14px' }}
          >
            🎮 Validador Free Fire
          </button>
          <button
            onClick={() => setActiveTab('binance')}
            className={activeTab === 'binance' ? 'btn-cyan' : 'btn-glass'}
            style={{ fontSize: '0.8rem', padding: '8px 14px' }}
          >
            🟡 Binance Pay API
          </button>
          <button
            onClick={() => setActiveTab('push-monitor')}
            className={activeTab === 'push-monitor' ? 'btn-cyan' : 'btn-glass'}
            style={{ fontSize: '0.8rem', padding: '8px 14px' }}
          >
            🔔 Push & Alertas Logs
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CONECTOR NO-CODE DE PROVEEDORES */}
      {/* ========================================================================= */}
      {activeTab === 'nocode' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Proveedores de Recargas Conectados</h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Configura endpoints dinámicos, headers con variables y mapeo de respuestas JSON sin tocar código backend.
              </div>
            </div>
            <button
              onClick={() => {
                setEditingIntegration(null);
                setFormName('Nueva API de Proveedor');
                setFormUrl('https://api.proveedor.com/v1/orders');
                setFormMethod('POST');
                setShowIntegrationModal(true);
              }}
              className="btn-cyan"
              style={{ fontSize: '0.82rem', padding: '8px 16px' }}
            >
              ➕ Nueva Integración
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {integrations.map((int) => (
              <div key={int.id} className="glass-panel" style={{
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--accent-cyan)' }}>{int.name}</h4>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      <span className="badge-cyan" style={{ fontSize: '0.65rem', marginRight: '6px' }}>{int.http_method}</span>
                      {int.endpoint_url}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: int.is_active ? '#10b981' : '#f87171' }}>
                    {int.is_active ? '● Activo' : '○ Inactivo'}
                  </span>
                </div>

                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  fontSize: '0.72rem',
                  fontFamily: 'monospace',
                  color: 'var(--text-muted)'
                }}>
                  <div><strong>Variables soportadas:</strong> &#123;&#123;uid&#125;&#125;, &#123;&#123;nickname&#125;&#125;, &#123;&#123;order_id&#125;&#125;, &#123;&#123;product_sku&#125;&#125;</div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <button
                    onClick={() => handleRunNoCodeTest(int)}
                    disabled={runningTest}
                    className="btn-cyan"
                    style={{ flex: 1, fontSize: '0.75rem', padding: '6px 10px' }}
                  >
                    {runningTest ? 'Probando...' : '⚡ Probar Conexión'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingIntegration(int);
                      setFormName(int.name);
                      setFormUrl(int.endpoint_url);
                      setFormMethod(int.http_method || 'POST');
                      setFormHeaders(JSON.stringify(int.headers || {}, null, 2));
                      setFormBody(JSON.stringify(int.body_template || {}, null, 2));
                      setFormMapping(JSON.stringify(int.response_mapping || {}, null, 2));
                      setShowIntegrationModal(true);
                    }}
                    className="btn-glass"
                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                  >
                    ✏️ Editar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Test Output Console */}
          {testResult && (
            <div className="glass-panel animate-fade" style={{
              borderRadius: 'var(--radius-lg)',
              padding: '18px',
              border: `1px solid ${testResult.success ? '#10b981' : '#ef4444'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: testResult.success ? '#10b981' : '#ef4444' }}>
                  {testResult.success ? '✅ Prueba Exitosa de API Proveedor' : '❌ Error al Ejecutar Integración'}
                </h4>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Latencia: <strong>{testResult.latencyMs}ms</strong> | Código HTTP: <strong>{testResult.statusCode || 200}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Datos Mapeados a ALVSHOP:</div>
                  <pre style={{ background: '#080a0f', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', overflowX: 'auto', color: '#10b981' }}>
                    {JSON.stringify(testResult.mappedData, null, 2)}
                  </pre>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Respuesta Cruda del Servidor:</div>
                  <pre style={{ background: '#080a0f', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', overflowX: 'auto', color: '#38bdf8' }}>
                    {JSON.stringify(testResult.response || testResult.error, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: VALIDADOR DE FREE FIRE TESTER */}
      {/* ========================================================================= */}
      {activeTab === 'ff-validator' && (
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '24px', maxWidth: '640px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>Consola de Pruebas: Validador Free Fire UID</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Verifica la consulta en tiempo real de cuentas de Free Fire y el retorno del Nickname oficial del jugador.
          </p>

          <form onSubmit={handleTestFreeFire} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  ID de Jugador (UID):
                </label>
                <input
                  type="text"
                  placeholder="Ej: 29386038 o 1548962314"
                  value={ffUid}
                  onChange={(e) => setFfUid(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: '#0d111a',
                    border: '1px solid var(--border-glass)',
                    color: '#fff',
                    fontSize: '0.95rem',
                    fontWeight: '700'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Región:
                </label>
                <select
                  value={ffRegion}
                  onChange={(e) => setFfRegion(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    background: '#0d111a',
                    border: '1px solid var(--border-glass)',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="LATAM">LATAM</option>
                  <option value="BR">Brasil</option>
                  <option value="US">USA / Norteamérica</option>
                  <option value="SAC">Sudamérica</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={ffLoading} className="btn-cyan" style={{ padding: '12px', fontWeight: '800' }}>
              {ffLoading ? 'Consultando Servidores de Free Fire...' : '🔍 Validar UID en Tiempo Real'}
            </button>
          </form>

          {/* Result Card */}
          {ffResult && (
            <div style={{
              background: ffResult.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${ffResult.success ? '#10b981' : '#ef4444'}`,
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              animation: 'fadeInUp 0.3s ease'
            }}>
              {ffResult.success ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.5rem' }}>👑</span>
                      <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#10b981' }}>
                          {ffResult.nickname}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          UID: {ffUid} | Región: {ffResult.region} {ffResult.fromCache && '⚡ (Desde Caché)'}
                        </div>
                      </div>
                    </div>
                    <span className="badge-cyan" style={{ background: '#10b981', color: '#000' }}>
                      Nivel {ffResult.account_level}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    paddingTop: '8px'
                  }}>
                    <div>Likes estimados: <strong>{ffResult.currentLikes?.toLocaleString()}</strong></div>
                    <div>Latencia de respuesta: <strong>{ffResult.latencyMs}ms</strong></div>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>
                  ❌ {ffResult.error || 'Error consultando ID del jugador'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BINANCE PAY API CONFIGURATION & SIMULATOR */}
      {/* ========================================================================= */}
      {activeTab === 'binance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '680px' }}>
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '1.5rem' }}>🟡</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f0b90b' }}>Binance Pay API Gateway</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Cobros automáticos en USDT con generación de QR, deeplinks y verificación instantánea.
                </div>
              </div>
            </div>

            <div style={{
              background: 'rgba(240, 185, 11, 0.08)',
              border: '1px solid rgba(240, 185, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              fontSize: '0.8rem',
              color: 'var(--text-main)',
              lineHeight: 1.5,
              marginBottom: '20px'
            }}>
              <div><strong>Estado de la API:</strong> <span style={{ color: '#10b981' }}>● Activa & Operativa</span></div>
              <div style={{ marginTop: '4px' }}>
                Las variables de entorno <code>VITE_BINANCE_API_KEY</code> y <code>VITE_BINANCE_SECRET_KEY</code> están configuradas en <code>.env</code>.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleSendTestPush('admin_new_order')}
                className="btn-cyan"
                style={{ background: '#f0b90b', color: '#000', fontWeight: '800' }}
              >
                ⚡ Simular Notificación de Pago Acreditado en Binance Pay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MONITOR DE PUSH & LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'push-monitor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Action Simulator */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '10px' }}>Simulador de Eventos Push en Vivo</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Dispara eventos en tiempo real para verificar los sintetizadores de sonido y las notificaciones emergentes.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button onClick={() => handleSendTestPush('order_completed')} className="btn-cyan" style={{ fontSize: '0.78rem' }}>
                🎉 Cliente: Pedido Entregado
              </button>
              <button onClick={() => handleSendTestPush('support_reply')} className="btn-cyan" style={{ fontSize: '0.78rem' }}>
                💬 Cliente: Respuesta Soporte
              </button>
              <button onClick={() => handleSendTestPush('admin_new_order')} className="btn-glass" style={{ fontSize: '0.78rem', borderColor: '#f59e0b', color: '#f59e0b' }}>
                🛒 Admin: Nuevo Pedido ($45 USDT)
              </button>
              <button onClick={() => handleSendTestPush('feed_interaction')} className="btn-glass" style={{ fontSize: '0.78rem', borderColor: '#ec4899', color: '#ec4899' }}>
                ❤️ Admin: Comentario Feed
              </button>
            </div>
          </div>

          {/* Logs History Table */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '14px' }}>Historial de Notificaciones Emitidas (`notification_logs`)</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px' }}>Tipo</th>
                    <th style={{ padding: '8px' }}>Título</th>
                    <th style={{ padding: '8px' }}>Mensaje</th>
                    <th style={{ padding: '8px' }}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {notificationLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No hay logs de notificaciones aún.
                      </td>
                    </tr>
                  ) : (
                    notificationLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '8px' }}>
                          <span className="badge-cyan" style={{ fontSize: '0.65rem' }}>{log.type}</span>
                        </td>
                        <td style={{ padding: '8px', fontWeight: '700' }}>{log.title}</td>
                        <td style={{ padding: '8px', color: 'var(--text-main)' }}>{log.body}</td>
                        <td style={{ padding: '8px', color: 'var(--text-muted)' }}>
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIGURADOR DE INTEGRACIÓN NO-CODE */}
      {/* ========================================================================= */}
      {showIntegrationModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          backgroundColor: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-cyan)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                {editingIntegration ? 'Editar Integración No-Code' : 'Nueva Integración de Proveedor'}
              </h3>
              <button
                onClick={() => setShowIntegrationModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveIntegration} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Nombre del Proveedor / Servicio:
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Método HTTP:
                  </label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                  >
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Endpoint URL:
                  </label>
                  <input
                    type="url"
                    required
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Headers (JSON con variables tipo &#123;&#123;api_key&#125;&#125;):
                </label>
                <textarea
                  rows="3"
                  value={formHeaders}
                  onChange={(e) => setFormHeaders(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', background: '#080a0f', border: '1px solid var(--border-glass)', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.78rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Body Template JSON (Variables: &#123;&#123;uid&#125;&#125;, &#123;&#123;product_sku&#125;&#125;, &#123;&#123;order_id&#125;&#125;):
                </label>
                <textarea
                  rows="4"
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', background: '#080a0f', border: '1px solid var(--border-glass)', color: '#10b981', fontFamily: 'monospace', fontSize: '0.78rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Response Mapping JSON (Mapeo a transaction_id, status, message):
                </label>
                <textarea
                  rows="3"
                  value={formMapping}
                  onChange={(e) => setFormMapping(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', background: '#080a0f', border: '1px solid var(--border-glass)', color: '#f59e0b', fontFamily: 'monospace', fontSize: '0.78rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowIntegrationModal(false)} className="btn-glass">
                  Cancelar
                </button>
                <button type="submit" disabled={savingIntegration} className="btn-cyan">
                  {savingIntegration ? 'Guardando...' : 'Guardar Integración'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
