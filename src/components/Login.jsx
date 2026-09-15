import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import './Login.css';

const DEFAULT_CARS = [
  { name: 'Uncle Sedan',     is_default: true, color: '#C73E3A' },
  { name: 'Tuk-Tuk Terror',  is_default: true, color: '#F2B544' },
  { name: 'F1 Kart',         is_default: true, color: '#2E86AB' },
  { name: 'Void Van',        is_default: true, color: '#1A1A1A' },
  { name: 'Kopitiam Kart',   is_default: true, color: '#6B4423' },
];

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('');   // '' | 'loading' | 'error'
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = username.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
    if (!trimmed || trimmed.length < 2) {
      setError('MIN 2 CHARS — LETTERS, NUMBERS, UNDERSCORE');
      return;
    }
    if (trimmed.length > 16) {
      setError('MAX 16 CHARS');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      // Look up existing user
      const { data: existing, error: lookupErr } = await supabase
        .from('users')
        .select('id, username')
        .eq('username', trimmed)
        .maybeSingle();

      if (lookupErr) throw lookupErr;

      if (existing) {
        onLogin(existing);
        return;
      }

      // New user — create + seed default cars
      const { data: newUser, error: createErr } = await supabase
        .from('users')
        .insert({ username: trimmed })
        .select('id, username')
        .single();

      if (createErr) throw createErr;

      const carRows = DEFAULT_CARS.map(c => ({
        user_id: newUser.id,
        name: c.name,
        is_default: c.is_default,
        image_url: null,
      }));

      const { error: carsErr } = await supabase.from('cars').insert(carRows);
      if (carsErr) throw carsErr;

      onLogin(newUser);
    } catch (err) {
      setError(err.message ?? 'CONNECTION FAILED');
      setStatus('error');
    }
  }

  const isLoading = status === 'loading';

  return (
    <main className="login-root" aria-label="Login screen">
      <div className="login-terminal">
        <header className="login-header">
          <div className="login-title-row">
            <span className="login-pixel-car" aria-hidden="true">▶▶</span>
            <h1 className="login-title">CAR DODGE</h1>
            <span className="login-pixel-car" aria-hidden="true">◀◀</span>
          </div>
          <p className="login-subtitle">SG EXPRESSWAY EDITION</p>
        </header>

        <div className="login-divider" aria-hidden="true">
          {'─'.repeat(28)}
        </div>

        <section className="login-prompt-area">
          <p className="login-prompt-line">
            <span className="login-cursor-blink" aria-hidden="true">▌</span>
            {' '}ENTER YOUR CALLSIGN
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="username" className="visually-hidden">Username</label>
            <input
              id="username"
              className="px-input login-input"
              type="text"
              value={username}
              onChange={e => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="PLAYER_001"
              maxLength={16}
              autoComplete="off"
              autoFocus
              disabled={isLoading}
              aria-describedby={error ? 'login-error' : undefined}
              aria-invalid={!!error}
            />

            {error && (
              <p id="login-error" className="login-error" role="alert">
                ⚠ {error}
              </p>
            )}

            <button
              type="submit"
              className="px-btn login-submit"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? 'CONNECTING...' : 'INSERT COIN ▶'}
            </button>
          </form>
        </section>

        <div className="login-divider" aria-hidden="true">
          {'─'.repeat(28)}
        </div>

        <footer className="login-footer">
          <p>WASD / ARROWS — MOVE</p>
          <p>SPACE — NITRO BOOST</p>
          <p className="login-footer-small">SURVIVE THE EXPRESSWAY</p>
        </footer>
      </div>
    </main>
  );
}
