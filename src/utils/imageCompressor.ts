/**
 * AdPulse Ultra-Fast Image Compressor & WebP Optimizer
 * Reduces raw 500KB+ banner images down to ~15KB WebP, preventing database & script bloat.
 */

export interface CompressionResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  dimensions: { width: number; height: number };
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (default 0.82)
}

/**
 * Compresses an uploaded image file into a highly-optimized WebP or JPEG data URI
 */
export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const maxWidth = options.maxWidth || 600;
  const maxHeight = options.maxHeight || 400;
  const quality = options.quality || 0.82;

  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image element'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio while constraining to max bounds
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get 2D canvas context'));
          return;
        }

        // High quality bicubic smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first (best compression), fallback to JPEG
        let compressedDataUrl = canvas.toDataURL('image/webp', quality);
        if (!compressedDataUrl.startsWith('data:image/webp')) {
          compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // Estimate size in bytes
        const base64Content = compressedDataUrl.split(',')[1] || '';
        const compressedSize = Math.round((base64Content.length * 3) / 4);

        const savingsPercent = Math.max(
          0,
          Math.round(((originalSize - compressedSize) / originalSize) * 100)
        );

        resolve({
          dataUrl: compressedDataUrl,
          originalSize,
          compressedSize,
          savingsPercent,
          dimensions: { width, height }
        });
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Checks if a string is a base64 Data URL
 */
export function isDataUri(url: string): boolean {
  return typeof url === 'string' && url.trim().startsWith('data:image/');
}

/**
 * Estimates byte size of a data URL or image string
 */
export function estimateImageBytes(url?: string): number {
  if (!url) return 0;
  if (!isDataUri(url)) return 0; // External URLs don't take local storage space
  const base64 = url.split(',')[1] || '';
  return Math.round((base64.length * 3) / 4);
}

/**
 * Format bytes to readable string (e.g. 14.5 KB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
