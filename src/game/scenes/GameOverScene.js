import { GAME_W, GAME_H } from '../constants.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }

  init(data) {
    this.finalScore = data.score ?? 0;
  }

  create() {
    const cx = GAME_W / 2;

    // Dim background
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.75).setOrigin(0);

    this.add.text(cx, 220, 'GAME OVER', {
      fontFamily: "'Press Start 2P'",
      fontSize: '28px',
      color: '#e84a5f',
      stroke: '#000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(cx, 300, `SCORE: ${this.finalScore}`, {
      fontFamily: "'Press Start 2P'",
      fontSize: '14px',
      color: '#f5a623',
    }).setOrigin(0.5);

    // Emit to React for Supabase write
    if (window.gameEvents) {
      window.gameEvents.emit('score-submit', { score: this.finalScore });
    }

    const retry = this.add.text(cx, 400, 'PRESS R TO RETRY', {
      fontFamily: "'Press Start 2P'",
      fontSize: '11px',
      color: '#e8ecf4',
    }).setOrigin(0.5);

    this.add.text(cx, 440, 'PRESS M FOR MENU', {
      fontFamily: "'Press Start 2P'",
      fontSize: '11px',
      color: '#5a6282',
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
