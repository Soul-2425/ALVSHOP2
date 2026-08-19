import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { requestPushPermission } from '../../notificaciones y apis/notificaciones/pushService';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState('Cliente Común');
  const [walletBalance, setWalletBalance] = useState(0.00);
  
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
    discount_offer_pct: 5,
    discount_special_pct: 10
  });

  const [isLoading, setIsLoading] = useState(true);

  // Load Config & Apply Dynamic CSS Variables
  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('config')
        .select('*')
        .eq('id', 1)
        .single();

      if (data && !error) {
        setConfig(prev => ({ ...prev, ...data }));
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

        // Trigger Jorge's Push Notification request
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
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
        toggleCurrency,
        exchangeRate,
        config,
        loadConfig,
        formatPrice,
        fetchProfile,
        isLoading
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
