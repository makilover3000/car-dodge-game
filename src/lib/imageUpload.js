import { supabase } from './supabase.js';

export const BUCKET = 'game-images';
export const MAX_FILE_SIZE = 12 * 1024 * 1024; // 12 MB
export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const MAX_OUTPUT = 1024;  // longest edge of the stored image
export const CROP_BOX = 320;     // on-screen crop viewport, px

/**
 * Render the user's chosen crop to a square canvas at full quality.
 *
 * The output resolution follows the source rather than a fixed pixel-art size:
 * a large photo stays large, and smoothing is left ON at high quality so the
 * result is a clean resample, never a blocky one.
 *
 * @param {ImageBitmap} bitmap
 * @param {{ zoom: number, offsetX: number, offsetY: number }} view
 * @param {number} size - output edge length
 * @returns {HTMLCanvasElement}
 */
export function renderCrop(bitmap, view, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // "cover" the square, then apply the user's zoom and pan.
  const base = Math.max(size / bitmap.width, size / bitmap.height);
  const scale = base * view.zoom;
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  const ratio = size / CROP_BOX;

  ctx.drawImage(
    bitmap,
    (size - w) / 2 + view.offsetX * ratio,
    (size - h) / 2 + view.offsetY * ratio,
    w,
    h,
  );
  return canvas;
}

/** Largest sensible output edge for a source image — never upscales. */
export function outputSizeFor(bitmap) {
  return Math.min(MAX_OUTPUT, Math.max(bitmap.width, bitmap.height));
}

/** How far the image may be panned before its edge enters the crop box. */
export function panLimit(bitmap, zoom) {
  const base = Math.max(CROP_BOX / bitmap.width, CROP_BOX / bitmap.height);
  const scale = base * zoom;
  return {
    x: Math.max(0, (bitmap.width * scale - CROP_BOX) / 2),
    y: Math.max(0, (bitmap.height * scale - CROP_BOX) / 2),
  };
}

export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('Could not encode image'))),
      'image/png',
    );
  });
}

/**
 * Upload a blob to Storage and return its public URL.
 * Only the URL is stored in the database — never the image bytes.
 */
export async function uploadToStorage(blob, userId, kind) {
  const path = `${userId}/${kind}-${Date.now()}.png`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/png', upsert: false });

  if (error) {
    const hint = /bucket|not found/i.test(error.message)
      ? `Storage bucket "${BUCKET}" is missing — create it in Supabase (public read).`
      : error.message;
    throw new Error(hint);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
