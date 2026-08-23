import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { processGameRecharge } from '../../../notificaciones y apis/apis/index';
import { notifyOrderCompleted } from '../../../notificaciones y apis/notificaciones/pushService';

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
  const [deletingOrder, setDeletingOrder] = useState(false);
  const [cleaningOld, setCleaningOld] = useState(false);
  const [credentialsInput, setCredentialsInput] = useState('');

  // Load Orders from Supabase
  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles(full_name, email, phone, role),
          order_items(
            id,
            product_id,
            quantity,
            price_usdt,
            cost_usdt,
            fields_data,
            credentials_delivered,
            products(name, image_url, subcategory_id)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.warn('Error loading orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Filter Logic
  const filteredOrders = orders.filter((ord) => {
    // 1. Status Filter
    if (statusFilter !== 'all' && ord.status !== statusFilter) return false;

    // 2. Search Query (Order ID, Customer Name, Email, or Product Name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = ord.id?.toLowerCase().includes(q);
      const matchName = ord.profiles?.full_name?.toLowerCase().includes(q);
      const matchEmail = ord.profiles?.email?.toLowerCase().includes(q);
      const matchProduct = ord.order_items?.some(i => i.products?.name?.toLowerCase().includes(q));
      if (!matchId && !matchName && !matchEmail && !matchProduct) return false;
    }

    // 3. Date Filters
    if (dateFilterPreset === 'today') {
      const today = new Date().toISOString().split('T')[0];
      const ordDate = new Date(ord.created_at).toISOString().split('T')[0];
      if (ordDate !== today) return false;
    } else if (dateFilterPreset === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      if (new Date(ord.created_at) < sevenDaysAgo) return false;
    } else if (dateFilterPreset === 'this_month') {
      const now = new Date();
      const ordDate = new Date(ord.created_at);
      if (ordDate.getMonth() !== now.getMonth() || ordDate.getFullYear() !== now.getFullYear()) return false;
    } else if (dateFilterPreset === 'custom') {
      if (startDate && new Date(ord.created_at) < new Date(startDate)) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(ord.created_at) > end) return false;
      }
    }

    return true;
  });

  // Calculate Metrics from Filtered Orders
  const totalSalesUsdt = filteredOrders.reduce((acc, ord) => acc + (Number(ord.total_usdt) || 0), 0);
  const completedOrdersCount = filteredOrders.filter(o => o.status === 'Completed').length;
  const pendingOrdersCount = filteredOrders.filter(o => o.status === 'Verification' || o.status === 'Pending').length;

  const statusConfig = {
    Completed: { label: 'Completado', bg: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: 'rgba(52, 211, 153, 0.4)' },
    Verification: { label: 'En Verificación', bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: 'rgba(251, 191, 36, 0.4)' },
    Pending: { label: 'Pendiente', bg: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa', border: 'rgba(96, 165, 250, 0.4)' },
    Rejected: { label: 'Rechazado', bg: 'rgba(248, 113, 113, 0.15)', color: '#f87171', border: 'rgba(248, 113, 113, 0.4)' }
  };

  // Handle Status Update & Automatic Stock Deduction
  const handleUpdateOrderStatus = async (newStatus) => {
    if (!selectedOrder) return;
    setUpdatingStatus(true);

    try {
      let supplierTxId = null;

      // 1. If marking as Completed, trigger automatic actions
      if (newStatus === 'Completed') {
        // Descontar stock
        if (selectedOrder.order_items) {
          for (const item of selectedOrder.order_items) {
            if (item.products?.id) {
              const { data: prodData } = await supabase.from('products').select('stock').eq('id', item.products.id).single();
              if (prodData && prodData.stock !== null) {
                const newStock = Math.max(0, prodData.stock - (item.quantity || 1));
                await supabase.from('products').update({ stock: newStock }).eq('id', item.products.id);
              }
            }
          }
        }

        // 2. Extract UID and Trigger Supplier API
        let parsedNotes = {};
        try {
          parsedNotes = typeof selectedOrder.customer_notes === 'string'
            ? JSON.parse(selectedOrder.customer_notes)
            : selectedOrder.customer_notes || {};
        } catch (e) {}

        const targetUid = parsedNotes.target_uid || parsedNotes['ID de Jugador (UID)'] || parsedNotes.uid || selectedOrder.order_items?.[0]?.fields_data?.['ID de Jugador (UID)'] || '';
        const productName = selectedOrder.order_items?.[0]?.products?.name || 'Recarga de Diamantes';

        if (targetUid) {
          const rechargeRes = await processGameRecharge({
            order_id: selectedOrder.id,
            uid: targetUid,
            nickname: parsedNotes.validated_nickname || '',
            product_name: productName,
            total_usdt: selectedOrder.total_usdt
          });

          supplierTxId = rechargeRes?.mappedData?.supplier_transaction_id;
        }

        // 3. Instant push notification to customer
        if (selectedOrder.user_id) {
          notifyOrderCompleted({
            orderId: selectedOrder.id,
            userId: selectedOrder.user_id,
            product: productName,
            amount: selectedOrder.total_usdt
          });
        }
      }

      // 2. Acreditación automática si es un depósito/recarga de saldo de billetera
      const isWalletRecharge = (typeof selectedOrder.customer_notes === 'string' && selectedOrder.customer_notes.includes('Recarga de Billetera')) ||
        (!selectedOrder.order_items || selectedOrder.order_items.length === 0);

      if (newStatus === 'Completed' && isWalletRecharge && selectedOrder.user_id) {
        try {
          const { data: userProfile } = await supabase.from('profiles').select('wallet_balance').eq('id', selectedOrder.user_id).single();
          const localBal = getLocalUserBalance(selectedOrder.user_id);
          const currentBal = localBal !== null ? localBal : Number(userProfile?.wallet_balance || 0);
          const newBal = Number((currentBal + Number(selectedOrder.total_usdt)).toFixed(2));

          setLocalUserBalance(selectedOrder.user_id, newBal);
          try {
            await supabase.from('profiles').update({ wallet_balance: newBal }).eq('id', selectedOrder.user_id);
          } catch (e) {}

          try {
            await supabase.from('transactions').insert({
              user_id: selectedOrder.user_id,
              type: 'Deposit',
              amount_usdt: Number(selectedOrder.total_usdt),
              status: 'Completed',
              notes: `Recarga manual en Quetzales acreditada por Administración (Orden #${selectedOrder.id.slice(0, 8)})`
            });
          } catch (e) {}
        } catch (depositErr) {
          console.error('Error acreditando saldo manual:', depositErr);
        }
      }

      // Update Order Status in Supabase
      const updatePayload = { status: newStatus };
      if (supplierTxId) {
        const prevReceipt = selectedOrder.bank_receipt_url || '';
        updatePayload.bank_receipt_url = prevReceipt ? `${prevReceipt} | SUPPLIER:${supplierTxId}` : `SUPPLIER:${supplierTxId}`;
      }    

      const { error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', selectedOrder.id);

      if (error) throw error;

      // If credentials were provided, save in order_items
      if (credentialsInput.trim() && selectedOrder.order_items?.[0]) {
        await supabase
          .from('order_items')
          .update({ credentials_delivered: credentialsInput.trim() })
          .eq('id', selectedOrder.order_items[0].id);
      }

      alert(`¡Estado del pedido actualizado a "${statusConfig[newStatus]?.label || newStatus}"!\n${supplierTxId ? `⚡ Recarga enviada exitosamente por la API (Tx Proveedor: ${supplierTxId})` : 'Stock descontado y cliente notificado.'}`);
      setSelectedOrder(null);
      setCredentialsInput('');
      await loadOrders();
    } catch (err) {
      alert('Error actualizando pedido: ' + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Delete Individual Order
  const handleDeleteOrder = async (orderId) => {
    if (!confirm(`¿Estás seguro de eliminar permanentemente la orden #${orderId.slice(0, 8)}? Esta acción liberará espacio en la base de datos.`)) return;
    setDeletingOrder(true);
    try {
      // 1. Delete associated order items
      await supabase.from('order_items').delete().eq('order_id', orderId);
      // 2. Delete the order
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) throw error;

      alert('¡Pedido eliminado permanentemente del registro!');
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
      await loadOrders();
    } catch (err) {
      alert('Error eliminando pedido: ' + err.message);
    } finally {
      setDeletingOrder(false);
    }
  };

  // 40-Day Cleanup: Purge orders older than 40 days to keep DB fast & clean
  const handleCleanupOldOrders = async () => {
    const days = 40;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const cutoffIso = cutoffDate.toISOString();
    const formattedCutoff = cutoffDate.toLocaleDateString();

    if (!confirm(`🧹 ¿Deseas depurar la base de datos eliminando todos los pedidos con más de 40 días de antigüedad (creados antes del ${formattedCutoff})? Esto liberará espacio y eliminará registros antiguos.`)) {
      return;
    }

    setCleaningOld(true);
    try {
      // 1. Query old orders
      const { data: oldOrders, error: fetchErr } = await supabase
        .from('orders')
        .select('id')
        .lt('created_at', cutoffIso);

      if (fetchErr) throw fetchErr;

      if (!oldOrders || oldOrders.length === 0) {
        alert('No se encontraron pedidos con más de 40 días de antigüedad. La base de datos ya está al día.');
        return;
      }

      const oldIds = oldOrders.map(o => o.id);

      // 2. Delete order items
      await supabase.from('order_items').delete().in('order_id', oldIds);

      // 3. Delete old orders
      const { error: delErr } = await supabase.from('orders').delete().in('id', oldIds);
      if (delErr) throw delErr;

      alert(`✅ ¡Depuración completada! Se eliminaron ${oldIds.length} pedidos antiguos (> 40 días) para mantener la base de datos limpia.`);
      await loadOrders();
    } catch (err) {
      alert('Error depurando pedidos antiguos: ' + err.message);
    } finally {
      setCleaningOld(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📦</span> Historial & Gestión de Pedidos
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Filtra por fecha, cambia estados, descuenta stock y limpia registros antiguos
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleCleanupOldOrders}
            disabled={cleaningOld}
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🧹</span> {cleaningOld ? 'Depurando...' : 'Limpiar Pedidos (> 40 días)'}
          </button>

          <button onClick={loadOrders} className="btn-glass" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🔄</span> Recargar Lista
          </button>
        </div>
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
            ${(Number(totalSalesUsdt) || 0).toFixed(2)} <span style={{ fontSize: '0.8rem' }}>USDT</span>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>
            🔍 Filtros de Búsqueda Avanzada
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: 'Todo el Historial' },
              { key: 'today', label: 'Hoy' },
              { key: '7days', label: 'Últimos 7 Días' },
              { key: 'this_month', label: 'Este Mes' },
              { key: 'custom', label: 'Rango Personalizado' }
            ].map(p => (
              <button
                key={p.key}
                onClick={() => setDateFilterPreset(p.key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: dateFilterPreset === p.key ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
                  color: dateFilterPreset === p.key ? '#000' : 'var(--text-muted)',
                  border: 'none'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Pickers */}
        {dateFilterPreset === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Desde:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Hasta:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
              />
            </div>
          </div>
        )}

        {/* Search & Status Filter */}
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '10px' }}>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
            >
              <option value="all">Todos los Estados</option>
              <option value="Completed">✅ Completados</option>
              <option value="Verification">🔍 En Verificación</option>
              <option value="Pending">⏳ Pendientes</option>
              <option value="Rejected">❌ Rechazados</option>
            </select>
          </div>

          <div>
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
                      {ord.payment_method === 'Wallet' ? '💎 Billetera' : ord.payment_method || 'Binance Pay'}
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
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            setSelectedOrder(ord);
                            setCredentialsInput(ord.order_items?.[0]?.credentials_delivered || '');
                          }}
                          className="btn-cyan"
                          style={{ padding: '6px 10px', fontSize: '0.78rem', fontWeight: '700' }}
                        >
                          ⚙️ Gestionar
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(ord.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#f87171',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                          title="Eliminar Pedido"
                        >
                          🗑️
                        </button>
                      </div>
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

              {/* Bank Deposit Receipt / Comprobante de Pago */}
              {selectedOrder.bank_receipt_url && (
                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '10px' }}>
                  <strong style={{ fontSize: '0.8rem', color: '#34d399' }}>📸 Comprobante de Pago Adjunto:</strong>
                  {selectedOrder.bank_receipt_url.startsWith('data:image') || selectedOrder.bank_receipt_url.startsWith('http') ? (
                    <div style={{ marginTop: '6px' }}>
                      <a href={selectedOrder.bank_receipt_url} target="_blank" rel="noopener noreferrer" title="Clic para ver en grande">
                        <img
                          src={selectedOrder.bank_receipt_url}
                          alt="Comprobante de depósito"
                          style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '1px solid var(--border-cyan)', objectFit: 'contain', cursor: 'zoom-in' }}
                        />
                      </a>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        🔍 Haz clic en el comprobante para abrirlo en tamaño completo
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#070b09', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', marginTop: '4px', color: '#fbbf24' }}>
                      {selectedOrder.bank_receipt_url}
                    </div>
                  )}
                </div>
              )}
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
                Cambiar Estado del Pedido (Descuenta stock automáticamente):
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

            {/* Actions: Delete Order & WhatsApp Contact */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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

              <button
                onClick={() => handleDeleteOrder(selectedOrder.id)}
                disabled={deletingOrder}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  padding: '8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                🗑️ Eliminar Permanentemente Este Pedido
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
