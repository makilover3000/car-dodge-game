import { useState, useEffect } from 'react';
import { gameEvents } from '../lib/gameEvents.js';
import './HUD.css';

export default function HUD() {
  const [score,  setScore]  = useState(0);
  const [lives,  setLives]  = useState(3);
  const [nitro,  setNitro]  = useState({ remaining: 0, total: 10000, active: false });
  const [biome,  setBiome]  = useState('expressway');

  useEffect(() => {
    function onScore(s)  { setScore(s); }
    function onLives(l)  { setLives(l); }
    function onNitro(n)  { setNitro(n); }
    function onBiome(b)  {
      setBiome(b.key);
      // Propagate palette to CSS variables on root
      const { palette } = b;
      const root = document.documentElement;
      root.style.setProperty('--biome-bg',      palette.bg);
      root.style.setProperty('--biome-accent',   palette.accent);
      root.style.setProperty('--biome-accent2',  palette.accent2);
      root.style.setProperty('--biome-ink',      palette.ink);
      root.style.setProperty('--biome-glow',     palette.glow);
      document.body.setAttribute('data-biome', b.key);
    }

    gameEvents.on('score',         onScore);
    gameEvents.on('lives',         onLives);
    gameEvents.on('nitro-cooldown', onNitro);
    gameEvents.on('biome-changed', onBiome);

    return () => {
      gameEvents.off('score',          onScore);
      gameEvents.off('lives',          onLives);
      gameEvents.off('nitro-cooldown', onNitro);
      gameEvents.off('biome-changed',  onBiome);
    };
  }, []);

  const nitroPercent = nitro.remaining === 0
    ? 100
    : Math.round(((nitro.total - nitro.remaining) / nitro.total) * 100);

  return (
    <div className="hud-root" aria-label="Game HUD" role="status" aria-live="polite">
      {/* Score */}
      <div className="hud-score">{String(score).padStart(6, '0')}</div>

      {/* Lives */}
      <div className="hud-lives" aria-label={`${lives} lives remaining`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <span
            key={i}
            className={`hud-heart ${i < lives ? 'hud-heart--full' : 'hud-heart--empty'}`}
            aria-hidden="true"
          >
            ♥
          </span>
        ))}
      </div>

      {/* Nitro bar */}
      <div className="hud-nitro" aria-label={`Nitro ${nitroPercent}%`}>
        <span className="hud-nitro-label">NITRO</span>
        <div className="hud-nitro-track" role="progressbar" aria-valuenow={nitroPercent} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={`hud-nitro-fill ${nitro.active ? 'hud-nitro-fill--active' : ''}`}
            style={{ width: `${nitroPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
