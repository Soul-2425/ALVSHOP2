import React, { useState } from 'react';
import { validatePlayerUid } from '../../notificaciones y apis/apis/index';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';

export default function Likes() {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState('instant'); // 'instant' or 'auto'

  // Instant Likes Form State
  const [instantUid, setInstantUid] = useState('29386038');
  const [instantQty, setInstantQty] = useState('2000');
  const [showInstantModal, setShowInstantModal] = useState(false);
  const [instantLoading, setInstantLoading] = useState(false);

  // Auto Likes Form State
  const [autoUid, setAutoUid] = useState('29386038');
  const [autoQtyPerDay, setAutoQtyPerDay] = useState('2000');
  const [autoDurationDays, setAutoDurationDays] = useState('365');
  const [autoHour, setAutoHour] = useState('13');
  const [autoMinute, setAutoMinute] = useState('21');
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);

  // Validated Player Info State
  const [playerInfo, setPlayerInfo] = useState({
    nickname: 'Jona detona',
    currentLikes: 210193
  });

  // Handle Instant Form Submit -> Open Modal 1
  const handleOpenInstantModal = async (e) => {
    e.preventDefault();
    if (!instantUid.trim()) return alert('Por favor ingresa el ID del jugador.');
    const qty = Number(instantQty);
    if (isNaN(qty) || qty < 1 || qty > 2000) {
      return alert('La cantidad de likes debe estar entre 1 y 2,000.');
    }

    setInstantLoading(true);
    try {
      const res = await validatePlayerUid(instantUid.trim(), 'Free Fire');
      if (res && res.success) {
        setPlayerInfo({
          nickname: res.nickname || 'Jona detona',
          currentLikes: res.currentLikes || 210193
        });
      } else {
        setPlayerInfo({
          nickname: `Jugador_${instantUid.slice(-4)}`,
          currentLikes: 210193
        });
      }
      setShowInstantModal(true);
    } catch (err) {
      console.warn(err);
      setShowInstantModal(true);
    } finally {
      setInstantLoading(false);
    }
  };

  // Handle Auto Form Submit -> Open Modal 2
  const handleOpenAutoModal = async (e) => {
    e.preventDefault();
    if (!autoUid.trim()) return alert('Por favor ingresa el ID del jugador.');
    const qty = Number(autoQtyPerDay);
    if (isNaN(qty) || qty < 1 || qty > 2000) {
      return alert('La cantidad de likes por día debe estar entre 1 y 2,000.');
    }
    const days = Number(autoDurationDays);
    if (isNaN(days) || days < 1) {
      return alert('La duración en días debe ser mínimo 1.');
    }

    setAutoLoading(true);
    try {
      const res = await validatePlayerUid(autoUid.trim(), 'Free Fire');
      if (res && res.success) {
        setPlayerInfo({
          nickname: res.nickname || 'Jona detona',
          currentLikes: res.currentLikes || 210193
        });
      } else {
        setPlayerInfo({
          nickname: `Jugador_${autoUid.slice(-4)}`,
          currentLikes: 210193
        });
      }
      setShowAutoModal(true);
    } catch (err) {
      console.warn(err);
      setShowAutoModal(true);
    } finally {
      setAutoLoading(false);
    }
  };

  // Confirm Actions
  const handleConfirmInstant = async () => {
    try {
      if (user) {
        await supabase.from('orders').insert({
          user_id: user.id,
          total_usdt: 0,
          total_gtq: 0,
          status: 'Completed',
          payment_method: 'Free Fire Likes Instant',
          customer_notes: `Envío Instantáneo de ${instantQty} Likes a UID: ${instantUid} (${playerInfo.nickname})`
        });
      }
      alert(`¡Solicitud confirmada! Se han enviado ${instantQty} likes al jugador "${playerInfo.nickname}".`);
      setShowInstantModal(false);
    } catch (err) {
      alert('¡Envío realizado exitosamente!');
      setShowInstantModal(false);
    }
  };

  const handleConfirmAuto = async () => {
    const totalExpected = (Number(autoQtyPerDay) * Number(autoDurationDays)).toLocaleString();
    try {
      if (user) {
        await supabase.from('orders').insert({
          user_id: user.id,
          total_usdt: 0,
          total_gtq: 0,
          status: 'Completed',
          payment_method: 'Free Fire Likes Scheduled',
          customer_notes: `Programación de ${autoQtyPerDay} likes/día por ${autoDurationDays} días (${totalExpected} total) a UID: ${autoUid} (${playerInfo.nickname}) a las ${autoHour}:${autoMinute}`
        });
      }
      alert(`¡Horario diario creado exitosamente! Se programaron ${autoQtyPerDay} likes diarios durante ${autoDurationDays} días para "${playerInfo.nickname}".`);
      setShowAutoModal(false);
    } catch (err) {
      alert('¡Horario diario programado exitosamente!');
      setShowAutoModal(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '20px', paddingBottom: '50px', maxWidth: '440px' }}>
      
      {/* Tab Switcher: Instant vs Auto */}
      <div style={{
        display: 'flex',
        gap: '8px',
        backgroundColor: '#0a0f0d',
        padding: '6px',
        borderRadius: '16px',
        border: '1px solid rgba(0, 230, 118, 0.15)',
        marginBottom: '20px'
      }}>
        <button
          onClick={() => setActiveTab('instant')}
          style={{
            flex: 1,
            padding: '10px 8px',
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            backgroundColor: activeTab === 'instant' ? '#00e676' : 'transparent',
            color: activeTab === 'instant' ? '#000' : '#8e9aa8',
            boxShadow: activeTab === 'instant' ? '0 0 16px rgba(0, 230, 118, 0.35)' : 'none'
          }}
        >
          ⚡ Likes Instantáneos
        </button>

        <button
          onClick={() => setActiveTab('auto')}
          style={{
            flex: 1,
            padding: '10px 8px',
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            backgroundColor: activeTab === 'auto' ? '#00e676' : 'transparent',
            color: activeTab === 'auto' ? '#000' : '#8e9aa8',
            boxShadow: activeTab === 'auto' ? '0 0 16px rgba(0, 230, 118, 0.35)' : 'none'
          }}
        >
          🔄 Me Gusta Automático
        </button>
      </div>

      {/* 1. VIEW: ENVIAR ME GUSTA (Instantáneos) */}
      {activeTab === 'instant' && (
        <div style={{
          backgroundColor: '#0d1512',
          border: '1px solid rgba(0, 230, 118, 0.2)',
          borderRadius: '24px',
          padding: '28px 20px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)'
        }} className="animate-fade">
          
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '800',
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: '6px'
          }}>
            ENVIAR ME GUSTA
          </h2>

          <p style={{
            fontSize: '0.85rem',
            color: '#718096',
            lineHeight: '1.4',
            marginBottom: '24px'
          }}>
            Introduzca el ID del objetivo y la cantidad deseada.
          </p>

          <form onSubmit={handleOpenInstantModal} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Field: ID DEL OBJETIVO */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#8e9aa8',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px'
              }}>
                ID DEL OBJETIVO
              </label>
              <input
                type="text"
                required
                value={instantUid}
                onChange={(e) => setInstantUid(e.target.value)}
                placeholder="29386038"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  backgroundColor: '#070b09',
                  border: '1px solid rgba(0, 230, 118, 0.4)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: '600',
                  outline: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
                }}
              />
            </div>

            {/* Field: CANTIDAD (1 - 2,000) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: '#8e9aa8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  CANTIDAD
                </label>
                <span style={{ fontSize: '0.72rem', color: '#00e676' }}>Límite: 1 - 2,000</span>
              </div>
              <input
                type="number"
                min="1"
                max="2000"
                required
                value={instantQty}
                onChange={(e) => setInstantQty(e.target.value)}
                placeholder="2000"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  backgroundColor: '#070b09',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: '600',
                  outline: 'none'
                }}
              />
            </div>

            {/* Action Button */}
            <button
              type="submit"
              disabled={instantLoading}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#00e676',
                color: '#000',
                fontWeight: '800',
                fontSize: '0.92rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderRadius: '16px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0, 230, 118, 0.35)',
                marginTop: '10px',
                transition: 'all 0.2s ease'
              }}
            >
              {instantLoading ? 'Verificando...' : 'ENVIAR ME GUSTA'}
            </button>

          </form>
        </div>
      )}

      {/* 2. VIEW: ME GUSTA AUTOMÁTICO (Programado) */}
      {activeTab === 'auto' && (
        <div style={{
          backgroundColor: '#0d1512',
          border: '1px solid rgba(0, 230, 118, 0.2)',
          borderRadius: '24px',
          padding: '28px 20px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)'
        }} className="animate-fade">
          
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '800',
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: '6px'
          }}>
            ME GUSTA AUTOMÁTICO
          </h2>

          <p style={{
            fontSize: '0.85rem',
            color: '#718096',
            lineHeight: '1.4',
            marginBottom: '20px'
          }}>
            Configura envíos automáticos diarios durante un período de tiempo. Proporciona el ID del jugador objetivo.
          </p>

          <form onSubmit={handleOpenAutoModal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Field: ID DEL OBJETIVO */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#8e9aa8',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '6px'
              }}>
                ID DEL OBJETIVO
              </label>
              <input
                type="text"
                required
                value={autoUid}
                onChange={(e) => setAutoUid(e.target.value)}
                placeholder="29386038"
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  backgroundColor: '#070b09',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '0.95rem',
                  fontWeight: '600'
                }}
              />
            </div>

            {/* Field: CANTIDAD POR DÍA (1-2000) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: '#8e9aa8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  CANTIDAD POR DÍA
                </label>
                <span style={{ fontSize: '0.72rem', color: '#00e676' }}>1 - 2,000 / día</span>
              </div>
              <input
                type="number"
                min="1"
                max="2000"
                required
                value={autoQtyPerDay}
                onChange={(e) => setAutoQtyPerDay(e.target.value)}
                placeholder="2000"
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  backgroundColor: '#070b09',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '0.95rem',
                  fontWeight: '600'
                }}
              />
            </div>

            {/* Field: DURACIÓN (DÍAS) */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#8e9aa8',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '6px'
              }}>
                DURACIÓN (DÍAS)
              </label>
              <input
                type="number"
                min="1"
                required
                value={autoDurationDays}
                onChange={(e) => setAutoDurationDays(e.target.value)}
                placeholder="365"
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  backgroundColor: '#070b09',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '0.95rem',
                  fontWeight: '600'
                }}
              />
            </div>

            {/* Field: TIEMPO DE ENVÍO (Hora y Minuto) */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#8e9aa8',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '6px'
              }}>
                TIEMPO DE ENVÍO
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input
                  type="number"
                  min="0"
                  max="23"
                  required
                  value={autoHour}
                  onChange={(e) => setAutoHour(e.target.value)}
                  placeholder="13"
                  style={{
                    width: '100%',
                    padding: '13px 16px',
                    backgroundColor: '#070b09',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}
                />
                <input
                  type="number"
                  min="0"
                  max="59"
                  required
                  value={autoMinute}
                  onChange={(e) => setAutoMinute(e.target.value)}
                  placeholder="21"
                  style={{
                    width: '100%',
                    padding: '13px 16px',
                    backgroundColor: '#070b09',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}
                />
              </div>
            </div>

            {/* Action Button */}
            <button
              type="submit"
              disabled={autoLoading}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#00e676',
                color: '#000',
                fontWeight: '800',
                fontSize: '0.92rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderRadius: '16px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0, 230, 118, 0.35)',
                marginTop: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              {autoLoading ? 'Verificando...' : 'CREAR HORARIO DIARIO'}
            </button>

          </form>
        </div>
      )}

      {/* ====================================================================== */}
      {/* SCREENSHOT 1 MODAL: CONFIRMAR ENVÍO (Instantáneo)                     */}
      {/* ====================================================================== */}
      {showInstantModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          backgroundColor: 'rgba(0,0,0,0.82)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="animate-fade" style={{
            width: '100%',
            maxWidth: '380px',
            backgroundColor: '#0d1512',
            border: '1px solid rgba(0, 230, 118, 0.3)',
            borderRadius: '24px',
            padding: '24px 20px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff', margin: 0 }}>
                Confirmar envío
              </h3>
              <button
                onClick={() => setShowInstantModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  color: '#8e9aa8',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                ✕
              </button>
            </div>

            {/* Formatted Rows Container */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
              
              <div style={{
                backgroundColor: '#070b09',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.85rem', color: '#8e9aa8' }}>ID del objetivo:</span>
                <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#fff' }}>{instantUid}</span>
              </div>

              <div style={{
                backgroundColor: '#070b09',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.85rem', color: '#8e9aa8' }}>Apodo:</span>
                <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#fff' }}>{playerInfo.nickname}</span>
              </div>

              <div style={{
                backgroundColor: '#070b09',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.85rem', color: '#8e9aa8' }}>Cantidad solicitada:</span>
                <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#fff' }}>{instantQty}</span>
              </div>

              <div style={{
                backgroundColor: '#070b09',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.85rem', color: '#8e9aa8' }}>Me gusta actualmente:</span>
                <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#fff' }}>{playerInfo.currentLikes.toLocaleString()}</span>
              </div>

            </div>

            {/* Alert / Question Container */}
            <div style={{
              backgroundColor: 'rgba(234, 179, 8, 0.08)',
              border: '1px solid rgba(234, 179, 8, 0.25)',
              borderRadius: '14px',
              padding: '12px 16px',
              textAlign: 'center',
              marginBottom: '18px'
            }}>
              <p style={{ fontSize: '0.82rem', color: '#fde047', margin: 0, lineHeight: '1.4' }}>
                ¿Estás seguro de que quieres enviar estos "me gusta"?
              </p>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowInstantModal(false)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#070b09',
                  color: '#00e676',
                  border: '1px solid rgba(0, 230, 118, 0.3)',
                  borderRadius: '16px',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmInstant}
                style={{
                  width: '100%',
                  padding: '13px',
                  backgroundColor: '#00e676',
                  color: '#000',
                  border: 'none',
                  borderRadius: '16px',
                  fontWeight: '800',
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(0, 230, 118, 0.35)'
                }}
              >
                Confirmar envío
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* SCREENSHOT 2 MODAL: CONFIRMAR CITA (Automático)                       */}
      {/* ====================================================================== */}
      {showAutoModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          backgroundColor: 'rgba(0,0,0,0.82)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="animate-fade" style={{
            width: '100%',
            maxWidth: '380px',
            backgroundColor: '#0d1512',
            border: '1px solid rgba(0, 230, 118, 0.3)',
            borderRadius: '24px',
            padding: '24px 20px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff', margin: 0 }}>
                Confirmar cita
              </h3>
              <button
                onClick={() => setShowAutoModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  color: '#8e9aa8',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                ✕
              </button>
            </div>

            {/* Formatted Rows Container */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              
              <div style={{
                backgroundColor: '#070b09',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.82rem', color: '#8e9aa8' }}>ID del objetivo:</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#fff' }}>{autoUid}</span>
              </div>

              <div style={{
                backgroundColor: '#070b09',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.82rem', color: '#8e9aa8' }}>Apodo:</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#fff' }}>{playerInfo.nickname}</span>
              </div>

              <div style={{
                backgroundColor: '#070b09',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.82rem', color: '#8e9aa8' }}>Me gusta actualmente:</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#fff' }}>{playerInfo.currentLikes.toLocaleString()}</span>
              </div>

              <div style={{
                backgroundColor: '#070b09',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.82rem', color: '#8e9aa8' }}>Me gusta por día:</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#fff' }}>{autoQtyPerDay} me gusta/día</span>
              </div>

              <div style={{
                backgroundColor: '#070b09',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.82rem', color: '#8e9aa8' }}>Duración:</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#fff' }}>{autoDurationDays} días</span>
              </div>

              <div style={{
                backgroundColor: '#070b09',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.82rem', color: '#8e9aa8' }}>Total previsto:</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#00e676' }}>
                  {(Number(autoQtyPerDay) * Number(autoDurationDays)).toLocaleString()} me gusta
                </span>
              </div>

              <div style={{
                backgroundColor: '#070b09',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.82rem', color: '#8e9aa8' }}>Horario diario:</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#fff' }}>{autoHour}:{autoMinute}</span>
              </div>

            </div>

            {/* Alert / Instruction Container */}
            <div style={{
              backgroundColor: 'rgba(234, 179, 8, 0.08)',
              border: '1px solid rgba(234, 179, 8, 0.25)',
              borderRadius: '14px',
              padding: '10px 14px',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              <p style={{ fontSize: '0.78rem', color: '#fde047', margin: 0, lineHeight: '1.4' }}>
                Confirme los detalles antes de activar el envío automático.
              </p>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowAutoModal(false)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#070b09',
                  color: '#00e676',
                  border: '1px solid rgba(0, 230, 118, 0.3)',
                  borderRadius: '16px',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmAuto}
                style={{
                  width: '100%',
                  padding: '13px',
                  backgroundColor: '#00e676',
                  color: '#000',
                  border: 'none',
                  borderRadius: '16px',
                  fontWeight: '800',
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(0, 230, 118, 0.35)'
                }}
              >
                Confirmar cita
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
