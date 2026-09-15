import { useState, useEffect } from 'react';
import { gameEvents } from '../lib/gameEvents.js';
import './HUD.css';

const MAX_LIVES = 3;

function Heart({ filled }) {
  return (
    <svg
      className={`hud-heart ${filled ? 'hud-heart--full' : 'hud-heart--empty'}`}
      viewBox="0 0 32 30"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M16 29 3 16.2A8.3 8.3 0 0 1 16 5.9 8.3 8.3 0 0 1 29 16.2Z"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function HUD() {
  const [score,  setScore]  = useState(0);
  const [lives,  setLives]  = useState(3);
  const [nitro,  setNitro]  = useState({ remaining: 0, total: 10000, active: false });
  const [coins,  setCoins]  = useState(0);
  const [biome,  setBiome]  = useState('expressway');

  useEffect(() => {
    function onScore(s)  { setScore(s); }
    function onLives(l)  { setLives(l); }
    function onNitro(n)  { setNitro(n); }
    function onCoins(c)  { setCoins(c); }
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
    gameEvents.on('coin-collected', onCoins);
    gameEvents.on('biome-changed', onBiome);

    return () => {
      gameEvents.off('score',          onScore);
      gameEvents.off('lives',          onLives);
      gameEvents.off('nitro-cooldown', onNitro);
      gameEvents.off('coin-collected', onCoins);
      gameEvents.off('biome-changed',  onBiome);

      // Hand the palette back so the garage isn't left tinted by the last world.
      const root = document.documentElement;
      ['bg', 'accent', 'accent2', 'ink', 'glow'].forEach(n =>
        root.style.removeProperty(`--biome-${n}`));
      document.body.removeAttribute('data-biome');
    };
  }, []);

  const nitroPercent = nitro.remaining === 0
    ? 100
    : Math.round(((nitro.total - nitro.remaining) / nitro.total) * 100);

  return (
    <div className="hud-root" aria-label="Game HUD" role="status" aria-live="polite">
      {/* Score + coins */}
      <div className="hud-stack">
        <div className="hud-score tnum">{String(score).padStart(6, '0')}</div>
        <div className="hud-coins" aria-label={`${coins} coins collected`}>
          <span className="hud-coin-dot" aria-hidden="true" />
          <span className="tnum">{coins}</span>
        </div>
      </div>

      {/* Lives */}
      <div className="hud-lives" aria-label={`${lives} lives remaining`}>
        {Array.from({ length: MAX_LIVES }).map((_, i) => (
          <Heart key={i} filled={i < lives} />
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
