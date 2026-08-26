import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

// Definición oficial de paquetes de Recargas América
const OFFICIAL_FF_CATALOG = [
  { name: '100 + 10 Diamantes Free Fire (Recarga Directa)', subcat: '100+10', price_public: 1.00, price_reseller: 0.85, cost: 0.71, is_active: true, type: 'direct' },
  { name: '310 + 31 Diamantes Free Fire (Recarga Directa)', subcat: '310+31', price_public: 2.60, price_reseller: 2.30, cost: 2.14, is_active: true, type: 'direct' },
  { name: '520 + 52 Diamantes Free Fire (Recarga Directa)', subcat: '520+52', price_public: 4.30, price_reseller: 3.80, cost: 3.62, is_active: true, type: 'direct' },
  { name: '1060 + 106 Diamantes Free Fire (Recarga Directa)', subcat: '1060+106', price_public: 7.90, price_reseller: 7.00, cost: 6.71, is_active: true, type: 'direct' },
  { name: '2180 + 218 Diamantes Free Fire (Recarga Directa)', subcat: '2180+218', price_public: 15.50, price_reseller: 14.00, cost: 13.32, is_active: true, type: 'direct' },
  { name: '5600 + 560 Diamantes Free Fire (Recarga Directa)', subcat: '5600+560', price_public: 39.00, price_reseller: 35.50, cost: 33.88, is_active: true, type: 'direct' },
  { name: 'Pin Digital Free Fire 100 Diamantes', subcat: 'Pin 100', price_public: 1.00, price_reseller: 0.85, cost: 0.71, is_active: false, type: 'pin' },
  { name: 'Pin Digital Free Fire 310 Diamantes', subcat: 'Pin 310', price_public: 2.60, price_reseller: 2.30, cost: 2.14, is_active: false, type: 'pin' },
  { name: 'Pin Digital Free Fire 520 Diamantes', subcat: 'Pin 520', price_public: 4.30, price_reseller: 3.80, cost: 3.62, is_active: false, type: 'pin' },
  { name: 'Pin Digital Free Fire 1060 Diamantes', subcat: 'Pin 1060', price_public: 7.90, price_reseller: 7.00, cost: 6.71, is_active: false, type: 'pin' },
  { name: 'Pin Digital Free Fire 2180 Diamantes', subcat: 'Pin 2180', price_public: 15.50, price_reseller: 14.00, cost: 13.32, is_active: false, type: 'pin' },
  { name: 'Pin Digital Free Fire 5600 Diamantes', subcat: 'Pin 5600', price_public: 39.00, price_reseller: 35.50, cost: 33.88, is_active: false, type: 'pin' }
];

const CACHE_KEY_CATS = 'alv_cache_categories_v2';
const CACHE_KEY_SUBS = 'alv_cache_subcategories_v2';
const CACHE_KEY_PRODS = 'alv_cache_products_v2';

const DEFAULT_FALLBACK_CATEGORIES = [
  {
    id: 'c4e3fbcf-e74f-4d64-912c-569df4be476b',
    name: 'Diamantes FF',
    icon: '💎',
    image_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
    product_count: 6
  },
  {
    id: 'likes-ff-id',
    name: 'Likes FF',
    icon: '👍',
    image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
    product_count: 7
  },
  {
    id: 'pines-ff-id',
    name: 'Pines FF',
    icon: '🎟️',
    image_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
    product_count: 3
  },
  {
    id: 'regalos-ff-id',
    name: 'REGALOS POR ID',
    icon: '🎁',
    image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
    product_count: 4
  },
  {
    id: 'bio-larga-id',
    name: 'Bio Larga FF',
    icon: '📝',
    image_url: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=600&q=80',
    product_count: 1
  }
];

const DEFAULT_SEED_PRODUCTS = [
  {
    id: 'ef5c0946-de86-428e-97f1-2222b5913184',
    name: '100 + 10 Diamantes Free Fire (Recarga Directa)',
    price_public: 1.09,
    price_reseller: 0.99,
    cost: 0.71,
    stock: 999,
    is_active: true,
    validation_type: 'Free Fire',
    image_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Recarga Directa', category_id: 'c4e3fbcf-e74f-4d64-912c-569df4be476b' }
  },
  {
    id: '86b169a9-65a8-4248-97c2-e9c0f2a4a832',
    name: '310 + 31 Diamantes Free Fire (Recarga Directa)',
    price_public: 3.29,
    price_reseller: 3.09,
    cost: 2.14,
    stock: 999,
    is_active: true,
    validation_type: 'Free Fire',
    image_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Recarga Directa', category_id: 'c4e3fbcf-e74f-4d64-912c-569df4be476b' }
  },
  {
    id: '4f7bb6b9-c17f-4bcb-84c2-a2b88d11d369',
    name: '520 + 52 Diamantes Free Fire (Recarga Directa)',
    price_public: 5.39,
    price_reseller: 4.99,
    cost: 3.62,
    stock: 999,
    is_active: true,
    validation_type: 'Free Fire',
    image_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Recarga Directa', category_id: 'c4e3fbcf-e74f-4d64-912c-569df4be476b' }
  },
  {
    id: '8f8537eb-98a2-4fef-a632-acf010cb3c85',
    name: '1060 + 106 Diamantes Free Fire (Recarga Directa)',
    price_public: 10.79,
    price_reseller: 9.99,
    cost: 6.71,
    stock: 999,
    is_active: true,
    validation_type: 'Free Fire',
    image_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Recarga Directa', category_id: 'c4e3fbcf-e74f-4d64-912c-569df4be476b' }
  },
  {
    id: '923c52eb-07af-4725-9f0a-bec1f705fddc',
    name: '2180 + 218 Diamantes Free Fire (Recarga Directa)',
    price_public: 21.49,
    price_reseller: 19.99,
    cost: 13.32,
    stock: 999,
    is_active: true,
    validation_type: 'Free Fire',
    image_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Recarga Directa', category_id: 'c4e3fbcf-e74f-4d64-912c-569df4be476b' }
  },
  {
    id: '17b06f94-9608-40e2-96a5-d24e207ddbb9',
    name: '5600 + 560 Diamantes Free Fire (Recarga Directa)',
    price_public: 52.99,
    price_reseller: 49.99,
    cost: 33.88,
    stock: 999,
    is_active: true,
    validation_type: 'Free Fire',
    image_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Recarga Directa', category_id: 'c4e3fbcf-e74f-4d64-912c-569df4be476b' }
  },
  {
    id: 'ac987ed2-e023-473a-9297-68ec32fc7d6b',
    name: 'Pin Digital Free Fire 100 Diamantes',
    price_public: 1.15,
    price_reseller: 1.05,
    cost: 0.71,
    stock: 999,
    is_active: true,
    validation_type: 'PIN',
    image_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Pines Digitales', category_id: 'pines-ff-id' }
  },
  {
    id: '9d7b55d3-f25e-411a-bc53-3894a79b9a70',
    name: 'Pin Digital Free Fire 310 Diamantes',
    price_public: 3.35,
    price_reseller: 3.15,
    cost: 2.14,
    stock: 999,
    is_active: true,
    validation_type: 'PIN',
    image_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Pines Digitales', category_id: 'pines-ff-id' }
  },
  {
    id: '773f16aa-1944-48cd-b511-395042d656ad',
    name: 'Pin Digital Free Fire 520 Diamantes',
    price_public: 5.45,
    price_reseller: 5.15,
    cost: 3.62,
    stock: 999,
    is_active: true,
    validation_type: 'PIN',
    image_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Pines Digitales', category_id: 'pines-ff-id' }
  },
  {
    id: '7ab4da9e-df66-4711-a77a-7e8d0b4365f7',
    name: '99 CAJAS EVO',
    price_public: 4.00,
    price_reseller: 3.50,
    cost: 2.50,
    stock: 999,
    is_active: true,
    validation_type: 'Free Fire',
    image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Regalos FF', category_id: 'regalos-ff-id' }
  },
  {
    id: 'e2bacb18-3220-4c13-b134-04a87e8cf034',
    name: '99 Cajas de Fragmentos',
    price_public: 3.00,
    price_reseller: 2.50,
    cost: 1.80,
    stock: 999,
    is_active: true,
    validation_type: 'Free Fire',
    image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Regalos FF', category_id: 'regalos-ff-id' }
  },
  {
    id: '672c5c36-414d-4e1e-a050-523a2809fadc',
    name: 'Skin - 6k 💎',
    price_public: 6.00,
    price_reseller: 5.50,
    cost: 4.00,
    stock: 999,
    is_active: true,
    validation_type: 'Free Fire',
    image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Regalos FF', category_id: 'regalos-ff-id' }
  },
  {
    id: 'f33d04f0-643d-4511-a72a-d40cf7f64960',
    name: 'Pase FF',
    price_public: 2.00,
    price_reseller: 1.80,
    cost: 1.20,
    stock: 999,
    is_active: true,
    validation_type: 'Free Fire',
    image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Regalos FF', category_id: 'regalos-ff-id' }
  },
  {
    id: '9f4137b0-70af-449c-97e9-520d7a105bbf',
    name: 'Bio Larga FF',
    price_public: 2.50,
    price_reseller: 2.00,
    cost: 1.00,
    stock: 999,
    is_active: true,
    validation_type: 'Free Fire',
    image_url: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=400&q=80',
    subcategories: { name: 'Bio Larga', category_id: 'bio-larga-id' }
  }
];

export default function AdminProducts() {
  const [categories, setCategories] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_CATS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_FALLBACK_CATEGORIES;
  });

  const [subcategories, setSubcategories] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_SUBS);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  const [products, setProducts] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_PRODS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_SEED_PRODUCTS;
  });

  const [loading, setLoading] = useState(false);
  const [syncingCatalog, setSyncingCatalog] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all', 'direct', 'pin', 'other'

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
  const [isActive, setIsActive] = useState(true);
  const [dynamicFields, setDynamicFields] = useState(['ID de Jugador (UID)']);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Inline Category & Subcategory Quick-Creation inside Product Modal
  const [showQuickCatForm, setShowQuickCatForm] = useState(false);
  const [quickCatName, setQuickCatName] = useState('');
  const [quickCatIcon, setQuickCatIcon] = useState('💎');
  const [quickCatImage, setQuickCatImage] = useState('');
  const [uploadingQuickCatImg, setUploadingQuickCatImg] = useState(false);
  const [creatingQuickCat, setCreatingQuickCat] = useState(false);

  const [showQuickSubcatForm, setShowQuickSubcatForm] = useState(false);
  const [quickSubcatName, setQuickSubcatName] = useState('');
  const [quickSubcatImage, setQuickSubcatImage] = useState('');
  const [uploadingQuickSubcatImg, setUploadingQuickSubcatImg] = useState(false);
  const [creatingQuickSubcat, setCreatingQuickSubcat] = useState(false);

  // Modal State for Full Categories & Subcategories Manager
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('💎');
  const [newCatImage, setNewCatImage] = useState('');
  const [uploadingCatImg, setUploadingCatImg] = useState(false);
  const [savingCat, setSavingCat] = useState(false);

  // Category Edit State
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatIcon, setEditingCatIcon] = useState('💎');
  const [editingCatImage, setEditingCatImage] = useState('');
  const [savingEditCat, setSavingEditCat] = useState(false);

  // Subcategory management state inside Category Modal
  const [activeCatForSubcats, setActiveCatForSubcats] = useState(null);
  const [newSubcatName, setNewSubcatName] = useState('');
  const [newSubcatImage, setNewSubcatImage] = useState('');
  const [savingSubcat, setSavingSubcat] = useState(false);

  const loadData = async () => {
    try {
      // Parallel fast flat fetch with timeout protection
      const fetchPromise = Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('subcategories').select('*').order('name'),
        supabase.from('products').select('*').order('created_at', { ascending: false })
      ]);

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network Timeout')), 5000)
      );

      const [catsRes, subsRes, prodsRes] = await Promise.race([fetchPromise, timeoutPromise]);

      const catData = (catsRes.data && catsRes.data.length > 0) ? catsRes.data : DEFAULT_FALLBACK_CATEGORIES;
      const subcatData = subsRes.data || [];
      const rawProdData = (prodsRes.data && prodsRes.data.length > 0) ? prodsRes.data : DEFAULT_SEED_PRODUCTS;

      setCategories(catData);
      setSubcategories(subcatData);

      // Fast JS Memory join
      const catMap = new Map(catData.map(c => [c.id, c]));
      const subMap = new Map(subcatData.map(s => [s.id, { ...s, categories: catMap.get(s.category_id) }]));
      const prodData = rawProdData.map(p => ({
        ...p,
        subcategories: subMap.get(p.subcategory_id) || p.subcategories
      }));

      // Deduplicate in memory by product name
      const uniqueMap = new Map();
      const duplicatesToDelete = [];

      prodData.forEach(p => {
        const cleanName = p.name.trim().toLowerCase();
        if (!uniqueMap.has(cleanName)) {
          uniqueMap.set(cleanName, p);
        } else {
          duplicatesToDelete.push(p.id);
        }
      });

      const finalProducts = Array.from(uniqueMap.values());
      setProducts(finalProducts);

      try {
        localStorage.setItem(CACHE_KEY_CATS, JSON.stringify(catData));
        localStorage.setItem(CACHE_KEY_SUBS, JSON.stringify(subcatData));
        localStorage.setItem(CACHE_KEY_PRODS, JSON.stringify(finalProducts));
      } catch (e) {}

    } catch (err) {
      console.warn('Usando catálogo en memoria/fallback debido a red lenta:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSubcategories = subcategories.filter(s => s.category_id === selectedCat);

  // Instant Availability Toggle Switch
  const handleToggleProductActive = async (prodId, currentStatus) => {
    const newStatus = !currentStatus;
    setProducts(prev => prev.map(p => p.id === prodId ? { ...p, is_active: newStatus } : p));
    try {
      const { error } = await supabase.from('products').update({ is_active: newStatus }).eq('id', prodId);
      if (error) throw error;
    } catch (err) {
      alert('Error cambiando disponibilidad: ' + err.message);
      loadData();
    }
  };

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
    setDynamicFields(dynamicFields.filter((_, i) => i !== index));
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
    setIsActive(true);
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
    setIsActive(prod.is_active !== false);
    setShowQuickCatForm(false);
    setShowQuickSubcatForm(false);

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

  // Quick Inline Category Creation with Photo
  const handleQuickCreateCategory = async (e) => {
    e.preventDefault();
    if (!quickCatName.trim()) return;
    setCreatingQuickCat(true);

    const slug = quickCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();

    try {
      const { data: newCat, error } = await supabase.from('categories').insert({
        name: quickCatName.trim(),
        slug,
        icon: quickCatIcon || '💎',
        image_url: quickCatImage.trim() || null
      }).select().single();

      if (error) throw error;

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
      setQuickCatImage('');
      setShowQuickCatForm(false);
      alert(`¡Categoría "${newCat.name}" creada y seleccionada con éxito!`);
    } catch (err) {
      alert('Error creando categoría: ' + err.message);
    } finally {
      setCreatingQuickCat(false);
    }
  };

  // Direct Photo Upload for Selected Category in Product Form
  const handleUploadSelectedCatPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCat) return;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `cat_${selectedCat}_${Date.now()}.${fileExt}`;
      const filePath = `categories/${fileName}`;

      const reader = new FileReader();
      reader.onloadend = async () => {
        const photoUrl = reader.result;
        await supabase.from('categories').update({ image_url: photoUrl }).eq('id', selectedCat);
        setCategories(prev => prev.map(c => c.id === selectedCat ? { ...c, image_url: photoUrl } : c));
      };
      reader.readAsDataURL(file);

      try {
        const { error: upErr } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
        if (!upErr) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
          if (data?.publicUrl) {
            await supabase.from('categories').update({ image_url: data.publicUrl }).eq('id', selectedCat);
            setCategories(prev => prev.map(c => c.id === selectedCat ? { ...c, image_url: data.publicUrl } : c));
          }
        }
      } catch (stErr) {}

      alert('¡Foto de la categoría actualizada con éxito!');
    } catch (err) {
      alert('Error al subir foto de la categoría: ' + err.message);
    }
  };

  // Direct Photo Upload for Selected Subcategory in Product Form
  const handleUploadSelectedSubcatPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSubcat) return;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `subcat_${selectedSubcat}_${Date.now()}.${fileExt}`;
      const filePath = `subcategories/${fileName}`;

      const reader = new FileReader();
      reader.onloadend = async () => {
        const photoUrl = reader.result;
        await supabase.from('subcategories').update({ image_url: photoUrl }).eq('id', selectedSubcat);
        setSubcategories(prev => prev.map(s => s.id === selectedSubcat ? { ...s, image_url: photoUrl } : s));
      };
      reader.readAsDataURL(file);

      try {
        const { error: upErr } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
        if (!upErr) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
          if (data?.publicUrl) {
            await supabase.from('subcategories').update({ image_url: data.publicUrl }).eq('id', selectedSubcat);
            setSubcategories(prev => prev.map(s => s.id === selectedSubcat ? { ...s, image_url: data.publicUrl } : s));
          }
        }
      } catch (stErr) {}

      alert('¡Foto de la subcategoría actualizada con éxito!');
    } catch (err) {
      alert('Error al subir foto de la subcategoría: ' + err.message);
    }
  };

  // Direct Button Text Updater for Category
  const handleUpdateCatButtonText = async (catId, buttonText) => {
    try {
      await supabase.from('categories').update({ button_text: buttonText }).eq('id', catId);
      setCategories(prev => prev.map(c => c.id === catId ? { ...c, button_text: buttonText } : c));
      alert('✅ ¡Texto del botón de categoría guardado!');
    } catch (err) {
      // Fallback in local state if column doesn't exist
      setCategories(prev => prev.map(c => c.id === catId ? { ...c, button_text: buttonText } : c));
    }
  };

  // Direct Button Text Updater for Subcategory
  const handleUpdateSubcatButtonText = async (subcatId, buttonText) => {
    try {
      await supabase.from('subcategories').update({ button_text: buttonText }).eq('id', subcatId);
      setSubcategories(prev => prev.map(s => s.id === subcatId ? { ...s, button_text: buttonText } : s));
      alert('✅ ¡Texto del botón de subcategoría guardado!');
    } catch (err) {
      setSubcategories(prev => prev.map(s => s.id === subcatId ? { ...s, button_text: buttonText } : s));
    }
  };

  // Quick Inline Subcategory Creation with Photo
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
        slug,
        image_url: quickSubcatImage.trim() || null
      }).select().single();

      if (error) throw error;

      setSubcategories(prev => [...prev, newSub]);
      setSelectedSubcat(newSub.id);
      setQuickSubcatName('');
      setQuickSubcatImage('');
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

  // Upload/Process Category Photo
  const handleCatPhotoUpload = async (e, isEditing = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCatImg(true);
    try {
      // 1. Convert to DataURL for instant base
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEditing) setEditingCatImage(reader.result);
        else setNewCatImage(reader.result);
      };
      reader.readAsDataURL(file);

      // 2. Try Supabase storage
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `categories/${fileName}`;
        const { error: upErr } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
        if (!upErr) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
          if (data?.publicUrl) {
            if (isEditing) setEditingCatImage(data.publicUrl);
            else setNewCatImage(data.publicUrl);
          }
        }
      } catch (stErr) {}
    } catch (err) {
      console.warn('Error uploading category photo:', err);
    } finally {
      setUploadingCatImg(false);
    }
  };

  // Save Edited Category
  const handleSaveEditCategory = async (catId) => {
    if (!editingCatName.trim()) return;
    setSavingEditCat(true);
    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name: editingCatName.trim(),
          icon: editingCatIcon || '💎',
          image_url: editingCatImage.trim() || null
        })
        .eq('id', catId);

      if (error) throw error;

      setCategories(prev => prev.map(c => c.id === catId ? {
        ...c,
        name: editingCatName.trim(),
        icon: editingCatIcon || '💎',
        image_url: editingCatImage.trim() || null
      } : c));

      setEditingCatId(null);
      alert('¡Categoría actualizada con éxito!');
      loadData();
    } catch (err) {
      alert('Error actualizando categoría: ' + err.message);
    } finally {
      setSavingEditCat(false);
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
      loadData();
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

  // Sincronización & Limpieza de Duplicados
  const handleSyncFreeFireCatalog = async () => {
    setSyncingCatalog(true);
    try {
      // 1. Obtener o crear Categoría Principal
      let { data: catList } = await supabase.from('categories').select('*');
      let catId = catList?.find(c => c.name.toLowerCase().includes('diamante') || c.name.toLowerCase().includes('free fire'))?.id;
      
      if (!catId) {
        const { data: newCat, error: catErr } = await supabase.from('categories').insert({
          name: 'Free Fire',
          slug: 'free-fire',
          icon: '💎'
        }).select().single();
        if (catErr) throw catErr;
        catId = newCat.id;
      }

      // 2. Limpiar Subcategorías Duplicadas (Dejar exactamente 1 por cada nombre oficial)
      const { data: existingSubs } = await supabase.from('subcategories').select('*');
      const uniqueSubNames = ['100+10', '310+31', '520+52', '1060+106', '2180+218', '5600+560'];
      const subMap = {};

      for (const sName of uniqueSubNames) {
        const matches = (existingSubs || []).filter(s => s.name.trim().toLowerCase() === sName.toLowerCase());
        if (matches.length > 0) {
          // Mantener la primera
          subMap[sName] = matches[0].id;
          // Eliminar duplicadas si hay más de 1
          if (matches.length > 1) {
            const duplicateIds = matches.slice(1).map(m => m.id);
            await supabase.from('subcategories').delete().in('id', duplicateIds);
          }
        } else {
          // Crear nueva limpia
          const { data: createdSub } = await supabase.from('subcategories').insert({
            category_id: catId,
            name: sName,
            slug: 'ff-' + sName.replace('+', '-')
          }).select().single();
          if (createdSub) subMap[sName] = createdSub.id;
        }
      }

      // Eliminar subcategorías de Pines o huérfanas que no sean las 6 oficiales
      const invalidSubs = (existingSubs || []).filter(s => !uniqueSubNames.some(u => u.toLowerCase() === s.name.trim().toLowerCase()));
      if (invalidSubs.length > 0) {
        await supabase.from('subcategories').delete().in('id', invalidSubs.map(i => i.id));
      }

      // 3. Crear o Actualizar los 6 Productos Oficiales de Recarga Directa (Activos)
      const { data: currentProds } = await supabase.from('products').select('*');

      for (const item of OFFICIAL_FF_CATALOG) {
        const matches = (currentProds || []).filter(p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase());
        const correctSubId = subMap[item.subcat] || null;

        if (matches.length > 0) {
          // Actualizar producto principal a Activo con su subcategoría correcta
          const primaryProd = matches[0];
          await supabase.from('products').update({
            subcategory_id: correctSubId,
            is_active: item.is_active,
            price_public: item.price_public,
            price_reseller: item.price_reseller,
            cost: item.cost,
            requires_validation: true,
            validation_type: 'Free Fire',
            button_action_text: 'Solicitar'
          }).eq('id', primaryProd.id);

          // Eliminar productos duplicados si hay más de 1 con el mismo nombre
          if (matches.length > 1) {
            const dupProdIds = matches.slice(1).map(m => m.id);
            await supabase.from('products').delete().in('id', dupProdIds);
          }
        } else {
          // Insertar nuevo producto
          const { data: newP } = await supabase.from('products').insert({
            subcategory_id: correctSubId,
            name: item.name,
            description: 'Recarga rápida directa a tu cuenta de Free Fire por UID. Entrega automatizada e inmediata.',
            price_public: item.price_public,
            price_reseller: item.price_reseller,
            cost: item.cost,
            stock: 999,
            is_active: item.is_active,
            image_url: item.type === 'direct'
              ? 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=60'
              : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60',
            requires_validation: true,
            validation_type: 'Free Fire',
            button_action_text: 'Solicitar'
          }).select().single();

          if (newP) {
            await supabase.from('product_fields').insert({
              product_id: newP.id,
              field_name: 'ID de Jugador (UID)',
              field_type: 'text',
              is_required: true,
              sort_order: 0
            });
          }
        }
      }

      await loadData();
      alert('✅ ¡Catálogo Reparado y Duplicados Eliminados con Éxito!\n\n💎 6 Paquetes Únicos de Recarga Directa Activos y Visibles en la Tienda.\n🧹 Subcategorías duplicadas depuradas.');
    } catch (err) {
      alert('Error reparando catálogo: ' + err.message);
    } finally {
      setSyncingCatalog(false);
    }
  };

  // Save / Update Product
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      let finalSubcatId = selectedSubcat;
      if (!finalSubcatId && selectedCat) {
        const existingSub = subcategories.find(s => s.category_id === selectedCat);
        if (existingSub) {
          finalSubcatId = existingSub.id;
        } else {
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
        is_active: isActive,
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
      alert(editingProductId ? '¡Producto actualizado con éxito!' : '¡Producto publicado exitosamente!');
    } catch (err) {
      alert('Error guardando producto: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Filtered Products for the table
  const displayedProducts = products.filter(p => {
    const isDirect = p.name.toLowerCase().includes('directa') || (p.name.toLowerCase().includes('diamante') && !p.name.toLowerCase().includes('pin'));
    const isPin = p.name.toLowerCase().includes('pin');

    if (filterType === 'direct') return isDirect;
    if (filterType === 'pin') return isPin;
    if (filterType === 'other') return !isDirect && !isPin;
    return true;
  });

  const directCount = products.filter(p => p.name.toLowerCase().includes('directa') || (p.name.toLowerCase().includes('diamante') && !p.name.toLowerCase().includes('pin'))).length;
  const pinCount = products.filter(p => p.name.toLowerCase().includes('pin')).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🛍️</span> Catálogo de Productos & Recargas América
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Gestiona la visibilidad pública con el switch, edita precios de venta y ajusta paquetes
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleSyncFreeFireCatalog}
            disabled={syncingCatalog}
            className="btn-cyan"
            style={{ fontSize: '0.82rem', background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' }}
          >
            {syncingCatalog ? 'Sincronizando...' : '⚡ Sincronizar Paquetes de Recargas'}
          </button>
          <button onClick={() => setShowCategoryModal(true)} className="btn-glass" style={{ fontSize: '0.82rem' }}>
            📁 Categorías ({categories.length})
          </button>
          <button
            onClick={handleOpenCreateProduct}
            className="btn-cyan"
            style={{ fontSize: '0.82rem' }}
          >
            ➕ Crear Nuevo Producto
          </button>
        </div>
      </div>

      {/* Recargas América Status Highlight Banner */}
      <div className="glass-panel" style={{
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        border: '1px solid var(--border-cyan)',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(30, 58, 138, 0.3) 100%)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.8rem' }}>💎</span>
          <div>
            <div style={{ fontWeight: '800', color: '#fff', fontSize: '0.95rem' }}>
              Integración Oficial: Recargas América (API Conectada)
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              🟢 <strong>Recargas Directas:</strong> Activas y visibles para comprar por UID. | 🔴 <strong>Pines Digitales:</strong> Ocultos por defecto (actívalos con el switch cuando gustes).
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', fontSize: '0.75rem', fontWeight: '800' }}>
            6 Directas ({directCount})
          </span>
          <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '0.75rem', fontWeight: '800' }}>
            6 Pines ({pinCount})
          </span>
        </div>
      </div>

      {/* Filter Tabs for Easy Management */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: `Todos los Productos (${products.length})`, icon: '🌐' },
          { key: 'direct', label: `💎 Recargas Directas (${directCount})`, icon: '💎' },
          { key: 'pin', label: `📦 Pines Digitales (${pinCount})`, icon: '📦' },
          { key: 'other', label: `📁 Otras Categorías (${products.length - directCount - pinCount})`, icon: '📁' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            style={{
              padding: '7px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              background: filterType === tab.key ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
              color: filterType === tab.key ? '#000' : 'var(--text-main)',
              border: filterType === tab.key ? 'none' : '1px solid var(--border-glass)'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Products Table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '20px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '10px 8px' }}>Producto</th>
              <th style={{ padding: '10px 8px' }}>Categoría / Paquete</th>
              <th style={{ padding: '10px 8px' }}>Precio Público</th>
              <th style={{ padding: '10px 8px' }}>Precio Revendedor</th>
              <th style={{ padding: '10px 8px' }}>Costo Proveedor</th>
              <th style={{ padding: '10px 8px' }}>Tu Ganancia</th>
              <th style={{ padding: '10px 8px' }}>Stock</th>
              <th style={{ padding: '10px 8px', textAlign: 'center' }}>Visibilidad en Catálogo</th>
              <th style={{ padding: '10px 8px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Cargando catálogo...
                </td>
              </tr>
            ) : displayedProducts.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No se encontraron productos en esta vista. Haz clic en "⚡ Sincronizar Paquetes de Recargas".
                </td>
              </tr>
            ) : (
              displayedProducts.map((p) => {
                const margin = (Number(p.price_public) - Number(p.cost)).toFixed(2);
                const catName = p.subcategories?.categories?.name || p.subcategories?.name;
                const catIcon = p.subcategories?.categories?.icon || '📁';
                const catImg = p.subcategories?.categories?.image_url;
                const isProductActive = p.is_active !== false;

                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', opacity: isProductActive ? 1 : 0.65 }}>
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
                          ⚠️ Sin Categoría
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '12px 8px', color: 'var(--accent-cyan)', fontWeight: '800' }}>
                      ${Number(p.price_public).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 8px', color: '#60a5fa', fontWeight: '700' }}>
                      ${Number(p.price_reseller).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 8px', color: '#f87171' }}>
                      ${Number(p.cost).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 8px', color: '#34d399', fontWeight: '800' }}>
                      +${margin}
                    </td>
                    <td style={{ padding: '12px 8px' }}>{p.stock} u.</td>

                    {/* Quick Visibility Switch Button */}
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleProductActive(p.id, isProductActive)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: isProductActive ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: isProductActive ? '#34d399' : '#f87171',
                          border: isProductActive ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                          transition: 'all 0.2s ease'
                        }}
                        title={isProductActive ? 'Clic para ocultar del catálogo público' : 'Clic para hacer visible en el catálogo público'}
                      >
                        <span>{isProductActive ? '🟢' : '🔴'}</span>
                        <span>{isProductActive ? 'Visible al Público' : 'Oculto'}</span>
                      </button>
                    </td>

                    {/* Actions: Edit & Delete */}
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          style={{
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            color: '#60a5fa',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: '700'
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
                            padding: '5px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.78rem'
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
              <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
                ➕ Crear Nueva Categoría Principal
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Icono</label>
                  <input
                    type="text"
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', textAlign: 'center' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Nombre</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Streaming, Free Fire..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Foto / Banner de la Categoría</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="https://... o sube foto"
                      value={newCatImage}
                      onChange={(e) => setNewCatImage(e.target.value)}
                      style={{ flex: 1, padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                    />
                    <label style={{
                      padding: '8px 12px',
                      borderRadius: '4px',
                      background: 'rgba(6, 182, 212, 0.15)',
                      border: '1px solid var(--border-cyan)',
                      color: 'var(--accent-cyan)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      whiteSpace: 'nowrap'
                    }}>
                      📁 {uploadingCatImg ? '...' : 'Subir'}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleCatPhotoUpload(e, false)}
                      />
                    </label>
                  </div>
                </div>
              </div>
              <button type="submit" disabled={savingCat || uploadingCatImg} className="btn-cyan" style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '0.8rem' }}>
                {savingCat ? 'Creando...' : '➕ Guardar Categoría'}
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {categories.map((cat) => {
                const subsForCat = subcategories.filter(s => s.category_id === cat.id);
                const isSelectedForSub = activeCatForSubcats?.id === cat.id;
                const isEditingThisCat = editingCatId === cat.id;

                return (
                  <div key={cat.id} style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: isEditingThisCat ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px'
                  }}>
                    {isEditingThisCat ? (
                      /* Edit Category Inline Form */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>
                          ✏️ Editar Categoría: {cat.name}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px' }}>
                          <input
                            type="text"
                            value={editingCatIcon}
                            onChange={(e) => setEditingCatIcon(e.target.value)}
                            placeholder="Ícono"
                            style={{ padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', textAlign: 'center' }}
                          />
                          <input
                            type="text"
                            value={editingCatName}
                            onChange={(e) => setEditingCatName(e.target.value)}
                            placeholder="Nombre de la categoría"
                            style={{ padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                            Foto / Banner de la Categoría:
                          </label>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="text"
                              value={editingCatImage}
                              onChange={(e) => setEditingCatImage(e.target.value)}
                              placeholder="URL de la imagen"
                              style={{ flex: 1, padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                            />
                            <label style={{
                              padding: '8px 12px',
                              borderRadius: '4px',
                              background: 'rgba(6, 182, 212, 0.15)',
                              border: '1px solid var(--border-cyan)',
                              color: 'var(--accent-cyan)',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              whiteSpace: 'nowrap'
                            }}>
                              📁 {uploadingCatImg ? '...' : 'Subir'}
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => handleCatPhotoUpload(e, true)}
                              />
                            </label>
                          </div>
                          {editingCatImage && (
                            <img src={editingCatImage} alt="Preview" style={{ width: '80px', height: '45px', objectFit: 'cover', borderRadius: '4px', marginTop: '6px', border: '1px solid var(--border-cyan)' }} />
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <button
                            type="button"
                            disabled={savingEditCat}
                            onClick={() => handleSaveEditCategory(cat.id)}
                            className="btn-cyan"
                            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                          >
                            {savingEditCat ? 'Guardando...' : '💾 Guardar Cambios'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCatId(null)}
                            className="btn-glass"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Category Row */
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {cat.image_url ? (
                            <img
                              src={cat.image_url}
                              alt={cat.name}
                              style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border-cyan)' }}
                            />
                          ) : (
                            <span style={{ fontSize: '1.4rem' }}>{cat.icon || '📁'}</span>
                          )}
                          <div>
                            <strong style={{ color: '#fff' }}>{cat.name}</strong>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                              ({subsForCat.length} subcategorías)
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCatId(cat.id);
                              setEditingCatName(cat.name);
                              setEditingCatIcon(cat.icon || '💎');
                              setEditingCatImage(cat.image_url || '');
                            }}
                            className="btn-glass"
                            style={{ padding: '4px 10px', fontSize: '0.75rem', color: 'var(--accent-cyan)' }}
                          >
                            ✏️ Editar Foto / Info
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveCatForSubcats(isSelectedForSub ? null : cat)}
                            className="btn-glass"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            {isSelectedForSub ? 'Ocultar' : '➕ Subcategorías'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.id)}
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    )}

                    {isSelectedForSub && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-glass)' }}>
                        <form onSubmit={handleCreateSubcategory} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                          <input
                            type="text"
                            required
                            placeholder="Nueva Subcategoría (ej. 100+10, Netflix)"
                            value={newSubcatName}
                            onChange={(e) => setNewSubcatName(e.target.value)}
                            style={{ flex: 1, padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                          />
                          <button type="submit" disabled={savingSubcat} className="btn-cyan" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                            {savingSubcat ? '...' : '➕ Añadir'}
                          </button>
                        </form>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {subsForCat.map((sub) => (
                            <span key={sub.id} style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '14px',
                              background: 'rgba(6, 182, 212, 0.1)',
                              border: '1px solid rgba(6, 182, 212, 0.3)',
                              fontSize: '0.75rem',
                              color: 'var(--accent-cyan)'
                            }}>
                              {sub.name}
                              <button
                                type="button"
                                onClick={() => handleDeleteSubcategory(sub.id)}
                                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem' }}
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
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
      {/* PRODUCT CREATE / EDIT MODAL */}
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
            maxWidth: '650px',
            maxHeight: '92vh',
            overflowY: 'auto',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            border: '1px solid var(--border-cyan)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0, color: '#fff' }}>
                {editingProductId ? '✏️ Editar Producto & Precio' : '➕ Crear Nuevo Producto'}
              </h3>
              <button onClick={() => setShowProductModal(false)} style={{ background: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Category and Subcategory Selector */}
              <div style={{ background: 'rgba(6, 182, 212, 0.04)', border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: '700', marginBottom: '4px' }}>
                      📁 Categoría Principal *
                    </label>
                    <select
                      value={selectedCat}
                      onChange={(e) => {
                        setSelectedCat(e.target.value);
                        setSelectedSubcat('');
                      }}
                      style={{ width: '100%', padding: '9px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                    >
                      <option value="">Selecciona Categoría...</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.icon || '📁'} {c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: '700', marginBottom: '4px' }}>
                      📂 Subcategoría (Paquete)
                    </label>
                    <select
                      value={selectedSubcat}
                      onChange={(e) => setSelectedSubcat(e.target.value)}
                      style={{ width: '100%', padding: '9px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                    >
                      <option value="">General / Misma Categoría</option>
                      {filteredSubcategories.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Selected Category Photo / Image Live Editor */}
                {selectedCat && (() => {
                  const currentCatObj = categories.find(c => c.id === selectedCat);
                  if (!currentCatObj) return null;
                  return (
                    <div style={{
                      marginTop: '8px',
                      marginBottom: '10px',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-glass)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '6px',
                          background: '#0d111a',
                          border: '1px solid var(--border-cyan)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          fontSize: '1.2rem',
                          flexShrink: 0
                        }}>
                          {currentCatObj.image_url ? (
                            <img src={currentCatObj.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span>{currentCatObj.icon || '📁'}</span>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#fff' }}>
                            {currentCatObj.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: currentCatObj.image_url ? '#34d399' : '#fbbf24' }}>
                            {currentCatObj.image_url ? '✅ Foto de Categoría Asignada' : '⚠️ Sin Foto de Categoría'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Custom Button Text on Category Card */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="text"
                            placeholder="Texto Botón (ej. Explorar)"
                            defaultValue={currentCatObj.button_text || ''}
                            id={`cat-btn-text-${currentCatObj.id}`}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '4px',
                              background: '#0d111a',
                              border: '1px solid var(--border-glass)',
                              color: '#fff',
                              fontSize: '0.75rem',
                              width: '140px'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = document.getElementById(`cat-btn-text-${currentCatObj.id}`)?.value;
                              handleUpdateCatButtonText(currentCatObj.id, val);
                            }}
                            className="btn-cyan"
                            style={{ padding: '5px 8px', fontSize: '0.72rem' }}
                            title="Guardar texto del botón"
                          >
                            💾
                          </button>
                        </div>

                        <label style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          background: 'rgba(6, 182, 212, 0.15)',
                          border: '1px solid var(--border-cyan)',
                          color: 'var(--accent-cyan)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          📸 Subir Foto
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleUploadSelectedCatPhoto}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })()}

                {/* Selected Subcategory Photo / Image Live Editor */}
                {selectedSubcat && (() => {
                  const currentSubcatObj = subcategories.find(s => s.id === selectedSubcat);
                  if (!currentSubcatObj) return null;
                  return (
                    <div style={{
                      marginTop: '8px',
                      marginBottom: '10px',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-glass)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '6px',
                          background: '#0d111a',
                          border: '1px solid #34d399',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          fontSize: '1.2rem',
                          flexShrink: 0
                        }}>
                          {currentSubcatObj.image_url ? (
                            <img src={currentSubcatObj.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span>📁</span>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#fff' }}>
                            Subcategoría: {currentSubcatObj.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: currentSubcatObj.image_url ? '#34d399' : '#fbbf24' }}>
                            {currentSubcatObj.image_url ? '✅ Foto de Subcategoría Asignada' : '⚠️ Sin Foto de Subcategoría'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Custom Button Text on Subcategory Card */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="text"
                            placeholder="Texto Botón (ej. Comprar)"
                            defaultValue={currentSubcatObj.button_text || ''}
                            id={`subcat-btn-text-${currentSubcatObj.id}`}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '4px',
                              background: '#0d111a',
                              border: '1px solid var(--border-glass)',
                              color: '#fff',
                              fontSize: '0.75rem',
                              width: '140px'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = document.getElementById(`subcat-btn-text-${currentSubcatObj.id}`)?.value;
                              handleUpdateSubcatButtonText(currentSubcatObj.id, val);
                            }}
                            className="btn-cyan"
                            style={{ padding: '5px 8px', fontSize: '0.72rem' }}
                            title="Guardar texto del botón"
                          >
                            💾
                          </button>
                        </div>

                        <label style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          background: 'rgba(52, 211, 153, 0.15)',
                          border: '1px solid rgba(52, 211, 153, 0.4)',
                          color: '#34d399',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          📸 Subir Foto
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleUploadSelectedSubcatPhoto}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickCatForm(!showQuickCatForm);
                      setShowQuickSubcatForm(false);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.75rem', cursor: 'pointer', padding: '2px 6px', fontWeight: '700' }}
                  >
                    {showQuickCatForm ? '✕ Cancelar' : '➕ Crear Nueva Categoría con Foto'}
                  </button>
                  <span style={{ color: 'var(--border-glass)' }}>|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickSubcatForm(!showQuickSubcatForm);
                      setShowQuickCatForm(false);
                    }}
                    style={{ background: 'none', border: 'none', color: '#34d399', fontSize: '0.75rem', cursor: 'pointer', padding: '2px 6px', fontWeight: '700' }}
                  >
                    {showQuickSubcatForm ? '✕ Cancelar' : '➕ Crear Nueva Subcategoría con Foto'}
                  </button>
                </div>

                {/* Quick Create Category Form with Photo Upload */}
                {showQuickCatForm && (
                  <div style={{ marginTop: '10px', padding: '12px', background: '#0d111a', borderRadius: '6px', border: '1px solid var(--border-cyan)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: '800' }}>
                      ➕ Nueva Categoría Principal:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="💎"
                        value={quickCatIcon}
                        onChange={(e) => setQuickCatIcon(e.target.value)}
                        style={{ padding: '6px', borderRadius: '4px', background: '#131a26', border: '1px solid var(--border-glass)', color: '#fff', textAlign: 'center' }}
                      />
                      <input
                        type="text"
                        placeholder="Nombre de la Categoría (ej. Cuentas Streaming)"
                        value={quickCatName}
                        onChange={(e) => setQuickCatName(e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: '4px', background: '#131a26', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="URL de Foto de Categoría o sube archivo"
                        value={quickCatImage}
                        onChange={(e) => setQuickCatImage(e.target.value)}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '4px', background: '#131a26', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                      />
                      <label style={{
                        padding: '6px 10px',
                        borderRadius: '4px',
                        background: 'rgba(6, 182, 212, 0.15)',
                        border: '1px solid var(--border-cyan)',
                        color: 'var(--accent-cyan)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        whiteSpace: 'nowrap'
                      }}>
                        📁 {uploadingQuickCatImg ? '...' : 'Subir'}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingQuickCatImg(true);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setQuickCatImage(reader.result);
                              setUploadingQuickCatImg(false);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      <button type="button" onClick={handleQuickCreateCategory} disabled={creatingQuickCat || uploadingQuickCatImg} className="btn-cyan" style={{ padding: '6px 14px', fontSize: '0.75rem' }}>
                        {creatingQuickCat ? 'Guardando...' : '💾 Guardar'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Create Subcategory Form with Photo Upload */}
                {showQuickSubcatForm && (
                  <div style={{ marginTop: '10px', padding: '12px', background: '#0d111a', borderRadius: '6px', border: '1px solid #34d399', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '800' }}>
                      ➕ Nueva Subcategoría (Paquete) para {categories.find(c => c.id === selectedCat)?.name || 'Categoría'}:
                    </div>
                    <input
                      type="text"
                      placeholder="Nombre Subcategoría (ej. 2180+218 Diamantes)"
                      value={quickSubcatName}
                      onChange={(e) => setQuickSubcatName(e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '4px', background: '#131a26', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="URL de Foto de Subcategoría (opcional)"
                        value={quickSubcatImage}
                        onChange={(e) => setQuickSubcatImage(e.target.value)}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '4px', background: '#131a26', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                      />
                      <label style={{
                        padding: '6px 10px',
                        borderRadius: '4px',
                        background: 'rgba(52, 211, 153, 0.15)',
                        border: '1px solid rgba(52, 211, 153, 0.4)',
                        color: '#34d399',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        whiteSpace: 'nowrap'
                      }}>
                        📁 {uploadingQuickSubcatImg ? '...' : 'Subir'}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingQuickSubcatImg(true);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setQuickSubcatImage(reader.result);
                              setUploadingQuickSubcatImg(false);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      <button type="button" onClick={handleQuickCreateSubcategory} disabled={creatingQuickSubcat || uploadingQuickSubcatImg} className="btn-cyan" style={{ padding: '6px 14px', fontSize: '0.75rem', background: '#059669', color: '#fff' }}>
                        {creatingQuickSubcat ? 'Guardando...' : '💾 Guardar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Name & Button Action Text */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Nombre del Producto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 100 + 10 Diamantes Free Fire"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%', padding: '9px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Texto Botón</label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    style={{ width: '100%', padding: '9px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Visibility Switch inside modal */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '6px', background: isActive ? 'rgba(52, 211, 153, 0.08)' : 'rgba(239, 68, 68, 0.08)', border: isActive ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '800', color: isActive ? '#34d399' : '#f87171' }}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#06b6d4' }}
                  />
                  <span>{isActive ? '🟢 Producto Visible para el Público en el Catálogo' : '🔴 Producto Oculto (Desactivado para el Público)'}</span>
                </label>
              </div>

              {/* 3 Price Levels & Stock */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--accent-cyan)', marginBottom: '2px', fontWeight: '700' }}>Público ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="1.00"
                    value={pricePublic}
                    onChange={(e) => setPricePublic(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#60a5fa', marginBottom: '2px', fontWeight: '700' }}>Revendedor ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.85"
                    value={priceReseller}
                    onChange={(e) => setPriceReseller(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#f87171', marginBottom: '2px', fontWeight: '700' }}>Costo ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.71"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Stock (u.)</label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Image Input & Upload */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Imagen del Producto</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="URL de imagen..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                  />
                  <label style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-glass)',
                    color: 'var(--text-main)',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}>
                    {uploadingImage ? 'Subiendo...' : '📁 Subir'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadFile(e, setImageUrl, setUploadingImage)}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              {/* Dynamic Customer Fields (e.g. UID) */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                    Campos que llena el cliente (Formulario):
                  </label>
                  <button type="button" onClick={handleAddDynamicField} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.75rem', cursor: 'pointer' }}>
                    ➕ Agregar Campo
                  </button>
                </div>
                {dynamicFields.map((field, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                    <input
                      type="text"
                      placeholder="Ej. ID de Jugador (UID)"
                      value={field}
                      onChange={(e) => handleFieldChange(idx, e.target.value)}
                      style={{ flex: 1, padding: '7px 10px', borderRadius: '4px', background: '#0d111a', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.8rem' }}
                    />
                    {dynamicFields.length > 1 && (
                      <button type="button" onClick={() => handleRemoveField(idx)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.85rem' }}>✕</button>
                    )}
                  </div>
                ))}
              </div>

              <button type="submit" disabled={saving} className="btn-cyan" style={{ padding: '12px', fontSize: '0.9rem', marginTop: '6px' }}>
                {saving ? 'Guardando...' : (editingProductId ? '💾 Guardar Cambios' : '🚀 Publicar Producto')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
