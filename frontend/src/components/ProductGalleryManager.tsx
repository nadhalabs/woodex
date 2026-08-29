'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, Star, ArrowLeft, ArrowRight, Loader2, ImagePlus, Check } from 'lucide-react';
import { uploadToCloudinary, getOptimizedImageUrl } from '@/lib/cloudinary';

export interface GalleryImageItem {
  id?: string;
  url: string;
  public_id?: string | null;
  display_order: number;
  is_primary: boolean;
}

interface ProductGalleryManagerProps {
  images: GalleryImageItem[];
  onChange: (images: GalleryImageItem[]) => void;
  resourceId?: string | null;
}

export function ProductGalleryManager({
  images,
  onChange,
  resourceId,
}: ProductGalleryManagerProps) {
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    setError(null);
    if (!resourceId) {
      setError('Please save the product first before adding photos.');
      return;
    }

    const validFiles = Array.from(files).filter((file) => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Only JPEG, PNG and WebP images are allowed.');
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Images must be smaller than 10MB.');
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploadingCount((prev) => prev + validFiles.length);

    try {
      const uploadPromises = validFiles.map((file) =>
        uploadToCloudinary(file, { resourceType: 'product', resourceId })
      );
      const results = await Promise.all(uploadPromises);

      let currentImages = [...images];
      const hasPrimary = currentImages.some((img) => img.is_primary);

      results.forEach((res, idx) => {
        const isFirstEver = currentImages.length === 0 && idx === 0;
        const isPrimary = !hasPrimary && isFirstEver;

        currentImages.push({
          url: res.secure_url,
          public_id: res.public_id,
          display_order: currentImages.length,
          is_primary: isPrimary,
        });
      });

      // If still no primary, ensure first is primary
      if (currentImages.length > 0 && !currentImages.some((i) => i.is_primary)) {
        currentImages[0].is_primary = true;
      }

      onChange(currentImages);
    } catch (err: any) {
      console.error('Gallery upload failed:', err);
      setError(err.message || 'One or more images failed to upload.');
    } finally {
      setUploadingCount(0);
    }
  };

  const handleSetPrimary = (index: number) => {
    const updated = images.map((img, idx) => ({
      ...img,
      is_primary: idx === index,
    }));
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    const removing = images[index];
    let remaining = images.filter((_, idx) => idx !== index);

    // If removed photo was primary and others exist, make first remaining photo primary
    if (removing.is_primary && remaining.length > 0) {
      remaining[0].is_primary = true;
    }

    // Re-index display_order
    remaining = remaining.map((img, idx) => ({
      ...img,
      display_order: idx,
    }));

    onChange(remaining);
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const updated = [...images];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Update display_order numbers
    const reordered = updated.map((img, idx) => ({
      ...img,
      display_order: idx,
    }));

    onChange(reordered);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
            Product Photos ({images.length})
          </label>
          <p className="text-[11px] text-zinc-400">
            Upload multiple photos. The first or starred photo will be the main product thumbnail.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingCount > 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-zinc-800 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-sm cursor-pointer disabled:opacity-50"
        >
          {uploadingCount > 0 ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ImagePlus className="w-3.5 h-3.5" />
          )}
          <span>{uploadingCount > 0 ? `Uploading (${uploadingCount})...` : '+ Add Photos'}</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
          }
        }}
      />

      {/* Gallery Grid */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-2xl">
          {images.map((img, idx) => (
            <div
              key={img.id || `${img.url}-${idx}`}
              className={`group relative rounded-xl overflow-hidden border-2 bg-white shadow-xs transition ${
                img.is_primary
                  ? 'border-black ring-2 ring-black/20'
                  : 'border-zinc-200 hover:border-zinc-400'
              }`}
            >
              {/* Image Preview */}
              <div className="aspect-square w-full relative overflow-hidden bg-zinc-100 flex items-center justify-center">
                <img
                  src={getOptimizedImageUrl(img.url, { width: 220, height: 220, crop: 'fill' })}
                  alt={`Product photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Primary Tag */}
                {img.is_primary && (
                  <div className="absolute top-1.5 left-1.5 bg-black text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-md flex items-center gap-1">
                    <Star className="w-3 h-3 fill-white" />
                    <span>Primary</span>
                  </div>
                )}

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="absolute top-1.5 right-1.5 p-1 bg-black/80 hover:bg-black text-white rounded-full transition shadow-md"
                  title="Remove photo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Action Bar */}
              <div className="p-1.5 bg-white border-t border-zinc-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, 'left')}
                    className="p-1 text-zinc-400 hover:text-black disabled:opacity-30 rounded hover:bg-zinc-100"
                    title="Move left"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === images.length - 1}
                    onClick={() => handleMove(idx, 'right')}
                    className="p-1 text-zinc-400 hover:text-black disabled:opacity-30 rounded hover:bg-zinc-100"
                    title="Move right"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {!img.is_primary && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(idx)}
                    className="text-[11px] font-bold text-black hover:text-zinc-600 px-1.5 py-0.5 rounded hover:bg-zinc-100"
                  >
                    Set Primary
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add more slot */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square border-2 border-dashed border-zinc-300 hover:border-black rounded-xl flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-black bg-white hover:bg-zinc-50 transition cursor-pointer p-2 text-center"
          >
            <Upload className="w-5 h-5 text-zinc-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Upload More</span>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-zinc-300 hover:border-black rounded-2xl p-6 text-center bg-zinc-50/50 hover:bg-zinc-50 transition cursor-pointer flex flex-col items-center justify-center gap-2"
        >
          {uploadingCount > 0 ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="w-6 h-6 animate-spin text-black" />
              <span className="text-xs font-semibold text-zinc-700">Uploading photos to Cloudinary...</span>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-zinc-100 text-black border border-zinc-200 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-black">
                  Upload Product Photos <span className="font-normal text-zinc-500">(Multiple allowed)</span>
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">JPEG, PNG, WebP up to 10MB each</p>
              </div>
            </>
          )}
        </div>
      )}

      {error && <p className="text-xs font-medium text-black mt-1">{error}</p>}
    </div>
  );
}
