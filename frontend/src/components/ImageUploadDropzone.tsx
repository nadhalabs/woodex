'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { uploadToCloudinary, getOptimizedImageUrl } from '@/lib/cloudinary';

interface ImageUploadDropzoneProps {
  value?: string | null;
  publicId?: string | null;
  onChange: (result: { url: string; public_id: string } | null) => void;
  folder?: string;
  label?: string;
  helperText?: string;
  className?: string;
}

export function ImageUploadDropzone({
  value,
  publicId,
  onChange,
  folder,
  label = 'Upload Image',
  helperText = 'JPEG, PNG, or WebP up to 10MB',
  className = '',
}: ImageUploadDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayUrl = localPreview || value;

  const handleFile = async (file: File) => {
    setError(null);

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image (JPEG, PNG, or WebP).');
      return;
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size exceeds 10MB limit.');
      return;
    }

    // Local instant preview
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);
    setUploading(true);
    setProgress(10);

    try {
      const res = await uploadToCloudinary(file, folder, (percent) => {
        setProgress(percent);
      });
      onChange({
        url: res.secure_url,
        public_id: res.public_id,
      });
      setLocalPreview(null);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.message || 'Image upload failed. Please try again.');
      setLocalPreview(null);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalPreview(null);
    setError(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
          {label}
        </label>
      )}

      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-2xl p-4 transition text-center cursor-pointer flex flex-col items-center justify-center min-h-[140px] ${
          isDragOver
            ? 'border-black bg-zinc-100'
            : 'border-zinc-300 hover:border-black bg-zinc-50/50 hover:bg-zinc-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        {displayUrl ? (
          <div className="relative group w-full flex items-center justify-center">
            <img
              src={getOptimizedImageUrl(displayUrl, { width: 300, height: 160, crop: 'fill' })}
              alt="Category Preview"
              className="w-auto max-h-32 rounded-xl object-cover border border-zinc-200 shadow-sm"
            />
            {uploading ? (
              <div className="absolute inset-0 bg-black/70 rounded-xl flex flex-col items-center justify-center text-white gap-2 p-2">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
                <span className="text-xs font-semibold">Uploading {progress}%...</span>
                <div className="w-3/4 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-white h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-1 right-1 p-1.5 bg-black hover:bg-zinc-800 text-white rounded-full transition shadow-md"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : uploading ? (
          <div className="flex flex-col items-center justify-center gap-2 text-zinc-500 py-4">
            <Loader2 className="w-7 h-7 animate-spin text-black" />
            <span className="text-xs font-semibold text-zinc-800">Uploading ({progress}%)...</span>
            <div className="w-48 bg-zinc-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-black h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-zinc-500 py-2">
            <div className="w-10 h-10 rounded-full bg-zinc-100 text-black border border-zinc-200 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-black">
                Click to upload <span className="font-normal text-zinc-500">or drag & drop</span>
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">{helperText}</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs font-medium text-black mt-1">{error}</p>
      )}
    </div>
  );
}
