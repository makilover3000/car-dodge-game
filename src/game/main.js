import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import GameOverScene from './scenes/GameOverScene.js';

import { GAME_W, GAME_H } from './constants.js';
export { GAME_W, GAME_H };

/**
 * Initialise and return a Phaser.Game instance.
 * @param {HTMLElement} parent - DOM element to mount the canvas into
 * @param {{ selectedCarId: string, username: string, userId: string }} ctx
 */
export function initPhaserGame(parent, ctx) {
  // Expose context so scenes can read it on boot
  window.__gameCtx = ctx;

  const config = {
    type: Phaser.AUTO,
    width: GAME_W,
    height: GAME_H,
    parent,
    backgroundColor: '#07091a',
    pixelArt: true,
    antialias: false,
    scene: [BootScene, MenuScene, GameScene, GameOverScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 }, debug: false },
    },
  };

  return new Phaser.Game(config);
}
