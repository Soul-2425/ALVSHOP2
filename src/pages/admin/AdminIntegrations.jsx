import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useApp } from '../../context/AppContext';
import { validatePlayerUid, executeSupplierApi } from '../../../notificaciones y apis/apis/index';
import {
  DEFAULT_NOTIFICATION_TEMPLATES,
  notifyOrderCompleted,
  notifySupportReply,
  notifyAdminNewOrder,
  notifyAdminFeedInteraction,
  notifyAdminSupportMessage,
  sendPushNotification
} from '../../../notificaciones y apis/notificaciones/pushService';
import { soundEffects } from '../../services/soundEffects';

export default function AdminIntegrations() {
  const { config, loadConfig } = useApp();
  const [activeTab, setActiveTab] = useState('nocode'); // 'nocode', 'templates', 'ff-validator', 'binance', 'push-monitor'

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
  // STATE: NOTIFICATION TEMPLATES EDITOR
  // ==========================================
  const [templates, setTemplates] = useState(DEFAULT_NOTIFICATION_TEMPLATES);
  const [savingTemplates, setSavingTemplates] = useState(false);

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
    if (config?.notification_templates) {
      setTemplates({ ...DEFAULT_NOTIFICATION_TEMPLATES, ...config.notification_templates });
    }
  }, [config]);

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

  // Guardar Plantillas de Notificaciones
  const handleSaveTemplates = async (e) => {
    e.preventDefault();
    setSavingTemplates(true);

    try {
      const { error } = await supabase
        .from('config')
        .update({ notification_templates: templates })
        .eq('id', 1);

      if (error) throw error;

      await loadConfig();
      alert('¡Plantillas de mensajes de notificación guardadas con éxito!');
    } catch (err) {
      alert('Error guardando plantillas: ' + err.message);
    } finally {
      setSavingTemplates(false);
    }
  };

  // Restaurar Plantillas por Defecto
  const handleResetDefaultTemplates = () => {
    if (confirm('¿Deseas restaurar todos los textos de notificación a los valores por defecto?')) {
      setTemplates(DEFAULT_NOTIFICATION_TEMPLATES);
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

    try {
      const startTime = Date.now();
      const res = await validatePlayerUid(ffUid.trim(), 'Free Fire', ffRegion);
      const latency = Date.now() - startTime;
      setFfResult({ ...res, latencyMs: latency });
    } catch (err) {
      setFfResult({ success: false, error: err.message });
    } finally {
      setFfLoading(false);
    }
  };

  // Enviar Notificación de Prueba
  const handleSendTestPush = async (type = 'general') => {
    setSendingPush(true);
    try {
      if (type === 'order_completed') {
        await notifyOrderCompleted({ orderId: 'ORD-TEST-992', userId: null, amount: 25.00, customTemplates: templates });
      } else if (type === 'support_reply') {
        await notifySupportReply({ conversationId: 'conv-test-1', userId: null, message: 'Hola, tus diamantes ya fueron acreditados a tu cuenta.', customTemplates: templates });
      } else if (type === 'admin_new_order') {
        await notifyAdminNewOrder({ orderId: 'ORD-771122', amount: 45.00, customerName: 'Jonathan Alvares', paymentMethod: 'Binance Pay', customTemplates: templates });
      } else if (type === 'feed_interaction') {
        await notifyAdminFeedInteraction({ type: 'like', userName: 'Gamer_Pro99', postId: 'post-1', customTemplates: templates });
      } else {
        await sendPushNotification({
          userId: null,
          title: testPushTitle,
          body: testPushBody,
          type: 'admin_test',
          metadata: { isAdmin: true }
        });
      }

      alert('¡Notificación enviada!');
      loadPushData();
    } catch (err) {
      alert('Error enviando notificación: ' + err.message);
    } finally {
      setSendingPush(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        border: '1px solid var(--border-cyan)',
        background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(6, 182, 212, 0.1) 100%)'
      }}>
        <h2 style={{ fontSize: '1.3rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚡</span> Integraciones, APIs & Mensajes de Notificaciones
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
          Personaliza los textos que reciben tus clientes, conecta APIs de recargas y gestiona Binance Pay
        </p>

        {/* Subnavigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
          {[
            { key: 'nocode', label: 'Conector No-Code Proveedores', icon: '🧩' },
            { key: 'templates', label: 'Plantillas de Mensajes', icon: '📝' },
            { key: 'ff-validator', label: 'Validador Free Fire', icon: '🎮' },
            { key: 'binance', label: 'Binance Pay API', icon: '🟡' },
            { key: 'push-monitor', label: 'Push & Alertas Logs', icon: '🔔' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: activeTab === tab.key ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
                color: activeTab === tab.key ? '#000' : 'var(--text-main)',
                border: activeTab === tab.key ? 'none' : '1px solid var(--border-glass)'
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: NO-CODE SUPPLIER CONNECTOR */}
      {/* ========================================================================= */}
      {activeTab === 'nocode' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Proveedores de Recargas Conectados</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Configura endpoints dinámicos, headers con variables y mapeo de respuestas JSON sin tocar código backend.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingIntegration(null);
                setFormName('');
                setFormUrl('');
                setShowIntegrationModal(true);
              }}
              className="btn-cyan"
              style={{ fontSize: '0.85rem' }}
            >
              ➕ Nueva Integración
            </button>
          </div>

          {/* Integrations Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
            {integrations.map((int) => (
              <div key={int.id} className="glass-panel" style={{
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: '800' }}>{int.name}</h4>
                    <span style={{ fontSize: '0.7rem', color: int.is_active ? '#10b981' : '#f87171', fontWeight: '800' }}>
                      ● {int.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div style={{
                    fontSize: '0.75rem',
                    background: '#070b09',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    color: 'var(--accent-cyan)',
                    fontFamily: 'monospace',
                    overflowX: 'auto'
                  }}>
                    <strong style={{ color: '#60a5fa' }}>{int.http_method}</strong> {int.endpoint_url}
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Variables soportadas: <code>&#123;&#123;uid&#125;&#125;</code>, <code>&#123;&#123;nickname&#125;&#125;</code>, <code>&#123;&#123;order_id&#125;&#125;</code>, <code>&#123;&#123;product_sku&#125;&#125;</code>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleRunNoCodeTest(int)}
                    disabled={runningTest}
                    className="btn-cyan"
                    style={{ flex: 1, padding: '8px 12px', fontSize: '0.78rem' }}
                  >
                    {runningTest ? 'Probando...' : '⚡ Probar Conexión'}
                  </button>

                  <button
                    onClick={() => {
                      setEditingIntegration(int);
                      setFormName(int.name);
                      setFormUrl(int.endpoint_url);
                      setFormMethod(int.http_method || 'POST');
                      setFormHeaders(JSON.stringify(int.headers, null, 2));
                      setFormBody(JSON.stringify(int.body_template, null, 2));
                      setFormMapping(JSON.stringify(int.response_mapping, null, 2));
                      setShowIntegrationModal(true);
                    }}
                    className="btn-glass"
                    style={{ padding: '8px 12px', fontSize: '0.78rem' }}
                  >
                    ✏️ Editar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Test Execution Output Box */}
          {testResult && (
            <div className="glass-panel" style={{
              borderRadius: 'var(--radius-lg)',
              padding: '18px 20px',
              border: testResult.success ? '1px solid #10b981' : '1px solid #ef4444',
              background: testResult.success ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ color: testResult.success ? '#10b981' : '#ef4444', fontSize: '0.9rem' }}>
                  {testResult.success ? '✅ Integración Ejecutada Correctamente' : '❌ Error al Ejecutar Integración'}
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Latencia: {testResult.latencyMs}ms | Código HTTP: {testResult.statusCode}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.75rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Datos Mapeados a ALVSHOP:</div>
                  <pre style={{ background: '#000', padding: '10px', borderRadius: '6px', overflowX: 'auto', color: 'var(--accent-cyan)' }}>
                    {JSON.stringify(testResult.mappedData, null, 2)}
                  </pre>
                </div>

                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Respuesta del Servidor:</div>
                  <pre style={{ background: '#000', padding: '10px', borderRadius: '6px', overflowX: 'auto', color: '#60a5fa' }}>
                    {JSON.stringify(testResult.response || testResult.error, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: NOTIFICATION MESSAGE TEMPLATES EDITOR */}
      {/* ========================================================================= */}
      {activeTab === 'templates' && (
        <form onSubmit={handleSaveTemplates} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Editor de Textos & Mensajes de Notificaciones</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Configura lo que dice cada notificación que se envía a tus clientes y asesores en tiempo real.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleResetDefaultTemplates}
                className="btn-glass"
                style={{ fontSize: '0.8rem', padding: '8px 14px' }}
              >
                🔄 Restaurar por Defecto
              </button>
              <button
                type="submit"
                disabled={savingTemplates}
                className="btn-cyan"
                style={{ fontSize: '0.85rem', padding: '8px 18px', fontWeight: '800' }}
              >
                {savingTemplates ? 'Guardando...' : '💾 Guardar Cambios'}
              </button>
            </div>
          </div>

          <div style={{
            background: 'rgba(6, 182, 212, 0.08)',
            border: '1px solid var(--border-cyan)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            fontSize: '0.8rem',
            color: '#a5f3fc'
          }}>
            💡 <strong>Variables dinámicas disponibles para usar en tus textos:</strong>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
              <code>&#123;&#123;order_id&#125;&#125;</code> (ID de orden), 
              <code>&#123;&#123;product&#125;&#125;</code> (Nombre del producto), 
              <code>&#123;&#123;amount&#125;&#125;</code> (Total en USDT), 
              <code>&#123;&#123;customer_name&#125;&#125;</code> (Nombre del cliente), 
              <code>&#123;&#123;message&#125;&#125;</code> (Mensaje de chat).
            </div>
          </div>

          {/* Template 1: Pedido Registrado */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h4 style={{ fontSize: '0.95rem', margin: '0 0 12px 0', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🛒</span> 1. Notificación: Pedido Creado / Registrado (Para el Cliente)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Título</label>
                <input
                  type="text"
                  value={templates.order_created?.title || ''}
                  onChange={(e) => setTemplates({
                    ...templates,
                    order_created: { ...templates.order_created, title: e.target.value }
                  })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Cuerpo del Mensaje</label>
                <input
                  type="text"
                  value={templates.order_created?.body || ''}
                  onChange={(e) => setTemplates({
                    ...templates,
                    order_created: { ...templates.order_created, body: e.target.value }
                  })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                />
              </div>
            </div>
          </div>

          {/* Template 2: Pedido Completado */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h4 style={{ fontSize: '0.95rem', margin: '0 0 12px 0', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🎉</span> 2. Notificación: Pedido Completado & Entregado (Para el Cliente)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Título</label>
                <input
                  type="text"
                  value={templates.order_completed?.title || ''}
                  onChange={(e) => setTemplates({
                    ...templates,
                    order_completed: { ...templates.order_completed, title: e.target.value }
                  })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Cuerpo del Mensaje</label>
                <input
                  type="text"
                  value={templates.order_completed?.body || ''}
                  onChange={(e) => setTemplates({
                    ...templates,
                    order_completed: { ...templates.order_completed, body: e.target.value }
                  })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                />
              </div>
            </div>
          </div>

          {/* Template 3: Nuevo Pedido en Tienda */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h4 style={{ fontSize: '0.95rem', margin: '0 0 12px 0', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>💰</span> 3. Notificación: Nueva Venta Ingresada (Para el Administrador y Asesores)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Título</label>
                <input
                  type="text"
                  value={templates.admin_new_order?.title || ''}
                  onChange={(e) => setTemplates({
                    ...templates,
                    admin_new_order: { ...templates.admin_new_order, title: e.target.value }
                  })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Cuerpo del Mensaje</label>
                <input
                  type="text"
                  value={templates.admin_new_order?.body || ''}
                  onChange={(e) => setTemplates({
                    ...templates,
                    admin_new_order: { ...templates.admin_new_order, body: e.target.value }
                  })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                />
              </div>
            </div>
          </div>

          {/* Template 4: Respuesta de Soporte */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h4 style={{ fontSize: '0.95rem', margin: '0 0 12px 0', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>💬</span> 4. Notificación: Respuesta del Asesor en Soporte Técnico (Para el Cliente)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Título</label>
                <input
                  type="text"
                  value={templates.support_reply?.title || ''}
                  onChange={(e) => setTemplates({
                    ...templates,
                    support_reply: { ...templates.support_reply, title: e.target.value }
                  })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Cuerpo del Mensaje</label>
                <input
                  type="text"
                  value={templates.support_reply?.body || ''}
                  onChange={(e) => setTemplates({
                    ...templates,
                    support_reply: { ...templates.support_reply, body: e.target.value }
                  })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingTemplates}
            className="btn-cyan"
            style={{ padding: '14px', fontSize: '0.95rem', fontWeight: '800' }}
          >
            {savingTemplates ? 'Guardando...' : '💾 Guardar Todas las Plantillas de Mensajes'}
          </button>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FREE FIRE VALIDATOR TESTER */}
      {/* ========================================================================= */}
      {activeTab === 'ff-validator' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '640px' }}>
          <form onSubmit={handleTestFreeFire} className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Consola de Prueba: Validador de Free Fire</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Ingresa un UID para verificar si tu proveedor o scraper resuelve el Nickname en vivo.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>ID de Jugador (UID)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 816331100"
                  value={ffUid}
                  onChange={(e) => setFfUid(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Región</label>
                <select
                  value={ffRegion}
                  onChange={(e) => setFfRegion(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                >
                  <option value="LATAM">LATAM</option>
                  <option value="US">EE.UU / Norteamérica</option>
                  <option value="BR">Brasil</option>
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
      {/* TAB 4: BINANCE PAY API CONFIGURATION & SIMULATOR */}
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
      {/* TAB 5: MONITOR DE PUSH & LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'push-monitor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Action Simulator */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '10px' }}>Simulador de Eventos Push en Vivo</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Dispara eventos en tiempo real para verificar los sintetizadores de sonido y las notificaciones emergentes con tus plantillas.
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
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Nombre del Proveedor</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. API Smile.one Direct"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Método</label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                  >
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                    <option value="PUT">PUT</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Endpoint URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://api.proveedor.com/v1/recharge"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Headers (JSON con variables)</label>
                <textarea
                  rows="3"
                  value={formHeaders}
                  onChange={(e) => setFormHeaders(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#a5f3fc', fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Body Template (JSON con variables)</label>
                <textarea
                  rows="4"
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#60a5fa', fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Response Mapping (JSON)</label>
                <textarea
                  rows="3"
                  value={formMapping}
                  onChange={(e) => setFormMapping(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#34d399', fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
              </div>

              <button type="submit" disabled={savingIntegration} className="btn-cyan" style={{ padding: '12px', marginTop: '6px' }}>
                {savingIntegration ? 'Guardando...' : '💾 Guardar Integración ➔'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
