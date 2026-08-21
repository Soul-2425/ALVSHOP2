import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import { notifyAdminSupportMessage, notifySupportReply } from '../../notificaciones y apis/notificaciones/pushService';
import { soundEffects } from '../services/soundEffects';

export default function Support() {
  const { user, profile, role, config } = useApp();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(true);

  const normalizedRole = role ? String(role).trim().toLowerCase() : '';
  const isAdmin = normalizedRole === 'admin' || normalizedRole === 'asesor';

  useEffect(() => {
    async function initChat() {
      if (!user) {
        setLoading(false);
        return;
      }

      // Check or create support conversation for this user
      let { data: conv } = await supabase
        .from('support_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!conv) {
        const { data: newConv } = await supabase
          .from('support_conversations')
          .insert({ user_id: user.id })
          .select()
          .single();
        conv = newConv;
      }

      if (conv) {
        setConversationId(conv.id);
        const { data: msgList } = await supabase
          .from('support_messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true });

        if (msgList && msgList.length > 0) {
          setMessages(msgList);
        } else {
          setMessages([
            {
              id: 'm-welcome',
              message: '¡Hola! Bienvenido al soporte técnico de ALVSHOP. ¿En qué podemos ayudarte con tus recargas o pedidos hoy?',
              is_admin_reply: true,
              created_at: new Date().toISOString()
            }
          ]);
        }
      }
      setLoading(false);
    }

    initChat();
  }, [user]);

  // Realtime Supabase Subscription for incoming messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`support_chat_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          if (payload.new) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
            soundEffects.playChatMessageSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !user || !conversationId) return;

    const textToSend = inputMessage.trim();
    const isReplyFromAdmin = isAdmin;

    const userMsg = {
      conversation_id: conversationId,
      sender_id: user.id,
      message: textToSend,
      is_admin_reply: isReplyFromAdmin
    };

    try {
      const { data, error } = await supabase
        .from('support_messages')
        .insert(userMsg)
        .select()
        .single();

      if (data && !error) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data];
        });
        setInputMessage('');

        // Trigger Push Notifications
        if (!isReplyFromAdmin) {
          notifyAdminSupportMessage({
            conversationId: conversationId,
            userName: profile?.full_name || user.email,
            message: textToSend
          });

          // Simulate advisor response if offline/testing
          setTimeout(() => {
            const advisorReply = {
              id: 'm-' + Date.now(),
              message: 'Gracias por escribirnos. Un asesor de ALVSHOP revisará tu pedido en breve.',
              is_admin_reply: true,
              created_at: new Date().toISOString()
            };
            setMessages((prev) => [...prev, advisorReply]);
            soundEffects.playChatMessageSound();
          }, 1200);
        } else {
          notifySupportReply({
            conversationId: conversationId,
            userId: user.id,
            message: textToSend
          });
        }
      }
    } catch (err) {
      alert('Error enviando mensaje: ' + err.message);
    }
  };

  const whatsappNumber = config.social_links?.whatsapp || '50250000000';

  return (
    <div className="container" style={{ paddingTop: '20px', maxWidth: '640px' }}>
      <div className="glass-panel" style={{
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-cyan)',
        display: 'flex',
        flexDirection: 'column',
        height: '75vh',
        overflow: 'hidden'
      }}>
        {/* Chat Header */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(6, 182, 212, 0.15) 100%)',
          borderBottom: '1px solid var(--border-glass)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 8px #10b981'
            }} />
            <div>
              <h3 style={{ fontSize: '1rem', margin: 0 }}>Soporte Técnico en Vivo</h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Asesores ALVSHOP en línea</div>
            </div>
          </div>

          <a
            href={`https://wa.me/${whatsappNumber.replace(/\+/g, '')}?text=${encodeURIComponent('Hola ALVSHOP, necesito soporte con un pedido.')}`}
            target="_blank"
            rel="noreferrer"
            className="btn-cyan"
            style={{ fontSize: '0.75rem', padding: '6px 12px', background: '#25D366', color: '#fff' }}
          >
            💬 WhatsApp Directo
          </a>
        </div>

        {/* Chat Messages Body */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {!user ? (
            <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔒</div>
              <p>Inicia sesión en tu perfil para consultar tus pedidos con el equipo de soporte.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = !msg.is_admin_reply;
              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                    backgroundColor: isMe ? 'var(--primary-navy)' : 'rgba(255, 255, 255, 0.06)',
                    border: isMe ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid var(--border-glass)',
                    color: '#fff',
                    fontSize: '0.88rem',
                    lineHeight: 1.4
                  }}
                >
                  <div style={{ fontSize: '0.7rem', color: isMe ? 'var(--accent-cyan)' : '#fbbf24', fontWeight: '700', marginBottom: '2px' }}>
                    {isMe ? 'Tú' : 'Asesor ALVSHOP'}
                  </div>
                  {msg.message}
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '4px' }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Chat Input */}
        {user && (
          <form onSubmit={handleSendMessage} style={{
            padding: '14px',
            borderTop: '1px solid var(--border-glass)',
            backgroundColor: '#0d111a',
            display: 'flex',
            gap: '8px'
          }}>
            <input
              type="text"
              placeholder="Escribe tu mensaje aquí..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-glass)',
                color: '#fff',
                fontSize: '0.9rem'
              }}
            />
            <button type="submit" className="btn-cyan" style={{ padding: '10px 18px' }}>
              Enviar ➔
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
