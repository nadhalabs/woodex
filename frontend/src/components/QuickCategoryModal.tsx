'use client';

import React, { useState } from 'react';
import { X, Layers, Loader2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { ImageUploadDropzone } from './ImageUploadDropzone';
import { getCategoryCloudinaryFolder } from '@/lib/cloudinary';

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
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-zinc-300 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-base text-black uppercase tracking-tight">Create New Category</h3>
              <p className="text-[11px] text-zinc-400">Add a category without leaving product setup</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-black p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Study Table, Bar Stools, Recliners"
              className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
              Description
            </label>
            <textarea
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
            <div className="p-3 bg-zinc-900 border border-zinc-700 text-white rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <div className="pt-3 border-t border-zinc-200 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 border border-zinc-300 text-zinc-800 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="w-1/2 py-2.5 bg-black hover:bg-zinc-800 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
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
