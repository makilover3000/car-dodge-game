import { GAME_W, GAME_H } from '../constants.js';

// Placeholder car colors matching the frontend constants
const CAR_TEXTURES = [
  { key: 'car_uncle_sedan',    color: 0xC73E3A },
  { key: 'car_tuktukt_terror', color: 0xF2B544 },
  { key: 'car_f1_kart',        color: 0x2E86AB },
  { key: 'car_void_van',       color: 0x1A1A1A },
  { key: 'car_kopitiam_kart',  color: 0x6B4423 },
];

const OBSTACLE_TEXTURES = [
  { key: 'obs_car',   color: 0xE84A5F, w: 40, h: 70 },
  { key: 'obs_truck', color: 0x9B59B6, w: 56, h: 90 },
];

export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    this._createLoadingBar();
    this._generateCarTextures();
    this._generateObstacleTextures();
    this._generateRoadTextures();
    this._generateCoinTexture();
  }

  create() {
    // Pull in whatever artwork the player uploaded for their car and coin
    const ctx = window.__gameCtx ?? {};
    const custom = [
      ['car_custom',  ctx.customImageUrl],
      ['coin_custom', ctx.coinImageUrl],
    ].filter(([, url]) => !!url);

    if (custom.length === 0) {
      this.scene.start('MenuScene');
      return;
    }

    custom.forEach(([key, url]) => this.load.image(key, url));
    this.load.once('complete', () => {
      // Uploaded art is photographic, so it must be sampled smoothly — the
      // nearest-neighbour default would undo the quality we just preserved.
      custom.forEach(([key]) => {
        if (this.textures.exists(key)) {
          this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
        }
      });
      this.scene.start('MenuScene');
    });
    this.load.start();
  }

  // ── Procedural texture generation (no sprite files needed) ──

  _generateCarTextures() {
    CAR_TEXTURES.forEach(({ key, color }) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color);
      g.fillRect(0, 0, 40, 64);
      // Windshield highlight
      g.fillStyle(0xffffff, 0.25);
      g.fillRect(6, 8, 28, 14);
      // Wheels
      g.fillStyle(0x111111);
      g.fillRect(0, 10, 8, 14);
      g.fillRect(32, 10, 8, 14);
      g.fillRect(0, 42, 8, 14);
      g.fillRect(32, 42, 8, 14);
      g.generateTexture(key, 40, 64);
      g.destroy();
    });
  }

  _generateObstacleTextures() {
    OBSTACLE_TEXTURES.forEach(({ key, color, w, h }) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color);
      g.fillRect(0, 0, w, h);
      g.fillStyle(0xffffff, 0.2);
      g.fillRect(4, 6, w - 8, 10);
      g.generateTexture(key, w, h);
      g.destroy();
    });
  }

  _generateRoadTextures() {
    // Road tile: mid-grey asphalt with bright markings
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x6B7A99);
    g.fillRect(0, 0, GAME_W, 64);
    // Dashed centre line
    g.fillStyle(0xFFD24A, 0.95);
    g.fillRect(GAME_W / 2 - 3, 0, 6, 40);
    // Road edge stripes
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(60, 0, 5, 64);
    g.fillRect(GAME_W - 65, 0, 5, 64);
    g.generateTexture('road_tile', GAME_W, 64);
    g.destroy();
  }

  /** Default collectible: a gold coin with a rim highlight. */
  _generateCoinTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xB45309);
    g.fillCircle(20, 20, 19);
    g.fillStyle(0xF59E0B);
    g.fillCircle(20, 20, 16);
    g.fillStyle(0xFFD24A);
    g.fillCircle(20, 20, 11);
    g.fillStyle(0xFFFFFF, 0.55);
    g.fillCircle(14, 13, 4);
    g.generateTexture('coin_default', 40, 40);
    g.destroy();
  }

  _createLoadingBar() {
    const { width, height } = this.scale;
    const barW = 300, barH = 20;
    const barX = (width - barW) / 2;
    const barY = height / 2;

    this.add.text(width / 2, barY - 40, 'LOADING...', {
      fontFamily: "'Press Start 2P'",
      fontSize: '14px',
      color: '#f5a623',
    }).setOrigin(0.5);

    const bg = this.add.rectangle(barX, barY, barW, barH, 0x2a3060).setOrigin(0);
    const bar = this.add.rectangle(barX, barY, 0, barH, 0xf5a623).setOrigin(0);

    this.load.on('progress', v => { bar.width = barW * v; });
  }
}
