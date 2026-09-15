import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase.js';
import './CarUpload.css';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export default function CarUpload({ userId, onUploaded, onCancel }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [blobRef, setBlobRef] = useState(null);
  const [carName, setCarName] = useState('');
  const [status, setStatus] = useState('idle'); // idle | previewing | uploading | error
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('PNG, JPEG, OR WEBP ONLY');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('FILE TOO LARGE (MAX 5MB)');
      return;
    }

    setError('');
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = new OffscreenCanvas(64, 64);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      const scale = Math.min(64 / bitmap.width, 64 / bitmap.height);
      const w = bitmap.width * scale;
      const h = bitmap.height * scale;
      ctx.drawImage(bitmap, (64 - w) / 2, (64 - h) / 2, w, h);
      bitmap.close();

      const blob = await canvas.convertToBlob({ type: 'image/png' });
      setBlobRef(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setStatus('previewing');
    } catch {
      setError('COULD NOT READ IMAGE FILE');
    }
  }

  async function handleConfirm() {
    const name = carName.trim() || 'CUSTOM CAR';
    if (!blobRef) return;
    setStatus('uploading');
    setError('');

    try {
      // Convert the 64x64 blob to a base64 data URL and store it directly
      // in the cars table — avoids Supabase Storage and its RLS entirely
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blobRef);
      });

      const { data: carRow, error: insertErr } = await supabase
        .from('cars')
        .insert({ user_id: userId, name, is_default: false, image_url: dataUrl })
        .select('id')
        .single();
      if (insertErr) throw insertErr;

      onUploaded({ id: carRow.id, name, is_default: false, image_url: dataUrl });
    } catch (err) {
      setError(err.message ?? 'UPLOAD FAILED');
      setStatus('previewing');
    }
  }

  function handleReset() {
    setPreviewUrl(null);
    setBlobRef(null);
    setCarName('');
    setError('');
    setStatus('idle');
    if (inputRef.current) inputRef.current.value = '';
  }

  const isUploading = status === 'uploading';

  return (
    <div className="upload-root px-card">
      <h2 className="upload-title">UPLOAD CAR</h2>

      {status === 'idle' && (
        <div className="upload-drop-zone">
          <label htmlFor="car-file-input" className="px-btn upload-file-btn">
            CHOOSE IMAGE
          </label>
          <input
            ref={inputRef}
            id="car-file-input"
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleFile}
            className="visually-hidden"
          />
          <p className="upload-hint">PNG / JPEG / WEBP · MAX 5MB</p>
          <p className="upload-hint">WILL BE RESIZED TO 64×64 PIXELS</p>
        </div>
      )}

      {(status === 'previewing' || status === 'uploading' || status === 'error') && previewUrl && (
        <div className="upload-preview-area">
          <p className="upload-preview-label">PREVIEW (64×64):</p>
          <img
            src={previewUrl}
            alt="Car preview"
            width={256}
            height={256}
            className="upload-preview-img"
          />

          <label htmlFor="car-name-input" className="upload-name-label">
            CAR NAME:
          </label>
          <input
            id="car-name-input"
            className="px-input upload-name-input"
            type="text"
            value={carName}
            onChange={e => setCarName(e.target.value)}
            placeholder="MY RIDE"
            maxLength={30}
            disabled={isUploading}
          />

          <div className="upload-actions">
            <button
              className="px-btn"
              onClick={handleConfirm}
              disabled={isUploading}
              aria-busy={isUploading}
            >
              {isUploading ? 'UPLOADING...' : 'CONFIRM ▶'}
            </button>
            <button
              className="px-btn px-btn--ghost"
              onClick={handleReset}
              disabled={isUploading}
            >
              RETRY
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="upload-error" role="alert">⚠ {error}</p>
      )}

      <button className="px-btn px-btn--ghost upload-cancel" onClick={onCancel}>
        ← BACK
      </button>
    </div>
  );
}
