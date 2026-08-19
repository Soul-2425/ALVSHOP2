import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';

export default function Feed() {
  const { user, profile, config } = useApp();
  const [posts, setPosts] = useState([]);
  const [newPostText, setNewPostText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadFeed() {
      setLoading(true);
      const { data, error } = await supabase
        .from('feed_posts')
        .select('*, profiles(full_name), feed_comments(*, profiles(full_name)), feed_likes(user_id)')
        .order('created_at', { ascending: false });

      if (data && !error && data.length > 0) {
        setPosts(data);
      } else {
        // Sample community posts
        setPosts([
          {
            id: 'p1',
            title: '🔥 ¡Nuevos Pases de Free Fire Disponibles!',
            content: 'Ya tenemos activo el nuevo evento con 10% de diamantes extra en todas las recargas superiores a 500 diamantes. ¡Aprovechen!',
            media_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
            likes_count: 24,
            created_at: '2026-08-18T18:00:00Z',
            profiles: { full_name: 'Admin ALV' },
            feed_comments: [
              { id: 'c1', content: '¿Aceptan Banrural?', profiles: { full_name: 'Manuel R.' } },
              { id: 'c2', content: 'Sí, las transferencias en Quetzales se aprueban en minutos.', profiles: { full_name: 'Admin ALV' } }
            ]
          },
          {
            id: 'p2',
            title: '🎬 Cuentas de Netflix & Disney+ Renovadas',
            content: 'Se cargaron más de 50 perfiles nuevos con garantía de 30 días. Recuerden ingresar a su perfil para ver sus credenciales una vez completada la compra.',
            likes_count: 18,
            created_at: '2026-08-17T20:15:00Z',
            profiles: { full_name: 'Soporte ALV' },
            feed_comments: []
          }
        ]);
      }
      setLoading(false);
    }

    loadFeed();
  }, []);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Debes iniciar sesión para publicar en la comunidad.');
      return;
    }
    if (!newPostText.trim()) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.from('feed_posts').insert({
        user_id: user.id,
        content: newPostText
      }).select('*, profiles(full_name)').single();

      if (data && !error) {
        setPosts([ { ...data, feed_comments: [], feed_likes: [] }, ...posts ]);
        setNewPostText('');
      }
    } catch (err) {
      alert('Error creando post: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const socials = config.social_links || {};

  return (
    <div className="container" style={{ paddingTop: '20px', maxWidth: '680px' }}>
      {/* Social Links Ribbon */}
      <div className="glass-panel" style={{
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        marginBottom: '24px',
        border: '1px solid var(--border-cyan)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>
          📱 Únete a Nuestra Comunidad:
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {socials.whatsapp && (
            <a href={`https://wa.me/${socials.whatsapp}`} target="_blank" rel="noreferrer" style={{ fontSize: '1.4rem' }} title="WhatsApp">
              💬
            </a>
          )}
          {socials.instagram && (
            <a href={socials.instagram} target="_blank" rel="noreferrer" style={{ fontSize: '1.4rem' }} title="Instagram">
              📸
            </a>
          )}
          {socials.tiktok && (
            <a href={socials.tiktok} target="_blank" rel="noreferrer" style={{ fontSize: '1.4rem' }} title="TikTok">
              🎵
            </a>
          )}
          {socials.facebook && (
            <a href={socials.facebook} target="_blank" rel="noreferrer" style={{ fontSize: '1.4rem' }} title="Facebook">
              📘
            </a>
          )}
        </div>
      </div>

      {/* Create Post Input */}
      {user && (
        <form onSubmit={handleCreatePost} className="glass-panel" style={{
          borderRadius: 'var(--radius-lg)',
          padding: '18px',
          marginBottom: '24px',
          border: '1px solid var(--border-glass)'
        }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '10px' }}>Comparte algo con la comunidad:</h4>
          <textarea
            rows="3"
            placeholder="¿Qué juego estás jugando hoy? ¿Dudas o comentarios?"
            value={newPostText}
            onChange={(e) => setNewPostText(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: '#0d111a',
              border: '1px solid var(--border-glass)',
              color: '#fff',
              marginBottom: '10px',
              fontSize: '0.9rem'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={submitting} className="btn-cyan" style={{ fontSize: '0.85rem', padding: '8px 20px' }}>
              {submitting ? 'Publicando...' : 'Publicar ➔'}
            </button>
          </div>
        </form>
      )}

      {/* Feed List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {posts.map((post) => (
          <div key={post.id} className="glass-panel" style={{
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            border: '1px solid var(--border-glass)'
          }}>
            {/* Author */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary-navy) 0%, var(--accent-cyan) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                color: '#fff'
              }}>
                {(post.profiles?.full_name || 'U')[0]}
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{post.profiles?.full_name || 'Usuario ALV'}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {new Date(post.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            {post.title && <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>{post.title}</h3>}
            <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '14px' }}>
              {post.content}
            </p>

            {post.media_url && (
              <img
                src={post.media_url}
                alt="Post Media"
                style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}
              />
            )}

            {/* Interactions Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-glass)',
              fontSize: '0.85rem',
              color: 'var(--text-muted)'
            }}>
              <button style={{ background: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <span style={{ color: '#f87171' }}>❤️</span> {post.likes_count || 0} Me gusta
              </button>
              <button style={{ background: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <span>💬</span> {post.feed_comments?.length || 0} Comentarios
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
