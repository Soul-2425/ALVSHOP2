import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { requestPushPermission } from '../../notificaciones y apis/notificaciones/pushService';
import { soundEffects } from '../services/soundEffects';

const AppContext = createContext();

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

  // Currency Toggle: 'USDT' or 'GTQ'
  const [currency, setCurrency] = useState('USDT');
  const [exchangeRate, setExchangeRate] = useState(7.80);
  
  // Dynamic Configuration (Branding, Colors, Bank Accounts, Socials)
  const [config, setConfig] = useState({
    site_title: 'ALVSHOP - Recargas & Cuentas Digitales',
    logo_url: '',
    favicon_url: '',
    background_color: '#0a0d14',
    primary_color: '#1e3a8a',
    accent_color: '#06b6d4',
    banners: [],
    bank_accounts: [{ bank: 'Banrural', account_number: '4313076359', type: 'Ahorro', name: 'Jonathan Alvares' }],
    social_links: { instagram: '', tiktok: '', whatsapp: '50250000000', facebook: '' },
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

        setConfig(prev => ({
          ...prev,
          ...data,
          binance_pay_id: binancePayId,
          binance_name: binanceName,
          binance_qr_url: binanceQrUrl,
          binance_deeplink_url: binanceDeeplink,
          binance_usdt_address: binanceUsdtAddress
        }));
        if (data.usdt_gtq_rate) setExchangeRate(Number(data.usdt_gtq_rate));

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
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        setProfile(data);
        setRole(data.role || 'Cliente Común');
        setWalletBalance(Number(data.wallet_balance || 0));

        // Load notifications and request permission
        loadUserNotifications(userId);
        requestPushPermission(userId);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  useEffect(() => {
    loadConfig();

    // Supabase Auth Listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
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

  // Format Price with Currency Toggle (USDT or GTQ)
  const formatPrice = (usdtAmount, customRole = null) => {
    let price = Number(usdtAmount || 0);
    const effectiveRole = customRole || role;

    // Apply role-based discounts if applicable
    if (effectiveRole === 'Cliente Oferta' && config.discount_offer_pct) {
      price = price * (1 - (config.discount_offer_pct / 100));
    } else if (effectiveRole === 'Cliente Especial' && config.discount_special_pct) {
      price = price * (1 - (config.discount_special_pct / 100));
    }

    if (currency === 'GTQ') {
      const gtqAmount = price * exchangeRate;
      return `Q${gtqAmount.toFixed(2)}`;
    }
    return `$${price.toFixed(2)} USDT`;
  };

  const toggleCurrency = () => {
    setCurrency(prev => prev === 'USDT' ? 'GTQ' : 'USDT');
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
        formatPrice,
        toggleCurrency,
        config,
        loadConfig,
        fetchProfile,
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
