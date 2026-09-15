import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import {
  ACCEPTED_TYPES, MAX_FILE_SIZE, CROP_BOX,
  renderCrop, outputSizeFor, panLimit, canvasToBlob, uploadToStorage,
} from '../lib/imageUpload.js';
import './CarUpload.css';

const COPY = {
  car:  { title: 'UPLOAD CAR',  label: 'CAR NAME:',  placeholder: 'MY RIDE',  fallback: 'CUSTOM CAR' },
  coin: { title: 'UPLOAD COIN', label: 'COIN NAME:', placeholder: 'MY COIN',  fallback: 'CUSTOM COIN' },
};

/**
 * Uploads a car or coin image at full quality with a square crop.
 * Source resolution is preserved up to 1024px — no pixel-art downsampling.
 */
export default function CarUpload({ userId, kind = 'car', onUploaded, onCancel }) {
  const [bitmap, setBitmap] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [name, setName] = useState('');
  const [status, setStatus] = useState('idle'); // idle | cropping | uploading
  const [error, setError] = useState('');

  const canvasRef = useRef(null);
  const inputRef = useRef(null);
  const dragRef = useRef(null);
  const copy = COPY[kind];

  // Redraw the crop preview whenever the view changes.
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    const preview = renderCrop(bitmap, { zoom, offsetX: offset.x, offsetY: offset.y }, CROP_BOX);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CROP_BOX, CROP_BOX);
    ctx.drawImage(preview, 0, 0);
  }, [bitmap, zoom, offset]);

  useEffect(() => { draw(); }, [draw]);

  // Keep the image covering the crop box when zooming out.
  useEffect(() => {
    if (!bitmap) return;
    const lim = panLimit(bitmap, zoom);
    setOffset(o => ({
      x: Math.max(-lim.x, Math.min(lim.x, o.x)),
      y: Math.max(-lim.y, Math.min(lim.y, o.y)),
    }));
  }, [zoom, bitmap]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) return setError('PNG, JPEG, OR WEBP ONLY');
    if (file.size > MAX_FILE_SIZE) return setError('FILE TOO LARGE (MAX 12MB)');

    setError('');
    try {
      const bmp = await createImageBitmap(file);
      setBitmap(bmp);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setStatus('cropping');
    } catch {
      setError('COULD NOT READ IMAGE FILE');
    }
  }

  function startDrag(e) {
    const point = e.touches?.[0] ?? e;
    dragRef.current = { x: point.clientX, y: point.clientY, ox: offset.x, oy: offset.y };
  }

  function onDrag(e) {
    if (!dragRef.current || !bitmap) return;
    const point = e.touches?.[0] ?? e;
    const lim = panLimit(bitmap, zoom);
    const nx = dragRef.current.ox + (point.clientX - dragRef.current.x);
    const ny = dragRef.current.oy + (point.clientY - dragRef.current.y);
    setOffset({
      x: Math.max(-lim.x, Math.min(lim.x, nx)),
      y: Math.max(-lim.y, Math.min(lim.y, ny)),
    });
  }

  function endDrag() { dragRef.current = null; }

  async function handleConfirm() {
    if (!bitmap) return;
    setStatus('uploading');
    setError('');

    try {
      const size = outputSizeFor(bitmap);
      const canvas = renderCrop(bitmap, { zoom, offsetX: offset.x, offsetY: offset.y }, size);
      const blob = await canvasToBlob(canvas);
      const imageUrl = await uploadToStorage(blob, userId, kind);
      const finalName = name.trim() || copy.fallback;

      const table = kind === 'coin' ? 'coin_skins' : 'cars';
      const row = kind === 'coin'
        ? { user_id: userId, name: finalName, image_url: imageUrl }
        : { user_id: userId, name: finalName, is_default: false, image_url: imageUrl };

      const { data, error: insertErr } = await supabase
        .from(table).insert(row).select('id').single();
      if (insertErr) throw insertErr;

      onUploaded({ id: data.id, name: finalName, is_default: false, image_url: imageUrl });
    } catch (err) {
      setError(err.message ?? 'UPLOAD FAILED');
      setStatus('cropping');
    }
  }

  function handleReset() {
    bitmap?.close?.();
    setBitmap(null);
    setName('');
    setError('');
    setStatus('idle');
    if (inputRef.current) inputRef.current.value = '';
  }

  const isUploading = status === 'uploading';

  return (
    <div className="upload-root px-card">
      <h2 className="upload-title">{copy.title}</h2>

      {status === 'idle' && (
        <div className="upload-drop-zone">
          <label htmlFor="img-file-input" className="px-btn upload-file-btn">CHOOSE IMAGE</label>
          <input
            ref={inputRef}
            id="img-file-input"
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleFile}
            className="visually-hidden"
          />
          <p className="upload-hint">PNG / JPEG / WEBP · MAX 12MB</p>
          <p className="upload-hint">FULL QUALITY KEPT — DRAG TO CROP</p>
        </div>
      )}

      {bitmap && (
        <div className="upload-preview-area">
          <p className="upload-preview-label">DRAG TO POSITION · SLIDE TO ZOOM</p>

          <canvas
            ref={canvasRef}
            width={CROP_BOX}
            height={CROP_BOX}
            className="upload-crop-canvas"
            onMouseDown={startDrag}
            onMouseMove={onDrag}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
            onTouchStart={startDrag}
            onTouchMove={onDrag}
            onTouchEnd={endDrag}
            aria-label="Crop preview — drag to reposition"
          />

          <label htmlFor="zoom-range" className="upload-name-label">ZOOM</label>
          <input
            id="zoom-range"
            className="upload-zoom"
            type="range"
            min="1" max="4" step="0.02"
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            disabled={isUploading}
          />

          <label htmlFor="img-name-input" className="upload-name-label">{copy.label}</label>
          <input
            id="img-name-input"
            className="px-input upload-name-input"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={copy.placeholder}
            maxLength={30}
            disabled={isUploading}
          />

          <div className="upload-actions">
            <button className="px-btn" onClick={handleConfirm} disabled={isUploading} aria-busy={isUploading}>
              {isUploading ? 'UPLOADING...' : 'CONFIRM'}
            </button>
            <button className="px-btn px-btn--ghost" onClick={handleReset} disabled={isUploading}>
              CHANGE IMAGE
            </button>
          </div>
        </div>
      )}

      {error && <p className="upload-error" role="alert">⚠ {error}</p>}

      <button className="px-btn px-btn--ghost upload-cancel" onClick={onCancel}>← BACK</button>
    </div>
  );
}
