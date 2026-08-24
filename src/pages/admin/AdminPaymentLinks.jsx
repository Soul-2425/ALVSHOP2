import React, { useState, useEffect } from 'react';
import {
  getAllPaymentLinks,
  addBulkPaymentLinks,
  deletePaymentLink,
  releasePaymentLink,
  calculateStockSummary
} from '../../services/paymentLinksService';
import { useApp } from '../../context/AppContext';

export default function AdminPaymentLinks() {
  const { config } = useApp();
  const exchangeRate = Number(config?.exchange_rate_gtq || 7.80);

  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State for Bulk Ingestion
  const [selectedDenom, setSelectedDenom] = useState(5);
  const [customAmount, setCustomAmount] = useState('');
  const [provider, setProvider] = useState('Recurrente');
  const [bulkText, setBulkText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Filter State
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadPool = async () => {
    setLoading(true);
    try {
      const data = await getAllPaymentLinks();
      setLinks(data || []);
    } catch (e) {
      console.warn('Error cargando pool de links:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPool();
  }, []);

  const stockData = calculateStockSummary(links);

  const handleAddLinks = async (e) => {
    e.preventDefault();
    const amount = selectedDenom === 'custom' ? Number(customAmount) : Number(selectedDenom);
    if (!amount || amount <= 0) {
      alert('Ingresa un monto válido.');
      return;
    }

    if (!bulkText.trim()) {
      alert('Por favor pega al menos un link en el área de texto.');
      return;
    }

    setSaving(true);
    setSaveSuccessMsg('');

    try {
      const result = await addBulkPaymentLinks(amount, bulkText, provider);
      if (result.error) {
        alert(result.error);
      } else {
        setSaveSuccessMsg(`¡${result.count} links de $${amount} USD agregados exitosamente al Pool!`);
        setBulkText('');
        if (selectedDenom === 'custom') setCustomAmount('');
        loadPool();
      }
    } catch (err) {
      alert('Error agregando links: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (linkId) => {
    if (!confirm('¿Estás seguro de eliminar este enlace del pool?')) return;
    await deletePaymentLink(linkId);
    setLinks(prev => prev.filter(l => l.id !== linkId));
  };

  const handleRelease = async (linkId) => {
    if (!confirm('¿Deseas liberar este enlace para que vuelva a estar DISPONIBLE para otro cliente?')) return;
    await releasePaymentLink(linkId);
    setLinks(prev => prev.map(l => l.id === linkId ? { ...l, status: 'available', assigned_to_user_id: null, assigned_order_id: null } : l));
  };

  // Filtered Links for Table
  const filteredLinks = links.filter(l => {
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    const matchesSearch =
      l.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.identifier_tag || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(l.amount_usd).includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        border: '1px solid var(--border-cyan)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '2.2rem' }}>🔗</span>
          <div>
            <h2 style={{ fontSize: '1.35rem', margin: 0, fontWeight: '900', color: '#fff' }}>
              Pool de Links de Pago Rotativos (Recurrente)
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: 'var(--accent-cyan)' }}>
              Inventario de enlaces desechables de 1 solo uso con auto-descarte, auditoría y alertas de stock bajo
            </p>
          </div>
        </div>

        <button
          onClick={loadPool}
          className="btn-glass"
          style={{ padding: '8px 16px', fontSize: '0.82rem' }}
        >
          🔄 Actualizar Pool
        </button>
      </div>

      {/* Global Low Stock Alert Banner */}
      {stockData.hasAnyLowStock && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(234, 179, 8, 0.15) 100%)',
          border: '2px solid #ef4444',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 0 25px rgba(239, 68, 68, 0.2)'
        }}>
          <span style={{ fontSize: '2rem' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '900', color: '#f87171', fontSize: '1rem', marginBottom: '2px' }}>
              ¡ALERTA DE STOCK BAJO DE LINKS DE PAGO!
            </div>
            <div style={{ fontSize: '0.82rem', color: '#fff' }}>
              {stockData.lowStockAlerts.map(a => a.message).join(' | ')}.
              Por favor genera nuevos links en Recurrente y agrégalos a continuación para no pausar las ventas.
            </div>
          </div>
        </div>
      )}

      {/* Stock Cards Monitor Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px'
      }}>
        {[5, 10, 20, 30, 50].map(amt => {
          const item = stockData.summary[amt] || { available: 0, reserved: 0, used: 0, isLowStock: true };
          const isLow = item.available <= 5;

          return (
            <div
              key={amt}
              style={{
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                background: isLow ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                border: isLow ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid var(--border-glass)',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fff' }}>
                  ${amt} USD
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontWeight: '800',
                  background: isLow ? 'rgba(239, 68, 68, 0.3)' : 'rgba(52, 211, 153, 0.2)',
                  color: isLow ? '#f87171' : '#34d399'
                }}>
                  {isLow ? '⚠️ STOCK BAJO' : '🟢 ÓPTIMO'}
                </span>
              </div>

              <div style={{ fontSize: '1.5rem', fontWeight: '900', color: isLow ? '#f87171' : 'var(--accent-cyan)' }}>
                {item.available} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Disponibles</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-glass)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span>🟡 Reservados: {item.reserved}</span>
                <span>🔴 Usados: {item.used}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Formulario de Carga Masiva de Links */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '24px' }}>
        <h3 style={{ fontSize: '1.15rem', color: 'var(--accent-cyan)', margin: '0 0 14px 0', fontWeight: '800' }}>
          ➕ Agregar Lote de Links al Pool (Sin tocar código)
        </h3>

        {saveSuccessMsg && (
          <div style={{
            background: 'rgba(52, 211, 153, 0.15)',
            border: '1px solid #34d399',
            color: '#34d399',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            fontWeight: '700',
            marginBottom: '16px'
          }}>
            ✅ {saveSuccessMsg}
          </div>
        )}

        <form onSubmit={handleAddLinks} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>
                Denominación ($ USD):
              </label>
              <select
                value={selectedDenom}
                onChange={(e) => setSelectedDenom(e.target.value === 'custom' ? 'custom' : Number(e.target.value))}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.88rem' }}
              >
                <option value={5}>Paquete de $5.00 USD (Q{(5 * exchangeRate).toFixed(2)} GTQ)</option>
                <option value={10}>Paquete de $10.00 USD (Q{(10 * exchangeRate).toFixed(2)} GTQ)</option>
                <option value={20}>Paquete de $20.00 USD (Q{(20 * exchangeRate).toFixed(2)} GTQ)</option>
                <option value={30}>Paquete de $30.00 USD (Q{(30 * exchangeRate).toFixed(2)} GTQ)</option>
                <option value={50}>Paquete de $50.00 USD (Q{(50 * exchangeRate).toFixed(2)} GTQ)</option>
                <option value="custom">Otro monto personalizado...</option>
              </select>
            </div>

            {selectedDenom === 'custom' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>
                  Ingresa el Monto ($ USD):
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="Ej. 15.00"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.88rem' }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>
                Pasarela / Proveedor:
              </label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.88rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>
              Pega la lista de enlaces generados (un enlace por línea):
            </label>
            <textarea
              rows={4}
              required
              placeholder={`https://app.recurrente.com/s/jonathan.../5usdc1\nhttps://app.recurrente.com/s/jonathan.../5usdc2\nhttps://app.recurrente.com/s/jonathan.../5usdc3`}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                background: '#0d111a',
                border: '1px solid var(--border-glass)',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: '0.85rem'
              }}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', marginTop: '4px' }}>
              💡 El sistema detecta automáticamente la terminación (ej. 5usdc1, 5usdc2) para el registro de auditoría.
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-cyan"
            style={{ alignSelf: 'flex-start', padding: '12px 24px', fontSize: '0.9rem', fontWeight: '800' }}
          >
            {saving ? 'Guardando en Base de Datos...' : '💾 Agregar Links al Pool'}
          </button>
        </form>
      </div>

      {/* Tabla de Inventario de Links */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setStatusFilter('all')}
              className={statusFilter === 'all' ? 'btn-cyan' : 'btn-glass'}
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              Todos ({links.length})
            </button>
            <button
              onClick={() => setStatusFilter('available')}
              className={statusFilter === 'available' ? 'btn-cyan' : 'btn-glass'}
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              🟢 Disponibles ({links.filter(l => l.status === 'available').length})
            </button>
            <button
              onClick={() => setStatusFilter('reserved')}
              className={statusFilter === 'reserved' ? 'btn-cyan' : 'btn-glass'}
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              🟡 Reservados ({links.filter(l => l.status === 'reserved').length})
            </button>
            <button
              onClick={() => setStatusFilter('used')}
              className={statusFilter === 'used' ? 'btn-cyan' : 'btn-glass'}
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              🔴 Quemados / Usados ({links.filter(l => l.status === 'used').length})
            </button>
          </div>

          <input
            type="text"
            placeholder="Buscar por tag, monto o url..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem', width: '220px' }}
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 8px' }}>Monto</th>
                <th style={{ padding: '10px 8px' }}>Tag / Identificador</th>
                <th style={{ padding: '10px 8px' }}>URL de Pago</th>
                <th style={{ padding: '10px 8px' }}>Estado</th>
                <th style={{ padding: '10px 8px' }}>Fecha</th>
                <th style={{ padding: '10px 8px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Cargando inventario de links...</td></tr>
              ) : filteredLinks.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No se encontraron enlaces en esta vista.</td></tr>
              ) : (
                filteredLinks.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <td style={{ padding: '12px 8px', fontWeight: '900', color: 'var(--accent-cyan)' }}>
                      ${Number(l.amount_usd).toFixed(2)} USD
                    </td>

                    <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#fbbf24' }}>
                      {l.identifier_tag || 'N/A'}
                    </td>

                    <td style={{ padding: '12px 8px' }}>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#60a5fa', textDecoration: 'none', wordBreak: 'break-all', fontSize: '0.78rem' }}
                      >
                        {l.url}
                      </a>
                    </td>

                    <td style={{ padding: '12px 8px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        background: l.status === 'available' ? 'rgba(52, 211, 153, 0.2)' : l.status === 'reserved' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: l.status === 'available' ? '#34d399' : l.status === 'reserved' ? '#fbbf24' : '#f87171'
                      }}>
                        {l.status === 'available' ? '🟢 Disponible' : l.status === 'reserved' ? '🟡 Reservado' : '🔴 Usado (Quemado)'}
                      </span>
                    </td>

                    <td style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {l.created_at ? new Date(l.created_at).toLocaleDateString() : 'N/A'}
                    </td>

                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {l.status !== 'available' && (
                          <button
                            onClick={() => handleRelease(l.id)}
                            title="Liberar enlace para reutilizar"
                            style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)', color: '#34d399', fontSize: '0.72rem', cursor: 'pointer' }}
                          >
                            🔓 Liberar
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(l.id)}
                          title="Eliminar enlace"
                          style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.72rem', cursor: 'pointer' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
