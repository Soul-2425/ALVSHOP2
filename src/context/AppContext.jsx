import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { requestPushPermission } from '../../notificaciones y apis/notificaciones/pushService';
import { soundEffects } from '../services/soundEffects';

const AppContext = createContext();

export async function fetchServerBalances() {
  try {
    const host = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost';
    const endpoints = [`/api/v1/balances`, `http://${host}:5000/api/v1/balances`];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          if (data.balances) {
            try {
              const currentMap = JSON.parse(localStorage.getItem('alv_wallet_balances') || '{}');
              const merged = { ...currentMap, ...data.balances };
              localStorage.setItem('alv_wallet_balances', JSON.stringify(merged));
            } catch (e) {}
            return data.balances;
          }
        }
      } catch (e) {}
    }
  } catch (err) {}
  return {};
}

export function getLocalUserBalance(userIdOrEmail) {
  if (typeof window === 'undefined' || !userIdOrEmail) return null;
  try {
    const map = JSON.parse(localStorage.getItem('alv_wallet_balances') || '{}');
    const key = String(userIdOrEmail).toLowerCase().trim();
    if (map[key] !== undefined) return Number(map[key]);
    if (map[userIdOrEmail] !== undefined) return Number(map[userIdOrEmail]);
    return null;
  } catch (e) {
    return null;
  }
}

export function setLocalUserBalance(userIdOrEmail, balance) {
  if (typeof window === 'undefined' || !userIdOrEmail) return;
  try {
    const map = JSON.parse(localStorage.getItem('alv_wallet_balances') || '{}');
    const key = String(userIdOrEmail).toLowerCase().trim();
    const num = Number(balance);
    map[key] = num;
    map[userIdOrEmail] = num;
    localStorage.setItem('alv_wallet_balances', JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('alv_balance_updated', { detail: { key, balance: num } }));
  } catch (e) {}
}

export function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState('Cliente Común');
  const [walletBalance, setWalletBalance] = useState(0.00);
  
  // Realtime Push Toasts & Notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Currency Selection: 'USDT', 'GTQ', 'MXN', 'COP'
  const [currency, setCurrencyState] = useState(() => {
    try {
      return localStorage.getItem('alv_selected_currency') || 'USDT';
    } catch (e) {
      return 'USDT';
    }
  });

  const setCurrency = (newCurr) => {
    setCurrencyState(newCurr);
    try {
      localStorage.setItem('alv_selected_currency', newCurr);
    } catch (e) {}
  };

  const [exchangeRate, setExchangeRate] = useState(7.80);
  const [rateMxn, setRateMxn] = useState(19.50);
  const [rateCop, setRateCop] = useState(4100.00);
  
  // Dynamic Configuration (Branding, Colors, Bank Accounts, Socials, Payment Methods)
  const [config, setConfig] = useState({
    site_title: 'ALVSHOP - Recargas & Cuentas Digitales',
    site_tagline: 'Diamantes Free Fire, Pines Digitales, Cuentas Streaming y Aumento de Likes con entrega 100% garantizada.',
    banner_url: '/gamer-banner.jpg',
    category_button_text: 'Explorar Productos',
    logo_url: '',
    favicon_url: '',
    background_color: '#0a0d14',
    primary_color: '#1e3a8a',
    accent_color: '#06b6d4',
    banners: [],
    usdt_gtq_rate: 7.80,
    usdt_mxn_rate: 19.50,
    usdt_cop_rate: 4100.00,
    bank_accounts: [{ bank: 'Banrural', account_number: '4313076359', type: 'Ahorro', name: 'Jonathan Alvares' }],
    mxn_accounts: [{ bank: 'BBVA / SPEI', account_number: '012180015487965412', type: 'CLABE Interbancaria', name: 'Jonathan Alvares' }],
    cop_accounts: [{ bank: 'Bancolombia / Nequi', account_number: '3124567890', type: 'Ahorros / Celular', name: 'Jonathan Alvares' }],
    payment_methods_visibility: {
      binance: true,
      gtq: true,
      mxn: true,
      cop: true,
      payment_links: true
    },
    social_links: { instagram: '', tiktok: '', whatsapp: '50243130763', facebook: '' },
    binance_pay_id: '527653920',
    binance_name: 'AlvJona',
    binance_qr_url: '/binance-qr.jpg',
    binance_deeplink_url: 'https://app.binance.com/uni-qr/T567z1pn',
    binance_usdt_address: '',
    discount_offer_pct: 5,
    discount_special_pct: 10
  });

  const [isLoading, setIsLoading] = useState(true);

  // Add Notification to floating Toast queue with Sound
  const addNotification = useCallback((notif) => {
    const id = notif.id || 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const newNotif = { ...notif, id, created_at: notif.created_at || new Date().toISOString() };

    setNotifications((prev) => {
      const exists = prev.some((n) => n.id === id);
      if (exists) return prev;
      return [newNotif, ...prev];
    });
    setUnreadCount((prev) => prev + 1);

    // Reproducir tono según tipo
    if (!isMuted) {
      if (notif.type === 'order_completed') soundEffects.playOrderCompletedSound();
      else if (notif.type === 'admin_new_order' || notif.type === 'order_created') soundEffects.playNewOrderAdminSound();
      else if (notif.type === 'support_reply' || notif.type === 'admin_support_message') soundEffects.playChatMessageSound();
      else if (notif.type === 'feed_interaction') soundEffects.playFeedInteractionSound();
    }
  }, [isMuted]);

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      soundEffects.setMuted(next);
      return next;
    });
  };

  // Load User Persistent Notification Logs from Supabase
  const loadUserNotifications = async (userId) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data && !error) {
        setNotifications(data);
        const unread = data.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.warn('Error loading notifications:', err);
    }
  };

  // Load Config & Apply Dynamic CSS Variables
  const loadConfig = async () => {
    try {
      // 1. Initial cached config
      try {
        const cached = JSON.parse(localStorage.getItem('alv_system_config') || '{}');
        if (cached && Object.keys(cached).length > 0) {
          setConfig(prev => ({ ...prev, ...cached }));
          if (cached.usdt_gtq_rate) setExchangeRate(Number(cached.usdt_gtq_rate));
          if (cached.usdt_mxn_rate) setRateMxn(Number(cached.usdt_mxn_rate));
          if (cached.usdt_cop_rate) setRateCop(Number(cached.usdt_cop_rate));
        }
      } catch (e) {}

      const { data, error } = await supabase
        .from('config')
        .select('*')
        .eq('id', 1)
        .single();

      if (data && !error) {
        const binancePayId = data.social_links?.binance_pay_id || data.binance_pay_id || '527653920';
        const binanceName = data.social_links?.binance_name || data.binance_name || 'AlvJona';
        const binanceQrUrl = data.social_links?.binance_qr_url || data.binance_qr_url || '/binance-qr.jpg';
        const binanceDeeplink = data.social_links?.binance_deeplink_url || data.binance_deeplink_url || 'https://app.binance.com/uni-qr/T567z1pn';
        const binanceUsdtAddress = data.social_links?.binance_usdt_address || '';

        const rateGtq = data.usdt_gtq_rate ? Number(data.usdt_gtq_rate) : 7.80;
        const rateMxnVal = data.usdt_mxn_rate || data.social_links?.usdt_mxn_rate ? Number(data.usdt_mxn_rate || data.social_links?.usdt_mxn_rate) : 19.50;
        const rateCopVal = data.usdt_cop_rate || data.social_links?.usdt_cop_rate ? Number(data.usdt_cop_rate || data.social_links?.usdt_cop_rate) : 4100.00;

        const mxnAccounts = data.mxn_accounts || data.social_links?.mxn_accounts || [
          { bank: 'BBVA / SPEI', account_number: '012180015487965412', type: 'CLABE Interbancaria', name: 'Jonathan Alvares' }
        ];

        const copAccounts = data.cop_accounts || data.social_links?.cop_accounts || [
          { bank: 'Bancolombia / Nequi', account_number: '3124567890', type: 'Ahorros / Celular', name: 'Jonathan Alvares' }
        ];

        const paymentVisibility = data.payment_methods_visibility || data.social_links?.payment_methods_visibility || {
          binance: true,
          gtq: true,
          mxn: true,
          cop: true,
          payment_links: true
        };

        const activeBannerUrl = data.banner_url || data.social_links?.banner_url || '/gamer-banner.jpg';
        const activeCategoryButtonText = data.category_button_text || data.social_links?.category_button_text || 'Explorar Productos';
        const activeSiteTitle = data.site_title || data.social_links?.site_title || 'ALVSHOP - Recargas & Cuentas Digitales';
        const activeSiteTagline = data.site_tagline || data.social_links?.site_tagline || 'Diamantes Free Fire, Pines Digitales, Cuentas Streaming y Aumento de Likes con entrega 100% garantizada.';
        const isStoreActive = data.store_active !== false; // default true if undefined

        const fullConfig = {
          ...data,
          site_title: activeSiteTitle,
          site_tagline: activeSiteTagline,
          banner_url: activeBannerUrl,
          category_button_text: activeCategoryButtonText,
          usdt_gtq_rate: rateGtq,
          usdt_mxn_rate: rateMxnVal,
          usdt_cop_rate: rateCopVal,
          mxn_accounts: mxnAccounts,
          cop_accounts: copAccounts,
          payment_methods_visibility: paymentVisibility,
          binance_pay_id: binancePayId,
          binance_name: binanceName,
          binance_qr_url: binanceQrUrl,
          binance_deeplink_url: binanceDeeplink,
          binance_usdt_address: binanceUsdtAddress,
          store_active: isStoreActive
        };

        setConfig(prev => ({
          ...prev,
          ...fullConfig
        }));
        setExchangeRate(rateGtq);
        setRateMxn(rateMxnVal);
        setRateCop(rateCopVal);

        try {
          localStorage.setItem('alv_system_config', JSON.stringify(fullConfig));
        } catch (e) {}

        // Inject Dynamic Colors into CSS Root
        const root = document.documentElement;
        if (data.background_color) root.style.setProperty('--bg-carbon', data.background_color);
        if (data.primary_color) root.style.setProperty('--primary-navy', data.primary_color);
        if (data.accent_color) {
          root.style.setProperty('--accent-cyan', data.accent_color);
          root.style.setProperty('--accent-cyan-glow', `${data.accent_color}66`);
          root.style.setProperty('--border-cyan', `${data.accent_color}4d`);
        }
        if (data.favicon_url) {
          let link = document.querySelector("link[rel~='icon']");
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
          }
          link.href = data.favicon_url;
        }
        if (data.site_title) {
          document.title = data.site_title;
        }
      }
    } catch (err) {
      console.warn('Error loading dynamic config:', err);
    }
  };

  // Fetch Current Profile
  const fetchProfile = async (userId, userEmailParam = '') => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      let effectiveBal = null;
      const userEmail = (userEmailParam || data?.email || user?.email || '').toLowerCase().trim();

      // 1. Supabase is the PRIMARY source of truth
      if (data && !error && data.wallet_balance !== undefined && data.wallet_balance !== null) {
        effectiveBal = Number(data.wallet_balance);
      } else {
        // 2. Fallback to server balances / local cache if Supabase is offline or not yet created
        const serverBalances = await fetchServerBalances();
        if (serverBalances) {
          if (userId && serverBalances[userId] !== undefined) effectiveBal = Number(serverBalances[userId]);
          else if (userEmail && serverBalances[userEmail] !== undefined) effectiveBal = Number(serverBalances[userEmail]);
        }
        if (effectiveBal === null) {
          const localBal = getLocalUserBalance(userId) || (userEmail ? getLocalUserBalance(userEmail) : null);
          if (localBal !== null) effectiveBal = localBal;
        }
      }

      const finalBal = effectiveBal !== null ? effectiveBal : 0.00;

      // Sync local cache to latest balance
      if (userId) setLocalUserBalance(userId, finalBal);
      if (userEmail) setLocalUserBalance(userEmail, finalBal);

      if (data && !error) {
        setProfile({ ...data, wallet_balance: finalBal });
        setRole(data.role || 'Cliente Común');
        setWalletBalance(finalBal);

        // Load notifications and request permission
        loadUserNotifications(userId);
        requestPushPermission(userId);
      } else {
        const fallbackEmail = userEmail || user?.email || '';
        const isKnownAdmin = fallbackEmail === 'alvarezmendezj33@gmail.com' || fallbackEmail === 'larosagranado1111@gmail.com';
        setProfile(prev => prev || { id: userId, email: fallbackEmail, full_name: user?.user_metadata?.full_name || fallbackEmail.split('@')[0], role: isKnownAdmin ? 'Admin' : 'Cliente Común', wallet_balance: finalBal });
        if (isKnownAdmin) setRole('Admin');
        setWalletBalance(finalBal);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      const fallbackEmail = (userEmailParam || user?.email || '').toLowerCase().trim();
      const localBal = getLocalUserBalance(userId) || (fallbackEmail ? getLocalUserBalance(fallbackEmail) : 0);
      const isKnownAdmin = fallbackEmail === 'alvarezmendezj33@gmail.com' || fallbackEmail === 'larosagranado1111@gmail.com';
      if (isKnownAdmin) setRole('Admin');
      setWalletBalance(localBal || 0);
    }
  };

  // Centralized Wallet Balance Updater
  const updateUserWalletBalance = async (userId, newBal, email = '') => {
    const finalBal = Number(Number(newBal).toFixed(2));
    const userEmail = (email || '').toLowerCase().trim();

    if (userId) setLocalUserBalance(userId, finalBal);
    if (userEmail) setLocalUserBalance(userEmail, finalBal);

    if (user?.id === userId || (userEmail && user?.email?.toLowerCase().trim() === userEmail)) {
      setWalletBalance(finalBal);
      setProfile(prev => prev ? { ...prev, wallet_balance: finalBal } : prev);
    }

    // Send to backend microservice to persist across all devices
    try {
      const host = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost';
      const endpoints = [`/api/v1/balance/update`, `http://${host}:5000/api/v1/balance/update`];
      for (const ep of endpoints) {
        try {
          await fetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, email: userEmail, balance: finalBal })
          });
          break;
        } catch (e) {}
      }
    } catch (err) {}

    try {
      if (userId) await supabase.from('profiles').update({ wallet_balance: finalBal }).eq('id', userId);
    } catch (err) {
      console.warn('Supabase profile update warning:', err);
    }
  };

  useEffect(() => {
    const handleBalanceEvent = (e) => {
      if (e.detail) {
        const { key, balance } = e.detail;
        const currentEmail = user?.email?.toLowerCase().trim();
        if (key === user?.id || (currentEmail && key === currentEmail)) {
          const bal = Number(balance);
          setWalletBalance(bal);
          setProfile(prev => prev ? { ...prev, wallet_balance: bal } : prev);
        }
      }
    };
    window.addEventListener('alv_balance_updated', handleBalanceEvent);

    // Supabase Realtime Listener for Instant Balance Updates across all devices
    let profileChannel = null;
    if (user?.id) {
      profileChannel = supabase
        .channel(`realtime-profile-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          (payload) => {
            if (payload.new && payload.new.wallet_balance !== undefined) {
              const newBal = Number(payload.new.wallet_balance);
              setWalletBalance(newBal);
              setProfile(prev => ({ ...prev, ...payload.new, wallet_balance: newBal }));
              setLocalUserBalance(user.id, newBal);
              if (user.email) setLocalUserBalance(user.email, newBal);
            }
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener('alv_balance_updated', handleBalanceEvent);
      if (profileChannel) supabase.removeChannel(profileChannel);
    };
  }, [user]);

  useEffect(() => {
    loadConfig();

    // Supabase Auth Listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
      } else {
        setProfile(null);
        setRole('Cliente Común');
        setWalletBalance(0.00);
        setNotifications([]);
        setUnreadCount(0);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Supabase Realtime Channels (Push WebSockets)
  useEffect(() => {
    const normalizedRole = role ? String(role).trim().toLowerCase() : '';
    const isAdmin = normalizedRole === 'admin' || normalizedRole === 'asesor';

    // 1. Canal Global de Admin (Para nuevos pedidos, comentarios feed y soporte entrante)
    const adminChannel = supabase.channel('admin_global_channel');

    adminChannel
      .on('broadcast', { event: 'push_notification' }, (payload) => {
        if (isAdmin && payload?.payload) {
          addNotification(payload.payload);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        if (isAdmin && payload.new) {
          addNotification({
            type: 'admin_new_order',
            title: '🛒 ¡Nuevo Pedido en Tienda!',
            body: `Orden #${(payload.new.id || '').slice(0, 8)} por $${Number(payload.new.total_usdt || 0).toFixed(2)} USDT`,
            metadata: { url: '/admin/orders', orderId: payload.new.id }
          });
        }
      })
      .subscribe();

    // 2. Canal Personal del Usuario (Para pedidos creados, completados y respuestas de soporte)
    let userChannel = null;
    if (user?.id) {
      userChannel = supabase.channel(`user_channel_${user.id}`);

      userChannel
        .on('broadcast', { event: 'push_notification' }, (payload) => {
          if (payload?.payload) {
            addNotification(payload.payload);
          }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` }, (payload) => {
          if (payload.new) {
            addNotification({
              type: 'order_created',
              title: '🛒 ¡Pedido Registrado!',
              body: `Tu pedido #${(payload.new.id || '').slice(0, 8)} por $${Number(payload.new.total_usdt || 0).toFixed(2)} USDT fue registrado con éxito.`,
              metadata: { url: '/profile?tab=orders', orderId: payload.new.id }
            });
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` }, (payload) => {
          if (payload.new && payload.new.status === 'Completed' && payload.old?.status !== 'Completed') {
            addNotification({
              type: 'order_completed',
              title: '🎉 ¡Pedido Completado y Entregado!',
              body: `Tu orden #${(payload.new.id || '').slice(0, 8)} ha sido entregada exitosamente.`,
              metadata: { url: '/profile?tab=orders', orderId: payload.new.id }
            });
          }
        })
        .subscribe();
    }

    return () => {
      supabase.removeChannel(adminChannel);
      if (userChannel) supabase.removeChannel(userChannel);
    };
  }, [user, role, addNotification]);

  // Format Price with Multi-Currency Support (USDT, GTQ, MXN, COP)
  const formatPrice = (usdtAmount, customRole = null, forceCurrency = null) => {
    let price = Number(usdtAmount || 0);
    const effectiveRole = customRole || role;

    // Apply role-based discounts if applicable
    if (effectiveRole === 'Cliente Oferta' && config.discount_offer_pct) {
      price = price * (1 - (config.discount_offer_pct / 100));
    } else if (effectiveRole === 'Cliente Especial' && config.discount_special_pct) {
      price = price * (1 - (config.discount_special_pct / 100));
    }

    const activeCurr = forceCurrency || currency;

    if (activeCurr === 'GTQ') {
      const gtqAmount = price * (config.usdt_gtq_rate || exchangeRate || 7.80);
      return `Q${gtqAmount.toFixed(2)} GTQ`;
    }
    if (activeCurr === 'MXN') {
      const mxnAmount = price * (config.usdt_mxn_rate || rateMxn || 19.50);
      return `$${mxnAmount.toFixed(2)} MXN`;
    }
    if (activeCurr === 'COP') {
      const copAmount = price * (config.usdt_cop_rate || rateCop || 4100.00);
      return `$${Math.round(copAmount).toLocaleString('es-CO')} COP`;
    }
    return `$${price.toFixed(2)} USDT`;
  };

  const convertPrice = (usdtAmount, targetCurrency = null) => {
    const price = Number(usdtAmount || 0);
    const activeCurr = targetCurrency || currency;

    if (activeCurr === 'GTQ') {
      const rate = Number(config.usdt_gtq_rate || exchangeRate || 7.80);
      const val = price * rate;
      return { amountFormatted: `Q${val.toFixed(2)}`, amountNumber: Number(val.toFixed(2)), symbol: 'Q', code: 'GTQ', rate };
    }
    if (activeCurr === 'MXN') {
      const rate = Number(config.usdt_mxn_rate || rateMxn || 19.50);
      const val = price * rate;
      return { amountFormatted: `$${val.toFixed(2)} MXN`, amountNumber: Number(val.toFixed(2)), symbol: '$', code: 'MXN', rate };
    }
    if (activeCurr === 'COP') {
      const rate = Number(config.usdt_cop_rate || rateCop || 4100.00);
      const val = Math.round(price * rate);
      return { amountFormatted: `$${val.toLocaleString('es-CO')} COP`, amountNumber: val, symbol: '$', code: 'COP', rate };
    }
    return { amountFormatted: `$${price.toFixed(2)} USDT`, amountNumber: price, symbol: '$', code: 'USDT', rate: 1.00 };
  };

  const toggleCurrency = () => {
    setCurrency(prev => {
      if (prev === 'USDT') return 'GTQ';
      if (prev === 'GTQ') return 'MXN';
      if (prev === 'MXN') return 'COP';
      return 'USDT';
    });
  };

  return (
    <AppContext.Provider
      value={{
        session,
        user,
        profile,
        role,
        setRole,
        walletBalance,
        setWalletBalance,
        currency,
        setCurrency,
        exchangeRate,
        setExchangeRate,
        rateMxn,
        setRateMxn,
        rateCop,
        setRateCop,
        formatPrice,
        convertPrice,
        toggleCurrency,
        config,
        loadConfig,
        fetchProfile,
        updateUserWalletBalance,
        isLoading,
        notifications,
        unreadCount,
        addNotification,
        removeNotification,
        clearAllNotifications,
        loadUserNotifications,
        isMuted,
        toggleMute
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
