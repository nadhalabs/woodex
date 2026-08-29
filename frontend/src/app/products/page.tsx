'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  PackagePlus,
  Search,
  AlertTriangle,
  Layers,
  Plus,
  X,
  Edit2,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  Package,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { showError, showSuccess } from '@/lib/feedback';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { ProductGalleryManager, GalleryImageItem } from '@/components/ProductGalleryManager';
import { QuickCategoryModal } from '@/components/QuickCategoryModal';
import { getOptimizedImageUrl, getProductCloudinaryFolder, slugify } from '@/lib/cloudinary';
import { useDialogAccessibility } from '@/hooks/useDialogAccessibility';

export default function ProductsPage() {
  const [me, setMe] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isQuickCategoryOpen, setIsQuickCategoryOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<any>(null);
  const [deletingProduct, setDeletingProduct] = useState<any>(null);

  // Stock Adjust Form
  const [newStockInput, setNewStockInput] = useState<number>(0);
  const [adjustmentNotes, setAdjustmentNotes] = useState('');

  // Product Form State
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [currentStock, setCurrentStock] = useState<number>(5);
  const [lowStockLevel, setLowStockLevel] = useState<number>(2);
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [galleryImages, setGalleryImages] = useState<GalleryImageItem[]>([]);
  const [variants, setVariants] = useState<{ name: string; price: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [adjustingStock, setAdjustingStock] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const productDialogRef = useDialogAccessibility<HTMLDivElement>(isProductModalOpen && !isQuickCategoryOpen, () => setIsProductModalOpen(false));
  const stockDialogRef = useDialogAccessibility<HTMLDivElement>(Boolean(adjustingProduct), () => setAdjustingProduct(null));
  const deleteDialogRef = useDialogAccessibility<HTMLDivElement>(Boolean(deletingProduct), () => setDeletingProduct(null));

  async function loadData() {
    try {
      const [meRes, catRes] = await Promise.all([
        fetchApi('/auth/me'),
        fetchApi('/categories'),
      ]);
      setMe(meRes);
      setCategories(catRes);

      let url = '/products?';
      if (search) url += `q=${encodeURIComponent(search)}&`;
      if (selectedCategoryId) url += `category_id=${encodeURIComponent(selectedCategoryId)}&`;
      if (lowStockOnly) url += `low_stock_only=true&`;

      const prodRes = await fetchApi(url);
      setProducts(prodRes);
    } catch (err) {
      console.error('Failed to load product data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [search, selectedCategoryId, lowStockOnly]);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCategoryId(categories.length > 0 ? categories[0].id : '');
    setSku('');
    setDescription('');
    setSellingPrice(0);
    setCostPrice(0);
    setCurrentStock(5);
    setLowStockLevel(2);
    setNotes('');
    setIsActive(true);
    setGalleryImages([]);
    setVariants([]);
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingProduct(p);
    setName(p.name);
    setCategoryId(p.category_id || (categories.find(c => c.name.toLowerCase() === (p.category || '').toLowerCase())?.id || ''));
    setSku(p.sku || '');
    setDescription(p.description || '');
    setSellingPrice(p.selling_price || 0);
    setCostPrice(p.cost_price || 0);
    setCurrentStock(p.current_stock || 0);
    setLowStockLevel(p.low_stock_level || 2);
    setNotes(p.notes || '');
    setIsActive(p.is_active !== undefined ? p.is_active : true);
    
    // Map existing images or fallback to image_url
    if (p.images && p.images.length > 0) {
      setGalleryImages(
        p.images.map((img: any) => ({
          id: img.id,
          url: img.url,
          public_id: img.public_id,
          display_order: img.display_order,
          is_primary: img.is_primary,
        }))
      );
    } else if (p.image_url) {
      setGalleryImages([
        {
          url: p.image_url,
          public_id: p.image_public_id,
          display_order: 0,
          is_primary: true,
        },
      ]);
    } else {
      setGalleryImages([]);
    }

    setVariants(p.variants_json || []);
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setFormError(null);

    const payload = {
      name: name.trim(),
      category_id: categoryId || undefined,
      sku: sku.trim() || undefined,
      description: description.trim() || undefined,
      selling_price: Number(sellingPrice),
      cost_price: Number(costPrice),
      current_stock: Number(currentStock),
      low_stock_level: Number(lowStockLevel),
      notes: notes.trim() || undefined,
      is_active: isActive,
      images: galleryImages.map((img, idx) => ({
        url: img.url,
        public_id: img.public_id || undefined,
        display_order: idx,
        is_primary: img.is_primary,
      })),
      variants_json: me?.business?.plan === 'standard' ? variants : undefined,
    };

    try {
      if (editingProduct) {
        await fetchApi(`/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsProductModalOpen(false);
      loadData();
      showSuccess(editingProduct ? 'Product updated successfully.' : 'Product created successfully.');
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product');
      showError(err, 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleStockAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    setAdjustingStock(true);
    try {
      await fetchApi(`/products/${adjustingProduct.id}/adjust-stock`, {
        method: 'POST',
        body: JSON.stringify({
          new_stock: Number(newStockInput),
          notes: adjustmentNotes,
        }),
      });
      setAdjustingProduct(null);
      loadData();
      showSuccess('Stock updated successfully.');
    } catch (err: any) {
      showError(err, 'Stock adjustment failed.');
    } finally {
      setAdjustingStock(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    setDeleting(true);
    try {
      await fetchApi(`/products/${deletingProduct.id}`, { method: 'DELETE' });
      setDeletingProduct(null);
      loadData();
      showSuccess('Product deleted.');
    } catch (err: any) {
      showError(err, 'Failed to delete product.');
    } finally {
      setDeleting(false);
    }
  };

  const handleQuickCategoryCreated = (newCat: any) => {
    setCategories((prev) => [...prev, newCat]);
    setCategoryId(newCat.id);
  };

  const isStandard = me?.business?.plan === 'standard';
  const canManageProducts = me?.user?.role === 'owner' || me?.user?.role === 'manager';

  return (
    <div className="min-h-screen bg-[#fbfbfb] flex">
      <Sidebar businessPlan={me?.business?.plan} userRole={me?.user?.role} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          userName={me?.user?.name}
          userRole={me?.user?.role}
          businessName={me?.business?.name}
          businessPlan={me?.business?.plan}
        />

        <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-black tracking-tight">Product Catalogue</h1>
              <p className="text-xs text-zinc-500">Furniture, wood timber & bespoke craftsmanship inventory</p>
            </div>

            {canManageProducts && <div className="flex w-full sm:w-auto items-center gap-3">
              <button
                onClick={openAddModal}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-black hover:bg-zinc-800 text-white font-extrabold px-4 py-2.5 rounded-xl transition text-xs uppercase tracking-wider shadow-md cursor-pointer"
              >
                <PackagePlus className="w-4 h-4" />
                <span>+ Add Product</span>
              </button>
            </div>}
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-zinc-200 gap-6 text-sm font-bold">
            <div className="pb-3 text-black border-b-2 border-black flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>All Products ({products.length})</span>
            </div>
            {canManageProducts && <Link
              href="/products/categories"
              className="pb-3 text-zinc-400 hover:text-black flex items-center gap-2 transition"
            >
              <Layers className="w-4 h-4" />
              <span>Categories ({categories.length})</span>
            </Link>}
          </div>

          {/* Filters & Search Bar */}
          <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
                <input
                  aria-label="Search products"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search product name, SKU or code..."
                  className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => setLowStockOnly(!lowStockOnly)}
                  aria-pressed={lowStockOnly}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer uppercase tracking-wider ${
                    lowStockOnly
                      ? 'bg-black text-white border-black shadow-xs'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Low Stock Only</span>
                </button>

                <select
                  aria-label="Filter products by category"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.product_count || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => {
              const isLow = p.current_stock <= p.low_stock_level;
              const primaryImg = p.image_url || (p.images && p.images[0]?.url);
              const categoryName = p.category_rel?.name || p.category || 'Uncategorized';
              const imageCount = p.images?.length || (p.image_url ? 1 : 0);

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-zinc-200 shadow-2xs hover:border-black hover:shadow-md transition flex flex-col justify-between overflow-hidden"
                >
                  {/* Photo Container */}
                  <div className="aspect-[16/10] w-full relative bg-zinc-100 overflow-hidden border-b border-zinc-100">
                    {primaryImg ? (
                      <img
                        src={getOptimizedImageUrl(primaryImg, { width: 400, height: 260, crop: 'fill' })}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 gap-1 bg-zinc-50">
                        <ImageIcon className="w-8 h-8 opacity-30" />
                        <span className="text-[11px] font-medium">No photo uploaded</span>
                      </div>
                    )}

                    {/* Category Badge */}
                    <div className="absolute top-3 left-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-black/80 text-white backdrop-blur-xs px-2.5 py-1 rounded-md shadow-xs">
                        {categoryName}
                      </span>
                    </div>

                    {/* Stock Alert Badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {imageCount > 1 && (
                        <span className="bg-black/80 text-white backdrop-blur-xs text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          <span>{imageCount}</span>
                        </span>
                      )}
                      {isLow ? (
                        <span className="bg-black text-white border border-zinc-700 text-xs font-black px-2.5 py-0.5 rounded-full shadow-md">
                          Low: {p.current_stock}
                        </span>
                      ) : (
                        <span className="bg-zinc-900 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-md">
                          Stock: {p.current_stock}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <h3 className="font-bold text-black text-base leading-snug">{p.name}</h3>
                        {p.is_active === false && (
                          <span className="text-[10px] uppercase font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">
                            Inactive
                          </span>
                        )}
                      </div>

                      {p.sku && <p className="text-xs text-zinc-400 mb-2 font-mono">SKU: {p.sku}</p>}

                      {p.description && (
                        <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{p.description}</p>
                      )}

                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-xl font-black text-black">
                          ₹{p.selling_price?.toLocaleString('en-IN')}
                        </span>
                        {p.cost_price > 0 && (
                          <span className="text-xs text-zinc-400">
                            Cost: ₹{p.cost_price?.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      {/* Standard Edition Variants */}
                      {p.variants_json && p.variants_json.length > 0 && (
                        <div className="mb-4 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200 text-xs">
                          <span className="font-bold text-black uppercase tracking-wider text-[10px] block mb-1">
                            Variants ({p.variants_json.length})
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {p.variants_json.map((v: any, idx: number) => (
                              <span
                                key={idx}
                                className="bg-white border border-zinc-300 text-black text-[11px] font-medium px-2 py-0.5 rounded-md"
                              >
                                {v.name} {v.price ? `(₹${v.price})` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    {canManageProducts && <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setAdjustingProduct(p);
                          setNewStockInput(p.current_stock);
                          setAdjustmentNotes('');
                        }}
                        className="text-xs font-bold uppercase tracking-wider text-black bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1.5 rounded-lg transition"
                      >
                        Adjust Stock
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-zinc-600 hover:text-black bg-zinc-100 hover:bg-zinc-200 rounded-lg transition"
                          title="Edit Product"
                          aria-label={`Edit ${p.name}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingProduct(p)}
                          className="p-1.5 text-zinc-400 hover:text-black bg-zinc-100 hover:bg-zinc-200 rounded-lg transition"
                          title="Delete Product"
                          aria-label={`Delete ${p.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>}
                  </div>
                </div>
              );
            })}

            {products.length === 0 && !loading && (
              <div className="col-span-full bg-white rounded-2xl p-12 text-center text-zinc-400 border border-zinc-200 font-medium">
                No products found matching filters.
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div ref={productDialogRef} role="dialog" aria-modal="true" aria-labelledby="product-dialog-title" tabIndex={-1} className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 border border-zinc-300 my-3 sm:my-8 max-h-[94vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-5">
              <div>
                <h3 id="product-dialog-title" className="font-black text-xl text-black">
                  {editingProduct ? 'Edit Furniture / Timber Product' : 'Add New Product'}
                </h3>
                <p className="text-xs text-zinc-400">Complete item specifications and product media</p>
              </div>
              <button type="button" onClick={() => setIsProductModalOpen(false)} aria-label="Close product dialog" className="text-zinc-400 hover:text-black p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-5">
              {/* SECTION 1: BASIC INFO */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                  1. Basic Information
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="product-name" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      Product Name *
                    </label>
                    <input
                      id="product-name"
                      data-autofocus
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Teak 3-Seater Sofa"
                      className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="product-category" className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                        Category *
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsQuickCategoryOpen(true)}
                        className="text-[11px] font-bold text-black hover:underline cursor-pointer"
                      >
                        + Create Category
                      </button>
                    </div>

                    <select
                      id="product-category"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    >
                      <option value="" disabled>
                        Select Category...
                      </option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="product-sku" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      SKU / Code
                    </label>
                    <input
                      id="product-sku"
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="e.g. SOFA-TK-01"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label htmlFor="product-selling-price" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      Selling Price (₹) *
                    </label>
                    <input
                      id="product-selling-price"
                      type="number"
                      required
                      min={0}
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-black text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label htmlFor="product-cost-price" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      Cost Price (₹)
                    </label>
                    <input
                      id="product-cost-price"
                      type="number"
                      min={0}
                      value={costPrice}
                      onChange={(e) => setCostPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: STOCK & INVENTORY */}
              <div className="space-y-3 pt-3 border-t border-zinc-200">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                  2. Inventory & Alerts
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="product-current-stock" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      Current Stock *
                    </label>
                    <input
                      id="product-current-stock"
                      type="number"
                      required
                      min={0}
                      value={currentStock}
                      onChange={(e) => setCurrentStock(Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-bold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label htmlFor="product-low-stock" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      Low-Stock Alert Level *
                    </label>
                    <input
                      id="product-low-stock"
                      type="number"
                      required
                      min={0}
                      value={lowStockLevel}
                      onChange={(e) => setLowStockLevel(Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-bold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: PRODUCT MEDIA GALLERY */}
              <div className="space-y-3 pt-3 border-t border-zinc-200">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                  3. Product Media & Gallery
                </h4>

                <ProductGalleryManager
                  images={galleryImages}
                  onChange={setGalleryImages}
                  folder={getProductCloudinaryFolder(me?.business?.id, name || 'new-product')}
                />
              </div>

              {/* SECTION 4: DETAILS & NOTES */}
              <div className="space-y-3 pt-3 border-t border-zinc-200">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                  4. Details & Notes
                </h4>

                <div>
                  <label htmlFor="product-description" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    Product Description
                  </label>
                  <textarea
                    id="product-description"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short description of wood material, upholstery, dimensions..."
                    className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-medium text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label htmlFor="product-notes" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    Internal Notes
                  </label>
                  <input
                    id="product-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Sheesham wood frame, supplier contact info"
                    className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-medium text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="product-active-toggle"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-black rounded border-zinc-300 focus:ring-black"
                  />
                  <label htmlFor="product-active-toggle" className="text-xs font-bold text-zinc-700 cursor-pointer">
                    Active Product (Visible across billing, quotations, and store catalogue)
                  </label>
                </div>
              </div>

              {/* SECTION 5: VARIANTS (STANDARD EDITION ONLY) */}
              {isStandard && (
                <div className="space-y-3 pt-3 border-t border-zinc-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-black flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-black" />
                      <span>Product Variants (Standard Feature)</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setVariants([...variants, { name: '', price: sellingPrice }])}
                      className="text-xs font-bold text-black hover:underline"
                    >
                      + Add Variant
                    </button>
                  </div>

                  {variants.map((v, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        aria-label={`Variant ${idx + 1} name`}
                        type="text"
                        placeholder="Variant name (e.g. Teak Finish)"
                        value={v.name}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[idx].name = e.target.value;
                          setVariants(updated);
                        }}
                        className="w-1/2 px-3 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg text-xs font-medium text-black"
                      />
                      <input
                        aria-label={`Variant ${idx + 1} price`}
                        type="number"
                        placeholder="Price (₹)"
                        value={v.price}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[idx].price = Number(e.target.value);
                          setVariants(updated);
                        }}
                        className="w-1/3 px-3 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg text-xs font-bold text-black"
                      />
                      <button
                        type="button"
                        onClick={() => setVariants(variants.filter((_, i) => i !== idx))}
                        aria-label={`Remove variant ${idx + 1}`}
                        className="p-1 text-zinc-400 hover:text-black"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {formError && (
                <div role="alert" className="p-3 bg-zinc-900 border border-zinc-700 text-white rounded-xl text-xs font-medium">
                  {formError}
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-zinc-200 flex flex-col-reverse sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="w-full sm:w-1/2 py-2.5 border border-zinc-300 text-zinc-800 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-zinc-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="w-full sm:w-1/2 py-2.5 bg-black hover:bg-zinc-800 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Product...</span>
                    </>
                  ) : editingProduct ? (
                    'Save Changes'
                  ) : (
                    'Save Product'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div ref={stockDialogRef} role="dialog" aria-modal="true" aria-labelledby="stock-adjust-title" tabIndex={-1} className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-4 sm:p-6 border border-zinc-300">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
              <h3 id="stock-adjust-title" className="font-bold text-black">Stock Adjustment</h3>
              <button type="button" onClick={() => setAdjustingProduct(null)} aria-label="Close stock adjustment dialog" className="text-zinc-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStockAdjust} className="space-y-4">
              <p className="text-xs text-zinc-600 font-medium">
                Adjusting current inventory count for{' '}
                <span className="font-bold text-black">{adjustingProduct.name}</span>.
              </p>

              <div>
                <label htmlFor="stock-adjust-quantity" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  New Quantity Count *
                </label>
                <input
                  id="stock-adjust-quantity"
                  data-autofocus
                  type="number"
                  required
                  min={0}
                  value={newStockInput}
                  onChange={(e) => setNewStockInput(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-bold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label htmlFor="stock-adjust-notes" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Adjustment Reason / Notes
                </label>
                <input
                  id="stock-adjust-notes"
                  type="text"
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  placeholder="e.g. Physical warehouse audit count"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-medium text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="w-1/2 py-2 border border-zinc-300 text-zinc-800 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustingStock}
                  className="w-1/2 py-2 bg-black hover:bg-zinc-800 text-white font-black rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  {adjustingStock ? 'Updating...' : 'Update Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div ref={deleteDialogRef} role="dialog" aria-modal="true" aria-labelledby="delete-product-title" aria-describedby="delete-product-description" tabIndex={-1} className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-4 sm:p-6 border border-zinc-300">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
              <h3 id="delete-product-title" className="font-bold text-black text-lg">Delete Product</h3>
              <button type="button" onClick={() => setDeletingProduct(null)} aria-label="Close delete product dialog" className="text-zinc-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p id="delete-product-description" className="text-sm text-zinc-700 mb-4">
              Are you sure you want to delete <span className="font-bold text-black">"{deletingProduct.name}"</span>? This will remove the product and its gallery images from WOODEX.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                data-autofocus
                className="w-1/2 py-2 border border-zinc-300 text-zinc-800 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={deleting}
                className="w-1/2 py-2 bg-black hover:bg-zinc-800 text-white font-black rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Quick Category Creator */}
      <QuickCategoryModal
        isOpen={isQuickCategoryOpen}
        onClose={() => setIsQuickCategoryOpen(false)}
        onSuccess={handleQuickCategoryCreated}
        businessId={me?.business?.id}
      />
    </div>
  );
}
