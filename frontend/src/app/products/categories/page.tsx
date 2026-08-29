'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  Loader2,
  Package,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { showError, showSuccess } from '@/lib/feedback';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { ImageUploadDropzone } from '@/components/ImageUploadDropzone';
import { getOptimizedImageUrl, getCategoryCloudinaryFolder } from '@/lib/cloudinary';
import { useDialogAccessibility } from '@/hooks/useDialogAccessibility';

export default function CategoriesPage() {
  const [me, setMe] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [deletingCategory, setDeletingCategory] = useState<any>(null);

  // Add / Edit Form State
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDataImage, setFormDataImage] = useState<{ url: string; public_id: string } | null>(null);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete / Reassign State
  const [deleteAction, setDeleteAction] = useState<'move' | 'uncategorize'>('move');
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const categoryDialogRef = useDialogAccessibility<HTMLDivElement>(Boolean(isAddModalOpen || editingCategory), () => {
    setIsAddModalOpen(false);
    setEditingCategory(null);
  });
  const deleteDialogRef = useDialogAccessibility<HTMLDivElement>(Boolean(deletingCategory), () => setDeletingCategory(null));

  async function loadData() {
    try {
      const [meRes, catRes] = await Promise.all([
        fetchApi('/auth/me'),
        fetchApi('/categories'),
      ]);
      setMe(meRes);
      setCategories(catRes);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setFormName('');
    setFormDescription('');
    setFormDataImage(null);
    setFormIsActive(true);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (cat: any) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || '');
    setFormDataImage(
      cat.image_url
        ? { url: cat.image_url, public_id: cat.image_public_id || '' }
        : null
    );
    setFormIsActive(cat.is_active);
    setFormError(null);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setFormSaving(true);
    setFormError(null);

    try {
      if (editingCategory) {
        // Update
        await fetchApi(`/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: formName.trim(),
            description: formDescription.trim() || undefined,
            image_url: formDataImage?.url || null,
            image_public_id: formDataImage?.public_id || null,
            is_active: formIsActive,
          }),
        });
        setEditingCategory(null);
      } else {
        // Create
        await fetchApi('/categories', {
          method: 'POST',
          body: JSON.stringify({
            name: formName.trim(),
            description: formDescription.trim() || undefined,
            image_url: formDataImage?.url || undefined,
            image_public_id: formDataImage?.public_id || undefined,
            is_active: formIsActive,
          }),
        });
        setIsAddModalOpen(false);
      }
      loadData();
      showSuccess(editingCategory ? 'Category updated successfully.' : 'Category created successfully.');
    } catch (err: any) {
      setFormError(err.message || 'Failed to save category.');
      showError(err, 'Failed to save category.');
    } finally {
      setFormSaving(false);
    }
  };

  const openDeleteDialog = (cat: any) => {
    setDeletingCategory(cat);
    setDeleteError(null);
    // Pick first available other category as default target
    const otherCats = categories.filter((c) => c.id !== cat.id);
    if (otherCats.length > 0) {
      setTargetCategoryId(otherCats[0].id);
      setDeleteAction('move');
    } else {
      setDeleteAction('uncategorize');
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    setDeleteSubmitting(true);
    setDeleteError(null);

    try {
      let url = `/categories/${deletingCategory.id}`;
      if (deletingCategory.product_count > 0) {
        if (deleteAction === 'move') {
          if (!targetCategoryId) {
            setDeleteError('Please select a category to move products to.');
            setDeleteSubmitting(false);
            return;
          }
          url += `?action=move&reassign_to_category_id=${targetCategoryId}`;
        } else {
          url += `?action=uncategorize`;
        }
      }

      await fetchApi(url, { method: 'DELETE' });
      setDeletingCategory(null);
      loadData();
      showSuccess('Category deleted.');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete category.');
      showError(err, 'Failed to delete category.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= categories.length) return;

    const newOrder = [...categories];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;

    // Build payload
    const items = newOrder.map((c, idx) => ({
      id: c.id,
      display_order: idx + 1,
    }));

    // Optimistic update
    setCategories(newOrder);

    try {
      await fetchApi('/categories/order', {
        method: 'PUT',
        body: JSON.stringify({ items }),
      });
    } catch (err) {
      showError(err, 'Failed to reorder categories.');
      loadData();
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
  });

  const otherCategories = categories.filter((c) => c.id !== deletingCategory?.id);
  const canManageCategories = me?.user?.role === 'owner' || me?.user?.role === 'manager';

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
          {/* Header & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-black tracking-tight">Category Management</h1>
              <p className="text-xs text-zinc-500">Configure catalogue categories, covers, and item collections</p>
            </div>

            {canManageCategories && <div className="flex w-full sm:w-auto items-center gap-3">
              <button
                onClick={openAddModal}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-black hover:bg-zinc-800 text-white font-extrabold px-4 py-2.5 rounded-xl transition text-xs uppercase tracking-wider shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Category</span>
              </button>
            </div>}
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-zinc-200 gap-6 text-sm font-bold">
            <Link
              href="/products"
              className="pb-3 text-zinc-400 hover:text-black flex items-center gap-2 transition"
            >
              <Package className="w-4 h-4" />
              <span>All Products</span>
            </Link>
            <div className="pb-3 text-black border-b-2 border-black flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span>Categories ({categories.length})</span>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
              <input
                aria-label="Search categories"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search category name or slug..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>

            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Showing {filteredCategories.length} of {categories.length} categories
            </div>
          </div>

          {/* Categories Table / Grid */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm text-zinc-600">
                <thead className="bg-zinc-50 text-black text-[10px] uppercase font-black tracking-widest border-b border-zinc-200">
                  <tr>
                    <th className="py-3.5 px-4 w-16 text-center">Order</th>
                    <th className="py-3.5 px-4 w-20">Photo</th>
                    <th className="py-3.5 px-4">Category Details</th>
                    <th className="py-3.5 px-4 text-center">Products</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium">
                  {filteredCategories.map((cat, idx) => (
                    <tr key={cat.id} className="hover:bg-zinc-50/80 transition">
                      {/* Reorder Arrows */}
                      <td className="py-3.5 px-4 text-center">
                        {canManageCategories ? <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveOrder(idx, 'up')}
                            className="p-1 text-zinc-400 hover:text-black disabled:opacity-20 rounded hover:bg-zinc-100"
                            title="Move up"
                            aria-label={`Move ${cat.name} up`}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-black w-5">{idx + 1}</span>
                          <button
                            type="button"
                            disabled={idx === filteredCategories.length - 1}
                            onClick={() => handleMoveOrder(idx, 'down')}
                            className="p-1 text-zinc-400 hover:text-black disabled:opacity-20 rounded hover:bg-zinc-100"
                            title="Move down"
                            aria-label={`Move ${cat.name} down`}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div> : <span className="text-xs font-bold text-black">{idx + 1}</span>}
                      </td>

                      {/* Photo */}
                      <td className="py-3.5 px-4">
                        {cat.image_url ? (
                          <img
                            src={getOptimizedImageUrl(cat.image_url, { width: 80, height: 80, crop: 'fill' })}
                            alt={cat.name}
                            className="w-12 h-12 rounded-xl object-cover border border-zinc-200 shadow-xs"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-black">
                            <FolderOpen className="w-6 h-6" />
                          </div>
                        )}
                      </td>

                      {/* Name & Slug */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-black text-base">{cat.name}</span>
                          <span className="text-[11px] font-mono bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md border border-zinc-200">
                            /{cat.slug}
                          </span>
                        </div>
                        {cat.description && (
                          <p className="text-xs text-zinc-400 mt-0.5 max-w-md line-clamp-1">
                            {cat.description}
                          </p>
                        )}
                      </td>

                      {/* Products Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-100 text-black border border-zinc-200">
                          <Package className="w-3 h-3 text-zinc-400" />
                          <span>{cat.product_count || 0} items</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {cat.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-black border border-zinc-300">
                            <CheckCircle2 className="w-3 h-3 text-black" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-400 border border-zinc-200">
                            Disabled
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {canManageCategories && <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(cat)}
                            className="p-1.5 text-zinc-600 hover:text-black bg-zinc-100 hover:bg-zinc-200 rounded-lg transition"
                            title="Edit Category"
                            aria-label={`Edit ${cat.name}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteDialog(cat)}
                            className="p-1.5 text-zinc-400 hover:text-black bg-zinc-100 hover:bg-zinc-200 rounded-lg transition"
                            title="Delete Category"
                            aria-label={`Delete ${cat.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>}
                      </td>
                    </tr>
                  ))}

                  {filteredCategories.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-400 font-medium">
                        No categories found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Add / Edit Category Modal */}
      {(isAddModalOpen || editingCategory) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div ref={categoryDialogRef} role="dialog" aria-modal="true" aria-labelledby="category-dialog-title" tabIndex={-1} className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-4 sm:p-6 border border-zinc-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
              <h3 id="category-dialog-title" className="font-black text-lg text-black uppercase tracking-tight">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingCategory(null);
                }}
                aria-label="Close category dialog"
                className="text-zinc-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label htmlFor="category-name" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Category Name *
                </label>
                <input
                  id="category-name"
                  data-autofocus
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Sofa, Bed, Dining Table"
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label htmlFor="category-description" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Description
                </label>
                <textarea
                  id="category-description"
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe this product collection"
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-medium text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              {/* Photo Upload */}
              <ImageUploadDropzone
                value={formDataImage?.url}
                publicId={formDataImage?.public_id}
                onChange={setFormDataImage}
                folder={getCategoryCloudinaryFolder(me?.business?.id)}
                label="Category Cover Photo"
              />

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="category-active-toggle"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-black rounded border-zinc-300 focus:ring-black"
                />
                <label htmlFor="category-active-toggle" className="text-xs font-bold text-zinc-700 cursor-pointer">
                  Active (visible in product catalogue filter)
                </label>
              </div>

              {formError && (
                <div role="alert" className="p-3 bg-zinc-900 border border-zinc-700 text-white rounded-xl text-xs font-medium">
                  {formError}
                </div>
              )}

              <div className="pt-3 border-t border-zinc-200 flex flex-col-reverse sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingCategory(null);
                  }}
                  className="w-full sm:w-1/2 py-2.5 border border-zinc-300 text-zinc-800 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving || !formName.trim()}
                  className="w-full sm:w-1/2 py-2.5 bg-black hover:bg-zinc-800 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {formSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Save Category'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Delete Category Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div ref={deleteDialogRef} role="dialog" aria-modal="true" aria-labelledby="delete-category-title" aria-describedby="delete-category-description" tabIndex={-1} className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6 border border-zinc-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
              <div className="flex items-center gap-2 text-black">
                <AlertTriangle className="w-5 h-5 text-black" />
                <h3 id="delete-category-title" className="font-black text-lg text-black uppercase tracking-tight">Delete Category</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                aria-label="Close delete category dialog"
                className="text-zinc-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p id="delete-category-description" className="text-sm text-zinc-700">
                Are you sure you want to delete the category <span className="font-bold text-black">"{deletingCategory.name}"</span>?
              </p>

              {/* If category contains products, show safe deletion options */}
              {deletingCategory.product_count > 0 ? (
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-black shrink-0 mt-0.5" />
                    <p className="text-xs text-zinc-800 font-medium">
                      This category contains <span className="font-bold">{deletingCategory.product_count} product(s)</span>. Products will not be deleted, but require an assignment choice:
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    {otherCategories.length > 0 && (
                      <label className="flex items-start gap-2 text-xs font-semibold text-zinc-800 cursor-pointer">
                        <input
                          type="radio"
                          name="delete-action"
                          value="move"
                          checked={deleteAction === 'move'}
                          onChange={() => setDeleteAction('move')}
                          className="mt-0.5 text-black focus:ring-black"
                        />
                        <div className="space-y-1.5 flex-1">
                          <span>Move products to another category:</span>
                          {deleteAction === 'move' && (
                            <select
                              value={targetCategoryId}
                              onChange={(e) => setTargetCategoryId(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-medium focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                            >
                              {otherCategories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </label>
                    )}

                    <label className="flex items-center gap-2 text-xs font-semibold text-zinc-800 cursor-pointer">
                      <input
                        type="radio"
                        name="delete-action"
                        value="uncategorize"
                        checked={deleteAction === 'uncategorize'}
                        onChange={() => setDeleteAction('uncategorize')}
                        className="text-black focus:ring-black"
                      />
                      <span>Remove category assignment (mark as Uncategorized)</span>
                    </label>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500">
                  This category contains 0 products and can be safely removed.
                </p>
              )}

              {deleteError && (
                <div role="alert" className="p-3 bg-zinc-900 border border-zinc-700 text-white rounded-xl text-xs font-medium">
                  {deleteError}
                </div>
              )}

              <div className="pt-3 border-t border-zinc-200 flex flex-col-reverse sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingCategory(null)}
                  data-autofocus
                  className="w-full sm:w-1/2 py-2.5 border border-zinc-300 text-zinc-800 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteSubmitting}
                  onClick={handleDeleteCategory}
                  className="w-full sm:w-1/2 py-2.5 bg-black hover:bg-zinc-800 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    'Confirm Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
