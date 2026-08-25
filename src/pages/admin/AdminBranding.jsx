import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useApp } from '../../context/AppContext';

export default function AdminBranding() {
  const { config, loadConfig } = useApp();

  // Dynamic Theme Colors (Negro Carbón, Azul Marino, Cyan Neón)
  const [bgColor, setBgColor] = useState('#0a0d14');
  const [primaryColor, setPrimaryColor] = useState('#1e3a8a');
  const [accentColor, setAccentColor] = useState('#06b6d4');

  // Brand Info & Banner Customization
  const [siteTitle, setSiteTitle] = useState('ALVSHOP - Recargas y Bienes Digitales');
  const [siteTagline, setSiteTagline] = useState('Diamantes Free Fire, Pines Digitales, Cuentas Streaming y Aumento de Likes con entrega 100% garantizada.');
  const [bannerUrl, setBannerUrl] = useState('/gamer-banner.jpg');
  const [categoryButtonText, setCategoryButtonText] = useState('Explorar Productos');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');

  // Social Links
  const [socials, setSocials] = useState({
    instagram: '',
    tiktok: '',
    whatsapp: '50243130763',
    facebook: ''
  });

  // SEO & Head Scripts Injection (Meta Pixel, Google Ads)
  const [customHeadScripts, setCustomHeadScripts] = useState('');

  // No-Code API Integrations
  const [integrations, setIntegrations] = useState([]);
  const [newApiName, setNewApiName] = useState('');
  const [newApiEndpoint, setNewApiEndpoint] = useState('');
  const [newApiMethod, setNewApiMethod] = useState('POST');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      if (config.background_color) setBgColor(config.background_color);
      if (config.primary_color) setPrimaryColor(config.primary_color);
      if (config.accent_color) setAccentColor(config.accent_color);
      if (config.site_title) setSiteTitle(config.site_title);
      if (config.site_tagline) setSiteTagline(config.site_tagline);
      if (config.banner_url || config.branding?.banner_url) setBannerUrl(config.banner_url || config.branding?.banner_url);
      if (config.category_button_text) setCategoryButtonText(config.category_button_text);
      if (config.logo_url) setLogoUrl(config.logo_url);
      if (config.favicon_url) setFaviconUrl(config.favicon_url);
      if (config.social_links) setSocials(config.social_links);
      if (config.custom_head_scripts) setCustomHeadScripts(config.custom_head_scripts);
    }

    async function loadIntegrations() {
      const { data } = await supabase.from('supplier_integrations').select('*');
      if (data && data.length > 0) {
        setIntegrations(data);
      } else {
        setIntegrations([
          { id: '1', name: 'API Proveedor Free Fire LATAM', endpoint_url: 'https://api.supplier-games.com/v1/topup', http_method: 'POST', is_active: true }
        ]);
      }
    }

    loadIntegrations();
  }, [config]);

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updateData = {
        background_color: bgColor,
        primary_color: primaryColor,
        accent_color: accentColor,
        site_title: siteTitle,
        site_tagline: siteTagline,
        banner_url: bannerUrl,
        category_button_text: categoryButtonText,
        logo_url: logoUrl,
        favicon_url: faviconUrl,
        social_links: socials,
        custom_head_scripts: customHeadScripts
      };

      try {
        await supabase.from('config').update(updateData).eq('id', 1);
      } catch (e) {
        console.warn('Supabase config update fallback:', e);
      }

      // Save locally to immediate config cache
      try {
        const existing = JSON.parse(localStorage.getItem('alv_system_config') || '{}');
        localStorage.setItem('alv_system_config', JSON.stringify({ ...existing, ...updateData }));
      } catch (e) {}

      if (loadConfig) await loadConfig();
      alert('✅ ¡Personalización de textos, banner, botones y marca guardados con éxito!');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddApiIntegration = async (e) => {
    e.preventDefault();
    if (!newApiName || !newApiEndpoint) return;

    try {
      const { data, error } = await supabase.from('supplier_integrations').insert({
        name: newApiName,
        endpoint_url: newApiEndpoint,
        http_method: newApiMethod,
        is_active: true
      }).select().single();

      if (error) throw error;

      setIntegrations([data, ...integrations]);
      setNewApiName('');
      setNewApiEndpoint('');
      alert('¡Conector de API de proveedor agregado exitosamente!');
    } catch (err) {
      alert('Error agregando API: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '780px' }}>
      <div>
        <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Marca, Personalización Visual & SEO</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Cambia los colores del sistema en tiempo real, logotipos, enlaces sociales y conecta APIs sin tocar código
        </p>
      </div>

      <form onSubmit={handleSaveBranding} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* 1. Dynamic Theme Color Pickers */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-cyan)' }}>
          <h4 style={{ fontSize: '1.05rem', marginBottom: '8px', color: 'var(--accent-cyan)' }}>
            🎨 Personalización de Colores en Tiempo Real
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Selecciona la paleta visual de la tienda. El cambio se aplicará instantáneamente en toda la aplicación:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {/* Color 1: Background (Negro Carbón) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '8px' }}>
                ⬛ Color de Fondo (Negro Carbón)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  style={{ width: '44px', height: '44px', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'none' }}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>{bgColor}</span>
              </div>
            </div>

            {/* Color 2: Primary (Azul Marino) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '8px' }}>
                🟦 Color Primario (Azul Marino)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{ width: '44px', height: '44px', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'none' }}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>{primaryColor}</span>
              </div>
            </div>

            {/* Color 3: Accent (Cyan Neón) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '8px' }}>
                🔷 Acento / Botones (Cyan Neón)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  style={{ width: '44px', height: '44px', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'none' }}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: accentColor }}>{accentColor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Banner Principal & Textos de Catálogo */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
          <h4 style={{ fontSize: '1.05rem', marginBottom: '8px', color: 'var(--accent-cyan)' }}>
            🖼️ Banner Principal de Inicio & Textos del Catálogo
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Personaliza el título de la tienda, la descripción, la imagen de fondo y el texto de los botones del catálogo:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '700' }}>
                Título Principal del Banner:
              </label>
              <input
                type="text"
                value={siteTitle}
                onChange={(e) => setSiteTitle(e.target.value)}
                placeholder="ALVSHOP - Recargas y Bienes Digitales"
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '700' }}>
                Subtítulo / Descripción del Banner:
              </label>
              <textarea
                rows={2}
                value={siteTagline}
                onChange={(e) => setSiteTagline(e.target.value)}
                placeholder="Diamantes Free Fire, Pines Digitales, Cuentas Streaming..."
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '700' }}>
                  URL Imagen de Fondo del Banner:
                </label>
                <input
                  type="text"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="/gamer-banner.jpg o https://..."
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '700' }}>
                  Texto del Botón en Tarjetas de Categoría:
                </label>
                <input
                  type="text"
                  value={categoryButtonText}
                  onChange={(e) => setCategoryButtonText(e.target.value)}
                  placeholder="Explorar Productos"
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Logo & Favicon Management */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
          <h4 style={{ fontSize: '1.05rem', marginBottom: '14px' }}>🖼️ Gestión de Logotipo y Favicon</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>URL del Logo Principal</label>
              <input
                type="text"
                placeholder="https://misitio.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>URL del Favicon (Ícono Pestaña)</label>
              <input
                type="text"
                placeholder="https://misitio.com/favicon.ico"
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </div>

        {/* 4. Social Media Links */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
          <h4 style={{ fontSize: '1.05rem', marginBottom: '14px' }}>📱 Módulo de Redes Sociales (Alimenta la Comunidad)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>💬 WhatsApp (Número con código)</label>
              <input
                type="text"
                placeholder="50243130763"
                value={socials.whatsapp || ''}
                onChange={(e) => setSocials({ ...socials, whatsapp: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>📸 Instagram (URL Perfil)</label>
              <input
                type="text"
                placeholder="https://instagram.com/alvshop"
                value={socials.instagram || ''}
                onChange={(e) => setSocials({ ...socials, instagram: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>🎵 TikTok (URL)</label>
              <input
                type="text"
                placeholder="https://tiktok.com/@alvshop"
                value={socials.tiktok || ''}
                onChange={(e) => setSocials({ ...socials, tiktok: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>📘 Facebook (URL Página)</label>
              <input
                type="text"
                placeholder="https://facebook.com/alvshop"
                value={socials.facebook || ''}
                onChange={(e) => setSocials({ ...socials, facebook: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </div>

        {/* 4. SEO & Script Injection (Meta Pixel, Google Ads) */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
          <h4 style={{ fontSize: '1.05rem', marginBottom: '8px' }}>🎯 Módulo de Inyección SEO & Scripts de Pauta (Ads)</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Pega aquí tus etiquetas &lt;meta&gt;, Meta Pixel ID o scripts de Google Ads directamente en el &lt;head&gt;:
          </p>
          <textarea
            rows="4"
            placeholder="<!-- Meta Pixel Code --> <script>...</script>"
            value={customHeadScripts}
            onChange={(e) => setCustomHeadScripts(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#a5f3fc', fontFamily: 'monospace', fontSize: '0.8rem' }}
          />
        </div>

        <button type="submit" disabled={saving} className="btn-cyan" style={{ padding: '14px', fontSize: '0.95rem' }}>
          {saving ? 'Guardando...' : '💾 Guardar Todo el Branding y Colores'}
        </button>
      </form>

      {/* 5. No-Code API Connector */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
        <h4 style={{ fontSize: '1.05rem', marginBottom: '8px' }}>🔌 Conector No-Code de APIs (Proveedores Externos)</h4>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Integra proveedores de recargas automatizadas sin necesidad de tocar el código:
        </p>

        <form onSubmit={handleAddApiIntegration} style={{ display: 'grid', gridTemplateColumns: '2fr 3fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            required
            placeholder="Nombre Proveedor"
            value={newApiName}
            onChange={(e) => setNewApiName(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
          />
          <input
            type="url"
            required
            placeholder="https://api.proveedor.com/recharge"
            value={newApiEndpoint}
            onChange={(e) => setNewApiEndpoint(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
          />
          <select
            value={newApiMethod}
            onChange={(e) => setNewApiMethod(e.target.value)}
            style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
          >
            <option value="POST">POST</option>
            <option value="GET">GET</option>
          </select>
          <button type="submit" className="btn-cyan" style={{ padding: '8px', fontSize: '0.8rem' }}>
            ➕ Conectar
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {integrations.map((api) => (
            <div key={api.id} style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{api.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>{api.http_method} • {api.endpoint_url}</div>
              </div>
              <span className="badge-cyan" style={{ fontSize: '0.65rem' }}>🟢 Conectado</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
