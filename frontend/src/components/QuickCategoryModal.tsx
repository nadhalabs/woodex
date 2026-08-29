'use client';

import React, { useState } from 'react';
import { X, Layers, Loader2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { ImageUploadDropzone } from './ImageUploadDropzone';
import { getCategoryCloudinaryFolder } from '@/lib/cloudinary';
import { useDialogAccessibility } from '@/hooks/useDialogAccessibility';

interface QuickCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCategory: any) => void;
  businessId?: string;
}

export function QuickCategoryModal({
  isOpen,
  onClose,
  onSuccess,
  businessId = '',
}: QuickCategoryModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageData, setImageData] = useState<{ url: string; public_id: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useDialogAccessibility<HTMLDivElement>(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const created = await fetchApi('/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          image_url: imageData?.url || undefined,
          image_public_id: imageData?.public_id || undefined,
          is_active: true,
        }),
      });

      setName('');
      setDescription('');
      setImageData(null);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="quick-category-title" tabIndex={-1} className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6 border border-zinc-300 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 id="quick-category-title" className="font-black text-base text-black uppercase tracking-tight">Create New Category</h3>
              <p className="text-[11px] text-zinc-400">Add a category without leaving product setup</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close create category dialog"
            className="text-zinc-400 hover:text-black p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="quick-category-name" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
              Category Name *
            </label>
            <input
              id="quick-category-name"
              data-autofocus
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Study Table, Bar Stools, Recliners"
              className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label htmlFor="quick-category-description" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
              Description
            </label>
            <textarea
              id="quick-category-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this collection"
              className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-medium text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          <ImageUploadDropzone
            value={imageData?.url}
            publicId={imageData?.public_id}
            onChange={setImageData}
            folder={getCategoryCloudinaryFolder(businessId)}
            label="Category Image (Optional)"
          />

          {error && (
            <div role="alert" className="p-3 bg-zinc-900 border border-zinc-700 text-white rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <div className="pt-3 border-t border-zinc-200 flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-1/2 py-2.5 border border-zinc-300 text-zinc-800 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="w-full sm:w-1/2 py-2.5 bg-black hover:bg-zinc-800 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                'Create & Select'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
