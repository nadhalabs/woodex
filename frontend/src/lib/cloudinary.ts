import { fetchApi } from './api';

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

export interface UploadResourceTarget {
  resourceType: 'product' | 'category';
  resourceId: string;
}

export async function uploadToCloudinary(
  file: File,
  target: UploadResourceTarget,
  onProgress?: (percent: number) => void
): Promise<CloudinaryUploadResult> {
  if (!target || !target.resourceId) {
    throw new Error('Resource ID is required to upload an image. Please save the item first.');
  }

  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG and WebP images are allowed.');
  }

  // Validate file size (10 MB max)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('Image size exceeds 10MB limit. Please upload a smaller image.');
  }

  const formData = new FormData();
  formData.append('file', file);
  const signing = await fetchApi('/image-uploads/signature', {
    method: 'POST',
    body: JSON.stringify({
      resource_type: target.resourceType,
      resource_id: target.resourceId,
    }),
  });
  formData.append('api_key', signing.api_key);
  formData.append('timestamp', String(signing.timestamp));
  formData.append('signature', signing.signature);
  formData.append('folder', signing.folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${encodeURIComponent(signing.cloud_name)}/image/upload`);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.secure_url && data.public_id) {
            resolve({
              secure_url: data.secure_url,
              public_id: data.public_id,
            });
          } else {
            reject(new Error('Cloudinary response missing url or public_id'));
          }
        } catch (err) {
          reject(new Error('Failed to parse Cloudinary response'));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData?.error?.message || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error occurred during image upload'));
    };

    xhr.send(formData);
  });
}

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: string | number;
  format?: string;
  crop?: 'fill' | 'scale' | 'fit' | 'thumb' | 'limit';
}

export function getOptimizedImageUrl(
  url?: string | null,
  options: ImageOptimizationOptions = {}
): string {
  if (!url) return '';

  // Only apply Cloudinary transformations to Cloudinary URLs
  if (!url.includes('cloudinary.com') || !url.includes('/image/upload/')) {
    return url;
  }

  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
  } = options;

  const transforms: string[] = [`f_${format}`, `q_${quality}`];

  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (crop && (width || height)) transforms.push(`c_${crop}`);

  const transformString = transforms.join(',');

  // If URL already has transformations, avoid duplicating or just insert after /image/upload/
  const uploadIndex = url.indexOf('/image/upload/');
  if (uploadIndex !== -1) {
    const prefix = url.substring(0, uploadIndex + '/image/upload/'.length);
    const rest = url.substring(uploadIndex + '/image/upload/'.length);

    // If rest starts with existing transform, skip or append
    return `${prefix}${transformString}/${rest}`;
  }

  return url;
}
