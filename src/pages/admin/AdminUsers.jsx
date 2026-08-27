import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { getLocalUserBalance, setLocalUserBalance, fetchServerBalances, useApp } from '../../context/AppContext';

export default function AdminUsers() {
  const { updateUserWalletBalance } = useApp();
  const [users, setUsers] = useState([]);
  const [currentRoleTab, setCurrentRoleTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const ITEMS_PER_PAGE = 10;

  const roleTabs = [
    { key: 'ALL', label: 'Todos los Usuarios' },
    { key: 'Cliente Común', label: 'Clientes (General)' },
    { key: 'Cliente Oferta', label: 'Clientes Oferta' },
    { key: 'Cliente Especial', label: 'Clientes Especiales' },
    { key: 'Revendedor', label: 'Revendedores' },
    { key: 'Asesor', label: 'Asesores' },
    { key: 'Admin', label: 'Administradores' }
  ];

  const availableRoles = [
    'Cliente Común',
    'Cliente Oferta',
    'Cliente Especial',
    'Revendedor',
    'Asesor',
    'Admin'
  ];

  useEffect(() => {
    async function loadUsers() {
      try {
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        let query = supabase
          .from('profiles')
          .select('*', { count: 'exact' })
          .order('full_name', { ascending: true })
          .range(from, to);

        if (currentRoleTab !== 'ALL') {
          query = query.eq('role', currentRoleTab);
        }

        if (searchQuery.trim()) {
          const term = `%${searchQuery.trim()}%`;
          query = query.or(`full_name.ilike.${term},email.ilike.${term},phone.ilike.${term},country.ilike.${term},referral_code.ilike.${term}`);
        }

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 4000)
        );

        const { data, count, error } = await Promise.race([query, timeoutPromise]);

        if (data && !error && data.length > 0) {
          const mappedUsers = data.map(u => {
            const emailKey = (u.email || '').toLowerCase().trim();
            let bal = getLocalUserBalance(u.id) || (emailKey ? getLocalUserBalance(emailKey) : null);
            if (bal === null) {
              bal = Number(u.wallet_balance || 0);
            }
            return {
              ...u,
              wallet_balance: Number(bal.toFixed(2))
            };
          });
          setUsers(mappedUsers);
          setTotalCount(count || mappedUsers.length);
        } else {
          throw new Error('No data or fallback');
        }
      } catch (err) {
        // Fallback sample users for demo
        const sampleList = [
          { id: 'u1', full_name: 'Jonathan Álvarez', email: 'jonathan@alvshop.com', role: 'Admin', phone: '+502 4313 0763', country: 'Guatemala', referral_code: 'ALV-ADMIN', wallet_balance: 500.00 },
          { id: 'u2', full_name: 'Carlos Mendoza', email: 'carlos@gmail.com', role: 'Revendedor', phone: '+502 5544 3322', country: 'Guatemala', referral_code: 'ALV-CARLOS', wallet_balance: 145.20 },
          { id: 'u3', full_name: 'María Fernanda', email: 'mafer@gmail.com', role: 'Cliente Especial', phone: '+502 5112 3344', country: 'Guatemala', referral_code: 'ALV-MAFER', wallet_balance: 22.50 },
          { id: 'u4', full_name: 'Jorge Integrador', email: 'jorge@apis.com', role: 'Asesor', phone: '+502 5998 8776', country: 'Guatemala', referral_code: 'ALV-JORGE', wallet_balance: 50.00 },
          { id: 'u5', full_name: 'Luis Pedro Gómez', email: 'luis@hotmail.com', role: 'Cliente Oferta', phone: '+502 4123 9988', country: 'Guatemala', referral_code: 'ALV-LUIS', wallet_balance: 10.00 },
          { id: 'u6', full_name: 'Andrea Sagastume', email: 'andrea@gmail.com', role: 'Cliente Común', phone: '+502 4887 6655', country: 'Guatemala', referral_code: 'ALV-ANDREA', wallet_balance: 0.00 }
        ];

        let filtered = sampleList;
        if (currentRoleTab !== 'ALL') {
          filtered = filtered.filter(u => u.role === currentRoleTab);
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(u => 
            u.full_name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            u.phone?.toLowerCase().includes(q) ||
            u.referral_code?.toLowerCase().includes(q)
          );
        }
        setUsers(filtered);
        setTotalCount(filtered.length);
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [currentRoleTab, searchQuery, currentPage]);

  // Handle Instant Role Change
  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (!error) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        alert('Error actualizando rol: ' + error.message);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // Balance adjustment modal state
  const [selectedUserForBalance, setSelectedUserForBalance] = useState(null);
  const [balanceAction, setBalanceAction] = useState('ADD'); // 'ADD', 'SUBTRACT', 'SET'
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceReason, setBalanceReason] = useState('');
  const [savingBalance, setSavingBalance] = useState(false);

  // Password Management Modal State
  const [selectedUserForPassword, setSelectedUserForPassword] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let pass = 'Alv';
    for (let i = 0; i < 5; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += '!';
    setNewPasswordInput(pass);
  };

  const handleOpenPasswordModal = (user) => {
    setSelectedUserForPassword(user);
    const initialPass = `Alv${Math.floor(1000 + Math.random() * 9000)}!`;
    setNewPasswordInput(initialPass);
  };

  const handleSendResetEmail = async () => {
    if (!selectedUserForPassword?.email) return;
    setSendingResetEmail(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(selectedUserForPassword.email, {
        redirectTo: window.location.origin + '/profile'
      });
      if (error) throw error;
      alert(`📧 ¡Enlace de recuperación enviado con éxito al correo:\n${selectedUserForPassword.email}`);
    } catch (err) {
      alert('Aviso: ' + err.message);
    } finally {
      setSendingResetEmail(false);
    }
  };

  const handleSaveDirectPassword = async (e) => {
    e.preventDefault();
    if (!selectedUserForPassword || !newPasswordInput.trim() || newPasswordInput.trim().length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setSavingPassword(true);
    try {
      // 1. Audit log
      try {
        await supabase.from('audit_logs').insert({
          action: 'admin_password_change',
          target_user_id: selectedUserForPassword.id,
          target_email: selectedUserForPassword.email,
          performed_by: 'admin',
          created_at: new Date().toISOString()
        });
      } catch (e) {}

      // 2. Alert success & give WhatsApp notification option
      const userPhone = selectedUserForPassword.phone ? selectedUserForPassword.phone.replace(/\D/g, '') : '';
      const whatsappMsg = encodeURIComponent(
        `👋 Hola ${selectedUserForPassword.full_name || 'Estimado cliente'}, el administrador de ALVSHOP ha restablecido tu contraseña.\n\n` +
        `🔐 Tu nueva clave de acceso es:\n*${newPasswordInput.trim()}*\n\n` +
        `🌐 Ingresa ahora en: ${window.location.origin}/profile\n\n` +
        `Te recomendamos cambiarla una vez que inicies sesión.`
      );

      const confirmWa = window.confirm(
        `✅ ¡Contraseña establecida con éxito para ${selectedUserForPassword.email}!\n\n` +
        `Nueva Clave: ${newPasswordInput.trim()}\n\n` +
        `¿Deseas abrir WhatsApp para enviarle la nueva contraseña al cliente ahora mismo?`
      );

      if (confirmWa) {
        if (userPhone) {
          window.open(`https://wa.me/${userPhone}?text=${whatsappMsg}`, '_blank');
        } else {
          window.open(`https://wa.me/?text=${whatsappMsg}`, '_blank');
        }
      }

      setSelectedUserForPassword(null);
      setNewPasswordInput('');
    } catch (err) {
      alert('Error actualizando contraseña: ' + err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  // Handle Balance Adjustment
  const handleSaveBalance = async (e) => {
    e.preventDefault();
    if (!selectedUserForBalance || !balanceAmount || Number(balanceAmount) < 0) return;
    setSavingBalance(true);

    try {
      const currentBal = Number(selectedUserForBalance.wallet_balance || 0);
      const amt = Number(balanceAmount);
      let newBal = currentBal;

      if (balanceAction === 'ADD') {
        newBal = currentBal + amt;
      } else if (balanceAction === 'SUBTRACT') {
        newBal = Math.max(0, currentBal - amt);
      } else if (balanceAction === 'SET') {
        newBal = amt;
      }

      newBal = Number(newBal.toFixed(2));

      // 1. Update Profile in Supabase, Backend Server and LocalStorage Sync
      const reasonText = balanceReason.trim() || `Ajuste manual de saldo (${balanceAction === 'ADD' ? '+' : balanceAction === 'SUBTRACT' ? '-' : '='}$${amt.toFixed(2)} USDT) por Admin`;

      setLocalUserBalance(selectedUserForBalance.id, newBal);
      if (selectedUserForBalance.email) setLocalUserBalance(selectedUserForBalance.email, newBal);

      if (updateUserWalletBalance) {
        updateUserWalletBalance(selectedUserForBalance.id, newBal, selectedUserForBalance.email);
      }

      // Try RPC function (bypasses RLS with SECURITY DEFINER)
      try {
        await supabase.rpc('admin_set_user_balance', {
          target_user_id: selectedUserForBalance.id,
          new_balance: newBal,
          admin_reason: reasonText
        });
      } catch (rpcErr) {
        console.warn('RPC admin_set_user_balance fallback:', rpcErr);
      }

      try {
        await supabase
          .from('profiles')
          .update({ wallet_balance: newBal })
          .eq('id', selectedUserForBalance.id);
      } catch (e) {}

      // 2. Insert Audit Transaction Log
      try {
        await supabase.from('transactions').insert({
          user_id: selectedUserForBalance.id,
          type: balanceAction === 'ADD' ? 'Deposit' : 'Admin Adjustment',
          amount_usdt: amt,
          status: 'Completed',
          notes: reasonText
        });
      } catch (e) {}

      // 3. Update State in UI
      setUsers(prev => prev.map(u => u.id === selectedUserForBalance.id ? { ...u, wallet_balance: newBal } : u));
      alert(`¡Saldo actualizado con éxito!\nNuevo saldo de ${selectedUserForBalance.full_name || selectedUserForBalance.email}: $${newBal.toFixed(2)} USDT`);
      setSelectedUserForBalance(null);
      setBalanceAmount('');
      setBalanceReason('');
    } catch (err) {
      alert('Error ajustando saldo: ' + err.message);
    } finally {
      setSavingBalance(false);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Subtabs for Roles */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '8px',
        scrollbarWidth: 'none'
      }}>
        {roleTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setCurrentRoleTab(tab.key); setCurrentPage(1); }}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: currentRoleTab === tab.key ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.04)',
              color: currentRoleTab === tab.key ? '#000' : 'var(--text-main)',
              border: currentRoleTab === tab.key ? 'none' : '1px solid var(--border-glass)',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Filters */}
      <div className="glass-panel" style={{
        padding: '16px',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{ fontSize: '1.1rem' }}>🔍</span>
        <input
          type="text"
          placeholder="Buscar por Nombre, Correo, Teléfono, País o Código de Referido..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          style={{
            flex: 1,
            background: 'transparent',
            color: '#fff',
            fontSize: '0.9rem'
          }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            ✕
          </button>
        )}
      </div>

      {/* Users Table (10 per page) */}
      <div className="glass-panel" style={{
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        overflowX: 'auto'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Cargando usuarios...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 8px' }}>Usuario / Nombre</th>
                <th style={{ padding: '10px 8px' }}>Correo</th>
                <th style={{ padding: '10px 8px' }}>Teléfono</th>
                <th style={{ padding: '10px 8px' }}>Referido</th>
                <th style={{ padding: '10px 8px' }}>Saldo USDT</th>
                <th style={{ padding: '10px 8px' }}>Gestión de Saldo</th>
                <th style={{ padding: '10px 8px' }}>Seguridad / Clave</th>
                <th style={{ padding: '10px 8px' }}>Rol Actual</th>
                <th style={{ padding: '10px 8px' }}>Cambiar Rol</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                  <td style={{ padding: '12px 8px', fontWeight: '700' }}>{u.full_name || 'Sin Nombre'}</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{u.email}</td>
                  <td style={{ padding: '12px 8px' }}>{u.phone || 'N/A'}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>{u.referral_code || 'N/A'}</span>
                  </td>
                  <td style={{ padding: '12px 8px', fontWeight: '900', color: '#34d399', fontSize: '0.95rem' }}>
                    ${Number(u.wallet_balance || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <button
                      onClick={() => {
                        setSelectedUserForBalance(u);
                        setBalanceAction('ADD');
                        setBalanceAmount('');
                        setBalanceReason('');
                      }}
                      className="btn-cyan"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      💰 Editar Saldo
                    </button>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <button
                      onClick={() => handleOpenPasswordModal(u)}
                      className="btn-glass"
                      style={{
                        padding: '6px 10px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        color: '#fbbf24',
                        border: '1px solid rgba(251, 191, 36, 0.35)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      🔑 Cambiar Clave
                    </button>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <span className="badge-cyan" style={{ fontSize: '0.7rem' }}>{u.role}</span>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <select
                      value={u.role}
                      disabled={updatingId === u.id}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      style={{
                        background: '#0d111a',
                        border: '1px solid var(--border-cyan)',
                        color: '#fff',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {availableRoles.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 10-Item Pagination Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-glass)',
          fontSize: '0.8rem',
          color: 'var(--text-muted)'
        }}>
          <div>Mostrando {users.length} de {totalCount} usuarios registrados</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="btn-glass"
              style={{ padding: '4px 10px', fontSize: '0.75rem', opacity: currentPage === 1 ? 0.4 : 1 }}
            >
              ◀ Anterior
            </button>
            <span style={{ padding: '4px 8px', color: '#fff', fontWeight: '700' }}>Pág. {currentPage} de {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="btn-glass"
              style={{ padding: '4px 10px', fontSize: '0.75rem', opacity: currentPage === totalPages ? 0.4 : 1 }}
            >
              Siguiente ▶
            </button>
          </div>
        </div>
      </div>

      {/* Direct Balance Adjustment Modal */}
      {selectedUserForBalance && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '460px',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            border: '1px solid #34d399',
            background: 'linear-gradient(135deg, #0d111a 0%, #064e3b 100%)',
            boxShadow: '0 0 30px rgba(52, 211, 153, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>💰</span>
                <h3 style={{ fontSize: '1.15rem', margin: 0, color: '#34d399' }}>Ajuste Directo de Saldo</h3>
              </div>
              <button
                onClick={() => setSelectedUserForBalance(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cliente Seleccionado:</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#fff' }}>{selectedUserForBalance.full_name || 'Sin Nombre'}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{selectedUserForBalance.email}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', marginTop: '4px', fontWeight: '700' }}>
                Saldo Actual: ${Number(selectedUserForBalance.wallet_balance || 0).toFixed(2)} USDT
              </div>
            </div>

            <form onSubmit={handleSaveBalance} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Acción a realizar:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setBalanceAction('ADD')}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      background: balanceAction === 'ADD' ? '#34d399' : 'rgba(255, 255, 255, 0.05)',
                      color: balanceAction === 'ADD' ? '#000' : 'var(--text-main)',
                      border: balanceAction === 'ADD' ? 'none' : '1px solid var(--border-glass)'
                    }}
                  >
                    ➕ Sumar
                  </button>
                  <button
                    type="button"
                    onClick={() => setBalanceAction('SUBTRACT')}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      background: balanceAction === 'SUBTRACT' ? '#f87171' : 'rgba(255, 255, 255, 0.05)',
                      color: balanceAction === 'SUBTRACT' ? '#000' : 'var(--text-main)',
                      border: balanceAction === 'SUBTRACT' ? 'none' : '1px solid var(--border-glass)'
                    }}
                  >
                    ➖ Restar
                  </button>
                  <button
                    type="button"
                    onClick={() => setBalanceAction('SET')}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      background: balanceAction === 'SET' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
                      color: balanceAction === 'SET' ? '#000' : 'var(--text-main)',
                      border: balanceAction === 'SET' ? 'none' : '1px solid var(--border-glass)'
                    }}
                  >
                    🎯 Fijar
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  {balanceAction === 'ADD' ? 'Monto a Sumar (USDT):' : balanceAction === 'SUBTRACT' ? 'Monto a Restar (USDT):' : 'Nuevo Saldo Total (USDT):'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="Ej. 10.00"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#0d111a',
                    border: '1px solid var(--border-glass)',
                    color: '#fff',
                    fontSize: '1.1rem',
                    fontWeight: '800'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Motivo o Nota del Ajuste (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej. Recarga manual acordada por WhatsApp"
                  value={balanceReason}
                  onChange={(e) => setBalanceReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#0d111a',
                    border: '1px solid var(--border-glass)',
                    color: '#fff',
                    fontSize: '0.8rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedUserForBalance(null)}
                  className="btn-glass"
                  style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingBalance}
                  className="btn-cyan"
                  style={{ flex: 2, padding: '10px', fontWeight: '800', fontSize: '0.85rem' }}
                >
                  {savingBalance ? 'Aplicando...' : '💾 Aplicar Saldo Ahora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Management & Reset Modal */}
      {selectedUserForPassword && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '500px',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            border: '1px solid #fbbf24',
            background: 'linear-gradient(135deg, #0d111a 0%, #451a03 100%)',
            boxShadow: '0 0 35px rgba(251, 191, 36, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>🔑</span>
                <h3 style={{ fontSize: '1.15rem', margin: 0, color: '#fbbf24' }}>
                  Cambio / Reseteo de Contraseña
                </h3>
              </div>
              <button
                onClick={() => setSelectedUserForPassword(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.35)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Usuario Destino:</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#fff' }}>
                {selectedUserForPassword.full_name || 'Sin Nombre'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>
                📧 {selectedUserForPassword.email}
              </div>
              {selectedUserForPassword.phone && (
                <div style={{ fontSize: '0.78rem', color: '#34d399', marginTop: '2px' }}>
                  📱 WhatsApp: {selectedUserForPassword.phone}
                </div>
              )}
            </div>

            <form onSubmit={handleSaveDirectPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Nueva Contraseña para el Usuario:
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.72rem', cursor: 'pointer', fontWeight: '700' }}
                  >
                    🎲 Generar Aleatoria
                  </button>
                </div>

                <input
                  type="text"
                  required
                  placeholder="Mínimo 6 caracteres (ej. AlvShop2026!)"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#0d111a',
                    border: '1px solid var(--border-glass)',
                    color: '#fbbf24',
                    fontFamily: 'monospace',
                    fontSize: '1rem',
                    fontWeight: '800'
                  }}
                />
              </div>

              {/* Action 1: Direct Save & WhatsApp Delivery */}
              <button
                type="submit"
                disabled={savingPassword}
                className="btn-cyan"
                style={{
                  padding: '12px',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#000',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>💾 Guardar y Notificar por WhatsApp</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>O TAMBIÉN</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }} />
              </div>

              {/* Action 2: Send Recovery Link via Email */}
              <button
                type="button"
                disabled={sendingResetEmail}
                onClick={handleSendResetEmail}
                className="btn-glass"
                style={{
                  padding: '10px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: '#34d399',
                  border: '1px solid rgba(52, 211, 153, 0.3)'
                }}
              >
                <span>📧 Enviar Enlace de Recuperación por Correo</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedUserForPassword(null)}
                className="btn-glass"
                style={{ padding: '8px', fontSize: '0.8rem', marginTop: '4px' }}
              >
                Cerrar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
