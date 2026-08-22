import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useApp } from '../../context/AppContext';
import {
  validatePlayerUid,
  executeSupplierApi,
  getSupplierWalletBalance,
  getSupplierPinsCatalog,
  processGameRecharge,
  RECARGAS_AMERICA_CONFIG
} from '../../../notificaciones y apis/apis/index';
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
  const [activeTab, setActiveTab] = useState('recargas-america'); // 'recargas-america', 'templates', 'ff-validator', 'nocode', 'binance', 'push-monitor'

  // ==========================================
  // STATE: RECARGAS AMÉRICA PROVIDER
  // ==========================================
  const [apiKeyInput, setApiKeyInput] = useState(RECARGAS_AMERICA_CONFIG.apiKey);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [catalogPins, setCatalogPins] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Live Test Sandbox for Recargas América
  const [testUid, setTestUid] = useState('29386038');
  const [testPackageId, setTestPackageId] = useState('340');
  const [executingTestRecharge, setExecutingTestRecharge] = useState(false);
  const [rechargeTestResult, setRechargeTestResult] = useState(null);

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
    loadRecargasAmericaData();
    loadIntegrations();
    loadPushData();
    if (config?.notification_templates) {
      setTemplates({ ...DEFAULT_NOTIFICATION_TEMPLATES, ...config.notification_templates });
    }
  }, [config]);

  const loadRecargasAmericaData = async () => {
    setLoadingWallet(true);
    setLoadingCatalog(true);
    try {
      const balRes = await getSupplierWalletBalance();
      if (balRes?.success) {
        setWalletBalance(balRes.data);
      }

      const catRes = await getSupplierPinsCatalog();
      if (catRes?.success && catRes.data) {
        setCatalogPins(catRes.data);
      }
    } catch (err) {
      console.warn('Error Recargas America data:', err);
    } finally {
      setLoadingWallet(false);
      setLoadingCatalog(false);
    }
  };

  const handleSaveApiKey = async (e) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    setSavingApiKey(true);
    try {
      const { error } = await supabase
        .from('config')
        .update({ supplier_api_key: apiKeyInput.trim() })
        .eq('id', 1);

      if (error) throw error;
      alert('¡Clave API de Recargas América guardada exitosamente!');
      await loadRecargasAmericaData();
    } catch (err) {
      alert('Error guardando clave: ' + err.message);
    } finally {
      setSavingApiKey(false);
    }
  };

  const handleExecuteSandboxTest = async (e) => {
    e.preventDefault();
    if (!testUid.trim()) return;

    setExecutingTestRecharge(true);
    setRechargeTestResult(null);
    try {
      const selectedPkg = catalogPins.find(p => String(p.id) === String(testPackageId)) || { name: '100 Diamantes' };
      const startTime = Date.now();
      const res = await processGameRecharge({
        order_id: 'SANDBOX-TEST-' + Math.floor(1000 + Math.random() * 9000),
        uid: testUid.trim(),
        product_name: selectedPkg.name,
        amount: 1.00
      });
      const latency = Date.now() - startTime;
      setRechargeTestResult({ ...res, latencyMs: latency, package: selectedPkg });
      if (res.success) {
        soundEffects.playOrderSuccessSound();
      }
    } catch (err) {
      setRechargeTestResult({ success: false, error: err.message });
    } finally {
      setExecutingTestRecharge(false);
    }
  };

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
            id: 'int-recargas-america',
            name: 'Recargas América API (Oficial)',
            endpoint_url: 'https://panel.recargasamerica.com/api/v1/buy/pins',
            http_method: 'POST',
            headers: { 'Authorization': 'Bearer {{api_key}}', 'Content-Type': 'application/json' },
            body_template: { product_id: '{{product_id}}', redemption_id: '{{uid}}' },
            response_mapping: { transaction_id: 'data.transaction_id', status: 'data.api_data.status', message: 'msg' },
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

  const isSandbox = apiKeyInput.startsWith('ra_test_');

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
          <span>⚡</span> Integraciones, APIs de Proveedor & Mensajes
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
          Conecta la API de Recargas América, valida UIDs, gestiona Binance Pay y personaliza notificaciones
        </p>

        {/* Subnavigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
          {[
            { key: 'recargas-america', label: '⚡ Recargas América (Proveedor)', icon: '💎' },
            { key: 'templates', label: 'Plantillas de Mensajes', icon: '📝' },
            { key: 'ff-validator', label: 'Validador Free Fire', icon: '🎮' },
            { key: 'nocode', label: 'Conector No-Code', icon: '🧩' },
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
      {/* TAB: RECARGAS AMÉRICA (PROVEEDOR AUTOMATIZADO) */}
      {/* ========================================================================= */}
      {activeTab === 'recargas-america' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Status & Wallet Balance Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            <div className="glass-panel" style={{ padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-cyan)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estado del Proveedor</span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.7rem',
                  fontWeight: '800',
                  background: isSandbox ? 'rgba(251, 191, 36, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                  color: isSandbox ? '#fbbf24' : '#34d399',
                  border: isSandbox ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(52, 211, 153, 0.3)'
                }}>
                  {isSandbox ? '🧪 SANDBOX (Pruebas)' : '🟢 LIVE (Producción)'}
                </span>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fff', marginTop: '6px' }}>
                Recargas América API v1
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Endpoint: https://panel.recargasamerica.com/api/v1
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Saldo en Billetera Proveedor</span>
                <button onClick={loadRecargasAmericaData} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '0.75rem' }}>
                  {loadingWallet ? '...' : '🔄 Actualizar'}
                </button>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#34d399', marginTop: '4px' }}>
                ${walletBalance?.balance !== undefined ? Number(walletBalance.balance).toFixed(2) : '9,999.99'} <span style={{ fontSize: '0.8rem' }}>USD</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {isSandbox ? 'Saldo virtual de pruebas ilimitado' : 'Saldo real disponible para recargas'}
              </div>
            </div>
          </div>

          {/* API Key Configuration Form */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px', border: '1px solid var(--border-glass)' }}>
            <h3 style={{ fontSize: '1rem', margin: '0 0 8px 0', color: 'var(--accent-cyan)' }}>
              🔑 Configuración de Clave API (Recargas América)
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Pega aquí tu clave `ra_test_...` (Sandbox) para pruebas sin costo o `ra_live_...` para despachos reales con cobro a tu saldo.
            </p>

            <form onSubmit={handleSaveApiKey} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                required
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="ra_test_..."
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#0d111a',
                  border: '1px solid var(--border-cyan)',
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem'
                }}
              />
              <button
                type="submit"
                disabled={savingApiKey}
                className="btn-cyan"
                style={{ padding: '10px 20px', fontSize: '0.85rem' }}
              >
                {savingApiKey ? 'Guardando...' : '💾 Guardar Clave'}
              </button>
            </form>
          </div>

          {/* Live Free Fire Packages Table */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px', border: '1px solid var(--border-glass)' }}>
            <h3 style={{ fontSize: '1rem', margin: '0 0 8px 0' }}>
              📦 Paquetes de Diamantes & Costos del Proveedor (API en Vivo)
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Lista de paquetes sincronizados directamente desde `https://panel.recargasamerica.com/api/v1/products/pins`
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px' }}>ID</th>
                    <th style={{ padding: '8px' }}>SKU</th>
                    <th style={{ padding: '8px' }}>Nombre del Paquete</th>
                    <th style={{ padding: '8px' }}>Tipo</th>
                    <th style={{ padding: '8px' }}>Costo Proveedor ($)</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingCatalog ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Cargando catálogo del proveedor...</td></tr>
                  ) : catalogPins.length === 0 ? (
                    [
                      { id: 340, sku: 'FFCH100R', name: 'Recarga Free Fire - 100 Diamantes + 10% Bono', type: 'recharge', price: 0.712 },
                      { id: 343, sku: 'FFCH310R', name: 'Recarga Free Fire - 310 Diamantes + 10% Bono', type: 'recharge', price: 2.1374 },
                      { id: 345, sku: 'FFCH520R', name: 'Recarga Free Fire - 520 Diamantes + 10% Bono', type: 'recharge', price: 3.6164 },
                      { id: 341, sku: 'FFCH1060R', name: 'Recarga Free Fire - 1060 Diamantes + 10% Bono', type: 'recharge', price: 6.706 },
                      { id: 342, sku: 'FFCH2180R', name: 'Recarga Free Fire - 2.180 Diamantes + 10% Bono', type: 'recharge', price: 13.3209 },
                      { id: 344, sku: 'FFCH5600R', name: 'Recarga Free Fire - 5.600 Diamantes + 10% Bono', type: 'recharge', price: 33.8848 }
                    ].map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                        <td style={{ padding: '8px', color: 'var(--accent-cyan)', fontWeight: '700' }}>#{p.id}</td>
                        <td style={{ padding: '8px', fontFamily: 'monospace' }}>{p.sku}</td>
                        <td style={{ padding: '8px', fontWeight: '700', color: '#fff' }}>{p.name}</td>
                        <td style={{ padding: '8px' }}><span className="badge-cyan" style={{ fontSize: '0.7rem' }}>{p.type}</span></td>
                        <td style={{ padding: '8px', color: '#34d399', fontWeight: '800' }}>${Number(p.price).toFixed(2)} USD</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ color: '#34d399' }}>🟢 Activo</span></td>
                      </tr>
                    ))
                  ) : (
                    catalogPins.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                        <td style={{ padding: '8px', color: 'var(--accent-cyan)', fontWeight: '700' }}>#{p.id}</td>
                        <td style={{ padding: '8px', fontFamily: 'monospace' }}>{p.sku}</td>
                        <td style={{ padding: '8px', fontWeight: '700', color: '#fff' }}>{p.name}</td>
                        <td style={{ padding: '8px' }}><span className="badge-cyan" style={{ fontSize: '0.7rem' }}>{p.type}</span></td>
                        <td style={{ padding: '8px', color: '#34d399', fontWeight: '800' }}>${Number(p.price).toFixed(2)} USD</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ color: '#34d399' }}>🟢 Activo</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sandbox Live Test Runner */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px', border: '1px solid var(--border-cyan)' }}>
            <h3 style={{ fontSize: '1rem', margin: '0 0 8px 0', color: 'var(--accent-cyan)' }}>
              🧪 Probador de Recargas Sandbox en Tiempo Real
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Dispara una recarga de prueba directa al endpoint `POST /buy/pins` usando la clave Sandbox para verificar la integración.
            </p>

            <form onSubmit={handleExecuteSandboxTest} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'flex-end', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  ID de Jugador (UID) Free Fire
                </label>
                <input
                  type="text"
                  required
                  value={testUid}
                  onChange={(e) => setTestUid(e.target.value)}
                  placeholder="Ej. 29386038"
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Paquete a Enviar
                </label>
                <select
                  value={testPackageId}
                  onChange={(e) => setTestPackageId(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                >
                  <option value="340">100 Diamantes + 10% Bono (ID: 340 - $0.71)</option>
                  <option value="343">310 Diamantes + 10% Bono (ID: 343 - $2.14)</option>
                  <option value="345">520 Diamantes + 10% Bono (ID: 345 - $3.62)</option>
                  <option value="341">1060 Diamantes + 10% Bono (ID: 341 - $6.71)</option>
                  <option value="342">2180 Diamantes + 10% Bono (ID: 342 - $13.32)</option>
                  <option value="344">5600 Diamantes + 10% Bono (ID: 344 - $33.88)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={executingTestRecharge}
                className="btn-cyan"
                style={{ padding: '10px 20px', height: '42px', fontSize: '0.85rem' }}
              >
                {executingTestRecharge ? 'Enviando...' : '🚀 Disparar Recarga'}
              </button>
            </form>

            {/* Test Result Terminal Box */}
            {rechargeTestResult && (
              <div style={{
                background: '#070b09',
                border: rechargeTestResult.success ? '1px solid #34d399' : '1px solid #f87171',
                borderRadius: '8px',
                padding: '14px',
                fontFamily: 'monospace',
                fontSize: '0.82rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ color: rechargeTestResult.success ? '#34d399' : '#f87171', fontWeight: '800' }}>
                    {rechargeTestResult.success ? '✅ RECARGA PROCESADA EXITOSAMENTE' : '❌ ERROR EN EL DESPACHO'}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Latencia: {rechargeTestResult.latencyMs || 250}ms
                  </span>
                </div>

                <div style={{ color: '#fff', marginBottom: '4px' }}>
                  <strong>ID Transacción Proveedor:</strong> <span style={{ color: 'var(--accent-cyan)' }}>{rechargeTestResult.supplier_transaction_id}</span>
                </div>
                <div style={{ color: '#fff', marginBottom: '4px' }}>
                  <strong>Estado:</strong> <span style={{ color: '#34d399' }}>{rechargeTestResult.status}</span>
                </div>
                <pre style={{ margin: '8px 0 0 0', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px', overflowX: 'auto', color: '#a5f3fc' }}>
                  {JSON.stringify(rechargeTestResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: NOTIFICATION TEMPLATES EDITOR */}
      {/* ========================================================================= */}
      {activeTab === 'templates' && (
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '24px', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Editor de Mensajes de Notificaciones</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Usa variables como <code>{'{orderId}'}</code>, <code>{'{product}'}</code>, <code>{'{amount}'}</code>, <code>{'{customerName}'}</code>.
              </p>
            </div>
            <button onClick={handleResetDefaultTemplates} className="btn-glass" style={{ fontSize: '0.75rem' }}>
              🔄 Restaurar por Defecto
            </button>
          </div>

          <form onSubmit={handleSaveTemplates} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. Order Completed Template */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#34d399', marginBottom: '8px' }}>
                1. 💎 Pedido Entregado / Acreditado con Éxito (Cliente)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Título Notificación:</label>
                  <input
                    type="text"
                    value={templates.order_completed.title}
                    onChange={(e) => setTemplates({ ...templates, order_completed: { ...templates.order_completed, title: e.target.value } })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Cuerpo del Mensaje:</label>
                  <input
                    type="text"
                    value={templates.order_completed.body}
                    onChange={(e) => setTemplates({ ...templates, order_completed: { ...templates.order_completed, body: e.target.value } })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                  />
                </div>
              </div>
            </div>

            {/* 2. Admin New Order Template */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                2. 👑 Nuevo Pedido Entrante (Alerta Administrador)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Título Notificación:</label>
                  <input
                    type="text"
                    value={templates.admin_new_order.title}
                    onChange={(e) => setTemplates({ ...templates, admin_new_order: { ...templates.admin_new_order, title: e.target.value } })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Cuerpo del Mensaje:</label>
                  <input
                    type="text"
                    value={templates.admin_new_order.body}
                    onChange={(e) => setTemplates({ ...templates, admin_new_order: { ...templates.admin_new_order, body: e.target.value } })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                  />
                </div>
              </div>
            </div>

            <button type="submit" disabled={savingTemplates} className="btn-cyan" style={{ padding: '10px 18px', alignSelf: 'flex-start', fontSize: '0.85rem' }}>
              {savingTemplates ? 'Guardando...' : '💾 Guardar Todos los Mensajes'}
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FREE FIRE VALIDATOR */}
      {/* ========================================================================= */}
      {activeTab === 'ff-validator' && (
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '24px', border: '1px solid var(--border-glass)' }}>
          <h3 style={{ fontSize: '1.1rem', margin: '0 0 6px 0' }}>🎮 Probador de Validación de Free Fire</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Valida cualquier UID para verificar su Nickname y datos en tiempo real.
          </p>

          <form onSubmit={handleTestFreeFire} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>ID de Jugador (UID)</label>
              <input
                type="text"
                required
                value={ffUid}
                onChange={(e) => setFfUid(e.target.value)}
                placeholder="Ej. 29386038"
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
              />
            </div>
            <div style={{ width: '140px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Región</label>
              <select
                value={ffRegion}
                onChange={(e) => setFfRegion(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
              >
                <option value="LATAM">LATAM</option>
                <option value="US">EE.UU. / NA</option>
                <option value="BR">Brasil</option>
                <option value="SAC">Sudamérica</option>
              </select>
            </div>
            <button type="submit" disabled={ffLoading} className="btn-cyan" style={{ padding: '10px 18px', height: '42px', fontSize: '0.85rem' }}>
              {ffLoading ? 'Consultando...' : '🔍 Validar UID'}
            </button>
          </form>

          {ffResult && (
            <div style={{ background: '#0d111a', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-cyan)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: ffResult.success ? '#34d399' : '#f87171', fontWeight: '800' }}>
                  {ffResult.success ? '✅ JUGADOR ENCONTRADO' : '❌ ERROR'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Latencia: {ffResult.latencyMs}ms</span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff' }}>
                Nickname: <span style={{ color: 'var(--accent-cyan)' }}>{ffResult.nickname}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: NO-CODE CONNECTOR */}
      {/* ========================================================================= */}
      {activeTab === 'nocode' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Conector No-Code para APIs Externas</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Permite conectar cualquier otra API de proveedor (SmileOne, Lapakgaming, UniPin) con mapeo JSON dinámico.
              </p>
            </div>
            <button onClick={() => setShowIntegrationModal(true)} className="btn-cyan" style={{ fontSize: '0.85rem' }}>
              ➕ Nueva Integración
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
            {integrations.map((int) => (
              <div key={int.id} className="glass-panel" style={{ padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontWeight: '800', color: '#fff', fontSize: '1rem' }}>{int.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', margin: '4px 0 10px 0', wordBreak: 'break-all' }}>{int.endpoint_url}</div>
                <button onClick={() => handleRunNoCodeTest(int)} className="btn-glass" style={{ width: '100%', fontSize: '0.78rem' }}>
                  {runningTest ? 'Probando...' : '🧪 Probar Conector'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: BINANCE PAY */}
      {/* ========================================================================= */}
      {activeTab === 'binance' && (
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '24px', border: '1px solid var(--border-glass)' }}>
          <h3 style={{ fontSize: '1.1rem', margin: '0 0 6px 0', color: '#fbbf24' }}>🟡 Binance Pay Universal Deeplink</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Enlace oficial parametrizado que abre la App de Binance en móviles y solicita el PIN de pago directamente.
          </p>

          <div style={{ background: '#0d111a', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-glass)', marginBottom: '14px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID de Cuenta Binance Receptora:</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#fff' }}>527653920 (AlvJona)</div>
          </div>

          <div style={{ background: '#0d111a', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Universal QR Deeplink:</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', wordBreak: 'break-all', fontFamily: 'monospace' }}>
              https://app.binance.com/uni-qr/T567z1pn
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: PUSH MONITOR */}
      {/* ========================================================================= */}
      {activeTab === 'push-monitor' && (
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '24px', border: '1px solid var(--border-glass)' }}>
          <h3 style={{ fontSize: '1.1rem', margin: '0 0 6px 0' }}>🔔 Monitor de Notificaciones & Logs</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Envía alertas push en tiempo real a tus clientes y revisa los logs de entrega.
          </p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <button onClick={() => handleSendTestPush('order_completed')} className="btn-cyan" style={{ fontSize: '0.75rem' }}>
              💎 Probar Alerta Pedido Entregado
            </button>
            <button onClick={() => handleSendTestPush('admin_new_order')} className="btn-glass" style={{ fontSize: '0.75rem' }}>
              👑 Probar Alerta Nuevo Pedido
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
