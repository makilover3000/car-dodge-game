import { useState, useEffect, useRef } from 'react';
import { gameEvents } from '../lib/gameEvents.js';
import './PauseOverlay.css';

export default function PauseOverlay({ onQuit }) {
  const [paused, setPaused] = useState(false);
  const resumeRef = useRef(null);

  useEffect(() => {
    function onPause() { setPaused(true); }
    gameEvents.on('game:pause', onPause);
    return () => gameEvents.off('game:pause', onPause);
  }, []);

  useEffect(() => {
    if (!paused) return;
    resumeRef.current?.focus();

    function onKey(e) {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        resume();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paused]);

  function resume() {
    setPaused(false);
    gameEvents.emit('game:resume');
  }

  function restart() {
    setPaused(false);
    gameEvents.emit('game:restart');
  }

  if (!paused) return null;

  return (
    <div className="modal-backdrop pause-backdrop" role="dialog" aria-modal="true" aria-label="Game paused">
      <div className="modal-box px-card pause-box">
        <p className="pause-title">PAUSED</p>
        <p className="pause-hint">ESC OR P TO RESUME</p>
        <div className="modal-actions pause-actions">
          <button ref={resumeRef} className="px-btn" onClick={resume}>
            RESUME
          </button>
          <button className="px-btn px-btn--ghost" onClick={restart}>
            RESTART
          </button>
          <button className="px-btn px-btn--ghost" onClick={onQuit}>
            QUIT TO GARAGE
          </button>
        </div>
      </div>
    </div>
  );
}
