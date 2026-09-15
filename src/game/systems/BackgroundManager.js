import { GAME_W, GAME_H } from '../constants.js';
import WORLDS from '../worlds/worldDefs.js';
import { buildWorldTextures, textureKeys, ROAD_GEOMETRY } from '../worlds/WorldBuilder.js';

const TRANSITION_MS = 1500;
const LOCK_MS       = 200;

/**
 * BackgroundManager — renders the current world as four scrolling layers and
 * crossfades to the next one when a score threshold is crossed.
 *
 * Layers scroll at different ratios so the world reads with depth: the ground
 * and roadside move with the car, while weather sits in its own plane.
 */
export default class BackgroundManager {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this._index = 0;
    this._locked = false;

    // Bake every world up front — one-time cost, no hitching mid-run.
    WORLDS.forEach(w => buildWorldTextures(scene, w));

    this._current = this._buildLayers(WORLDS[0], 1);
    this._announce(WORLDS[0]);

    this._onThresholdBound = d => this._onThreshold(d.index);
    window.gameEvents?.on('biome-threshold-crossed', this._onThresholdBound);
  }

  /**
   * @param {number} scrollSpeed - px/s
   * @param {number} delta - ms
   */
  update(scrollSpeed, delta) {
    const shift = (scrollSpeed / 1000) * delta;
    this._scroll(this._current, shift);
    if (this._incoming) this._scroll(this._incoming, shift);
  }

  _scroll(layers, shift) {
    layers.forEach(l => { l.tilePositionY -= shift * l.getData('ratio'); });
  }

  /** Build the four tileSprites for a world at a given starting alpha. */
  _buildLayers(world, alpha) {
    const keys = textureKeys(world.key);
    const road = ROAD_GEOMETRY;
    const particleRatio = world.particle.speedRatio ?? 1;

    const specs = [
      { key: keys.ground,    x: 0,        w: GAME_W,     depth: 0, ratio: 1 },
      { key: keys.road,      x: road.x,   w: road.width, depth: 1, ratio: 1 },
      { key: keys.decor,     x: 0,        w: GAME_W,     depth: 2, ratio: 1 },
      { key: keys.particles, x: 0,        w: GAME_W,     depth: 3, ratio: particleRatio },
    ];

    return specs.map(s => {
      const sprite = this.scene.add
        .tileSprite(s.x, 0, s.w, GAME_H, s.key)
        .setOrigin(0, 0)
        .setAlpha(alpha)
        .setDepth(s.depth);
      sprite.setData('ratio', s.ratio);
      return sprite;
    });
  }

  _onThreshold(index) {
    const next = index % WORLDS.length;
    if (this._locked || next === this._index) return;
    this._locked = true;

    const world = WORLDS[next];
    this._incoming = this._buildLayers(world, 0);

    this.scene.tweens.add({
      targets: this._incoming,
      alpha: 1,
      duration: TRANSITION_MS,
      ease: 'Cubic.easeInOut',
    });

    this.scene.tweens.add({
      targets: this._current,
      alpha: 0,
      duration: TRANSITION_MS,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        this._current.forEach(l => l.destroy());
        this._current = this._incoming;
        this._incoming = null;
        this._index = next;
        this._announce(world);
        this.scene.time.delayedCall(LOCK_MS, () => { this._locked = false; });
      },
    });
  }

  /** Tell React which world is active so the HUD palette follows it. */
  _announce(world) {
    window.gameEvents?.emit('biome-changed', {
      key: world.key,
      name: world.name,
      palette: world.palette,
    });
  }

  destroy() {
    window.gameEvents?.off('biome-threshold-crossed', this._onThresholdBound);
    this._current?.forEach(l => l.destroy());
    this._incoming?.forEach(l => l.destroy());
  }
}
