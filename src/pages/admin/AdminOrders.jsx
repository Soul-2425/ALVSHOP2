import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [dateFilterPreset, setDateFilterPreset] = useState('all'); // 'all', 'today', '7days', 'this_month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [credentialsInput, setCredentialsInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  // Load Orders from Supabase
  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles(full_name, email, phone, role),
          order_items(*, products(name, image_url))
        `)
        .order('created_at', { ascending: false });

      if (data && !error) {
        setOrders(data);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error(err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Filter Orders based on Date, Status, Search
  const filteredOrders = orders.filter((order) => {
    const orderDate = new Date(order.created_at);
    const now = new Date();

    // 1. Date Filter
    if (dateFilterPreset === 'today') {
      const isToday = orderDate.toDateString() === now.toDateString();
      if (!isToday) return false;
    } else if (dateFilterPreset === '7days') {
      const diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);
      if (diffDays > 7) return false;
    } else if (dateFilterPreset === 'this_month') {
      const isSameMonth = orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      if (!isSameMonth) return false;
    } else if (dateFilterPreset === 'custom') {
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (orderDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) return false;
      }
    }

    // 2. Status Filter
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false;
    }

    // 3. Search Query Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const idMatch = order.id.toLowerCase().includes(query);
      const emailMatch = order.profiles?.email?.toLowerCase().includes(query);
      const nameMatch = order.profiles?.full_name?.toLowerCase().includes(query);
      const notesMatch = order.customer_notes?.toLowerCase().includes(query);
      const itemMatch = order.order_items?.some(i => i.products?.name?.toLowerCase().includes(query));

      if (!idMatch && !emailMatch && !nameMatch && !notesMatch && !itemMatch) {
        return false;
      }
    }

    return true;
  });

  // Calculate Metrics from filtered
  const totalFilteredSalesUsdt = filteredOrders.reduce((sum, o) => sum + Number(o.total_usdt || 0), 0);
  const pendingOrdersCount = filteredOrders.filter(o => o.status === 'Pending' || o.status === 'Verification').length;
  const completedOrdersCount = filteredOrders.filter(o => o.status === 'Completed').length;

  // Status Labels & Badges
  const statusConfig = {
    Completed: { label: 'Completado', bg: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: 'rgba(52, 211, 153, 0.4)' },
    Verification: { label: 'En Verificación', bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: 'rgba(251, 191, 36, 0.4)' },
    Pending: { label: 'Pendiente', bg: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa', border: 'rgba(96, 165, 250, 0.4)' },
    Rejected: { label: 'Rechazado', bg: 'rgba(248, 113, 113, 0.15)', color: '#f87171', border: 'rgba(248, 113, 113, 0.4)' }
  };

  // Update Status in Supabase
  const handleUpdateOrderStatus = async (newStatus) => {
    if (!selectedOrder) return;
    setUpdatingStatus(true);

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      // If credentials were provided, save in order_items
      if (credentialsInput.trim() && selectedOrder.order_items?.[0]) {
        await supabase
          .from('order_items')
          .update({ credentials_delivered: credentialsInput.trim() })
          .eq('id', selectedOrder.order_items[0].id);
      }

      alert(`¡Estado del pedido actualizado a "${statusConfig[newStatus]?.label || newStatus}"!`);
      setSelectedOrder(null);
      setCredentialsInput('');
      await loadOrders();
    } catch (err) {
      alert('Error actualizando pedido: ' + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header & Quick Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📦</span> Historial & Gestión de Pedidos
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Filtra por fecha, estado y gestiona la entrega de diamantes y cuentas
          </p>
        </div>
        <button onClick={loadOrders} className="btn-glass" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🔄</span> Recargar Lista
        </button>
      </div>

      {/* Summary Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-cyan)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pedidos en Vista</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fff', marginTop: '4px' }}>
            {filteredOrders.length} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>pedidos</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Facturado</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--accent-cyan)', marginTop: '4px' }}>
            ${totalFilteredSalesUsdt.toFixed(2)} <span style={{ fontSize: '0.8rem' }}>USDT</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
          <div style={{ fontSize: '0.75rem', color: '#fbbf24' }}>Por Procesar / Verificación</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fbbf24', marginTop: '4px' }}>
            {pendingOrdersCount} <span style={{ fontSize: '0.8rem' }}>pendientes</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
          <div style={{ fontSize: '0.75rem', color: '#34d399' }}>Entregados con Éxito</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#34d399', marginTop: '4px' }}>
            {completedOrdersCount} <span style={{ fontSize: '0.8rem' }}>completados</span>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="glass-panel" style={{
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        border: '1px solid var(--border-glass)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        
        {/* Row 1: Date Filter Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>📅 Filtrar Fecha:</span>
          
          {[
            { key: 'all', label: 'Todo el Tiempo' },
            { key: 'today', label: '⚡ Hoy' },
            { key: '7days', label: '📆 Últimos 7 Días' },
            { key: 'this_month', label: '🗓️ Este Mes' },
            { key: 'custom', label: '🔍 Rango Personalizado' }
          ].map((preset) => (
            <button
              key={preset.key}
              onClick={() => setDateFilterPreset(preset.key)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: dateFilterPreset === preset.key ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
                color: dateFilterPreset === preset.key ? '#000' : 'var(--text-main)',
                border: dateFilterPreset === preset.key ? 'none' : '1px solid var(--border-glass)'
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Row 2: Custom Date Range Pickers (If custom selected) */}
        {dateFilterPreset === 'custom' && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Desde:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ background: '#0d111a', color: '#fff', border: '1px solid var(--border-glass)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.8rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hasta:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ background: '#0d111a', color: '#fff', border: '1px solid var(--border-glass)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.8rem' }}
              />
            </div>

            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                ✕ Limpiar Rango
              </button>
            )}
          </div>
        )}

        {/* Row 3: Status & Search Filter */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Status Dropdown */}
          <div style={{ minWidth: '180px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                background: '#0d111a',
                border: '1px solid var(--border-glass)',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}
            >
              <option value="all">⚡ Todos los Estados</option>
              <option value="Pending">Pendiente (Sin pagar / En espera)</option>
              <option value="Verification">En Verificación (Comprobante adjunto)</option>
              <option value="Completed">Completado (Entregado)</option>
              <option value="Rejected">Rechazado</option>
            </select>
          </div>

          {/* Search Bar */}
          <div style={{ flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              placeholder="Buscar por ID, UID del jugador, correo o producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: 'var(--radius-sm)',
                background: '#0d111a',
                border: '1px solid var(--border-glass)',
                color: '#fff',
                fontSize: '0.85rem'
              }}
            />
          </div>
        </div>

      </div>

      {/* Orders Table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '10px 8px' }}># ID Orden</th>
              <th style={{ padding: '10px 8px' }}>Fecha & Hora</th>
              <th style={{ padding: '10px 8px' }}>Cliente</th>
              <th style={{ padding: '10px 8px' }}>Producto / Servicio</th>
              <th style={{ padding: '10px 8px' }}>Datos / UID</th>
              <th style={{ padding: '10px 8px' }}>Total (USDT)</th>
              <th style={{ padding: '10px 8px' }}>Método</th>
              <th style={{ padding: '10px 8px' }}>Estado</th>
              <th style={{ padding: '10px 8px', textAlign: 'center' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Cargando pedidos...
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                  No se encontraron pedidos con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredOrders.map((ord) => {
                const badge = statusConfig[ord.status] || statusConfig.Pending;
                const formattedDate = new Date(ord.created_at).toLocaleString('es-GT', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                // Extract customer details/notes
                let parsedNotes = ord.customer_notes || '';
                try {
                  const obj = JSON.parse(ord.customer_notes);
                  parsedNotes = Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(' | ');
                } catch (e) {
                  // Keep as string
                }

                return (
                  <tr key={ord.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    {/* ID */}
                    <td style={{ padding: '12px 8px', fontWeight: '800', color: 'var(--accent-cyan)' }}>
                      #{ord.id.slice(0, 8)}
                    </td>

                    {/* Date */}
                    <td style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {formattedDate}
                    </td>

                    {/* Customer */}
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontWeight: '700', color: '#fff' }}>{ord.profiles?.full_name || 'Cliente'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ord.profiles?.email || 'N/A'}</div>
                    </td>

                    {/* Product */}
                    <td style={{ padding: '12px 8px' }}>
                      {ord.order_items?.map((item) => (
                        <div key={item.id} style={{ fontWeight: '600' }}>
                          {item.products?.name || 'Recarga Digital'} (x{item.quantity})
                        </div>
                      ))}
                    </td>

                    {/* UID / Notes */}
                    <td style={{ padding: '12px 8px', maxWidth: '200px', fontSize: '0.8rem' }}>
                      <span style={{ color: '#a5f3fc', fontWeight: '600' }}>
                        {parsedNotes || 'Sin datos extra'}
                      </span>
                    </td>

                    {/* Total */}
                    <td style={{ padding: '12px 8px', fontWeight: '900', color: 'var(--accent-cyan)' }}>
                      ${Number(ord.total_usdt).toFixed(2)} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>USDT</span>
                    </td>

                    {/* Payment Method */}
                    <td style={{ padding: '12px 8px', fontSize: '0.8rem' }}>
                      {ord.payment_method === 'Wallet' ? '💎 Billetera' : '🏦 Banrural GTQ'}
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: '800',
                        background: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`
                      }}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Action */}
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          setSelectedOrder(ord);
                          setCredentialsInput(ord.order_items?.[0]?.credentials_delivered || '');
                        }}
                        className="btn-cyan"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: '700' }}
                      >
                        Gestionar ⚙️
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Manage Order Modal */}
      {selectedOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel animate-fade" style={{
            width: '100%',
            maxWidth: '560px',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            border: '1px solid var(--border-cyan)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Gestionar Pedido #{selectedOrder.id.slice(0, 8)}</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Creado el {new Date(selectedOrder.created_at).toLocaleString()}
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Order Details Card */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                <div><strong>Cliente:</strong> {selectedOrder.profiles?.full_name || 'N/A'}</div>
                <div><strong>Correo:</strong> {selectedOrder.profiles?.email || 'N/A'}</div>
                <div><strong>Total USDT:</strong> ${Number(selectedOrder.total_usdt).toFixed(2)} USDT</div>
                <div><strong>Total GTQ:</strong> Q{Number(selectedOrder.total_gtq).toFixed(2)} GTQ</div>
                <div><strong>Método:</strong> {selectedOrder.payment_method}</div>
                <div><strong>Estado Actual:</strong> <span style={{ color: statusConfig[selectedOrder.status]?.color }}>{statusConfig[selectedOrder.status]?.label}</span></div>
              </div>

              {/* Customer Notes / UID Info */}
              <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '10px' }}>
                <strong style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>Datos de Entrega / UID:</strong>
                <div style={{ background: '#070b09', padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem', marginTop: '4px', color: '#fff', wordBreak: 'break-word' }}>
                  {selectedOrder.customer_notes || 'Sin notas del cliente'}
                </div>
              </div>
            </div>

            {/* Streaming Account / Delivery Credentials Field */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-muted)' }}>
                Credenciales o Enlace de Entrega al Cliente (Opcional):
              </label>
              <input
                type="text"
                placeholder="Ej. Correo: cliente@netflix.com | Clave: 123456 | Perfil 3"
                value={credentialsInput}
                onChange={(e) => setCredentialsInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#0d111a',
                  border: '1px solid var(--border-cyan)',
                  color: '#fff',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            {/* Change Status Buttons */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px', color: 'var(--text-muted)' }}>
                Cambiar Estado del Pedido:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => handleUpdateOrderStatus('Completed')}
                  disabled={updatingStatus}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(52, 211, 153, 0.4)',
                    background: 'rgba(52, 211, 153, 0.15)',
                    color: '#34d399',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  ✅ Marcar Completado
                </button>

                <button
                  onClick={() => handleUpdateOrderStatus('Verification')}
                  disabled={updatingStatus}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                    background: 'rgba(251, 191, 36, 0.15)',
                    color: '#fbbf24',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  🔍 En Verificación
                </button>

                <button
                  onClick={() => handleUpdateOrderStatus('Pending')}
                  disabled={updatingStatus}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(96, 165, 250, 0.4)',
                    background: 'rgba(96, 165, 250, 0.15)',
                    color: '#60a5fa',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  ⏳ Marcar Pendiente
                </button>

                <button
                  onClick={() => handleUpdateOrderStatus('Rejected')}
                  disabled={updatingStatus}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(248, 113, 113, 0.4)',
                    background: 'rgba(248, 113, 113, 0.15)',
                    color: '#f87171',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  ❌ Rechazar Pedido
                </button>
              </div>
            </div>

            {/* WhatsApp Direct Contact Button */}
            {selectedOrder.profiles?.phone && (
              <a
                href={`https://wa.me/${selectedOrder.profiles.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  `Hola ${selectedOrder.profiles.full_name}, te escribimos de ALVSHOP respecto a tu pedido #${selectedOrder.id.slice(0,8)}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-glass"
                style={{ display: 'inline-flex', width: '100%', justifyContent: 'center', padding: '10px', fontSize: '0.85rem', color: '#25D366' }}
              >
                💬 Contactar al Cliente por WhatsApp ({selectedOrder.profiles.phone})
              </a>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
