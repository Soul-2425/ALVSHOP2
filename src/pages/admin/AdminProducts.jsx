import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Products
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
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
  const [uploadingImage, setUploadingImage] = useState(false);

  // Inline Category & Subcategory Quick-Creation inside Product Modal
  const [showQuickCatForm, setShowQuickCatForm] = useState(false);
  const [quickCatName, setQuickCatName] = useState('');
  const [quickCatIcon, setQuickCatIcon] = useState('💎');
  const [creatingQuickCat, setCreatingQuickCat] = useState(false);

  const [showQuickSubcatForm, setShowQuickSubcatForm] = useState(false);
  const [quickSubcatName, setQuickSubcatName] = useState('');
  const [creatingQuickSubcat, setCreatingQuickSubcat] = useState(false);

  // Modal State for Full Categories & Subcategories Manager
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('💎');
  const [newCatImage, setNewCatImage] = useState('');
  const [uploadingCatImg, setUploadingCatImg] = useState(false);
  const [savingCat, setSavingCat] = useState(false);

  // Subcategory management state inside Category Modal
  const [activeCatForSubcats, setActiveCatForSubcats] = useState(null);
  const [newSubcatName, setNewSubcatName] = useState('');
  const [newSubcatImage, setNewSubcatImage] = useState('');
  const [savingSubcat, setSavingSubcat] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const { data: catData } = await supabase.from('categories').select('*').order('name');
    const { data: subcatData } = await supabase.from('subcategories').select('*').order('name');
    const { data: prodData } = await supabase
      .from('products')
      .select('*, subcategories(id, name, category_id, categories(id, name, icon, image_url))')
      .order('created_at', { ascending: false });

    if (catData) setCategories(catData);
    if (subcatData) setSubcategories(subcatData);
    if (prodData) setProducts(prodData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update selected subcategories list when selected category changes
  const filteredSubcategories = subcategories.filter(s => s.category_id === selectedCat);

  // Image Upload Helper
  const handleUploadFile = async (e, setImageTarget, setUploadingTarget) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTarget(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        // Fallback to Data URL if storage bucket fails
        const reader = new FileReader();
        reader.onload = () => {
          setImageTarget(reader.result);
          setUploadingTarget(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setImageTarget(data.publicUrl);
    } catch (err) {
      console.warn('Error subiendo imagen:', err);
    } finally {
      setUploadingTarget(false);
    }
  };

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

  // Open Create Product Modal
  const handleOpenCreateProduct = () => {
    setEditingProductId(null);
    setSelectedCat(categories[0]?.id || '');
    setSelectedSubcat('');
    setName('');
    setDescription('');
    setPricePublic('');
    setPriceReseller('');
    setCost('');
    setStock('999');
    setImageUrl('');
    setButtonText('Comprar');
    setRequiresValidation(false);
    setDynamicFields(['ID de Jugador (UID)']);
    setShowQuickCatForm(false);
    setShowQuickSubcatForm(false);
    setShowProductModal(true);
  };

  // Open Edit Product Modal
  const handleOpenEditProduct = async (prod) => {
    setEditingProductId(prod.id);
    const prodCatId = prod.subcategories?.category_id || categories[0]?.id || '';
    setSelectedCat(prodCatId);
    setSelectedSubcat(prod.subcategory_id || '');
    setName(prod.name || '');
    setDescription(prod.description || '');
    setPricePublic(String(prod.price_public || ''));
    setPriceReseller(String(prod.price_reseller || ''));
    setCost(String(prod.cost || ''));
    setStock(String(prod.stock ?? '999'));
    setImageUrl(prod.image_url || '');
    setButtonText(prod.button_action_text || 'Comprar');
    setRequiresValidation(Boolean(prod.requires_validation));
    setValidationType(prod.validation_type || 'Free Fire');
    setShowQuickCatForm(false);
    setShowQuickSubcatForm(false);

    // Fetch dynamic fields for this product
    const { data: fields } = await supabase
      .from('product_fields')
      .select('field_name')
      .eq('product_id', prod.id)
      .order('sort_order');

    if (fields && fields.length > 0) {
      setDynamicFields(fields.map(f => f.field_name));
    } else {
      setDynamicFields(['ID de Jugador (UID)']);
    }

    setShowProductModal(true);
  };

  // Quick Inline Category Creation
  const handleQuickCreateCategory = async (e) => {
    e.preventDefault();
    if (!quickCatName.trim()) return;
    setCreatingQuickCat(true);

    const slug = quickCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();

    try {
      const { data: newCat, error } = await supabase.from('categories').insert({
        name: quickCatName.trim(),
        slug,
        icon: quickCatIcon || '💎'
      }).select().single();

      if (error) throw error;

      // Auto create a primary subcategory
      const subSlug = slug + '-sub';
      const { data: newSub } = await supabase.from('subcategories').insert({
        category_id: newCat.id,
        name: newCat.name,
        slug: subSlug
      }).select().single();

      setCategories(prev => [...prev, newCat]);
      if (newSub) {
        setSubcategories(prev => [...prev, newSub]);
        setSelectedSubcat(newSub.id);
      }

      setSelectedCat(newCat.id);
      setQuickCatName('');
      setShowQuickCatForm(false);
      alert(`¡Categoría "${newCat.name}" creada y seleccionada!`);
    } catch (err) {
      alert('Error creando categoría: ' + err.message);
    } finally {
      setCreatingQuickCat(false);
    }
  };

  // Quick Inline Subcategory Creation (e.g. 100+10, 310+31)
  const handleQuickCreateSubcategory = async (e) => {
    e.preventDefault();
    if (!selectedCat || !quickSubcatName.trim()) {
      alert('Por favor selecciona primero la categoría de destino.');
      return;
    }
    setCreatingQuickSubcat(true);

    const slug = quickSubcatName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();

    try {
      const { data: newSub, error } = await supabase.from('subcategories').insert({
        category_id: selectedCat,
        name: quickSubcatName.trim(),
        slug
      }).select().single();

      if (error) throw error;

      setSubcategories(prev => [...prev, newSub]);
      setSelectedSubcat(newSub.id);
      setQuickSubcatName('');
      setShowQuickSubcatForm(false);
      alert(`¡Subcategoría "${newSub.name}" creada y seleccionada!`);
    } catch (err) {
      alert('Error creando subcategoría: ' + err.message);
    } finally {
      setCreatingQuickSubcat(false);
    }
  };

  // Create Category in Manager Modal
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setSavingCat(true);

    const slug = newCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();

    try {
      const { data: newCat, error } = await supabase.from('categories').insert({
        name: newCatName.trim(),
        slug,
        icon: newCatIcon || '💎',
        image_url: newCatImage.trim() || null
      }).select().single();

      if (error) throw error;

      // Auto-create default subcategory
      const subSlug = slug + '-default';
      const { data: defaultSub } = await supabase.from('subcategories').insert({
        category_id: newCat.id,
        name: newCat.name,
        slug: subSlug,
        image_url: newCatImage.trim() || null
      }).select().single();

      setCategories([...categories, newCat]);
      if (defaultSub) setSubcategories([...subcategories, defaultSub]);

      setNewCatName('');
      setNewCatIcon('💎');
      setNewCatImage('');
      alert(`¡Categoría "${newCat.name}" creada con éxito!`);
    } catch (err) {
      alert('Error creando categoría: ' + err.message);
    } finally {
      setSavingCat(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (catId) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría y todas sus subcategorías asociadas?')) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', catId);
      if (error) throw error;
      setCategories(categories.filter(c => c.id !== catId));
      setSubcategories(subcategories.filter(s => s.category_id !== catId));
      if (activeCatForSubcats?.id === catId) setActiveCatForSubcats(null);
    } catch (err) {
      alert('Error eliminando categoría: ' + err.message);
    }
  };

  // Create Subcategory in Manager Modal
  const handleCreateSubcategory = async (e) => {
    e.preventDefault();
    if (!activeCatForSubcats || !newSubcatName.trim()) return;
    setSavingSubcat(true);

    const slug = newSubcatName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();

    try {
      const { data, error } = await supabase.from('subcategories').insert({
        category_id: activeCatForSubcats.id,
        name: newSubcatName.trim(),
        slug,
        image_url: newSubcatImage.trim() || null
      }).select().single();

      if (error) throw error;

      setSubcategories([...subcategories, data]);
      setNewSubcatName('');
      setNewSubcatImage('');
      alert(`¡Subcategoría "${data.name}" creada con éxito!`);
    } catch (err) {
      alert('Error creando subcategoría: ' + err.message);
    } finally {
      setSavingSubcat(false);
    }
  };

  // Delete Subcategory
  const handleDeleteSubcategory = async (subId) => {
    if (!confirm('¿Estás seguro de eliminar esta subcategoría?')) return;
    try {
      const { error } = await supabase.from('subcategories').delete().eq('id', subId);
      if (error) throw error;
      setSubcategories(subcategories.filter(s => s.id !== subId));
    } catch (err) {
      alert('Error eliminando subcategoría: ' + err.message);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (prodId) => {
    if (!confirm('¿Estás seguro de eliminar este producto del catálogo?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', prodId);
      if (error) throw error;
      setProducts(products.filter(p => p.id !== prodId));
    } catch (err) {
      alert('Error eliminando producto: ' + err.message);
    }
  };

  // Save / Update Product
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Ensure target subcategory is valid
      let finalSubcatId = selectedSubcat;
      if (!finalSubcatId && selectedCat) {
        // Find existing subcategory for this category
        const existingSub = subcategories.find(s => s.category_id === selectedCat);
        if (existingSub) {
          finalSubcatId = existingSub.id;
        } else {
          // Create default subcategory
          const targetCat = categories.find(c => c.id === selectedCat);
          const slug = (targetCat?.name || 'subcat').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
          const { data: newSub } = await supabase.from('subcategories').insert({
            category_id: selectedCat,
            name: targetCat?.name || 'General',
            slug,
            image_url: targetCat?.image_url || null
          }).select().single();
          if (newSub) {
            finalSubcatId = newSub.id;
            setSubcategories(prev => [...prev, newSub]);
          }
        }
      }

      const productPayload = {
        subcategory_id: finalSubcatId || null,
        name: name.trim(),
        description: description.trim(),
        price_public: Number(pricePublic),
        price_reseller: Number(priceReseller),
        cost: Number(cost),
        stock: Number(stock),
        image_url: imageUrl.trim() || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=60',
        button_action_text: buttonText,
        requires_validation: requiresValidation,
        validation_type: requiresValidation ? validationType : null
      };

      let targetProdId = editingProductId;

      if (editingProductId) {
        const { error: updErr } = await supabase
          .from('products')
          .update(productPayload)
          .eq('id', editingProductId);

        if (updErr) throw updErr;

        // Delete old fields to re-insert fresh dynamic fields
        await supabase.from('product_fields').delete().eq('product_id', editingProductId);
      } else {
        const { data: newProd, error: prodErr } = await supabase
          .from('products')
          .insert(productPayload)
          .select()
          .single();

        if (prodErr) throw prodErr;
        targetProdId = newProd.id;
      }

      // Insert dynamic form fields
      for (let i = 0; i < dynamicFields.length; i++) {
        if (dynamicFields[i].trim()) {
          await supabase.from('product_fields').insert({
            product_id: targetProdId,
            field_name: dynamicFields[i].trim(),
            field_type: 'text',
            is_required: true,
            sort_order: i
          });
        }
      }

      await loadData();
      setShowProductModal(false);
      alert(editingProductId ? '¡Producto actualizado con éxito!' : '¡Producto publicado exitosamente en su categoría correspondiente!');
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
            Organización por Categorías, Subcategorías, Imágenes Flexibles y 3 Niveles de Precio
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowCategoryModal(true)} className="btn-glass" style={{ fontSize: '0.85rem' }}>
            📁 Gestionar Categorías & Subcategorías ({categories.length})
          </button>
          <button
            onClick={handleOpenCreateProduct}
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
              <th style={{ padding: '10px 8px' }}>Categoría / Subcategoría</th>
              <th style={{ padding: '10px 8px' }}>Precio Público</th>
              <th style={{ padding: '10px 8px' }}>Precio Revendedor</th>
              <th style={{ padding: '10px 8px' }}>Costo Proveedor</th>
              <th style={{ padding: '10px 8px' }}>Ganancia</th>
              <th style={{ padding: '10px 8px' }}>Stock</th>
              <th style={{ padding: '10px 8px', textAlign: 'center' }}>Acciones</th>
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
                const catName = p.subcategories?.categories?.name || p.subcategories?.name;
                const catIcon = p.subcategories?.categories?.icon || '📁';
                const catImg = p.subcategories?.categories?.image_url;

                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          background: '#0d111a',
                          border: '1px solid var(--border-glass)',
                          flexShrink: 0
                        }}>
                          <img
                            src={p.image_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100'}
                            alt={p.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', color: '#fff' }}>{p.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Botón: {p.button_action_text || 'Comprar'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px 8px' }}>
                      {catName ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                          {catImg ? (
                            <img src={catImg} alt="" style={{ width: '14px', height: '14px', borderRadius: '2px', objectFit: 'cover' }} />
                          ) : (
                            <span>{catIcon}</span>
                          )}
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: '700' }}>
                            {catName} {p.subcategories?.name && p.subcategories.name !== catName ? `(${p.subcategories.name})` : ''}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                          ⚠️ Sin Categoría (Clic en Editar)
                        </span>
                      )}
                    </td>

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

                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          style={{
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            color: '#60a5fa',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#f87171',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* CATEGORY & SUBCATEGORY MANAGER MODAL */}
      {/* ========================================================================= */}
      {showCategoryModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel animate-fade" style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            border: '1px solid var(--border-cyan)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Gestor de Categorías & Subcategorías</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Asigna nombres, iconos e imágenes personalizadas para la cabecera del catálogo
                </p>
              </div>
              <button onClick={() => setShowCategoryModal(false)} style={{ background: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Create Category Form */}
            <form onSubmit={handleCreateCategory} style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--accent-cyan)' }}>
                ➕ Crear Nueva Categoría Principal:
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Ícono"
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', textAlign: 'center', fontSize: '1.1rem' }}
                />
                <input
                  type="text"
                  required
                  placeholder="Nombre (Ej. STREAMING 🎬)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                />
                <input
                  type="url"
                  placeholder="URL Imagen (Opcional)"
                  value={newCatImage}
                  onChange={(e) => setNewCatImage(e.target.value)}
                  style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>O Subir Imagen:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadFile(e, setNewCatImage, setUploadingCatImg)}
                    style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
                  />
                  {uploadingCatImg && <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Subiendo...</span>}
                </div>

                <button type="submit" disabled={savingCat} className="btn-cyan" style={{ padding: '8px 18px', fontSize: '0.82rem' }}>
                  {savingCat ? 'Guardando...' : 'Crear Categoría ➔'}
                </button>
              </div>
            </form>

            {/* Categories & Subcategories List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                Categorías Existentes ({categories.length}):
              </div>

              {categories.map((c) => {
                const subcats = subcategories.filter(s => s.category_id === c.id);
                const isSelected = activeCatForSubcats?.id === c.id;

                return (
                  <div key={c.id} style={{
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                    padding: '12px 14px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {c.image_url ? (
                          <div style={{ width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', background: '#0d111a', flexShrink: 0 }}>
                            <img src={c.image_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <span style={{ fontSize: '1.2rem' }}>{c.icon || '💎'}</span>
                        )}

                        <div>
                          <span style={{ fontWeight: '800', color: '#fff', fontSize: '0.95rem' }}>{c.name}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                            ({subcats.length} subcategorías)
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setActiveCatForSubcats(isSelected ? null : c)}
                          style={{
                            background: isSelected ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.08)',
                            color: isSelected ? '#000' : 'var(--text-main)',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          {isSelected ? 'Ocultar Subcategorías ▴' : 'Ver / Añadir Subcategorías ▾'}
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(c.id)}
                          style={{ background: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Subcategories Management Dropdown */}
                    {isSelected && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        {/* Subcategories List */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                          {subcats.map((s) => (
                            <div key={s.id} style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: '#0d111a',
                              border: '1px solid var(--border-glass)',
                              fontSize: '0.78rem'
                            }}>
                              {s.image_url && <img src={s.image_url} alt="" style={{ width: '14px', height: '14px', borderRadius: '2px', objectFit: 'cover' }} />}
                              <span>{s.name}</span>
                              <button
                                onClick={() => handleDeleteSubcategory(s.id)}
                                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.7rem' }}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Add Subcategory Form */}
                        <form onSubmit={handleCreateSubcategory} style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            required
                            placeholder={`Nueva subcategoría para ${c.name} (Ej. 100+10, Netflix...)`}
                            value={newSubcatName}
                            onChange={(e) => setNewSubcatName(e.target.value)}
                            style={{ flex: 1, padding: '7px 10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                          />
                          <input
                            type="url"
                            placeholder="URL Imagen Subcat"
                            value={newSubcatImage}
                            onChange={(e) => setNewSubcatImage(e.target.value)}
                            style={{ width: '140px', padding: '7px 10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.78rem' }}
                          />
                          <button type="submit" disabled={savingSubcat} className="btn-cyan" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                            {savingSubcat ? '...' : '➕ Añadir'}
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE / EDIT PRODUCT MODAL */}
      {/* ========================================================================= */}
      {showProductModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel animate-fade" style={{
            width: '100%',
            maxWidth: '640px',
            maxHeight: '92vh',
            overflowY: 'auto',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            border: '1px solid var(--border-cyan)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>
                  {editingProductId ? '✏️ Editar Producto' : '➕ Nuevo Producto / Recarga'}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Configura categoría, subcategoría (ej. 100+10), imagen y 3 niveles de precio
                </p>
              </div>
              <button onClick={() => setShowProductModal(false)} style={{ background: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Category Selection + Quick Create Button */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: '700' }}>
                    📁 Categoría de Destino *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickCatForm(!showQuickCatForm)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-cyan)',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {showQuickCatForm ? '✕ Cancelar' : '➕ Crear Nueva Categoría Aquí'}
                  </button>
                </div>

                {showQuickCatForm ? (
                  <div style={{
                    background: 'rgba(6, 182, 212, 0.08)',
                    border: '1px solid var(--accent-cyan)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px',
                    marginBottom: '10px',
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <input
                      type="text"
                      placeholder="Icono"
                      value={quickCatIcon}
                      onChange={(e) => setQuickCatIcon(e.target.value)}
                      style={{ width: '55px', padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', textAlign: 'center' }}
                    />
                    <input
                      type="text"
                      placeholder="Nombre (Ej. DIAMANTES 💎 o STREAMING)"
                      value={quickCatName}
                      onChange={(e) => setQuickCatName(e.target.value)}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                    />
                    <button
                      type="button"
                      disabled={creatingQuickCat}
                      onClick={handleQuickCreateCategory}
                      className="btn-cyan"
                      style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                    >
                      {creatingQuickCat ? '...' : 'Guardar'}
                    </button>
                  </div>
                ) : (
                  <select
                    required
                    value={selectedCat}
                    onChange={(e) => {
                      setSelectedCat(e.target.value);
                      setSelectedSubcat('');
                    }}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-cyan)', color: '#fff', fontWeight: '700' }}
                  >
                    <option value="">-- Seleccionar Categoría --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.icon || '💎'} {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Subcategory Selection + Quick Create Button */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                    🏷️ Subcategoría / Paquete (Ej. 100+10, 310+31, Netflix)
                  </label>
                  {selectedCat && (
                    <button
                      type="button"
                      onClick={() => setShowQuickSubcatForm(!showQuickSubcatForm)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#60a5fa',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {showQuickSubcatForm ? '✕ Cancelar' : '➕ Crear Nueva Subcategoría'}
                    </button>
                  )}
                </div>

                {showQuickSubcatForm ? (
                  <div style={{
                    background: 'rgba(96, 165, 250, 0.08)',
                    border: '1px solid #60a5fa',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px',
                    marginBottom: '10px',
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <input
                      type="text"
                      placeholder="Nombre (Ej. 100+10 o 5600+560)"
                      value={quickSubcatName}
                      onChange={(e) => setQuickSubcatName(e.target.value)}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                    />
                    <button
                      type="button"
                      disabled={creatingQuickSubcat}
                      onClick={handleQuickCreateSubcategory}
                      className="btn-cyan"
                      style={{ background: '#3b82f6', padding: '8px 14px', fontSize: '0.8rem' }}
                    >
                      {creatingQuickSubcat ? '...' : 'Guardar'}
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedSubcat}
                    onChange={(e) => setSelectedSubcat(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                  >
                    <option value="">-- General / Sin Subcategoría Específica --</option>
                    {filteredSubcategories.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Product Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 100+10 Diamantes Free Fire o Recarga 5600 Diamantes"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                />
              </div>

              {/* Product Image & Live Preview */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: '700', marginBottom: '6px' }}>
                  🖼️ Imagen del Producto (Cualquier tamaño / Aspect Ratio)
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '12px', alignItems: 'center' }}>
                  <div style={{
                    width: '100px',
                    height: '80px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    background: '#0d111a',
                    border: '1px solid var(--border-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {imageUrl ? (
                      <img src={imageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '1.8rem' }}>🎮</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input
                      type="url"
                      placeholder="Pegar URL de la imagen (Ej. https://...)"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>O Subir Archivo:</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadFile(e, setImageUrl, setUploadingImage)}
                        style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
                      />
                      {uploadingImage && <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Subiendo...</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Descripción & Instrucciones</label>
                <textarea
                  rows="2"
                  placeholder="Detalles de entrega, tiempos, etc..."
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
                    <option value="Recargar">Recargar</option>
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
                      placeholder="Ej. ID de Jugador (UID), Correo, WhatsApp..."
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
                {saving ? 'Guardando...' : editingProductId ? '💾 Actualizar Producto ➔' : 'Guardar y Publicar en Catálogo ➔'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
