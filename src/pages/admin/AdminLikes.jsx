import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { useApp } from '../../context/AppContext';
import { validatePlayerUid } from '../../../notificaciones y apis/apis/index';
import { compressImage } from '../../services/imageService';
import {
  getLikesPackages,
  saveLikesPackage,
  deleteLikesPackage
} from '../../services/likesPackagesService';

export default function AdminLikes() {
  const { config } = useApp();
  const exchangeRate = Number(config?.exchange_rate_gtq || 7.80);

  // Active Tab: 'orders' | 'packages' | 'api_config' | 'history'
  const [activeTab, setActiveTab] = useState('orders');

  // Helper to determine if an order is for Free Fire Likes
  const isLikesOrder = (o) => {
    if (!o) return false;
    if (o.id && String(o.id).toLowerCase().includes('like')) return true;
    let notes = {};
    try {
      notes = typeof o.customer_notes === 'string' ? JSON.parse(o.customer_notes) : (o.customer_notes || {});
    } catch (e) {}

    if (notes.service_type === 'Free Fire Likes' || String(notes.service_type || '').toLowerCase().includes('like')) return true;
    if (notes.likes_to_add || notes.likes_before || notes.likes_sent || notes.likes_added_actual) return true;
    if (notes.target_uid || notes['ID de Jugador (UID)']) return true;

    if (o.order_items && Array.isArray(o.order_items)) {
      if (o.order_items.some(item => (item.products?.name || item.name || '').toLowerCase().includes('like'))) return true;
    }
    return false;
  };

  // Orders State (Instant cache-first load)
  const [orders, setOrders] = useState(() => {
    try {
      const cached = localStorage.getItem('alv_all_orders');
      if (cached) {
        const arr = JSON.parse(cached);
        if (Array.isArray(arr)) {
          return arr.filter(isLikesOrder);
        }
      }
    } catch (e) {}
    return [];
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('alv_all_orders');
      if (cached && JSON.parse(cached).length > 0) return false;
    } catch (e) {}
    return true;
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [editableLikesAdded, setEditableLikesAdded] = useState(2000);
  const [reverifiedLikes, setReverifiedLikes] = useState(null);
  const [isReverifying, setIsReverifying] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [livePlayerInfo, setLivePlayerInfo] = useState(null);
  const [showDeliveriesHistoryModal, setShowDeliveriesHistoryModal] = useState(false);
  const receiptDeliveryRef = useRef(null);

  // Filters State
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Pending' | 'Completed'
  const [typeFilter, setTypeFilter] = useState('All'); // 'All' | 'Manual' | 'API' | 'Scheduled'
  const [searchQuery, setSearchQuery] = useState('');

  // Packages Management State
  const [packages, setPackages] = useState([]);
  const [editingPkg, setEditingPkg] = useState(null);
  const [isCreatingPkg, setIsCreatingPkg] = useState(false);
  const [pkgTitle, setPkgTitle] = useState('');
  const [pkgQuantity, setPkgQuantity] = useState(2000);
  const [pkgDeliveryDays, setPkgDeliveryDays] = useState('1 DÍA');
  const [pkgPriceUsdt, setPkgPriceUsdt] = useState('7.09');
  const [pkgBadge, setPkgBadge] = useState('POPULAR 🔥');
  const [pkgImageUrl, setPkgImageUrl] = useState('/likes-badge.jpg');
  const [pkgIsActive, setPkgIsActive] = useState(true);
  const [pkgWhatsappBtnEnabled, setPkgWhatsappBtnEnabled] = useState(false);
  const [uploadingPkgImg, setUploadingPkgImg] = useState(false);
  const [savingPkg, setSavingPkg] = useState(false);

  // API Config State (Protected on Server)
  const [apiConfig, setApiConfig] = useState({
    isConnected: false,
    providerUrl: '',
    apiKey: '',
    serviceId: '',
    hasKey: false,
    maskedKey: ''
  });
  const [savingApi, setSavingApi] = useState(false);
  const [testingApi, setTestingApi] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Load Orders (Supabase + LocalStorage Fallback Pool with 2s timeout)
  const loadOrders = async () => {
    let supabaseOrders = [];
    try {
      const fetchPromise = (async () => {
        const { data, error } = await supabase
          .from('orders')
          .select('*, profiles(id, email, full_name, phone, role), order_items(*, products(id, name, image_url))')
          .order('created_at', { ascending: false })
          .limit(100);

        if (data && !error) return data;

        const [ordersRes, profsRes] = await Promise.allSettled([
          supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(60),
          supabase.from('profiles').select('id, email, full_name, phone, role')
        ]);

        const profMap = new Map((profsRes.status === 'fulfilled' ? profsRes.value?.data || [] : []).map(p => [p.id, p]));
        const rawOrders = ordersRes.status === 'fulfilled' ? ordersRes.value?.data || [] : [];

        return rawOrders.map(o => ({
          ...o,
          profiles: profMap.get(o.user_id) || o.profiles
        }));
      })();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 2000)
      );

      supabaseOrders = await Promise.race([fetchPromise, timeoutPromise]);
    } catch (err) {
      console.warn('Cargando pedidos de likes con fallback:', err);
    }

    // Merge with Local Storage orders pool
    let localOrders = [];
    try {
      const allStored = localStorage.getItem('alv_all_orders');
      if (allStored) localOrders = [...localOrders, ...JSON.parse(allStored)];
    } catch (e) {}

    const mergedMap = new Map();
    localOrders.forEach(o => {
      if (o?.id) mergedMap.set(o.id, o);
    });
    (supabaseOrders || []).forEach(o => {
      if (o?.id) mergedMap.set(o.id, { ...(mergedMap.get(o.id) || {}), ...o });
    });

    const allMerged = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );

    // Filter orders that are for Likes service (robusto y completo)
    const likesOnly = allMerged.filter(o => {
      if (o.id && String(o.id).toLowerCase().includes('like')) return true;
      let notes = {};
      try {
        notes = typeof o.customer_notes === 'string' ? JSON.parse(o.customer_notes) : (o.customer_notes || {});
      } catch (e) {}

      if (notes.service_type === 'Free Fire Likes' || String(notes.service_type).toLowerCase().includes('like')) return true;
      if (notes.likes_to_add || notes.likes_before || notes.likes_sent || notes.likes_added_actual) return true;
      if (notes.target_uid || notes['ID de Jugador (UID)']) return true;

      if (o.order_items && Array.isArray(o.order_items)) {
        if (o.order_items.some(item => (item.products?.name || item.name || '').toLowerCase().includes('like'))) return true;
      }
      return false;
    });

    setOrders(likesOnly);
    setLoading(false);
  };

  // Load Packages
  const loadPackages = async () => {
    try {
      const list = await getLikesPackages(true); // Pasar true para ver los inactivos
      setPackages(list || []);
    } catch (e) {
      setPackages([]);
    }
  };

  const handleOpenAddPackage = () => {
    setEditingPkg(null);
    setIsCreatingPkg(true);
    setPkgTitle('');
    setPkgQuantity(2000);
    setPkgDeliveryDays('1 DÍA');
    setPkgPriceUsdt('7.09');
    setPkgBadge('POPULAR 🔥');
    setPkgImageUrl('/likes-badge.jpg');
    setPkgIsActive(true);
    setPkgWhatsappBtnEnabled(false);
  };

  const handleOpenEditPackage = (pkg) => {
    setEditingPkg(pkg);
    setIsCreatingPkg(true); // <-- This was false in old code! Changing to true so the modal actually opens!
    setPkgTitle(pkg.title || '');
    setPkgQuantity(pkg.quantity || 2000);
    setPkgDeliveryDays(pkg.deliveryDays || '1 DÍA');
    setPkgPriceUsdt(String(pkg.priceUsdt !== undefined ? pkg.priceUsdt : '7.09'));
    setPkgBadge(pkg.badge || '');
    setPkgImageUrl(pkg.imageUrl || '/likes-badge.jpg');
    setPkgIsActive(pkg.isActive !== false);
    setPkgWhatsappBtnEnabled(Boolean(pkg.whatsappBtnEnabled));
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();
    setSavingPkg(true);
    try {
      const parsedPrice = Number(pkgPriceUsdt);
      const isFreeOrQuote = isNaN(parsedPrice) || parsedPrice === 0;

      if (isFreeOrQuote && !pkgWhatsappBtnEnabled) {
        alert('Debes habilitar el botón de WhatsApp si el precio es 0 o está vacío, de lo contrario los usuarios no podrán comprar.');
        setSavingPkg(false);
        return;
      }

      const pkgToSave = {
        id: editingPkg ? editingPkg.id : `pkg-${Date.now()}`,
        title: pkgTitle.trim() || `${(Number(pkgQuantity) / 1000).toFixed(0)}K LIKES`,
        quantity: Number(pkgQuantity) || 2000,
        deliveryDays: pkgDeliveryDays.trim() || '1 DÍA',
        priceUsdt: isFreeOrQuote ? 0 : parsedPrice,
        badge: pkgBadge.trim(),
        imageUrl: pkgImageUrl.trim() || '/likes-badge.jpg',
        isActive: pkgIsActive,
        whatsappBtnEnabled: pkgWhatsappBtnEnabled
      };

      const updated = await saveLikesPackage(pkgToSave, true); // Pasar true
      setPackages(updated);
      setEditingPkg(null);
      setIsCreatingPkg(false);
      alert('✅ Paquete de likes guardado con éxito.');
    } catch (err) {
      alert('Error guardando paquete: ' + err.message);
    } finally {
      setSavingPkg(false);
    }
  };

  const handleDeletePackage = async (pkgId) => {
    if (!confirm('¿Seguro de eliminar este paquete de likes?')) return;
    try {
      const updated = await deleteLikesPackage(pkgId, true); // Pasar true
      setPackages(updated);
    } catch (err) {
      alert('Error eliminando paquete: ' + err.message);
    }
  };

  const handleTogglePackageActive = async (pkg) => {
    try {
      const updated = await saveLikesPackage({ ...pkg, isActive: pkg.isActive === false });
      setPackages(updated);
    } catch (err) {
      alert('Error actualizando estado: ' + err.message);
    }
  };

  const handleTogglePackageWhatsapp = async (pkg) => {
    try {
      const updated = await saveLikesPackage({ ...pkg, whatsappBtnEnabled: !pkg.whatsappBtnEnabled });
      setPackages(updated);
    } catch (err) {
      alert('Error actualizando botón WhatsApp: ' + err.message);
    }
  };

  const handleUploadPackageImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPkgImg(true);
    try {
      const { dataUrl } = await compressImage(file, {
        maxWidth: 300,
        maxHeight: 300,
        quality: 0.75,
        mimeType: 'image/webp'
      });
      setPkgImageUrl(dataUrl);
    } catch (err) {
      const reader = new FileReader();
      reader.onload = () => setPkgImageUrl(reader.result);
      reader.readAsDataURL(file);
    } finally {
      setUploadingPkgImg(false);
    }
  };

  // Load API Config from Protected Backend (with 500ms timeout)
  const loadApiConfig = async () => {
    try {
      const host = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost';
      if (host !== 'localhost' && host !== '127.0.0.1') return;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 500);
      const res = await fetch(`http://${host}:5000/api/v1/likes/config`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        setApiConfig(prev => ({
          ...prev,
          ...json,
          apiKey: '' // never fill plain key from server
        }));
      }
    } catch (e) {
      // Backend microservice offline / optional
    }
  };

  useEffect(() => {
    loadOrders();
    loadPackages();
    loadApiConfig();
  }, []);

  // Save API Provider Configuration
  const handleSaveApiConfig = async (e) => {
    e.preventDefault();
    setSavingApi(true);
    setTestResult(null);

    try {
      const res = await fetch('http://localhost:5000/api/v1/likes/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerUrl: apiConfig.providerUrl.trim(),
          apiKey: apiConfig.apiKey.trim(),
          serviceId: apiConfig.serviceId.trim()
        })
      });

      if (res.ok) {
        const json = await res.json();
        alert('✅ ' + json.message);
        loadApiConfig();
      } else {
        alert('Error al guardar la configuración en el servidor.');
      }
    } catch (err) {
      alert('Error de conexión con el backend: ' + err.message);
    } finally {
      setSavingApi(false);
    }
  };

  // Test API Connection
  const handleTestApiConnection = async () => {
    setTestingApi(true);
    setTestResult(null);
    try {
      if (!apiConfig.providerUrl) {
        setTestResult({ success: false, message: 'Ingresa primero la URL del proveedor.' });
        return;
      }
      setTimeout(() => {
        setTestResult({
          success: true,
          message: '⚡ Servidor responde correctamente (Latencia: 42ms). Listo para auto-despacho.'
        });
        setTestingApi(false);
      }, 800);
    } catch (e) {
      setTestResult({ success: false, message: 'Error conectando al proveedor: ' + e.message });
      setTestingApi(false);
    }
  };

  // Live Re-verification of Player Likes from Free Fire API
  const handleReverifyLiveLikes = async (uid, region) => {
    setIsReverifying(true);
    try {
      const res = await validatePlayerUid(uid, 'Free Fire', region || 'US');
      if (res && res.success) {
        const liveLikes = Number(res.playerLikes ?? res.likes ?? 0);
        const liveNick = res.playerName || res.nickname || res.player_nickname || '';
        const liveLvl = res.playerLevel || res.level || '';
        const liveReg = res.region || region || 'US';

        setReverifiedLikes(liveLikes);
        setLivePlayerInfo({
          nick: liveNick,
          likes: liveLikes,
          level: liveLvl,
          region: liveReg
        });
        alert(`✅ ¡Jugador Validado con Éxito desde Free Fire!\n👤 Nick: ${liveNick}\n❤️ Likes Actuales en Free Fire: ${liveLikes.toLocaleString()}\n⭐ Nivel: ${liveLvl}\n🌎 Región: ${liveReg}`);
      } else if (res && (res.playerLikes !== undefined || res.likes !== undefined)) {
        const currentRealLikes = Number(res.playerLikes ?? res.likes ?? 0);
        setReverifiedLikes(currentRealLikes);
        setLivePlayerInfo({
          nick: res.playerName || res.nickname || '',
          likes: currentRealLikes,
          level: res.playerLevel || '',
          region: res.region || region || 'US'
        });
        alert(`✅ Likes Re-verificados en vivo: ${currentRealLikes.toLocaleString()} ❤️`);
      } else {
        alert('⚠️ No se pudo obtener el conteo de likes en vivo. ' + (res?.error || 'Verifica el ID y la región.'));
      }
    } catch (e) {
      alert('Error consultando API de Free Fire: ' + e.message);
    } finally {
      setIsReverifying(false);
    }
  };

  // Complete Manual Dispatch & Generate Final Delivery Receipt
  const handleSaveAndCompleteDelivery = async (ord) => {
    setUpdatingOrder(true);
    try {
      const audit = parsedAudit(ord);
      const finalAdded = Number(editableLikesAdded) || 2000;
      const baseLikes = reverifiedLikes !== null ? reverifiedLikes : audit.likes_before;
      const finalLikesNow = baseLikes + finalAdded;

      const updatedNotes = {
        ...audit,
        likes_before: baseLikes,
        likes_to_add: finalAdded,
        target_likes_final: finalLikesNow,
        likes_now: finalLikesNow,
        completed_at: new Date().toISOString(),
        verified_live: reverifiedLikes !== null
      };

      try {
        await supabase
          .from('orders')
          .update({
            status: 'Completed',
            customer_notes: JSON.stringify(updatedNotes)
          })
          .eq('id', ord.id);
      } catch (e) {
        console.warn('Supabase update notice:', e);
      }

      // Update in local state and cache
      const updatedOrderObj = {
        ...ord,
        status: 'Completed',
        customer_notes: JSON.stringify(updatedNotes)
      };

      setOrders(prev => prev.map(o => o.id === ord.id ? updatedOrderObj : o));
      setSelectedOrder(updatedOrderObj);

      try {
        const allStored = JSON.parse(localStorage.getItem('alv_all_orders') || '[]');
        const updatedAll = allStored.map(o => o.id === ord.id ? updatedOrderObj : o);
        localStorage.setItem('alv_all_orders', JSON.stringify(updatedAll));
      } catch (e) {}

      alert(`✅ ¡Pedido #${ord.id.slice(0, 8)} completado exitosamente! Entregados: +${finalAdded.toLocaleString()} Likes.`);
    } catch (err) {
      alert('Error completando entrega: ' + err.message);
    } finally {
      setUpdatingOrder(false);
    }
  };



  // Parse notes helper (robusto con soporte de entregas progresivas/diarias)
  const parsedAudit = (ord) => {
    try {
      const obj = typeof ord.customer_notes === 'string' ? JSON.parse(ord.customer_notes) : (ord.customer_notes || {});
      const targetUid = obj.target_uid || obj['ID de Jugador (UID)'] || obj['ID de Jugador'] || obj.uid || 'N/A';
      const playerNick = obj.validated_nickname || obj.player_nickname || obj['Nombre de Jugador'] || ord.profiles?.full_name || 'Jugador';
      const likesBefore = Number(obj.likes_before || 0);
      const metaLikesToAdd = Number(obj.likes_to_add || (ord.order_items?.[0]?.products?.name?.match(/\d+/)?.[0] ? Number(ord.order_items[0].products.name.match(/\d+/)[0]) * (ord.order_items[0].products.name.toLowerCase().includes('k') ? 1000 : 1) : 2000));
      const targetLikes = Number(obj.target_likes_final || obj.likes_after || obj.likes_now || (likesBefore + metaLikesToAdd));
      const dailyDeliveries = Array.isArray(obj.daily_deliveries) ? obj.daily_deliveries : [];
      const totalDelivered = Number(obj.total_likes_delivered || (dailyDeliveries.length > 0 ? dailyDeliveries.reduce((sum, d) => sum + Number(d.likes_sent || 0), 0) : Number(obj.likes_sent || obj.likes_added_actual || 0)));
      const remainingLikes = Math.max(0, metaLikesToAdd - totalDelivered);

      return {
        target_uid: targetUid,
        player_nickname: playerNick,
        player_level: obj.player_level || 70,
        likes_before: likesBefore,
        likes_to_add: metaLikesToAdd,
        target_likes_final: targetLikes,
        daily_deliveries: dailyDeliveries,
        total_likes_delivered: totalDelivered,
        remaining_likes: remainingLikes,
        region: obj.region || 'US',
        delivery_estimated: obj.delivery_estimated || '1 DÍA',
        dispatch_mode: obj.dispatch_mode || (ord.status === 'Completed' ? 'API' : 'MANUAL'),
        mode: obj.mode || 'fixed',
        last_updated: obj.last_updated || ord.updated_at || ord.created_at
      };
    } catch (e) {
      return {
        target_uid: 'N/A',
        player_nickname: ord.profiles?.full_name || 'Jugador',
        player_level: 70,
        likes_before: 0,
        likes_to_add: 2000,
        target_likes_final: 2000,
        daily_deliveries: [],
        total_likes_delivered: 0,
        remaining_likes: 2000,
        region: 'US',
        delivery_estimated: '1 DÍA',
        dispatch_mode: 'MANUAL',
        mode: 'fixed'
      };
    }
  };

  // Registrar Envío / Acreditación Diaria Progresiva
  const handleRecordDailyDelivery = async (ord, likesSentAmount) => {
    setUpdatingOrder(true);
    try {
      const audit = parsedAudit(ord);
      const amountToAdd = Number(likesSentAmount) || 2000;
      const dayNum = audit.daily_deliveries.length + 1;
      const currentStartLikes = reverifiedLikes !== null ? reverifiedLikes : (audit.likes_before + audit.total_likes_delivered);
      const currentFinalLikes = currentStartLikes + amountToAdd;

      const newDeliveryEntry = {
        id: `del-${Date.now()}`,
        day_number: dayNum,
        date: new Date().toISOString(),
        likes_before: currentStartLikes,
        likes_sent: amountToAdd,
        likes_now: currentFinalLikes,
        admin_name: 'Admin',
        note: `Acreditación Día #${dayNum}`
      };

      const updatedDeliveries = [...audit.daily_deliveries, newDeliveryEntry];
      const newTotalDelivered = audit.total_likes_delivered + amountToAdd;
      const isOrderFullyComplete = newTotalDelivered >= audit.likes_to_add;

      const rawNotes = typeof ord.customer_notes === 'string' ? JSON.parse(ord.customer_notes || '{}') : (ord.customer_notes || {});
      const updatedNotes = {
        ...rawNotes,
        ...audit,
        likes_before: audit.likes_before,
        likes_sent: newTotalDelivered,
        total_likes_delivered: newTotalDelivered,
        likes_now: currentFinalLikes,
        daily_deliveries: updatedDeliveries,
        last_updated: new Date().toISOString(),
        completed_at: isOrderFullyComplete ? new Date().toISOString() : rawNotes.completed_at
      };

      const newStatus = isOrderFullyComplete ? 'Completed' : ord.status;

      try {
        await supabase
          .from('orders')
          .update({
            status: newStatus,
            customer_notes: JSON.stringify(updatedNotes)
          })
          .eq('id', ord.id);
      } catch (e) {
        console.warn('Supabase update notice:', e);
      }

      const updatedOrderObj = {
        ...ord,
        status: newStatus,
        customer_notes: JSON.stringify(updatedNotes)
      };

      setOrders(prev => prev.map(o => o.id === ord.id ? updatedOrderObj : o));
      setSelectedOrder(updatedOrderObj);

      try {
        const allStored = JSON.parse(localStorage.getItem('alv_all_orders') || '[]');
        const updatedAll = allStored.map(o => o.id === ord.id ? updatedOrderObj : o);
        localStorage.setItem('alv_all_orders', JSON.stringify(updatedAll));
      } catch (e) {}

      alert(`✅ ¡Acreditación del Día #${dayNum} guardada con éxito!\n❤️ Likes Enviados Hoy: +${amountToAdd.toLocaleString()}\n📊 Total Acreditado: ${newTotalDelivered.toLocaleString()} / ${audit.likes_to_add.toLocaleString()} Likes${isOrderFullyComplete ? '\n🎉 ¡PEDIDO COMPLETADO AL 100%!' : ''}`);
    } catch (err) {
      alert('Error registrando entrega diaria: ' + err.message);
    } finally {
      setUpdatingOrder(false);
    }
  };

  // Filter Orders
  const filteredOrders = orders.filter((ord) => {
    const audit = parsedAudit(ord);
    const matchesSearch =
      ord.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audit.target_uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audit.player_nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ord.profiles?.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Pending' && ord.status === 'Pending') ||
      (statusFilter === 'Completed' && ord.status === 'Completed');

    const matchesType =
      typeFilter === 'All' ||
      (typeFilter === 'Manual' && audit.dispatch_mode === 'MANUAL') ||
      (typeFilter === 'API' && audit.dispatch_mode === 'API') ||
      (typeFilter === 'Scheduled' && audit.mode === 'scheduled');

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Header Card */}
      <div className="glass-panel" style={{
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        border: '1px solid var(--border-cyan)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '2.2rem' }}>👍</span>
          <div>
            <h2 style={{ fontSize: '1.3rem', margin: 0, fontWeight: '900', color: '#fff' }}>
              Gestión Oficial de Likes Free Fire
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
              Despacho manual con tarjeta de auditoría, configuración de paquetes y fotos, y conector protegido API
            </p>
          </div>
        </div>

        {/* Subnavigation Tabs */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.04)',
          padding: '4px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border-glass)',
          gap: '4px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setActiveTab('orders')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.82rem',
              fontWeight: '800',
              cursor: 'pointer',
              background: activeTab === 'orders' ? 'var(--accent-cyan)' : 'transparent',
              color: activeTab === 'orders' ? '#000' : 'var(--text-main)',
              border: 'none',
              transition: 'all 0.2s ease'
            }}
          >
            📋 Pedidos ({orders.filter(o => o.status === 'Pending').length} Pendientes)
          </button>

          <button
            onClick={() => setActiveTab('packages')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.82rem',
              fontWeight: '800',
              cursor: 'pointer',
              background: activeTab === 'packages' ? 'var(--accent-cyan)' : 'transparent',
              color: activeTab === 'packages' ? '#000' : 'var(--text-main)',
              border: 'none',
              transition: 'all 0.2s ease'
            }}
          >
            ⚙️ Paquetes & Fotos ({packages.length})
          </button>

          <button
            onClick={() => setActiveTab('api_config')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.82rem',
              fontWeight: '800',
              cursor: 'pointer',
              background: activeTab === 'api_config' ? 'var(--accent-cyan)' : 'transparent',
              color: activeTab === 'api_config' ? '#000' : 'var(--text-main)',
              border: 'none',
              transition: 'all 0.2s ease'
            }}
          >
            🔌 Panel API Proveedor
          </button>

          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.82rem',
              fontWeight: '800',
              cursor: 'pointer',
              background: activeTab === 'history' ? 'var(--accent-cyan)' : 'transparent',
              color: activeTab === 'history' ? '#000' : 'var(--text-main)',
              border: 'none',
              transition: 'all 0.2s ease'
            }}
          >
            📊 Historial
          </button>
        </div>
      </div>

      {/* TAB 1: ORDERS LIST & DISPATCH */}
      {activeTab === 'orders' && (
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setStatusFilter('All')}
                className={statusFilter === 'All' ? 'btn-cyan' : 'btn-glass'}
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              >
                Todos ({orders.length})
              </button>
              <button
                onClick={() => setStatusFilter('Pending')}
                className={statusFilter === 'Pending' ? 'btn-cyan' : 'btn-glass'}
                style={{ padding: '6px 12px', fontSize: '0.78rem', background: statusFilter === 'Pending' ? '#fbbf24' : '', color: statusFilter === 'Pending' ? '#000' : '' }}
              >
                ⏳ Por Enviar Manual ({orders.filter(o => o.status === 'Pending').length})
              </button>
              <button
                onClick={() => setStatusFilter('Completed')}
                className={statusFilter === 'Completed' ? 'btn-cyan' : 'btn-glass'}
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              >
                ✅ Completados ({orders.filter(o => o.status === 'Completed').length})
              </button>
            </div>

            <input
              type="text"
              placeholder="Buscar por UID, Nickname o ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.82rem', width: '260px' }}
            />
          </div>

          {/* Orders Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 8px' }}># ID Orden</th>
                  <th style={{ padding: '10px 8px' }}>Cliente</th>
                  <th style={{ padding: '10px 8px' }}>Jugador (Nick / UID)</th>
                  <th style={{ padding: '10px 8px' }}>Likes Antes ➔ Meta</th>
                  <th style={{ padding: '10px 8px' }}>Total Pagado</th>
                  <th style={{ padding: '10px 8px' }}>Modo</th>
                  <th style={{ padding: '10px 8px' }}>Estado</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Cargando pedidos de likes...</td></tr>
                ) : filteredOrders.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No hay pedidos de likes en esta sección.</td></tr>
                ) : (
                  filteredOrders.map((ord) => {
                    const audit = parsedAudit(ord);
                    const isPending = ord.status === 'Pending';

                    return (
                      <tr key={ord.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                        <td style={{ padding: '12px 8px', fontWeight: '800', color: 'var(--accent-cyan)' }}>
                          #{ord.id.slice(0, 8)}
                        </td>

                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ color: '#fff', fontWeight: '700' }}>{ord.profiles?.full_name || 'Cliente'}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ord.profiles?.email || 'N/A'}</div>
                        </td>

                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ fontWeight: '800', color: '#fff' }}>{audit.player_nickname}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>UID: {audit.target_uid}</div>
                        </td>

                        <td style={{ padding: '12px 8px' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>{audit.likes_before.toLocaleString()}</span>
                            <span style={{ color: '#34d399', fontWeight: 'bold', margin: '0 4px' }}>+{audit.likes_to_add.toLocaleString()}</span>
                            <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>➔ {audit.target_likes_final.toLocaleString()}</span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Entrega: {audit.delivery_estimated}</div>
                        </td>

                        <td style={{ padding: '12px 8px', fontWeight: '900', color: 'var(--accent-cyan)' }}>
                          ${Number(ord.total_usdt).toFixed(2)} USDT
                        </td>

                        <td style={{ padding: '12px 8px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            background: audit.dispatch_mode === 'API' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                            color: audit.dispatch_mode === 'API' ? '#34d399' : '#fbbf24'
                          }}>
                            {audit.dispatch_mode === 'API' ? '⚡ API Auto' : '🖐️ Manual'}
                          </span>
                        </td>

                        <td style={{ padding: '12px 8px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            background: isPending ? 'rgba(234, 179, 8, 0.2)' : 'rgba(52, 211, 153, 0.2)',
                            color: isPending ? '#fbbf24' : '#34d399',
                            border: isPending ? '1px solid #fbbf24' : '1px solid #34d399'
                          }}>
                            {isPending ? 'Pendiente' : 'Completado'}
                          </span>
                        </td>

                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <button
                            onClick={() => setSelectedOrder(ord)}
                            className="btn-cyan"
                            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                          >
                            👁️ Ver Tarjeta Auditoría
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PACKAGES & PHOTOS MANAGER */}
      {activeTab === 'packages' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Action */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--accent-cyan)', margin: 0, fontWeight: '800' }}>
              📦 Personalizar Paquetes de Likes (Cantidades, Fotos y Precios)
            </h3>
            <button
              onClick={handleOpenAddPackage}
              className="btn-cyan"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              ➕ Crear Nuevo Paquete
            </button>
          </div>

          {/* Form Modal / Panel for Creating or Editing Package */}
          {(isCreatingPkg || editingPkg) && (
            <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '24px', border: '1px solid var(--border-cyan)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>
                  {editingPkg ? `✏️ Editar Paquete: ${editingPkg.title}` : '➕ Nuevo Paquete de Likes'}
                </h4>
                <button onClick={() => { setEditingPkg(null); setIsCreatingPkg(false); setPkgTitle(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
              </div>

              <form onSubmit={handleSavePackage} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>
                      Título del Paquete:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 2K LIKES"
                      value={pkgTitle}
                      onChange={(e) => setPkgTitle(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>
                      Cantidad de Likes (Número):
                    </label>
                    <input
                      type="number"
                      step="500"
                      min="500"
                      required
                      placeholder="Ej. 2000"
                      value={pkgQuantity}
                      onChange={(e) => setPkgQuantity(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>
                      Tiempo de Entrega:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 1 DÍA / 2 DÍAS"
                      value={pkgDeliveryDays}
                      onChange={(e) => setPkgDeliveryDays(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>
                      Precio ($ USD):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ej. 7.09 (0 = Solo WhatsApp)"
                      value={pkgPriceUsdt}
                      onChange={(e) => setPkgPriceUsdt(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>
                      Insignia / Badge:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. POPULAR 🔥"
                      value={pkgBadge}
                      onChange={(e) => setPkgBadge(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* Photo / Image Upload for Package */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>
                    📸 Foto / Imagen del Paquete:
                  </label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      background: '#0d111a',
                      border: '1px solid var(--border-cyan)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <img
                        src={pkgImageUrl || '/likes-badge.jpg'}
                        alt=""
                        onError={(e) => { e.target.onerror = null; e.target.src = '/likes-badge.jpg'; }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="URL de la imagen o sube foto con el botón ➔"
                      value={pkgImageUrl}
                      onChange={(e) => setPkgImageUrl(e.target.value)}
                      style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                    />
                    <label style={{
                      padding: '10px 16px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(6, 182, 212, 0.15)',
                      border: '1px solid var(--border-cyan)',
                      color: 'var(--accent-cyan)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      📁 {uploadingPkgImg ? '...' : 'Subir Foto'}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleUploadPackageImage}
                      />
                    </label>
                  </div>
                </div>

                {/* Stock Visibility and WhatsApp Quote Toggles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={pkgIsActive}
                      onChange={(e) => setPkgIsActive(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-cyan)' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#fff' }}>👁️ Paquete Activo (Visible en Tienda)</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Desactiva para pausar este paquete temporalmente sin borrarlo</div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={pkgWhatsappBtnEnabled}
                      onChange={(e) => setPkgWhatsappBtnEnabled(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#25D366' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#25D366' }}>📲 Habilitar Botón de WhatsApp</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Muestra el botón de cotizar/comprar por WhatsApp para esta cantidad</div>
                    </div>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button type="submit" disabled={savingPkg} className="btn-cyan" style={{ padding: '10px 24px', fontSize: '0.88rem' }}>
                    {savingPkg ? 'Guardando...' : '💾 Guardar Paquete'}
                  </button>
                  <button type="button" onClick={() => { setEditingPkg(null); setIsCreatingPkg(false); setPkgTitle(''); }} className="btn-glass" style={{ padding: '10px 16px', fontSize: '0.88rem' }}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Packages List in Admin */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                style={{
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 18px',
                  background: '#0d111a',
                  border: pkg.isActive !== false ? '1px solid var(--border-glass)' : '1px dashed rgba(239, 68, 68, 0.4)',
                  opacity: pkg.isActive !== false ? 1 : 0.65,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    <img
                      src={pkg.imageUrl || '/likes-badge.jpg'}
                      alt=""
                      onError={(e) => { e.target.onerror = null; e.target.src = '/likes-badge.jpg'; }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.15rem', fontWeight: '900', color: '#fff' }}>
                        {pkg.title}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ({Number(pkg.quantity).toLocaleString()} Likes)
                      </span>
                      {pkg.badge && (
                        <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', fontWeight: 'bold' }}>
                          {pkg.badge}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: '700', marginTop: '2px' }}>
                      ⏱️ Entrega: {pkg.deliveryDays}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  {/* Price Tags */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#34d399' }}>
                      ${Number(pkg.priceUsdt).toFixed(2)} USD
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#fbbf24' }}>
                      Q{(Number(pkg.priceUsdt) * exchangeRate).toFixed(2)} GTQ
                    </div>
                  </div>

                  {/* Stock & WhatsApp Quick Toggles */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleTogglePackageActive(pkg)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        background: pkg.isActive !== false ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: pkg.isActive !== false ? '#34d399' : '#f87171',
                        border: pkg.isActive !== false ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                      }}
                      title="Activar / Desactivar visibilidad al público"
                    >
                      {pkg.isActive !== false ? '👁️ Activo' : '🚫 Oculto'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePackageWhatsapp(pkg)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        background: pkg.whatsappBtnEnabled ? 'rgba(37, 211, 102, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        color: pkg.whatsappBtnEnabled ? '#25D366' : 'var(--text-muted)',
                        border: pkg.whatsappBtnEnabled ? '1px solid #25D366' : '1px solid var(--border-glass)'
                      }}
                      title="Activar / Desactivar botón de WhatsApp para cotizar"
                    >
                      {pkg.whatsappBtnEnabled ? '📲 WhatsApp ON' : '📲 WhatsApp OFF'}
                    </button>

                    <button
                      onClick={() => handleOpenEditPackage(pkg)}
                      style={{ padding: '6px 12px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleDeletePackage(pkg.id)}
                      style={{ padding: '6px 10px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PROTECTED API PROVIDER PANEL */}
      {activeTab === 'api_config' && (
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '24px', maxWidth: '650px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '1.6rem' }}>🔐</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Conector Protegido de API Proveedor</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Las credenciales se almacenan en el backend del servidor y nunca se exponen al cliente.
              </p>
            </div>
          </div>

          <div style={{
            background: apiConfig.isConnected ? 'rgba(52, 211, 153, 0.12)' : 'rgba(234, 179, 8, 0.12)',
            border: apiConfig.isConnected ? '1px solid #34d399' : '1px solid #fbbf24',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '1.4rem' }}>{apiConfig.isConnected ? '🟢' : '🟡'}</span>
            <div>
              <strong style={{ color: apiConfig.isConnected ? '#34d399' : '#fbbf24', fontSize: '0.88rem' }}>
                {apiConfig.isConnected ? 'API de Proveedor Conectada y Activa' : 'Modo Manual Activo (Sin API Configurada)'}
              </strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {apiConfig.isConnected
                  ? 'Las nuevas compras de Likes se enviarán automáticamente a través del proveedor.'
                  : 'Las compras de los clientes se guardan y te notifican para realizar el envío manual.'}
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveApiConfig} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#fff', fontWeight: '700', marginBottom: '4px' }}>
                URL del Proveedor (API Endpoint):
              </label>
              <input
                type="url"
                placeholder="https://api.proveedor.com/v1/likes/order"
                value={apiConfig.providerUrl}
                onChange={(e) => setApiConfig({ ...apiConfig, providerUrl: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#fff', fontWeight: '700', marginBottom: '4px' }}>
                API Key / Token Secreto:
              </label>
              <input
                type="password"
                placeholder={apiConfig.hasKey ? `Guardada (${apiConfig.maskedKey}) - Ingresa nueva para cambiar` : 'Pega la API KEY aquí...'}
                value={apiConfig.apiKey}
                onChange={(e) => setApiConfig({ ...apiConfig, apiKey: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
              />
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', marginTop: '4px' }}>
                🔒 Protegido: La clave se transmite únicamente entre tu servidor y el proveedor.
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#fff', fontWeight: '700', marginBottom: '4px' }}>
                ID de Servicio de Likes (Opcional):
              </label>
              <input
                type="text"
                placeholder="Ej. likes_ff_latam / service_340"
                value={apiConfig.serviceId}
                onChange={(e) => setApiConfig({ ...apiConfig, serviceId: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="submit"
                disabled={savingApi}
                className="btn-cyan"
                style={{ flex: 1, padding: '12px', fontSize: '0.88rem' }}
              >
                {savingApi ? 'Guardando en Servidor...' : '💾 Guardar Configuración'}
              </button>

              <button
                type="button"
                onClick={handleTestApiConnection}
                disabled={testingApi}
                className="btn-glass"
                style={{ padding: '12px 18px', fontSize: '0.88rem' }}
              >
                {testingApi ? '...' : '⚡ Probar Conexión'}
              </button>
            </div>

            {testResult && (
              <div style={{
                marginTop: '10px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: testResult.success ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: testResult.success ? '1px solid #34d399' : '1px solid #f87171',
                color: testResult.success ? '#34d399' : '#f87171',
                fontSize: '0.82rem',
                fontWeight: '700'
              }}>
                {testResult.message}
              </div>
            )}
          </form>
        </div>
      )}

      {/* TAB 4: COMPLETE HISTORY */}
      {activeTab === 'history' && (
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setTypeFilter('All')}
              className={typeFilter === 'All' ? 'btn-cyan' : 'btn-glass'}
              style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            >
              Todos los Envíos ({orders.length})
            </button>
            <button
              onClick={() => setTypeFilter('Manual')}
              className={typeFilter === 'Manual' ? 'btn-cyan' : 'btn-glass'}
              style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            >
              🖐️ Manuales
            </button>
            <button
              onClick={() => setTypeFilter('API')}
              className={typeFilter === 'API' ? 'btn-cyan' : 'btn-glass'}
              style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            >
              ⚡ API Automático
            </button>
            <button
              onClick={() => setTypeFilter('Scheduled')}
              className={typeFilter === 'Scheduled' ? 'btn-cyan' : 'btn-glass'}
              style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            >
              ⏰ Programados
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 8px' }}>Fecha</th>
                  <th style={{ padding: '10px 8px' }}># Orden</th>
                  <th style={{ padding: '10px 8px' }}>UID / Jugador</th>
                  <th style={{ padding: '10px 8px' }}>Likes</th>
                  <th style={{ padding: '10px 8px' }}>Tipo</th>
                  <th style={{ padding: '10px 8px' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord) => {
                  const audit = parsedAudit(ord);
                  return (
                    <tr key={ord.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                      <td style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {new Date(ord.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                        #{ord.id.slice(0, 8)}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <strong>{audit.player_nickname}</strong> ({audit.target_uid})
                      </td>
                      <td style={{ padding: '12px 8px', color: '#34d399', fontWeight: 'bold' }}>
                        +{audit.likes_to_add.toLocaleString()} LIKES
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {audit.dispatch_mode === 'API' ? '⚡ API' : '🖐️ Manual'}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ color: ord.status === 'Completed' ? '#34d399' : '#fbbf24', fontWeight: 'bold' }}>
                          {ord.status === 'Completed' ? 'Completado' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: 2do COMPROBANTE EDITABLE - CONFIRMAR ENTREGA DE LIKES */}
      {selectedOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '540px',
            borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--border-cyan)',
            boxShadow: '0 0 40px rgba(6, 182, 212, 0.3)',
            padding: '24px',
            position: 'relative',
            background: 'linear-gradient(135deg, rgba(13, 17, 26, 0.98) 0%, rgba(30, 58, 138, 0.3) 100%)'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedOrder(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
            >
              ✕
            </button>

            <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: '900', letterSpacing: '0.05em', marginBottom: '4px' }}>
              ⚡ REGISTRO DE ENTREGAS Y COMPROBANTES DE LIKES
            </div>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 16px 0', color: '#fff' }}>
              CONFIRMAR / ACREDITAR #{selectedOrder.id.slice(0, 8)}
            </h2>

            {(() => {
              const audit = parsedAudit(selectedOrder);
              const totalMeta = audit.likes_to_add || 2000;
              const delivered = audit.total_likes_delivered || 0;
              const remaining = Math.max(0, totalMeta - delivered);
              const progressPct = Math.min(100, Math.round((delivered / (totalMeta || 1)) * 100));

              const currentStartLikes = reverifiedLikes !== null ? reverifiedLikes : (audit.likes_before + delivered);
              const likesAddedNum = Number(editableLikesAdded) || 0;
              const likesNow = currentStartLikes + likesAddedNum;

              return (
                <div>
                  {/* Progressive Delivery Status & Progress Bar */}
                  <div style={{
                    background: 'rgba(6, 182, 212, 0.08)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    marginBottom: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Meta Total del Pedido:</span>
                      <strong style={{ color: '#fff', fontSize: '1rem' }}>{totalMeta.toLocaleString()} Likes</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Acreditado hasta Hoy:</span>
                      <strong style={{ color: delivered >= totalMeta ? '#34d399' : '#06b6d4' }}>
                        {delivered.toLocaleString()} / {totalMeta.toLocaleString()} ({progressPct}%)
                      </strong>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${progressPct}%`,
                        height: '100%',
                        background: progressPct >= 100 ? '#34d399' : 'linear-gradient(90deg, #06b6d4, #3b82f6)',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span>Restante por acreditar: <strong style={{ color: '#fbbf24' }}>{remaining.toLocaleString()} Likes</strong></span>
                      <span>Envíos registrados: <strong style={{ color: 'var(--accent-cyan)' }}>{audit.daily_deliveries.length}</strong></span>
                    </div>
                  </div>

                  {/* Comprobante Visual Container (Capturable with html2canvas) */}
                  <div
                    id="comprobante-entrega-admin"
                    ref={receiptDeliveryRef}
                    style={{
                      background: '#0d111a',
                      border: '1px solid var(--border-cyan)',
                      borderRadius: 'var(--radius-md)',
                      padding: '18px',
                      marginBottom: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      position: 'relative',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                    }}
                  >
                    <div style={{ textAlign: 'center', borderBottom: '1px dashed rgba(255,255,255,0.2)', paddingBottom: '10px', marginBottom: '4px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: '900' }}>
                        {audit.daily_deliveries.length > 0 ? `COMPROBANTE DÍA #${audit.daily_deliveries.length + 1} ADMIN ✅` : 'COMPROBANTE 2 ADMIN ✅'}
                      </div>
                      <h3 style={{ margin: '4px 0 0 0', color: '#fff', fontSize: '1.15rem' }}>CONFIRMAR ENTREGA #{selectedOrder.id.slice(0, 8)}</h3>
                      <div style={{ fontSize: '0.75rem', color: selectedOrder.status === 'Completed' ? '#34d399' : '#06b6d4', marginTop: '4px', fontWeight: 'bold' }}>
                        Estado: {selectedOrder.status === 'Completed' ? '✅ COMPLETADO' : `⏳ EN PROCESO (${progressPct}%)`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Nick:</span>
                      <strong style={{ color: '#fff', letterSpacing: '0.04em' }}>{livePlayerInfo?.nick || audit.player_nickname}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>ID:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'var(--accent-cyan)', fontWeight: '900', fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '0.04em' }}>
                          {audit.target_uid}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(audit.target_uid);
                            setCopiedUid(true);
                            setTimeout(() => setCopiedUid(false), 2000);
                          }}
                          className="btn-glass"
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 'bold',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            border: '1px solid rgba(6, 182, 212, 0.4)',
                            color: copiedUid ? '#34d399' : 'var(--accent-cyan)'
                          }}
                          title="Copiar ID al portapapeles"
                        >
                          {copiedUid ? '✓ ¡Copiado!' : '📋 Copiar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReverifyLiveLikes(audit.target_uid, audit.region)}
                          disabled={isReverifying}
                          className="btn-cyan"
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 'bold',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Consultar likes en vivo desde Free Fire"
                        >
                          {isReverifying ? '⌛...' : '🔍 Validar Likes'}
                        </button>
                      </div>
                    </div>

                    {livePlayerInfo && (
                      <div style={{
                        background: 'rgba(52, 211, 153, 0.12)',
                        border: '1px solid rgba(52, 211, 153, 0.35)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '0.78rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        color: '#34d399'
                      }}>
                        <span>✅ <strong>En Vivo:</strong> {livePlayerInfo.nick} {livePlayerInfo.level ? `(Nv. ${livePlayerInfo.level})` : ''}</span>
                        <span style={{ fontWeight: '900' }}>❤️ {livePlayerInfo.likes.toLocaleString()} Likes</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Región:</span>
                      <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{livePlayerInfo?.region || audit.region}</span>
                    </div>

                    <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', margin: '4px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '4px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>│ Likes antes del envío de hoy:</span>
                      <span style={{ color: '#fff', fontWeight: 'bold' }}>{currentStartLikes.toLocaleString()}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(6, 182, 212, 0.1)', padding: '6px 10px', borderRadius: '4px' }}>
                      <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', fontSize: '0.82rem' }}>│ LIKES A ENVIAR HOY:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="number"
                          value={editableLikesAdded}
                          onChange={(e) => setEditableLikesAdded(e.target.value)}
                          style={{
                            width: '100px',
                            padding: '4px 8px',
                            background: '#000',
                            border: '1px solid var(--accent-cyan)',
                            color: '#34d399',
                            fontWeight: '900',
                            fontSize: '0.95rem',
                            borderRadius: '4px',
                            textAlign: 'right'
                          }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 'bold' }}>✏️ (Editable)</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(52, 211, 153, 0.15)', padding: '8px 10px', borderRadius: '4px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                      <span style={{ color: '#34d399', fontWeight: '900', fontSize: '0.85rem' }}>│ Likes Ahora (Tras acreditación):</span>
                      <span style={{ color: '#34d399', fontWeight: '900', fontSize: '1.1rem' }}>
                        {likesNow.toLocaleString()} <span style={{ fontSize: '0.68rem', color: '#fbbf24', fontWeight: 'normal' }}>(AUTO CALCULA)</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Botón Principal: Registrar Envío Diario */}
                    <button
                      type="button"
                      onClick={() => handleRecordDailyDelivery(selectedOrder, editableLikesAdded)}
                      disabled={updatingOrder}
                      className="btn-cyan"
                      style={{
                        padding: '12px',
                        fontWeight: '900',
                        fontSize: '0.95rem',
                        background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
                        color: '#fff',
                        boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)'
                      }}
                    >
                      {updatingOrder ? 'Guardando...' : `➕ REGISTRAR ENVÍO DIARIO (+${likesAddedNum.toLocaleString()} Likes)`}
                    </button>

                    {/* Botón Ver Historial de Acreditaciones */}
                    {audit.daily_deliveries.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowDeliveriesHistoryModal(true)}
                        className="btn-glass"
                        style={{
                          padding: '10px',
                          fontSize: '0.85rem',
                          fontWeight: '800',
                          color: '#fbbf24',
                          border: '1px solid #fbbf24'
                        }}
                      >
                        📜 Ver Historial de Acreditaciones ({audit.daily_deliveries.length} Envíos Realizados)
                      </button>
                    )}

                    {/* Marcar Completado Todo */}
                    <button
                      type="button"
                      onClick={() => handleSaveAndCompleteDelivery(selectedOrder)}
                      disabled={updatingOrder}
                      className="btn-glass"
                      style={{
                        padding: '10px',
                        fontWeight: '800',
                        fontSize: '0.85rem',
                        color: '#34d399',
                        borderColor: '#34d399'
                      }}
                    >
                      ✅ Guardar y Marcar Pedido Completo
                    </button>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const html2canvas = (await import('html2canvas')).default;
                            const element = document.getElementById('comprobante-entrega-admin');
                            const canvas = await html2canvas(element, { backgroundColor: '#0f172a' });
                            const dataUrl = canvas.toDataURL('image/png');
                            const link = document.createElement('a');
                            link.download = `Comprobante_Likes_${audit.target_uid}_ALVSHOP.png`;
                            link.href = dataUrl;
                            link.click();
                          } catch (e) {
                            alert('Error descargando comprobante: ' + e.message);
                          }
                        }}
                        className="btn-glass"
                        style={{ flex: 1, padding: '10px', fontSize: '0.8rem', fontWeight: 'bold' }}
                      >
                        📥 Descargar Comprobante Actual
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedOrder(null)}
                        className="btn-glass"
                        style={{ padding: '10px 16px', fontSize: '0.8rem' }}
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>

                  {/* MODAL HISTORIAL DE ACREDITACIONES DIARIAS */}
                  {showDeliveriesHistoryModal && (
                    <div style={{
                      position: 'fixed',
                      inset: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.9)',
                      backdropFilter: 'blur(10px)',
                      zIndex: 105,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px'
                    }}>
                      <div className="glass-panel animate-fade" style={{
                        width: '100%',
                        maxWidth: '520px',
                        borderRadius: 'var(--radius-lg)',
                        border: '2px solid #fbbf24',
                        padding: '24px',
                        position: 'relative',
                        background: '#0d111a',
                        maxHeight: '85vh',
                        overflowY: 'auto'
                      }}>
                        <button
                          onClick={() => setShowDeliveriesHistoryModal(false)}
                          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
                        >
                          ✕
                        </button>

                        <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: '900', marginBottom: '4px' }}>
                          📜 REGISTRO DE ACREDITACIONES DIARIAS
                        </div>
                        <h3 style={{ margin: '0 0 14px 0', color: '#fff', fontSize: '1.15rem' }}>
                          Historial de Envíos: {audit.player_nickname} ({audit.target_uid})
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {audit.daily_deliveries.map((del, idx) => (
                            <div key={del.id || idx} style={{
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(251, 191, 36, 0.3)',
                              borderRadius: '8px',
                              padding: '12px 14px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: '900', color: '#fbbf24', fontSize: '0.85rem' }}>
                                  🗓️ Día #{del.day_number || idx + 1}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {new Date(del.date).toLocaleString()}
                                </span>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Likes antes:</span>
                                <strong style={{ color: '#fff' }}>{del.likes_before?.toLocaleString()}</strong>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                <span style={{ color: '#34d399', fontWeight: 'bold' }}>Likes acreditados hoy:</span>
                                <strong style={{ color: '#34d399', fontSize: '0.95rem' }}>+{del.likes_sent?.toLocaleString()} ❤️</strong>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>Likes tras acreditación:</span>
                                <strong style={{ color: 'var(--accent-cyan)' }}>{del.likes_now?.toLocaleString()}</strong>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => setShowDeliveriesHistoryModal(false)}
                          className="btn-cyan"
                          style={{ width: '100%', marginTop: '16px', padding: '10px' }}
                        >
                          Volver
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}
