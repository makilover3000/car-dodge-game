import { GAME_W, GAME_H } from '../constants.js';

const TRANSITION_MS = 1500;
const LOCK_MS       = 200;  // prevent double-fire

const BIOMES = [
  {
    key: 'expressway',
    roadColor:  0x1c2340,
    skyColor:   0x0a1024,
    palette: { bg: '#0a1024', accent: '#f5a623', accent2: '#e84a5f', ink: '#e8ecf4', glow: 'rgba(245,166,35,0.35)' },
  },
  {
    key: 'sunset',
    roadColor:  0x2d1515,
    skyColor:   0x1a0a0a,
    palette: { bg: '#1a0a0a', accent: '#ff6b35', accent2: '#e84a5f', ink: '#f5e6d3', glow: 'rgba(255,107,53,0.35)' },
  },
  {
    key: 'neon',
    roadColor:  0x0d0020,
    skyColor:   0x05000f,
    palette: { bg: '#05000f', accent: '#b44fff', accent2: '#00f5ff', ink: '#e8d4ff', glow: 'rgba(180,79,255,0.4)' },
  },
  {
    key: 'space',
    roadColor:  0x050518,
    skyColor:   0x000010,
    palette: { bg: '#000010', accent: '#00d4ff', accent2: '#7b2fff', ink: '#c8f0ff', glow: 'rgba(0,212,255,0.35)' },
  },
  {
    key: 'glitch',
    roadColor:  0x001100,
    skyColor:   0x000000,
    palette: { bg: '#000000', accent: '#00ff41', accent2: '#ff0099', ink: '#e0ffe0', glow: 'rgba(0,255,65,0.5)' },
  },
];

/**
 * BackgroundManager — scrolling biomes with crossfade transitions.
 */
export default class BackgroundManager {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this._currentIndex = 0;
    this._locked = false;

    // Build the initial biome layers
    this._current = this._buildLayers(BIOMES[0], 1);

    // Store bound handler so we can unsubscribe cleanly in destroy()
    this._onThresholdBound = d => this._onThreshold(d.index);
    if (window.gameEvents) {
      window.gameEvents.on('biome-threshold-crossed', this._onThresholdBound);
    }
  }

  /**
   * Call every frame.
   * @param {number} scrollSpeed - px/s
   * @param {number} delta - ms
   */
  update(scrollSpeed, delta) {
    const shift = (scrollSpeed / 1000) * delta;
    this._scrollLayers(this._current, shift);
    if (this._incoming) this._scrollLayers(this._incoming, shift);
  }

  _scrollLayers(layers, shift) {
    layers.forEach(l => { l.tilePositionY -= shift; });
  }

  _buildLayers(biome, alpha) {
    const layers = [];

    // Sky / background fill
    const sky = this.scene.add.tileSprite(0, 0, GAME_W, GAME_H, 'road_tile')
      .setOrigin(0, 0)
      .setAlpha(alpha)
      .setDepth(0)
      .setTint(biome.skyColor);
    layers.push(sky);

    // Road surface
    const road = this.scene.add.tileSprite(GAME_W / 2 - 160, 0, 320, GAME_H, 'road_tile')
      .setOrigin(0.5, 0)
      .setAlpha(alpha)
      .setDepth(1)
      .setTint(biome.roadColor);
    layers.push(road);

    return layers;
  }

  _onThreshold(index) {
    if (this._locked || index >= BIOMES.length) return;
    this._locked = true;

    const biome = BIOMES[index];
    this._incoming = this._buildLayers(biome, 0);

    // Crossfade: incoming fades in, current fades out
    this.scene.tweens.add({
      targets: this._incoming,
      alpha: 1,
      duration: TRANSITION_MS,
      ease: 'Sine.easeInOut',
    });
    this.scene.tweens.add({
      targets: this._current,
      alpha: 0,
      duration: TRANSITION_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        // Destroy outgoing layers
        this._current.forEach(l => l.destroy());
        this._current = this._incoming;
        this._incoming = null;
        this._currentIndex = index;

        // Propagate palette to React/CSS
        if (window.gameEvents) {
          window.gameEvents.emit('biome-changed', { key: biome.key, palette: biome.palette });
        }

        // Unlock after brief lockout
        this.scene.time.delayedCall(LOCK_MS, () => { this._locked = false; });
      },
    });
  }

  destroy() {
    if (window.gameEvents) window.gameEvents.off('biome-threshold-crossed', this._onThresholdBound);
    this._current?.forEach(l => l.destroy());
    this._incoming?.forEach(l => l.destroy());
  }
}
