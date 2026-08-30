import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { processGameRecharge } from '../../../notificaciones y apis/apis/index';
import { notifyOrderCompleted } from '../../../notificaciones y apis/notificaciones/pushService';
import { burnPaymentLink, releasePaymentLink } from '../../services/paymentLinksService';
import { useApp } from '../../context/AppContext';

export default function AdminOrders() {
  const { soundEffects, addNotification } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [dateFilterPreset, setDateFilterPreset] = useState('all'); // 'all', 'today', '7days', 'this_month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Likes Delivery Modal State
  const [deliveryModalOrder, setDeliveryModalOrder] = useState(null);
  const [likesAddedInput, setLikesAddedInput] = useState('');
  const [publishToFeed, setPublishToFeed] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Date Range Delete Modal State
  const [showDateRangeDeleteModal, setShowDateRangeDeleteModal] = useState(false);
  const [rangeDeleteStart, setRangeDeleteStart] = useState('');
  const [rangeDeleteEnd, setRangeDeleteEnd] = useState('');
  const [deletingRangeOrders, setDeletingRangeOrders] = useState(false);

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState(false);
  const [cleaningOld, setCleaningOld] = useState(false);
  const [credentialsInput, setCredentialsInput] = useState('');
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState(null);

  // Load Orders from Multi-layer Synchronizer (Supabase + API + Storage)
  const loadOrders = async () => {
    try {
      // 1. Fetch Supabase Database
      let supabaseOrders = [];
      let profMap = new Map();
      let prodMap = new Map();
      let itemsByOrder = new Map();

      try {
        const [ordRes, profRes, itemsRes, prodsRes] = await Promise.allSettled([
          supabase.from('orders').select('*').order('created_at', { ascending: false }),
          supabase.from('profiles').select('id, full_name, email, phone, role'),
          supabase.from('order_items').select('*'),
          supabase.from('products').select('id, name, image_url, subcategory_id')
        ]);

        if (profRes.status === 'fulfilled' && profRes.value.data) {
          profMap = new Map(profRes.value.data.map(p => [p.id, p]));
        }
        if (prodsRes.status === 'fulfilled' && prodsRes.value.data) {
          prodMap = new Map(prodsRes.value.data.map(p => [p.id, p]));
        }
        if (itemsRes.status === 'fulfilled' && itemsRes.value.data) {
          const items = itemsRes.value.data.map(i => ({
            ...i,
            products: prodMap.get(i.product_id)
          }));
          items.forEach(i => {
            if (!itemsByOrder.has(i.order_id)) itemsByOrder.set(i.order_id, []);
            itemsByOrder.get(i.order_id).push(i);
          });
        }
        if (ordRes.status === 'fulfilled' && ordRes.value.data) {
          supabaseOrders = ordRes.value.data.map(o => ({
            ...o,
            profiles: profMap.get(o.user_id) || o.profiles,
            order_items: itemsByOrder.get(o.id) || o.order_items || []
          }));
        }
      } catch (sbErr) {
        console.warn('Supabase fetch notice:', sbErr);
      }

      // 2. Fetch Backend API Orders backup (if server is active)
      let backendOrders = [];
      try {
        const apiRes = await fetch('/api/v1/orders');
        if (apiRes.ok) {
          const apiJson = await apiRes.json();
          if (Array.isArray(apiJson)) backendOrders = apiJson;
        }
      } catch (e) {}

      // 3. Scan Local Storage for any recent client-side orders
      let localOrders = [];
      try {
        const allStored = localStorage.getItem('alv_all_orders');
        if (allStored) localOrders = [...localOrders, ...JSON.parse(allStored)];

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('alv_user_orders_')) {
            try {
              const uOrders = JSON.parse(localStorage.getItem(key) || '[]');
              if (Array.isArray(uOrders)) localOrders = [...localOrders, ...uOrders];
            } catch (e) {}
          }
        }
      } catch (e) {}

      // 4. Merge, De-duplicate by ID, and sort by created_at DESC
      const mergedMap = new Map();

      // Put local orders first
      localOrders.forEach(o => {
        if (o?.id) mergedMap.set(o.id, o);
      });

      // Put backend orders
      backendOrders.forEach(o => {
        if (o?.id) mergedMap.set(o.id, { ...(mergedMap.get(o.id) || {}), ...o });
      });

      // Overlay authoritative Supabase orders
      supabaseOrders.forEach(o => {
        if (o?.id) mergedMap.set(o.id, { ...(mergedMap.get(o.id) || {}), ...o });
      });

      const finalOrders = Array.from(mergedMap.values()).sort((a, b) => {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });

      setOrders(finalOrders);
    } catch (err) {
      console.warn('Error synchronizing orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();

    // Listen for storage events (e.g. order placed in another tab/window)
    const handleStorageChange = (e) => {
      if (e.key === 'alv_all_orders' || (e.key && e.key.startsWith('alv_user_orders_'))) {
        loadOrders();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Supabase Realtime Channel on 'orders' table
    let channel = null;
    try {
      channel = supabase
        .channel('admin-orders-live-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              try { soundEffects?.playNewOrderAdminSound?.(); } catch (e) {}
              addNotification?.({
                type: 'admin_new_order',
                title: '📦 ¡Nuevo Pedido Recibido!',
                body: `Se ha registrado el pedido #${payload.new?.id?.slice(0, 8)} por $${Number(payload.new?.total_usdt || 0).toFixed(2)} USDT.`
              });
            }
            loadOrders();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription error:', err);
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, dateFilterPreset, startDate, endDate]);

  // Filter Logic
  const filteredOrders = orders.filter((ord) => {
    // 1. Status Filter
    if (statusFilter !== 'all' && ord.status !== statusFilter) return false;

    // 2. Search Query (Order ID, Customer Name, Email, Product Name, Notes, Method, Receipt)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = ord.id?.toLowerCase().includes(q);
      const matchName = ord.profiles?.full_name?.toLowerCase().includes(q);
      const matchEmail = ord.profiles?.email?.toLowerCase().includes(q);
      const matchProduct = ord.order_items?.some(i => i.products?.name?.toLowerCase().includes(q));
      const matchNotes = typeof ord.customer_notes === 'string' && ord.customer_notes.toLowerCase().includes(q);
      const matchMethod = ord.payment_method?.toLowerCase().includes(q);
      const matchReceipt = typeof ord.bank_receipt_url === 'string' && ord.bank_receipt_url.toLowerCase().includes(q);
      if (!matchId && !matchName && !matchEmail && !matchProduct && !matchNotes && !matchMethod && !matchReceipt) return false;
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

  // Pagination calculation (10 orders per page)
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) || 1;
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const statusConfig = {
    Completed: { label: 'Completado', bg: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: 'rgba(52, 211, 153, 0.4)' },
    Verification: { label: 'En Verificación', bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: 'rgba(251, 191, 36, 0.4)' },
    Pending: { label: 'Pendiente', bg: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa', border: 'rgba(96, 165, 250, 0.4)' },
    Rejected: { label: 'Rechazado', bg: 'rgba(248, 113, 113, 0.15)', color: '#f87171', border: 'rgba(248, 113, 113, 0.4)' }
  };

  // Handle Status Update & Automatic Stock Deduction
  const handleUpdateOrderStatus = async (newStatus) => {
    if (!selectedOrder) return;
    
    // Check if it's a Likes order and we want to mark it as Completed
    let parsedNotes = {};
    try {
      parsedNotes = typeof selectedOrder.customer_notes === 'string'
        ? JSON.parse(selectedOrder.customer_notes)
        : selectedOrder.customer_notes || {};
    } catch (e) {}

    if (newStatus === 'Completed' && parsedNotes.service_type === 'Free Fire Likes') {
      setDeliveryModalOrder(selectedOrder);
      setLikesAddedInput(parsedNotes.likes_to_add || '');
      setPublishToFeed(true);
      return; // Stop here, wait for modal submission
    }

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
      let parsedNotes = {};
      const rawNotesStr = typeof selectedOrder.customer_notes === 'string'
        ? selectedOrder.customer_notes
        : JSON.stringify(selectedOrder.customer_notes || {});

      try {
        parsedNotes = typeof selectedOrder.customer_notes === 'string'
          ? JSON.parse(selectedOrder.customer_notes)
          : selectedOrder.customer_notes || {};
      } catch (e) {}

      const isWalletRecharge = rawNotesStr.toLowerCase().includes('wallet_deposit') ||
        rawNotesStr.toLowerCase().includes('wallet deposit') ||
        rawNotesStr.toLowerCase().includes('recarga') ||
        rawNotesStr.toLowerCase().includes('billetera') ||
        rawNotesStr.toLowerCase().includes('deposit') ||
        selectedOrder.payment_method === 'Recurrente / Link' ||
        (!selectedOrder.order_items || selectedOrder.order_items.length === 0);

      // Si se completa y viene de un enlace de pago único, quemar el link (marcar used)
      if (newStatus === 'Completed' && parsedNotes.link_id) {
        try {
          await burnPaymentLink(parsedNotes.link_id, selectedOrder.id);
        } catch (e) {}
      }

      // Si se rechaza y viene de un enlace de pago, liberar el link de vuelta al pool
      if (newStatus === 'Rejected' && parsedNotes.link_id) {
        try {
          await releasePaymentLink(parsedNotes.link_id);
        } catch (e) {}
      }

      if (newStatus === 'Completed' && isWalletRecharge && selectedOrder.user_id) {
        try {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('wallet_balance, email')
            .eq('id', selectedOrder.user_id)
            .single();

          const userEmail = userProfile?.email || selectedOrder.customer_email || '';
          const currentBal = Number(userProfile?.wallet_balance || 0);
          const rechargeAmt = Number(selectedOrder.total_usdt || 0);
          const newBal = Number((currentBal + rechargeAmt).toFixed(2));

          setLocalUserBalance(selectedOrder.user_id, newBal);
          if (userEmail) setLocalUserBalance(userEmail, newBal);

          // Update Supabase profiles table directly
          const { error: profileUpdateErr } = await supabase
            .from('profiles')
            .update({ wallet_balance: newBal })
            .eq('id', selectedOrder.user_id);

          if (profileUpdateErr) {
            console.warn('Profiles direct update warning:', profileUpdateErr);
          }

          // Push to backend microservice to sync devices
          try {
            const host = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost';
            const endpoints = [`/api/v1/balance/update`, `http://${host}:5000/api/v1/balance/update`];
            for (const ep of endpoints) {
              try {
                await fetch(ep, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: selectedOrder.user_id, email: userEmail, balance: newBal })
                });
                break;
              } catch (e) {}
            }
          } catch (e) {}

          try {
            await supabase.from('transactions').insert({
              user_id: selectedOrder.user_id,
              type: 'Deposit',
              amount_usdt: rechargeAmt,
              status: 'Completed',
              notes: `Recarga acreditada por Administración (Orden #${selectedOrder.id.slice(0, 8)}${parsedNotes.link_tag ? ` - Link: ${parsedNotes.link_tag}` : ''})`
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
      try {
        await supabase.from('order_items').delete().eq('order_id', orderId);
      } catch (e) {}

      // 2. Delete associated transactions that reference this order
      try {
        await supabase.from('transactions').delete().eq('order_id', orderId);
      } catch (e) {}

      // 3. Delete the order from Supabase
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) {
        console.warn('Supabase order delete error:', error);
      }

      // 4. Update UI State Immediately so it disappears from the screen
      setOrders(prev => prev.filter(o => o.id !== orderId));
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
      alert('¡Pedido eliminado permanentemente del registro!');
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
        alert('No se encontraron pedidos con más de 40 días de antigüedad.');
        return;
      }

      const oldIds = oldOrders.map(o => o.id);

      // 2. Delete order items
      try {
        await supabase.from('order_items').delete().in('order_id', oldIds);
      } catch (e) {}

      // 3. Delete transactions referencing these orders
      try {
        await supabase.from('transactions').delete().in('order_id', oldIds);
      } catch (e) {}

      // 4. Delete the old orders
      const { error: deleteErr } = await supabase
        .from('orders')
        .delete()
        .in('id', oldIds);

      if (deleteErr) throw deleteErr;

      setOrders(prev => prev.filter(o => !oldIds.includes(o.id)));
      alert(`¡Se eliminaron con éxito ${oldIds.length} pedidos antiguos! La base de datos está optimizada.`);
      await loadOrders();
    } catch (err) {
      alert('Error depurando pedidos antiguos: ' + err.message);
    } finally {
      setCleaningOld(false);
    }
  };

  // Handle Delete Orders by Custom Date Range
  const handleDeleteOrdersByRange = async (e) => {
    e?.preventDefault();
    if (!rangeDeleteStart || !rangeDeleteEnd) {
      alert('⚠️ Por favor selecciona la Fecha de Inicio y la Fecha de Fin.');
      return;
    }

    const startObj = new Date(rangeDeleteStart);
    startObj.setHours(0, 0, 0, 0);

    const endObj = new Date(rangeDeleteEnd);
    endObj.setHours(23, 59, 59, 999);

    if (startObj > endObj) {
      alert('⚠️ La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }

    // Find matching orders
    const targets = orders.filter(o => {
      const oDate = new Date(o.created_at);
      return oDate >= startObj && oDate <= endObj;
    });

    if (targets.length === 0) {
      alert(`No se encontraron pedidos registrados entre el ${rangeDeleteStart} y el ${rangeDeleteEnd}.`);
      return;
    }

    const confirmMsg = `⚠️ ATENCIÓN: Se eliminarán permanentemente ${targets.length} pedidos creados entre el ${rangeDeleteStart} y el ${rangeDeleteEnd}.\n\n¿Estás seguro de que deseas eliminarlos? Esta acción no se puede deshacer.`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingRangeOrders(true);
    try {
      const targetIds = targets.map(o => o.id);

      // 1. Delete order items
      try {
        await supabase.from('order_items').delete().in('order_id', targetIds);
      } catch (e) {}

      // 2. Delete transactions
      try {
        await supabase.from('transactions').delete().in('order_id', targetIds);
      } catch (e) {}

      // 3. Delete orders
      const { error: delErr } = await supabase.from('orders').delete().in('id', targetIds);
      if (delErr) throw delErr;

      setOrders(prev => prev.filter(o => !targetIds.includes(o.id)));
      alert(`✅ ¡Se eliminaron con éxito ${targetIds.length} pedidos del rango seleccionado!`);
      setShowDateRangeDeleteModal(false);
      setRangeDeleteStart('');
      setRangeDeleteEnd('');
      await loadOrders();
    } catch (err) {
      alert('Error eliminando pedidos por rango: ' + err.message);
    } finally {
      setDeletingRangeOrders(false);
    }
  };

  // Confirm Likes Delivery
  const handleConfirmLikesDelivery = async () => {
    if (!deliveryModalOrder) return;
    setUpdatingStatus(true);
    
    try {
      let parsedNotes = typeof deliveryModalOrder.customer_notes === 'string'
        ? JSON.parse(deliveryModalOrder.customer_notes) : deliveryModalOrder.customer_notes || {};
      
      const likesAdded = Number(likesAddedInput) || 0;
      const likesBefore = Number(parsedNotes.likes_before) || 0;
      const likesNow = likesBefore + likesAdded;
      
      const updatedNotes = {
        ...parsedNotes,
        likes_added_actual: likesAdded,
        likes_after: likesNow
      };

      // 1. Update Order
      const { error } = await supabase.from('orders').update({
        status: 'Completed',
        customer_notes: JSON.stringify(updatedNotes)
      }).eq('id', deliveryModalOrder.id);

      if (error) throw error;

      // 2. Publish to Feed (Community) if checked
      if (publishToFeed) {
        try {
          const feedContent = `✅ ¡Pedido completado exitosamente para **${parsedNotes.validated_nickname || 'Jugador'}**!\nSe agregaron **+${likesAdded.toLocaleString()} Likes** a su cuenta oficial de Free Fire.\n\nRegión: ${parsedNotes.region || 'Desconocida'}\nLikes Actuales: ${likesNow.toLocaleString()} ❤️`;
          await supabase.from('feed_posts').insert({
            user_id: user.id,
            content: feedContent,
            images: [], // Optionally generate and save the Comprobante 2 image URL here later
            likes: 0
          });
        } catch (feedErr) {
          console.warn('Could not post to feed', feedErr);
        }
      }

      // 3. Notify user
      if (deliveryModalOrder.user_id) {
        notifyOrderCompleted({
          orderId: deliveryModalOrder.id,
          userId: deliveryModalOrder.user_id,
          product: 'Paquete de Likes FF',
          amount: deliveryModalOrder.total_usdt
        });
      }

      alert('✅ Entrega de Likes Confirmada. Comprobante Generado.');
      setDeliveryModalOrder(null);
      setSelectedOrder(null);
      loadOrders();
    } catch (err) {
      alert('Error confirmando entrega: ' + err.message);
    } finally {
      setUpdatingStatus(false);
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
            Filtra por fecha, cambia estados, descuenta stock y depura pedidos por fecha
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowDateRangeDeleteModal(true)}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
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
            <span>🗑️</span> Borrar Pedidos por Fecha (X a X)
          </button>

          <button
            onClick={handleCleanupOldOrders}
            disabled={cleaningOld}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-muted)',
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
            <span>🧹</span> {cleaningOld ? 'Depurando...' : 'Limpiar (> 40 días)'}
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

      {/* Orders Table with Horizontal Scroll for PC & Mobile */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px', overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '10px 8px' }}># ID Orden</th>
              <th style={{ padding: '10px 8px' }}>Fecha & Hora</th>
              <th style={{ padding: '10px 8px' }}>Cliente</th>
              <th style={{ padding: '10px 8px' }}>Producto / Servicio</th>
              <th style={{ padding: '10px 8px' }}>Datos / UID</th>
              <th style={{ padding: '10px 8px' }}>Total (USDT)</th>
              <th style={{ padding: '10px 8px' }}>Método</th>
              <th style={{ padding: '10px 8px' }}>📸 Comprobante</th>
              <th style={{ padding: '10px 8px' }}>Estado</th>
              <th style={{ padding: '10px 8px', textAlign: 'center' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Cargando pedidos...
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                  No se encontraron pedidos con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              paginatedOrders.map((ord) => {
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

                const hasReceiptImage = ord.bank_receipt_url && (ord.bank_receipt_url.startsWith('data:image') || ord.bank_receipt_url.startsWith('http'));

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
                      {ord.order_items && ord.order_items.length > 0 && ord.order_items[0].products?.name ? (
                        ord.order_items.map((item) => (
                          <div key={item.id} style={{ fontWeight: '600' }}>
                            {item.products?.name} (x{item.quantity})
                          </div>
                        ))
                      ) : (() => {
                        let noteObj = {};
                        try { noteObj = JSON.parse(ord.customer_notes); } catch (e) {}
                        if (noteObj?.service_type === 'Free Fire Likes') {
                          return <div style={{ fontWeight: '800', color: 'var(--accent-cyan)' }}>👍 Paquete Likes FF (+{noteObj.likes_to_add || 100})</div>;
                        }
                        if (noteObj?.service_type === 'Wallet Deposit (Link Recurrente)') {
                          return <div style={{ fontWeight: '800', color: '#fbbf24' }}>🔗 Recarga Saldo (Link {noteObj.link_tag || ''})</div>;
                        }
                        if (noteObj?.type === 'wallet_deposit' || noteObj?.service_type === 'wallet_deposit' || noteObj?.deposit_currency) {
                          const curr = noteObj.deposit_currency || 'Manual';
                          return (
                            <div style={{ fontWeight: '800', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>🏦</span>
                              <span>Recarga Billetera ({curr}{noteObj.converted_text ? ` - ${noteObj.converted_text}` : ''})</span>
                            </div>
                          );
                        }
                        return <div style={{ fontWeight: '600' }}>Recarga Digital</div>;
                      })()}
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
                      {(() => {
                        let noteObj = {};
                        try { noteObj = JSON.parse(ord.customer_notes); } catch (e) {}
                        if (noteObj?.payment_method_detail === 'Recurrente / Link') return '🔗 Link Recurrente';
                        if (ord.payment_method === 'Wallet') return '💎 Billetera';
                        return ord.payment_method || 'Manual';
                      })()}
                    </td>

                    {/* Bank Receipt Column */}
                    <td style={{ padding: '12px 8px' }}>
                      {hasReceiptImage ? (
                        <button
                          type="button"
                          onClick={() => setViewingReceiptUrl(ord.bank_receipt_url)}
                          style={{
                            background: 'rgba(52, 211, 153, 0.15)',
                            border: '1px solid rgba(52, 211, 153, 0.4)',
                            color: '#34d399',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          👁️ Ver Foto
                        </button>
                      ) : ord.bank_receipt_url && ord.bank_receipt_url.includes('SUPPLIER') ? (
                        <span style={{ fontSize: '0.7rem', color: '#fbbf24' }}>API Auto</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                      )}
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

        {/* 10 Orders Per Page Pagination Controls */}
        {filteredOrders.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-glass)',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Mostrando <strong style={{ color: '#fff' }}>{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredOrders.length)}</strong> - <strong style={{ color: '#fff' }}>{Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)}</strong> de <strong style={{ color: 'var(--accent-cyan)' }}>{filteredOrders.length}</strong> pedidos
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="btn-glass"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  opacity: currentPage === 1 ? 0.4 : 1,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                ◀ Anterior
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
                .map((page, idx, arr) => {
                  const prev = arr[idx - 1];
                  return (
                    <React.Fragment key={page}>
                      {prev && page - prev > 1 && (
                        <span style={{ color: 'var(--text-muted)', padding: '0 4px', fontSize: '0.8rem' }}>...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        style={{
                          minWidth: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          border: page === currentPage ? '1px solid var(--border-cyan)' : '1px solid var(--border-glass)',
                          background: page === currentPage ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                          color: page === currentPage ? '#000' : '#fff',
                          fontWeight: 'bold',
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="btn-glass"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  opacity: currentPage === totalPages ? 0.4 : 1,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Siguiente ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Date Range Delete Modal */}
      {showDateRangeDeleteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel animate-fade" style={{
            width: '100%',
            maxWidth: '500px',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.9)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', margin: 0, color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🗑️</span> Borrar Pedidos por Rango de Fechas
              </h3>
              <button
                onClick={() => setShowDateRangeDeleteModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
              Selecciona el rango de fechas desde la cual deseas eliminar los pedidos. Todos los pedidos registrados entre la <strong>Fecha Desde (00:00)</strong> y la <strong>Fecha Hasta (23:59)</strong> serán eliminados permanentemente de la base de datos.
            </p>

            <form onSubmit={handleDeleteOrdersByRange} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '700' }}>
                    📅 Fecha Desde (X):
                  </label>
                  <input
                    type="date"
                    required
                    value={rangeDeleteStart}
                    onChange={(e) => setRangeDeleteStart(e.target.value)}
                    style={{ width: '100%', padding: '9px', borderRadius: '6px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '700' }}>
                    📅 Fecha Hasta (X):
                  </label>
                  <input
                    type="date"
                    required
                    value={rangeDeleteEnd}
                    onChange={(e) => setRangeDeleteEnd(e.target.value)}
                    style={{ width: '100%', padding: '9px', borderRadius: '6px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Range Match Preview */}
              {rangeDeleteStart && rangeDeleteEnd && (() => {
                const s = new Date(rangeDeleteStart); s.setHours(0,0,0,0);
                const e = new Date(rangeDeleteEnd); e.setHours(23,59,59,999);
                const matchCount = orders.filter(o => {
                  const d = new Date(o.created_at);
                  return d >= s && d <= e;
                }).length;
                return (
                  <div style={{ padding: '10px 12px', borderRadius: '6px', background: matchCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', fontSize: '0.8rem', color: matchCount > 0 ? '#f87171' : 'var(--text-muted)' }}>
                    📊 Se encontraron <strong style={{ color: '#fff' }}>{matchCount}</strong> pedidos en este rango de fechas listos para eliminar.
                  </div>
                );
              })()}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowDateRangeDeleteModal(false)}
                  className="btn-glass"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={deletingRangeOrders}
                  style={{
                    background: '#dc2626',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: deletingRangeOrders ? 'not-allowed' : 'pointer'
                  }}
                >
                  {deletingRangeOrders ? 'Eliminando...' : '⚠️ Confirmar y Eliminar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    <div style={{ marginTop: '8px' }}>
                      <div
                        onClick={() => setViewingReceiptUrl(selectedOrder.bank_receipt_url)}
                        style={{
                          cursor: 'zoom-in',
                          position: 'relative',
                          display: 'inline-block',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '2px solid var(--accent-cyan)'
                        }}
                      >
                        <img
                          src={selectedOrder.bank_receipt_url}
                          alt="Comprobante de depósito"
                          style={{ maxWidth: '100%', maxHeight: '220px', display: 'block', objectFit: 'contain', background: '#000' }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'rgba(0,0,0,0.7)',
                          color: '#fff',
                          fontSize: '0.72rem',
                          padding: '4px',
                          textAlign: 'center',
                          fontWeight: 'bold'
                        }}>
                          🔍 Clic para ampliar en pantalla completa
                        </div>
                      </div>

                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setViewingReceiptUrl(selectedOrder.bank_receipt_url)}
                          className="btn-cyan"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold' }}
                        >
                          🔍 Ver Comprobante Completo
                        </button>
                        <a
                          href={selectedOrder.bank_receipt_url}
                          download="comprobante_deposito.png"
                          className="btn-glass"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', textDecoration: 'none', color: '#34d399' }}
                        >
                          📥 Descargar Imagen
                        </a>
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

      {/* Full-Screen Receipt Lightbox Modal */}
      {viewingReceiptUrl && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
          onClick={() => setViewingReceiptUrl(null)}
        >
          <div
            style={{
              maxWidth: '90vw',
              maxHeight: '88vh',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: '#0d111a',
              padding: '16px',
              borderRadius: '16px',
              border: '1px solid var(--border-cyan)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#34d399', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📸 Comprobante de Pago
              </h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <a
                  href={viewingReceiptUrl}
                  download="comprobante_pago.png"
                  className="btn-cyan"
                  style={{ padding: '6px 14px', fontSize: '0.8rem', textDecoration: 'none' }}
                >
                  📥 Descargar
                </a>
                <button
                  onClick={() => setViewingReceiptUrl(null)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    color: '#f87171',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            <img
              src={viewingReceiptUrl}
              alt="Comprobante de depósito"
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                borderRadius: '8px',
                objectFit: 'contain',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            />
          </div>
        </div>
      )}

      {/* Delivery Confirmation Modal for Likes */}
      {deliveryModalOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 150,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel animate-fade" style={{
            width: '100%',
            maxWidth: '500px',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            border: '2px solid #34d399',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 100%)',
            boxShadow: '0 8px 32px rgba(52, 211, 153, 0.2)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', margin: 0, color: '#34d399' }}>✅ CONFIRMAR ENTREGA DE LIKES</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Pedido #{deliveryModalOrder.id.slice(0, 8)}
                </div>
              </div>
              <button onClick={() => setDeliveryModalOrder(null)} style={{ background: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {(() => {
              let parsedNotes = {};
              try { parsedNotes = JSON.parse(deliveryModalOrder.customer_notes || '{}'); } catch(e){}
              const likesBefore = Number(parsedNotes.likes_before) || 0;
              const likesAdded = Number(likesAddedInput) || 0;
              const likesNow = likesBefore + likesAdded;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Ficha Jugador */}
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Jugador:</span>
                      <strong style={{ color: '#fff' }}>{parsedNotes.validated_nickname || 'N/A'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>ID (UID):</span>
                      <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{parsedNotes.target_uid || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Región:</span>
                      <span style={{ color: '#fff' }}>{parsedNotes.region || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Likes Calc */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Likes Antes:</span>
                      <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{likesBefore.toLocaleString()} ❤️</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Likes Añadidos:</span>
                      <input 
                        type="number"
                        value={likesAddedInput}
                        onChange={(e) => setLikesAddedInput(e.target.value)}
                        style={{
                          width: '100px',
                          background: 'rgba(52, 211, 153, 0.1)',
                          border: '1px solid #34d399',
                          color: '#34d399',
                          padding: '6px',
                          borderRadius: '6px',
                          textAlign: 'right',
                          fontWeight: 'bold'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed rgba(255,255,255,0.2)', paddingTop: '10px' }}>
                      <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' }}>Likes Ahora:</span>
                      <span style={{ color: '#34d399', fontSize: '1.2rem', fontWeight: 'bold' }}>{likesNow.toLocaleString()} 🎯</span>
                    </div>
                  </div>
                  
                  {/* Feed Toggle */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', cursor: 'pointer', fontSize: '0.85rem', color: '#fff' }}>
                    <input 
                      type="checkbox" 
                      checked={publishToFeed} 
                      onChange={(e) => setPublishToFeed(e.target.checked)} 
                    />
                    📢 Publicar éxito en el feed de la comunidad
                  </label>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <button onClick={() => setDeliveryModalOrder(null)} className="btn-glass" style={{ flex: 1, padding: '10px' }}>
                      Cancelar
                    </button>
                    <button 
                      onClick={handleConfirmLikesDelivery} 
                      disabled={updatingStatus}
                      className="btn-cyan" 
                      style={{ flex: 2, padding: '10px', fontWeight: 'bold', background: '#34d399', color: '#000' }}
                    >
                      {updatingStatus ? 'Procesando...' : 'GUARDAR Y COMPLETAR ✅'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}
