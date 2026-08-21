import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Products
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedSubcat, setSelectedSubcat] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pricePublic, setPricePublic] = useState('');
  const [priceReseller, setPriceReseller] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('999');
  const [imageUrl, setImageUrl] = useState('');
  const [buttonText, setButtonText] = useState('Comprar');
  const [requiresValidation, setRequiresValidation] = useState(false);
  const [validationType, setValidationType] = useState('Free Fire');
  const [dynamicFields, setDynamicFields] = useState(['ID de Jugador (UID)']);
  const [saving, setSaving] = useState(false);

  // Modal State for Categories
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('💎');
  const [savingCat, setSavingCat] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const { data: catData } = await supabase.from('categories').select('*').order('name');
    const { data: subcatData } = await supabase.from('subcategories').select('*').order('name');
    const { data: prodData } = await supabase.from('products').select('*, subcategories(name, category_id)').order('created_at', { ascending: false });

    if (catData) setCategories(catData);
    if (subcatData) setSubcategories(subcatData);
    if (prodData) setProducts(prodData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddDynamicField = () => {
    setDynamicFields([...dynamicFields, '']);
  };

  const handleFieldChange = (index, value) => {
    const updated = [...dynamicFields];
    updated[index] = value;
    setDynamicFields(updated);
  };

  const handleRemoveField = (index) => {
    const updated = dynamicFields.filter((_, idx) => idx !== index);
    setDynamicFields(updated.length > 0 ? updated : ['ID de Jugador (UID)']);
  };

  // Create Category
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setSavingCat(true);

    const slug = newCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();

    try {
      const { data, error } = await supabase.from('categories').insert({
        name: newCatName.trim(),
        slug,
        icon: newCatIcon
      }).select().single();

      if (error) throw error;

      setCategories([...categories, data]);
      setNewCatName('');
      alert('¡Categoría creada con éxito!');
    } catch (err) {
      alert('Error creando categoría: ' + err.message);
    } finally {
      setSavingCat(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (catId) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', catId);
      if (error) throw error;
      setCategories(categories.filter(c => c.id !== catId));
    } catch (err) {
      alert('Error eliminando categoría: ' + err.message);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (prodId) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', prodId);
      if (error) throw error;
      setProducts(products.filter(p => p.id !== prodId));
    } catch (err) {
      alert('Error eliminando producto: ' + err.message);
    }
  };

  // Save Product
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: newProd, error: prodErr } = await supabase.from('products').insert({
        subcategory_id: selectedSubcat || null,
        name,
        description,
        price_public: Number(pricePublic),
        price_reseller: Number(priceReseller),
        cost: Number(cost),
        stock: Number(stock),
        image_url: imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=60',
        button_action_text: buttonText,
        requires_validation: requiresValidation,
        validation_type: requiresValidation ? validationType : null
      }).select().single();

      if (prodErr) throw prodErr;

      // Insert dynamic fields into product_fields
      for (let i = 0; i < dynamicFields.length; i++) {
        if (dynamicFields[i].trim()) {
          await supabase.from('product_fields').insert({
            product_id: newProd.id,
            field_name: dynamicFields[i].trim(),
            field_type: 'text',
            is_required: true,
            sort_order: i
          });
        }
      }

      await loadData();
      setShowProductModal(false);
      setName('');
      setDescription('');
      setPricePublic('');
      setPriceReseller('');
      setCost('');
      setDynamicFields(['ID de Jugador (UID)']);
      alert('¡Producto publicado exitosamente con sus campos de formulario y 3 precios configurados!');
    } catch (err) {
      alert('Error guardando producto: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Catálogo de Productos & Precios</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Estructura de 3 precios: Público, Revendedor y Costo Proveedor
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowCategoryModal(true)} className="btn-glass" style={{ fontSize: '0.85rem' }}>
            📁 Gestionar Categorías ({categories.length})
          </button>
          <button
            onClick={() => {
              setDynamicFields(['ID de Jugador (UID)']);
              setShowProductModal(true);
            }}
            className="btn-cyan"
            style={{ fontSize: '0.85rem' }}
          >
            ➕ Crear Nuevo Producto
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '10px 8px' }}>Producto</th>
              <th style={{ padding: '10px 8px' }}>Precio Público</th>
              <th style={{ padding: '10px 8px' }}>Precio Revendedor</th>
              <th style={{ padding: '10px 8px' }}>Costo Proveedor</th>
              <th style={{ padding: '10px 8px' }}>Margen Ganancia</th>
              <th style={{ padding: '10px 8px' }}>Stock</th>
              <th style={{ padding: '10px 8px' }}>Botón</th>
              <th style={{ padding: '10px 8px' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No hay productos registrados aún. Haz clic en "Crear Nuevo Producto".
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const margin = (Number(p.price_public) - Number(p.cost)).toFixed(2);
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <td style={{ padding: '12px 8px', fontWeight: '700' }}>{p.name}</td>
                    <td style={{ padding: '12px 8px', color: 'var(--accent-cyan)', fontWeight: '800' }}>
                      ${Number(p.price_public).toFixed(2)} USDT
                    </td>
                    <td style={{ padding: '12px 8px', color: '#60a5fa', fontWeight: '700' }}>
                      ${Number(p.price_reseller).toFixed(2)} USDT
                    </td>
                    <td style={{ padding: '12px 8px', color: '#f87171' }}>
                      ${Number(p.cost).toFixed(2)} USDT
                    </td>
                    <td style={{ padding: '12px 8px', color: '#34d399', fontWeight: '800' }}>
                      +${margin} USDT
                    </td>
                    <td style={{ padding: '12px 8px' }}>{p.stock} u.</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span className="badge-cyan" style={{ fontSize: '0.7rem' }}>{p.button_action_text || 'Comprar'}</span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        style={{ background: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        🗑️ Borrar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Category Manager Modal */}
      {showCategoryModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          backgroundColor: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel animate-fade" style={{
            width: '100%',
            maxWidth: '520px',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            border: '1px solid var(--border-cyan)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Gestor de Categorías</h3>
              <button onClick={() => setShowCategoryModal(false)} style={{ background: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Create Category Form */}
            <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Ícono (Emoji)"
                value={newCatIcon}
                onChange={(e) => setNewCatIcon(e.target.value)}
                style={{ width: '70px', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', textAlign: 'center' }}
              />
              <input
                type="text"
                required
                placeholder="Nombre de Categoría (Ej. Gaming)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
              />
              <button type="submit" disabled={savingCat} className="btn-cyan" style={{ padding: '10px 16px', fontSize: '0.85rem' }}>
                {savingCat ? '...' : '➕ Crear'}
              </button>
            </form>

            {/* Categories List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {categories.map((c) => (
                <div key={c.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-glass)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '0.9rem' }}>
                    <span>{c.icon || '💎'}</span>
                    <span>{c.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(c.id)}
                    style={{ background: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Product Modal */}
      {showProductModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          backgroundColor: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel animate-fade" style={{
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            border: '1px solid var(--border-cyan)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Nuevo Producto / Recarga</h3>
              <button onClick={() => setShowProductModal(false)} style={{ background: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Nombre del Producto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. +2,000 likes"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Descripción</label>
                <textarea
                  rows="2"
                  placeholder="Detalles de entrega, 1800-2200 likes x ID..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                />
              </div>

              {/* 3 Price Inputs in USDT */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: '700', marginBottom: '4px' }}>1. Precio Público ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="6.00"
                    value={pricePublic}
                    onChange={(e) => setPricePublic(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-cyan)', color: '#fff', fontWeight: '700' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#60a5fa', fontWeight: '700', marginBottom: '4px' }}>2. Precio Revendedor ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="5.00"
                    value={priceReseller}
                    onChange={(e) => setPriceReseller(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontWeight: '700' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#f87171', fontWeight: '700', marginBottom: '4px' }}>3. Costo Proveedor ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="4.00"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontWeight: '700' }}
                  />
                </div>
              </div>

              {/* Action Button & Stock */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Texto del Botón</label>
                  <select
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                  >
                    <option value="Comprar">Comprar</option>
                    <option value="Solicitar">Solicitar</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Stock Disponible</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                  />
                </div>
              </div>

              {/* Form Builder for dynamic inputs */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700' }}>Campos requeridos al cliente (Form Builder):</label>
                  <button type="button" onClick={handleAddDynamicField} className="btn-glass" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                    ➕ Agregar Campo
                  </button>
                </div>
                {dynamicFields.map((field, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Ej. ID de Jugador (UID)"
                      value={field}
                      onChange={(e) => handleFieldChange(idx, e.target.value)}
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                    />
                    {dynamicFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveField(idx)}
                        style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button type="submit" disabled={saving} className="btn-cyan" style={{ padding: '12px', marginTop: '6px' }}>
                {saving ? 'Guardando...' : 'Guardar y Publicar Producto ➔'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
