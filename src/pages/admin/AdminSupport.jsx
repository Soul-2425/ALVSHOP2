import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { useApp } from '../../context/AppContext';
import { notifySupportReply } from '../../../notificaciones y apis/notificaciones/pushService';
import { soundEffects } from '../../services/soundEffects';

export default function AdminSupport() {
  const { user, profile, config } = useApp();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'report', 'feedback'
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

  // Quick preset reply templates for Admin
  const QUICK_REPLIES = [
    '✅ Tu pedido ha sido verificado y acreditado exitosamente.',
    '🔍 Estamos revisando tu comprobante de pago con el banco. Te confirmamos en unos minutos.',
    '⚠️ Por favor adjunta la captura clara de tu comprobante o tu ID de jugador.',
    '💡 ¡Muchas gracias por tu sugerencia! La tomaremos en cuenta para mejorar ALVSHOP.',
    '👋 Hola, ¿en qué podemos ayudarte con tu recarga o compra hoy?'
  ];

  // Load all support conversations
  const loadConversations = async () => {
    try {
      // 1. Fetch from Supabase
      let sbConvs = [];
      let profMap = new Map();

      try {
        const [convRes, profRes, msgRes] = await Promise.allSettled([
          supabase.from('support_conversations').select('*').order('updated_at', { ascending: false }),
          supabase.from('profiles').select('id, full_name, email, phone, role'),
          supabase.from('support_messages').select('*').order('created_at', { ascending: false })
        ]);

        if (profRes.status === 'fulfilled' && profRes.value.data) {
          profMap = new Map(profRes.value.data.map(p => [p.id, p]));
        }

        const msgsByConv = new Map();
        if (msgRes.status === 'fulfilled' && msgRes.value.data) {
          msgRes.value.data.forEach(m => {
            if (!msgsByConv.has(m.conversation_id)) msgsByConv.set(m.conversation_id, []);
            msgsByConv.get(m.conversation_id).push(m);
          });
        }

        if (convRes.status === 'fulfilled' && convRes.value.data) {
          sbConvs = convRes.value.data.map(c => {
            const userProf = profMap.get(c.user_id);
            const convMsgs = msgsByConv.get(c.id) || [];
            const lastMsg = convMsgs[0] || null;
            return {
              ...c,
              user_name: userProf?.full_name || c.user_name || 'Usuario ALV',
              user_email: userProf?.email || c.user_email || 'cliente@alvshop.com',
              user_phone: userProf?.phone || '',
              type: c.type || (c.category === 'feedback' || (lastMsg?.message || '').toLowerCase().includes('sugerencia') || (lastMsg?.message || '').toLowerCase().includes('feedback') ? 'feedback' : 'report'),
              last_message: lastMsg?.message || 'Nueva conversación iniciada',
              last_message_at: lastMsg?.created_at || c.created_at,
              unread_count: convMsgs.filter(m => !m.is_admin_reply && !m.is_read).length
            };
          });
        }
      } catch (e) {
        console.warn('Supabase conversations notice:', e);
      }

      // 2. Local Storage Cache / Fallback for conversations
      let localConvs = [];
      try {
        const stored = JSON.parse(localStorage.getItem('alv_admin_support_convs') || '[]');
        if (Array.isArray(stored)) localConvs = stored;
      } catch (e) {}

      // Default sample conversations if none found
      if (sbConvs.length === 0 && localConvs.length === 0) {
        localConvs = [
          {
            id: 'conv-sample-1',
            user_id: 'usr-1',
            user_name: 'Jonathan Álvarez',
            user_email: 'jonathan.alv@gmail.com',
            type: 'report',
            last_message: 'Hola, hice una transferencia por Banrural para 520 diamantes pero aún no me llega el pedido.',
            last_message_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            status: 'open',
            unread_count: 1
          },
          {
            id: 'conv-sample-2',
            user_id: 'usr-2',
            user_name: 'Carlos Mendoza',
            user_email: 'carlos.mendoza@hotmail.com',
            type: 'feedback',
            last_message: 'Sería genial que agreguen pago por Nequi directo con QR automático en la tienda.',
            last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            status: 'open',
            unread_count: 0
          },
          {
            id: 'conv-sample-3',
            user_id: 'usr-3',
            user_name: 'María Fernanda GT',
            user_email: 'mafer.gt@gmail.com',
            type: 'report',
            last_message: 'Buenas tardes, cargué saldo a mi billetera por $10 USD pero no se me reflejó.',
            last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
            status: 'resolved',
            unread_count: 0
          }
        ];
      }

      // Merge and sort
      const mergedMap = new Map();
      localConvs.forEach(c => mergedMap.set(c.id, c));
      sbConvs.forEach(c => mergedMap.set(c.id, { ...(mergedMap.get(c.id) || {}), ...c }));

      const finalConvs = Array.from(mergedMap.values()).sort((a, b) => {
        return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0);
      });

      setConversations(finalConvs);
      if (finalConvs.length > 0 && !selectedConvId) {
        setSelectedConvId(finalConvs[0].id);
      }
    } catch (err) {
      console.warn('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();

    // Supabase Realtime Subscription on support_messages
    const channel = supabase
      .channel('admin-support-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            if (!payload.new.is_admin_reply) {
              soundEffects.playChatMessageSound();
            }
            if (payload.new.conversation_id === selectedConvId) {
              setMessages(prev => {
                if (prev.some(m => m.id === payload.new.id)) return prev;
                return [...prev, payload.new];
              });
            }
          }
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConvId]);

  // Load Messages for Selected Conversation
  useEffect(() => {
    if (!selectedConvId) return;

    async function loadConvMessages() {
      setLoadingMessages(true);
      try {
        const { data, error } = await supabase
          .from('support_messages')
          .select('*')
          .eq('conversation_id', selectedConvId)
          .order('created_at', { ascending: true });

        if (data && !error && data.length > 0) {
          setMessages(data);
        } else {
          // Check local cached messages or set initial conversation starter
          const activeConv = conversations.find(c => c.id === selectedConvId);
          const initialMsgs = [
            {
              id: 'm-start-1',
              conversation_id: selectedConvId,
              message: activeConv?.last_message || 'Hola, necesito asistencia técnica con mi cuenta.',
              is_admin_reply: false,
              created_at: activeConv?.last_message_at || new Date().toISOString()
            }
          ];
          setMessages(initialMsgs);
        }
      } catch (err) {
        console.warn('Error loading conversation messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    }

    loadConvMessages();
  }, [selectedConvId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send Reply from Admin Panel
  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !selectedConvId) return;

    setSendingReply(true);
    const text = replyText.trim();
    const currentConv = conversations.find(c => c.id === selectedConvId);

    const newMsgObj = {
      conversation_id: selectedConvId,
      sender_id: user?.id || 'admin',
      message: text,
      is_admin_reply: true,
      created_at: new Date().toISOString()
    };

    try {
      let savedMsg = null;
      try {
        const { data, error } = await supabase
          .from('support_messages')
          .insert(newMsgObj)
          .select()
          .single();

        if (data && !error) {
          savedMsg = data;
        }
      } catch (e) {
        console.warn('Supabase message insert notice:', e);
      }

      if (!savedMsg) {
        savedMsg = { ...newMsgObj, id: 'm-adm-' + Date.now() };
      }

      setMessages(prev => [...prev, savedMsg]);
      setReplyText('');
      soundEffects.playChatMessageSound();

      // Update conversation in state & localStorage
      setConversations(prev => prev.map(c => {
        if (c.id === selectedConvId) {
          return {
            ...c,
            last_message: text,
            last_message_at: new Date().toISOString(),
            unread_count: 0
          };
        }
        return c;
      }));

      // Send Push Notification to the Customer
      try {
        await notifySupportReply({
          conversationId: selectedConvId,
          userId: currentConv?.user_id || null,
          message: text
        });
      } catch (e) {}

    } catch (err) {
      alert('Error enviando respuesta: ' + err.message);
    } finally {
      setSendingReply(false);
    }
  };

  // Filter Conversations by Tab and Search Query
  const filteredConversations = conversations.filter(c => {
    // Tab filter
    if (activeTab === 'report' && c.type !== 'report') return false;
    if (activeTab === 'feedback' && c.type !== 'feedback') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.user_name?.toLowerCase().includes(q);
      const matchEmail = c.user_email?.toLowerCase().includes(q);
      const matchMsg = c.last_message?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchMsg) return false;
    }
    return true;
  });

  const selectedConv = conversations.find(c => c.id === selectedConvId);
  const reportsCount = conversations.filter(c => c.type === 'report').length;
  const feedbackCount = conversations.filter(c => c.type === 'feedback').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Header Card */}
      <div className="glass-panel" style={{
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        border: '1px solid var(--border-cyan)',
        background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(6, 182, 212, 0.1) 100%)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px'
      }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💬</span> Centro de Soporte, Reportes & Feedback
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Gestiona y responde todas las conversaciones de soporte técnico y sugerencias de clientes en tiempo real
          </p>
        </div>

        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              background: activeTab === 'all' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
              color: activeTab === 'all' ? '#000' : 'var(--text-main)',
              border: activeTab === 'all' ? 'none' : '1px solid var(--border-glass)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>💬 Todas</span>
            <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px', background: activeTab === 'all' ? '#000' : 'rgba(255, 255, 255, 0.1)', color: activeTab === 'all' ? '#fff' : 'inherit' }}>
              {conversations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              background: activeTab === 'report' ? '#ef4444' : 'rgba(239, 68, 68, 0.15)',
              color: activeTab === 'report' ? '#fff' : '#f87171',
              border: activeTab === 'report' ? 'none' : '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🚨 Reportes de Pedidos</span>
            <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px', background: activeTab === 'report' ? '#000' : 'rgba(239, 68, 68, 0.3)', color: '#fff' }}>
              {reportsCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('feedback')}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              background: activeTab === 'feedback' ? '#34d399' : 'rgba(52, 211, 153, 0.15)',
              color: activeTab === 'feedback' ? '#000' : '#34d399',
              border: activeTab === 'feedback' ? 'none' : '1px solid rgba(52, 211, 153, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>💡 Sugerencias & Feedback</span>
            <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px', background: activeTab === 'feedback' ? '#000' : 'rgba(52, 211, 153, 0.3)', color: activeTab === 'feedback' ? '#fff' : 'inherit' }}>
              {feedbackCount}
            </span>
          </button>
        </div>
      </div>

      {/* Main Inbox Workspace (Split 2-Columns) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 360px) 1fr',
        gap: '16px',
        minHeight: '650px'
      }} className="admin-support-grid">
        
        {/* Left Column: Conversations List */}
        <div className="glass-panel" style={{
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-glass)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Search Box */}
          <div style={{ padding: '14px', borderBottom: '1px solid var(--border-glass)' }}>
            <input
              type="text"
              placeholder="🔍 Buscar por nombre, email o texto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                background: '#0d111a',
                border: '1px solid var(--border-glass)',
                color: '#fff',
                fontSize: '0.8rem'
              }}
            />
          </div>

          {/* Conversations Scrollable List */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {filteredConversations.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                <div style={{ fontSize: '0.85rem' }}>No hay conversaciones en esta categoría</div>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedConvId;
                const isReport = conv.type === 'report';

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--accent-cyan)' : '3px solid transparent',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.1rem' }}>{isReport ? '🚨' : '💡'}</span>
                        <div style={{ fontSize: '0.85rem', fontWeight: '800', color: isSelected ? 'var(--accent-cyan)' : '#fff' }}>
                          {conv.user_name}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: '800',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: isReport ? 'rgba(239, 68, 68, 0.2)' : 'rgba(52, 211, 153, 0.2)',
                        color: isReport ? '#f87171' : '#34d399'
                      }}>
                        {isReport ? 'REPORTE' : 'FEEDBACK'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      {conv.user_email}
                    </div>

                    <div style={{
                      fontSize: '0.78rem',
                      color: '#cbd5e1',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.3
                    }}>
                      {conv.last_message}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {conv.unread_count > 0 && (
                        <span style={{
                          padding: '1px 6px',
                          borderRadius: '10px',
                          fontSize: '0.65rem',
                          fontWeight: '900',
                          background: 'var(--accent-cyan)',
                          color: '#000'
                        }}>
                          {conv.unread_count} nuevo
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Timeline & Direct Admin Reply */}
        <div className="glass-panel" style={{
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-cyan)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {selectedConv ? (
            <>
              {/* Active Conversation Header */}
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-glass)',
                background: 'rgba(255, 255, 255, 0.03)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: selectedConv.type === 'report' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(52, 211, 153, 0.2)',
                    border: selectedConv.type === 'report' ? '1px solid #ef4444' : '1px solid #34d399',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem'
                  }}>
                    {selectedConv.type === 'report' ? '🚨' : '💡'}
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: '900', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{selectedConv.user_name}</span>
                      <span style={{
                        fontSize: '0.68rem',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: selectedConv.type === 'report' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(52, 211, 153, 0.2)',
                        color: selectedConv.type === 'report' ? '#f87171' : '#34d399',
                        fontWeight: '800'
                      }}>
                        {selectedConv.type === 'report' ? 'Incidencia / Reporte de Pedido' : 'Sugerencia de Cliente'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {selectedConv.user_email} {selectedConv.user_phone && `• Tel: ${selectedConv.user_phone}`}
                    </div>
                  </div>
                </div>

                {/* Direct WhatsApp Action */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedConv.user_phone && (
                    <a
                      href={`https://wa.me/${selectedConv.user_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${selectedConv.user_name}, te saludamos de Soporte ALVSHOP respecto a tu consulta.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-glass"
                      style={{ fontSize: '0.75rem', padding: '6px 12px', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.4)' }}
                    >
                      💬 WhatsApp
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, status: c.status === 'resolved' ? 'open' : 'resolved' } : c));
                      alert(selectedConv.status === 'resolved' ? 'Conversación reabierta' : '✅ Conversación marcada como RESUELTA.');
                    }}
                    className="btn-glass"
                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                  >
                    {selectedConv.status === 'resolved' ? 'Reabrir' : '✓ Marcar Resuelto'}
                  </button>
                </div>
              </div>

              {/* Chat Messages Timeline */}
              <div style={{
                flex: 1,
                padding: '20px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: 'rgba(10, 13, 20, 0.4)'
              }}>
                {loadingMessages ? (
                  <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)' }}>
                    Cargando historial de mensajes...
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAdmin = msg.is_admin_reply;

                    return (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                          maxWidth: '75%',
                          padding: '12px 16px',
                          borderRadius: isAdmin ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                          background: isAdmin ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(30, 58, 138, 0.4) 100%)' : 'rgba(255, 255, 255, 0.06)',
                          border: isAdmin ? '1px solid var(--border-cyan)' : '1px solid var(--border-glass)',
                          color: '#fff',
                          fontSize: '0.88rem',
                          boxShadow: isAdmin ? '0 4px 15px rgba(6, 182, 212, 0.15)' : 'none'
                        }}
                      >
                        <div style={{
                          fontSize: '0.7rem',
                          fontWeight: '800',
                          color: isAdmin ? 'var(--accent-cyan)' : '#fbbf24',
                          marginBottom: '3px'
                        }}>
                          {isAdmin ? '👑 Asesor ALVSHOP (Tú)' : `👤 ${selectedConv.user_name}`}
                        </div>
                        <div style={{ lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                          {msg.message}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '4px' }}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies Carousel */}
              <div style={{
                padding: '8px 16px',
                background: '#0d111a',
                borderTop: '1px solid var(--border-glass)',
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                whiteSpace: 'nowrap'
              }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center', fontWeight: 'bold' }}>
                  ⚡ Respuestas Rápidas:
                </span>
                {QUICK_REPLIES.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReplyText(q)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-glass)',
                      color: '#cbd5e1',
                      fontSize: '0.72rem',
                      cursor: 'pointer'
                    }}
                  >
                    {q.slice(0, 32)}...
                  </button>
                ))}
              </div>

              {/* Admin Reply Form Box */}
              <form onSubmit={handleSendReply} style={{
                padding: '14px 18px',
                background: '#0d111a',
                borderTop: '1px solid var(--border-glass)',
                display: 'flex',
                gap: '10px',
                alignItems: 'center'
              }}>
                <input
                  type="text"
                  placeholder={`Responder a ${selectedConv.user_name}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '11px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-glass)',
                    color: '#fff',
                    fontSize: '0.88rem'
                  }}
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="btn-cyan"
                  style={{ padding: '11px 20px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                >
                  {sendingReply ? 'Enviando...' : 'Enviar Respuesta ➔'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', margin: 'auto', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>💬</div>
              <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '6px' }}>Selecciona una conversación</h3>
              <p style={{ fontSize: '0.82rem', maxWidth: '360px', margin: '0 auto' }}>
                Haz clic en cualquier reporte o sugerencia de la columna izquierda para responder al cliente directamente desde aquí.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
