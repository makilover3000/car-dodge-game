import { GAME_W, GAME_H } from '../constants.js';

const LANE_COUNT  = 4;
const LANE_WIDTH  = 80;
const LANES_START = (GAME_W - LANE_COUNT * LANE_WIDTH) / 2;
const CAR_Y       = GAME_H - 120;

const CAR_KEY_MAP = {
  // Maps a car name slug to a pregenerated texture key
  'uncle-sedan':    'car_uncle_sedan',
  'tuktukt-terror': 'car_tuktukt_terror',
  'f1-kart':        'car_f1_kart',
  'void-van':       'car_void_van',
  'kopitiam-kart':  'car_kopitiam_kart',
};

/**
 * CarManager — renders and moves the player's car.
 */
export default class CarManager {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ selectedCarId: string, customImageUrl?: string }} ctx
   */
  constructor(scene, ctx) {
    this.scene = scene;
    this._lane = 1; // 0-indexed, start in lane 1 of 4
    this._speed = { x: 0 };
    this._nitroActive = false;
    this._nitroCooldown = 0;  // ms remaining
    const NITRO_CD = 10_000;  // 10s
    this._NITRO_CD = NITRO_CD;

    const texKey = this._resolveTexKey(ctx);
    this._isCustom = texKey === 'car_custom';
    this.sprite = scene.physics.add.sprite(this._laneX(1), CAR_Y, texKey);
    this.sprite.setDepth(10);
    this.sprite.setCollideWorldBounds(true);

    if (texKey === 'car_custom') {
      this.sprite.setDisplaySize(68, 100);
      this.sprite.body.setSize(54, 84);
    } else {
      this.sprite.body.setSize(32, 56);
    }
  }

  /** Returns the sprite for collision checks. */
  get body() { return this.sprite; }

  /** Returns current nitro state for HUD. */
  get nitroState() {
    return { remaining: this._nitroCooldown, total: this._NITRO_CD, active: this._nitroActive };
  }

  /**
   * Move the car based on input intent.
   * @param {{ left: boolean, right: boolean, accel: boolean, brake: boolean, nitro: boolean }} intent
   * @param {number} delta - ms
   */
  update(intent, delta) {
    const BASE_VX = this._isCustom ? 340 : 260;
    let vx = 0;
    if (intent.left)  vx = -BASE_VX;
    if (intent.right) vx =  BASE_VX;
    this.sprite.setVelocityX(vx);

    // Clamp to road edges
    const minX = LANES_START + 20;
    const maxX = LANES_START + LANE_COUNT * LANE_WIDTH - 20;
    this.sprite.x = Phaser.Math.Clamp(this.sprite.x, minX, maxX);

    // Nitro
    if (this._nitroCooldown > 0) {
      this._nitroCooldown = Math.max(0, this._nitroCooldown - delta);
    }

    if (intent.nitro && this._nitroCooldown === 0) {
      this._nitroActive = true;
      this._nitroCooldown = this._NITRO_CD;
      this.scene.time.delayedCall(1500, () => { this._nitroActive = false; });
    }

    // Emit nitro state to HUD
    if (window.gameEvents) {
      window.gameEvents.emit('nitro-cooldown', this.nitroState);
    }
  }

  /** Returns additional speed when nitro is active. */
  get nitroBonus() { return this._nitroActive ? 120 : 0; }

  _laneX(lane) {
    return LANES_START + lane * LANE_WIDTH + LANE_WIDTH / 2;
  }

  _resolveTexKey(ctx) {
    if (ctx.customImageUrl && this.scene.textures.exists('car_custom')) return 'car_custom';
    // Fallback to first default car
    return CAR_KEY_MAP['uncle-sedan'];
  }

  destroy() { this.sprite.destroy(); }
}
