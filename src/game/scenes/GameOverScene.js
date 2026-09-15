import { GAME_W, GAME_H } from '../constants.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }

  init(data) {
    this.finalScore = data.score ?? 0;
    this.coins = data.coins ?? 0;
  }

  create() {
    const cx = GAME_W / 2;

    // Light scrim — isolates the panel without blacking out the world behind it
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0xEFF6FF, 0.88).setOrigin(0);
    this.add.rectangle(cx, GAME_H / 2, 360, 300, 0xFFFFFF)
      .setStrokeStyle(4, 0x0F172A);

    this.add.text(cx, 260, 'GAME OVER', {
      fontFamily: "'Press Start 2P'",
      fontSize: '26px',
      color: '#DC2626',
      stroke: '#0F172A',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(cx, 330, `SCORE: ${this.finalScore}`, {
      fontFamily: "'Press Start 2P'",
      fontSize: '14px',
      color: '#D97706',
    }).setOrigin(0.5);

    this.add.text(cx, 362, `COINS: ${this.coins}`, {
      fontFamily: "'Press Start 2P'",
      fontSize: '11px',
      color: '#B45309',
    }).setOrigin(0.5);

    // Emit to React for Supabase write
    if (window.gameEvents) {
      window.gameEvents.emit('score-submit', { score: this.finalScore, coins: this.coins });
    }

    const retry = this.add.text(cx, 400, 'PRESS R TO RETRY', {
      fontFamily: "'Press Start 2P'",
      fontSize: '11px',
      color: '#2563EB',
    }).setOrigin(0.5);

    this.add.text(cx, 440, 'PRESS M FOR MENU', {
      fontFamily: "'Press Start 2P'",
      fontSize: '11px',
      color: '#475569',
    }).setOrigin(0.5);

    this.tweens.add({ targets: retry, alpha: 0, duration: 500, yoyo: true, repeat: -1 });

    this._onR = () => this.scene.start('GameScene');
    this._onM = () => { if (window.gameEvents) window.gameEvents.emit('game:over'); };
    this.input.keyboard.on('keydown-R', this._onR);
    this.input.keyboard.on('keydown-M', this._onM);
  }

  shutdown() {
    this.input.keyboard?.off('keydown-R', this._onR);
    this.input.keyboard?.off('keydown-M', this._onM);
  }
}
