import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import { notifyAdminFeedInteraction } from '../../notificaciones y apis/notificaciones/pushService';
import { soundEffects } from '../services/soundEffects';

export default function Feed() {
  const { user, profile, config } = useApp();
  const [posts, setPosts] = useState([]);
  const [newPostText, setNewPostText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentInputs, setCommentInputs] = useState({});
  const [activeCommentBox, setActiveCommentBox] = useState(null);

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
            ],
            feed_likes: []
          },
          {
            id: 'p2',
            title: '🎬 Cuentas de Netflix & Disney+ Renovadas',
            content: 'Se cargaron más de 50 perfiles nuevos con garantía de 30 días. Recuerden ingresar a su perfil para ver sus credenciales una vez completada la compra.',
            likes_count: 18,
            created_at: '2026-08-17T20:15:00Z',
            profiles: { full_name: 'Soporte ALV' },
            feed_comments: [],
            feed_likes: []
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

        // Notify Admins
        notifyAdminFeedInteraction({
          type: 'comment',
          userName: profile?.full_name || user.email,
          content: `Nueva publicación: "${newPostText.slice(0, 50)}"`,
          postId: data.id
        });
      }
    } catch (err) {
      alert('Error creando post: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async (postId) => {
    if (!user) {
      alert('Inicia sesión para dar like.');
      return;
    }

    soundEffects.playFeedInteractionSound();

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const hasLiked = p.feed_likes?.some(l => l.user_id === user.id);
        const newLikes = hasLiked
          ? p.feed_likes.filter(l => l.user_id !== user.id)
          : [...(p.feed_likes || []), { user_id: user.id }];
        return { ...p, feed_likes: newLikes, likes_count: (p.likes_count || 0) + (hasLiked ? -1 : 1) };
      }
      return p;
    }));

    try {
      await supabase.from('feed_likes').insert({ post_id: postId, user_id: user.id });
    } catch {
      // Ignore conflict
    }

    // Trigger Admin Notification
    notifyAdminFeedInteraction({
      type: 'like',
      userName: profile?.full_name || user.email,
      postId: postId
    });
  };

  const handleAddComment = async (postId) => {
    const text = commentInputs[postId];
    if (!user) {
      alert('Inicia sesión para comentar.');
      return;
    }
    if (!text || !text.trim()) return;

    const newCommentObj = {
      id: 'comm-' + Date.now(),
      post_id: postId,
      content: text.trim(),
      profiles: { full_name: profile?.full_name || 'Tú' },
      created_at: new Date().toISOString()
    };

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, feed_comments: [...(p.feed_comments || []), newCommentObj] };
      }
      return p;
    }));

    setCommentInputs(prev => ({ ...prev, [postId]: '' }));

    try {
      await supabase.from('feed_comments').insert({
        post_id: postId,
        user_id: user.id,
        content: text.trim()
      });
    } catch (e) {
      console.warn('Error guardando comentario:', e);
    }

    // Trigger Admin Notification
    notifyAdminFeedInteraction({
      type: 'comment',
      userName: profile?.full_name || user.email,
      content: text.trim(),
      postId: postId
    });
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
        {posts.map((post) => {
          const userHasLiked = post.feed_likes?.some(l => l.user_id === user?.id);

          return (
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
                <button
                  onClick={() => handleToggleLike(post.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: userHasLiked ? '#f87171' : 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontWeight: userHasLiked ? '700' : 'normal'
                  }}
                >
                  <span>{userHasLiked ? '❤️' : '🤍'}</span> {post.likes_count || post.feed_likes?.length || 0} Me gusta
                </button>
                <button
                  onClick={() => setActiveCommentBox(activeCommentBox === post.id ? null : post.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <span>💬</span> {post.feed_comments?.length || 0} Comentarios
                </button>
              </div>

              {/* Comments Section */}
              {activeCommentBox === post.id && (
                <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                  {post.feed_comments && post.feed_comments.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                      {post.feed_comments.map((comm) => (
                        <div key={comm.id} style={{
                          background: 'rgba(255,255,255,0.03)',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8rem'
                        }}>
                          <strong style={{ color: 'var(--accent-cyan)' }}>{comm.profiles?.full_name || 'Usuario'}: </strong>
                          {comm.content}
                        </div>
                      ))}
                    </div>
                  )}

                  {user && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Escribe un comentario..."
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: '#0d111a',
                          border: '1px solid var(--border-glass)',
                          color: '#fff',
                          fontSize: '0.8rem'
                        }}
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        className="btn-cyan"
                        style={{ padding: '8px 14px', fontSize: '0.78rem' }}
                      >
                        Comentar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
