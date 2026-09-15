import { GAME_W, GAME_H } from '../constants.js';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    this._buildScrollingRoad();
    this._buildTitle();
    this._buildInstructions();
    this._bindStart();
  }

  _buildScrollingRoad() {
    // Tile the road texture as a scrolling background
    this.road = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'road_tile').setOrigin(0, 0);
  }

  _buildTitle() {
    const cx = GAME_W / 2;

    this.add.text(cx, 160, 'CAR DODGE', {
      fontFamily: "'Press Start 2P'",
      fontSize: '28px',
      color: '#EC4899',
      stroke: '#0F172A',
      strokeThickness: 6,
      shadow: { offsetX: 4, offsetY: 4, color: '#0F172A', blur: 0, fill: true },
    }).setOrigin(0.5);

    this.add.text(cx, 210, 'SG EXPRESSWAY EDITION', {
      fontFamily: "'Press Start 2P'",
      fontSize: '9px',
      color: '#0F172A',
    }).setOrigin(0.5);
  }

  _buildInstructions() {
    const cx = GAME_W / 2;
    const lines = [
      ['WASD / ARROWS', 'MOVE'],
      ['SPACE', 'NITRO BOOST'],
      ['ESC / P', 'PAUSE'],
    ];

    lines.forEach(([key, val], i) => {
      this.add.text(cx - 20, 320 + i * 34, key, {
        fontFamily: "'Press Start 2P'", fontSize: '8px', color: '#475569',
      }).setOrigin(1, 0);
      this.add.text(cx + 20, 320 + i * 34, val, {
        fontFamily: "'Press Start 2P'", fontSize: '8px', color: '#0F172A',
      }).setOrigin(0, 0);
    });
  }

  _bindStart() {
    const cx = GAME_W / 2;

    const prompt = this.add.text(cx, 460, 'PRESS SPACE OR CLICK TO START', {
      fontFamily: "'Press Start 2P'",
      fontSize: '12px',
      color: '#2563EB',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0,
      duration: 500,
      ease: 'Linear',
      yoyo: true,
      repeat: -1,
    });

    this._onSpace = () => this.scene.start('GameScene');
    this.input.keyboard.on('keydown-SPACE', this._onSpace);
    this.input.on('pointerdown', this._onSpace);
  }

  shutdown() {
    this.input.keyboard?.off('keydown-SPACE', this._onSpace);
    this.input.off('pointerdown', this._onSpace);
  }

  update() {
    // Scroll road downward to simulate forward motion
    if (this.road) this.road.tilePositionY -= 4;
  }
}
