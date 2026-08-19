import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function AdminUsers() {
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
      setLoading(true);
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

      const { data, count, error } = await query;

      if (data && !error) {
        setUsers(data);
        setTotalCount(count || 0);
      } else {
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
      }
      setLoading(false);
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
                  <td style={{ padding: '12px 8px', fontWeight: '800', color: 'var(--accent-cyan)' }}>
                    ${Number(u.wallet_balance || 0).toFixed(2)}
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
    </div>
  );
}
