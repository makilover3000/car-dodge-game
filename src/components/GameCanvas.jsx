import { useEffect, useRef } from 'react';
import { gameEvents } from '../lib/gameEvents.js';
import { supabase } from '../lib/supabase.js';
import { initPhaserGame } from '../game/main.js';
import HUD from './HUD.jsx';
import './GameCanvas.css';

export default function GameCanvas({ user, onGameOver }) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    // Guard against React StrictMode double-invocation
    if (gameRef.current) return;

    const selectedCarId = localStorage.getItem('selectedCarId');
    const customImageUrl = localStorage.getItem('selectedCarImageUrl') || undefined;

    gameRef.current = initPhaserGame(containerRef.current, {
      selectedCarId,
      customImageUrl,
      username: user.username,
      userId: user.id,
    });

    // Focus the container so the Phaser canvas receives keyboard events
    containerRef.current?.focus();

    async function handleScoreSubmit({ score }) {
      if (!score) return;
      await supabase.from('scores').insert({
        user_id: user.id,
        username: user.username,
        score: Math.floor(score),
      });
    }
    gameEvents.on('score-submit', handleScoreSubmit);

    function handleGameOver() { onGameOver(); }
    gameEvents.on('game:over', handleGameOver);

    return () => {
      gameEvents.off('score-submit', handleScoreSubmit);
      gameEvents.off('game:over', handleGameOver);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [user, onGameOver]);

  return (
    <div className="game-canvas-root">
      <div
        ref={containerRef}
        id="phaser-container"
        className="game-phaser-container"
        tabIndex={-1}
        onClick={() => containerRef.current?.focus()}
        aria-label="Game canvas"
      />
      <HUD />
    </div>
  );
}
