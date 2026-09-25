import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AlertContext = createContext();

export function AlertProvider({ children }) {
  const [alertConfig, setAlertConfig] = useState(null);

  const showAlert = useCallback(({
    title = 'Notificación',
    message = '',
    type = 'info', // 'success', 'error', 'warning', 'info', 'confirm'
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    onConfirm = null,
    onCancel = null
  }) => {
    return new Promise((resolve) => {
      setAlertConfig({
        title,
        message,
        type,
        confirmText,
        cancelText,
        onConfirm: () => {
          setAlertConfig(null);
          if (onConfirm) onConfirm();
          resolve(true);
        },
        onCancel: () => {
          setAlertConfig(null);
          if (onCancel) onCancel();
          resolve(false);
        }
      });
    });
  }, []);

  const showSuccess = useCallback((message, title = '¡Operación Exitosa!') => {
    return showAlert({ title, message, type: 'success' });
  }, [showAlert]);

  const showError = useCallback((message, title = 'Atención') => {
    return showAlert({ title, message, type: 'error' });
  }, [showAlert]);

  const showConfirm = useCallback((message, title = '¿Confirmar Acción?') => {
    return showAlert({ title, message, type: 'confirm' });
  }, [showAlert]);

  // Expose to window and gracefully route window.alert to custom modal
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.alvAlert = showSuccess;
    window.alvError = showError;
    window.alvConfirm = showConfirm;

    // Intercept native browser alert
    window.alert = (msg) => {
      const text = String(msg || '');
      let alertType = 'info';
      let alertTitle = 'ALVSHOP';

      if (text.includes('✅') || text.toLowerCase().includes('éxito') || text.toLowerCase().includes('exitosamente') || text.toLowerCase().includes('guardado')) {
        alertType = 'success';
        alertTitle = '¡Operación Exitosa!';
      } else if (text.includes('❌') || text.toLowerCase().includes('error') || text.toLowerCase().includes('falló') || text.toLowerCase().includes('incorrect')) {
        alertType = 'error';
        alertTitle = 'Atención';
      } else if (text.includes('⚠️') || text.toLowerCase().includes('aviso') || text.toLowerCase().includes('advertencia')) {
        alertType = 'warning';
        alertTitle = 'Aviso Importante';
      }

      showAlert({
        title: alertTitle,
        message: text,
        type: alertType
      });
    };
  }, [showAlert, showSuccess, showError, showConfirm]);

  const getTypeStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          icon: '✅',
          color: '#34d399',
          border: '1px solid rgba(52, 211, 153, 0.4)',
          glow: '0 0 30px rgba(52, 211, 153, 0.25)',
          btnClass: 'btn-cyan'
        };
      case 'error':
        return {
          icon: '❌',
          color: '#f87171',
          border: '1px solid rgba(248, 113, 113, 0.4)',
          glow: '0 0 30px rgba(248, 113, 113, 0.25)',
          btnClass: 'btn-glass'
        };
      case 'warning':
        return {
          icon: '⚠️',
          color: '#fbbf24',
          border: '1px solid rgba(251, 191, 36, 0.4)',
          glow: '0 0 30px rgba(251, 191, 36, 0.25)',
          btnClass: 'btn-cyan'
        };
      case 'confirm':
        return {
          icon: '❓',
          color: 'var(--accent-cyan)',
          border: '1px solid var(--border-cyan)',
          glow: '0 0 30px rgba(6, 182, 212, 0.25)',
          btnClass: 'btn-cyan'
        };
      default:
        return {
          icon: '💡',
          color: 'var(--accent-cyan)',
          border: '1px solid var(--border-cyan)',
          glow: '0 0 30px rgba(6, 182, 212, 0.25)',
          btnClass: 'btn-cyan'
        };
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, showSuccess, showError, showConfirm }}>
      {children}

      {alertConfig && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(5, 8, 14, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {(() => {
            const style = getTypeStyles(alertConfig.type);
            const isConfirm = alertConfig.type === 'confirm';

            return (
              <div className="glass-panel animate-fade" style={{
                width: '100%',
                maxWidth: '440px',
                borderRadius: 'var(--radius-lg)',
                border: style.border,
                boxShadow: style.glow,
                padding: '26px 24px',
                background: 'linear-gradient(145deg, rgba(13, 17, 26, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%)',
                textAlign: 'center',
                position: 'relative'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  margin: '0 auto 14px auto',
                  border: style.border
                }}>
                  {style.icon}
                </div>

                <h3 style={{
                  fontSize: '1.2rem',
                  margin: '0 0 10px 0',
                  color: style.color,
                  fontWeight: '800'
                }}>
                  {alertConfig.title}
                </h3>

                <div style={{
                  fontSize: '0.88rem',
                  color: '#cbd5e1',
                  lineHeight: '1.5',
                  marginBottom: '22px',
                  whiteSpace: 'pre-line'
                }}>
                  {alertConfig.message}
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  {isConfirm && (
                    <button
                      type="button"
                      onClick={alertConfig.onCancel}
                      className="btn-glass"
                      style={{
                        flex: 1,
                        padding: '12px 18px',
                        fontSize: '0.88rem',
                        fontWeight: '700'
                      }}
                    >
                      {alertConfig.cancelText}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={alertConfig.onConfirm}
                    className="btn-cyan"
                    style={{
                      flex: 1,
                      padding: '12px 18px',
                      fontSize: '0.88rem',
                      fontWeight: '800',
                      background: alertConfig.type === 'error' ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : undefined,
                      color: '#fff',
                      boxShadow: '0 0 15px rgba(6, 182, 212, 0.3)'
                    }}
                  >
                    {alertConfig.confirmText}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    return {
      showAlert: ({ message }) => alert(message),
      showSuccess: (message) => alert(message),
      showError: (message) => alert(message),
      showConfirm: (message) => Promise.resolve(confirm(message))
    };
  }
  return context;
}
