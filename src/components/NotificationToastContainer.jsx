import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function NotificationToastContainer() {
  const { notifications, removeNotification, isMuted, toggleMute } = useApp();
  const navigate = useNavigate();

  if (!notifications || notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '380px',
      width: 'calc(100% - 40px)',
      pointerEvents: 'none'
    }}>
      {notifications.map((notif) => {
        const isOrder = notif.type === 'order_completed' || notif.type === 'admin_new_order';
        const isSupport = notif.type === 'support_reply' || notif.type === 'admin_support_message';
        const isFeed = notif.type === 'feed_interaction';

        let borderColor = 'var(--border-cyan)';
        let glowColor = 'rgba(6, 182, 212, 0.35)';
        let badgeIcon = '🔔';

        if (notif.type === 'order_completed') {
          borderColor = '#10b981';
          glowColor = 'rgba(16, 185, 129, 0.4)';
          badgeIcon = '🎉';
        } else if (notif.type === 'admin_new_order') {
          borderColor = '#f59e0b';
          glowColor = 'rgba(245, 158, 11, 0.4)';
          badgeIcon = '🛒';
        } else if (isSupport) {
          borderColor = '#38bdf8';
          glowColor = 'rgba(56, 189, 248, 0.4)';
          badgeIcon = '💬';
        } else if (isFeed) {
          borderColor = '#ec4899';
          glowColor = 'rgba(236, 72, 153, 0.4)';
          badgeIcon = '❤️';
        }

        return (
          <div
            key={notif.id}
            style={{
              pointerEvents: 'auto',
              background: 'linear-gradient(135deg, rgba(10, 13, 20, 0.95) 0%, rgba(30, 58, 138, 0.85) 100%)',
              backdropFilter: 'blur(16px)',
              border: `1px solid ${borderColor}`,
              boxShadow: `0 8px 32px 0 ${glowColor}`,
              borderRadius: 'var(--radius-lg)',
              padding: '14px 16px',
              color: '#fff',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              transition: 'all 0.2s ease',
              cursor: notif.metadata?.url ? 'pointer' : 'default'
            }}
            onClick={() => {
              if (notif.metadata?.url) {
                navigate(notif.metadata.url);
                removeNotification(notif.id);
              }
            }}
          >
            {/* Notification Icon Badge */}
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: `1px solid ${borderColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              flexShrink: 0
            }}>
              {badgeIcon}
            </div>

            {/* Notification Details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: borderColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {notif.title}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(notif.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: 0,
                    lineHeight: 1
                  }}
                  title="Cerrar"
                >
                  ✕
                </button>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '3px', lineHeight: 1.35 }}>
                {notif.body}
              </div>

              {notif.metadata?.url && (
                <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', marginTop: '6px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Ver detalle</span> ➔
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
