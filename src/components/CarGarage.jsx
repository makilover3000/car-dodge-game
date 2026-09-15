import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import CarUpload from './CarUpload.jsx';
import './CarGarage.css';

// Placeholder colors for default cars (keyed by name)
const DEFAULT_CAR_COLORS = {
  'Uncle Sedan':    '#C73E3A',
  'Tuk-Tuk Terror': '#F2B544',
  'F1 Kart':        '#2E86AB',
  'Void Van':        '#1A1A1A',
  'Kopitiam Kart':  '#6B4423',
};

const CAR_DESCRIPTIONS = {
  'Uncle Sedan':    "Your uncle's trusty Proton. Smells like Tiger Balm.",
  'Tuk-Tuk Terror': "Bangkok's finest. Somehow faster than everything.",
  'F1 Kart':        "Technically street legal. Technically.",
  'Void Van':        "No one knows where it came from. No one asks.",
  'Kopitiam Kart':  "Powered by kopi-o. Unstoppable before 9am.",
};

export default function CarGarage({ user, onStartGame, onViewLeaderboard, onLogout }) {
  const [cars, setCars] = useState([]);
  const [selectedCarId, setSelectedCarId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null); // car object pending delete
  const [showUpload, setShowUpload] = useState(false);
  const [error, setError] = useState('');

  // Load cars from Supabase
  const loadCars = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('cars')
      .select('id, name, is_default, image_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (err) { setError(err.message); setLoading(false); return; }

    setCars(data ?? []);

    // Restore or default selected car
    const stored = localStorage.getItem('selectedCarId');
    const valid = data?.find(c => c.id === stored);
    const pick = valid ?? data?.[0];
    if (pick) {
      setSelectedCarId(pick.id);
      localStorage.setItem('selectedCarId', pick.id);
      if (pick.image_url && !pick.is_default) {
        localStorage.setItem('selectedCarImageUrl', pick.image_url);
      } else {
        localStorage.removeItem('selectedCarImageUrl');
      }
    }
    setLoading(false);
  }, [user.id]);

  useEffect(() => { loadCars(); }, [loadCars]);

  function selectCar(id) {
    setSelectedCarId(id);
    localStorage.setItem('selectedCarId', id);
    const car = cars.find(c => c.id === id);
    if (car?.image_url && !car.is_default) {
      localStorage.setItem('selectedCarImageUrl', car.image_url);
    } else {
      localStorage.removeItem('selectedCarImageUrl');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const { error: err } = await supabase.from('cars').delete().eq('id', deleteTarget.id);
    if (err) { setError(err.message); setDeleteTarget(null); return; }

    const next = cars.filter(c => c.id !== deleteTarget.id);
    setCars(next);
    if (selectedCarId === deleteTarget.id) {
      const fallback = next[0];
      if (fallback) { setSelectedCarId(fallback.id); localStorage.setItem('selectedCarId', fallback.id); }
      else { setSelectedCarId(null); localStorage.removeItem('selectedCarId'); }
    }
    setDeleteTarget(null);
  }

  function handleUploaded(newCar) {
    setCars(prev => [...prev, newCar]);
    setSelectedCarId(newCar.id);
    localStorage.setItem('selectedCarId', newCar.id);
    if (newCar.image_url && !newCar.is_default) {
      localStorage.setItem('selectedCarImageUrl', newCar.image_url);
    } else {
      localStorage.removeItem('selectedCarImageUrl');
    }
    setShowUpload(false);
  }

  const atCap = cars.length >= 10;

  if (showUpload) {
    return (
      <main className="garage-root">
        <CarUpload
          userId={user.id}
          onUploaded={handleUploaded}
          onCancel={() => setShowUpload(false)}
        />
      </main>
    );
  }

  return (
    <main className="garage-root" aria-label="Car Garage">
      {/* ── Header bar ── */}
      <header className="garage-header">
        <div className="garage-header-left">
          <span className="garage-title">GARAGE</span>
          <span className="garage-player">[ {user.username} ]</span>
        </div>
        <div className="garage-header-right">
          <button className="px-btn px-btn--ghost garage-btn-sm" onClick={onViewLeaderboard}>
            SCORES
          </button>
          <button className="px-btn px-btn--ghost garage-btn-sm" onClick={onLogout}>
            LOGOUT
          </button>
        </div>
      </header>

      {/* ── Car grid ── */}
      {loading ? (
        <p className="garage-loading">LOADING GARAGE...</p>
      ) : (
        <section className="garage-grid-section" aria-label="Your cars">
          <p className="garage-count">{cars.length} / 10 CARS</p>
          <div className="garage-grid" role="list">
            {cars.map(car => {
              const color = DEFAULT_CAR_COLORS[car.name] ?? '#888';
              const isSelected = car.id === selectedCarId;
              return (
                <div
                  key={car.id}
                  role="listitem"
                  className={`garage-car-slot ${isSelected ? 'garage-car-slot--selected' : ''}`}
                  onClick={() => selectCar(car.id)}
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') selectCar(car.id); }}
                  aria-label={`${car.name}${isSelected ? ' (selected)' : ''}`}
                  aria-pressed={isSelected}
                >
                  {/* Car art: image or colored rectangle */}
                  <div className="garage-car-art" style={{ '--car-color': color }}>
                    {car.image_url ? (
                      <img
                        src={car.image_url}
                        alt={car.name}
                        width={64}
                        height={64}
                        className="garage-car-img"
                      />
                    ) : (
                      <div className="garage-car-rect" aria-hidden="true" />
                    )}
                    {isSelected && <div className="garage-car-selected-badge" aria-hidden="true">▶</div>}
                  </div>

                  <p className="garage-car-name">{car.name}</p>
                  {CAR_DESCRIPTIONS[car.name] && (
                    <p className="garage-car-desc">{CAR_DESCRIPTIONS[car.name]}</p>
                  )}

                  <button
                    className="px-btn px-btn--danger garage-delete-btn"
                    onClick={e => { e.stopPropagation(); setDeleteTarget(car); }}
                    aria-label={`Delete ${car.name}`}
                  >
                    SCRAP
                  </button>
                </div>
              );
            })}

            {/* Add car slot */}
            {!atCap && (
              <button
                className="garage-car-slot garage-add-slot"
                onClick={() => setShowUpload(true)}
                aria-label="Upload custom car"
              >
                <span className="garage-add-icon" aria-hidden="true">+</span>
                <span className="garage-add-label">UPLOAD CAR</span>
              </button>
            )}
          </div>

          {atCap && (
            <p className="garage-cap-msg">GARAGE FULL — SCRAP A CAR TO ADD MORE</p>
          )}
        </section>
      )}

      {error && <p className="garage-error" role="alert">⚠ {error}</p>}

      {/* ── Start button ── */}
      <div className="garage-start-area">
        <button
          className="px-btn garage-start-btn"
          onClick={onStartGame}
          disabled={!selectedCarId}
        >
          START RACE ▶▶
        </button>
      </div>

      {/* ── Delete confirmation modal ── */}
      {deleteTarget && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirm delete">
          <div className="modal-box px-card">
            <p className="modal-question">SCRAP {deleteTarget.name.toUpperCase()}?</p>
            <p className="modal-warning">THIS IS PERMANENT.</p>
            <div className="modal-actions">
              <button className="px-btn px-btn--danger" onClick={confirmDelete}>
                SCRAP IT
              </button>
              <button className="px-btn px-btn--ghost" onClick={() => setDeleteTarget(null)}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
