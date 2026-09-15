import { GAME_W, GAME_H } from '../constants.js';

const LANE_COUNT  = 4;
const LANE_WIDTH  = 80;
const LANES_START = (GAME_W - LANE_COUNT * LANE_WIDTH) / 2;

const SPAWN_MS      = 1800;  // average gap between coin drops
const SPAWN_JITTER  = 600;
const RUN_CHANCE    = 0.35;  // odds a drop is a short line of coins
const RUN_LENGTH    = 3;
const RUN_GAP       = 54;    // vertical spacing within a run
const COIN_SIZE     = 34;
const COIN_VALUE    = 25;    // points per coin

/**
 * CoinManager — spawns collectible coins down the lanes.
 *
 * Mirrors ObstacleManager's spawn/cull loop, but on pickup the coin itself is
 * destroyed, so a coin is only ever banked once.
 */
export default class CoinManager {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this.collected = 0;
    this._elapsed = 0;
    this._nextSpawn = SPAWN_MS;

    this.group = scene.physics.add.group();
    this._textureKey = scene.textures.exists('coin_custom') ? 'coin_custom' : 'coin_default';
  }

  /**
   * @param {Phaser.Physics.Arcade.Sprite} playerSprite
   * @param {(total: number) => void} onCollect
   */
  setupCollision(playerSprite, onCollect) {
    this.scene.physics.add.overlap(playerSprite, this.group, (_player, coin) => {
      if (!coin.active) return;
      this._pickup(coin);
      onCollect(this.collected);
    });
  }

  /**
   * @param {number} delta - ms since last frame
   * @param {number} scrollSpeed - px/s
   */
  update(delta, scrollSpeed) {
    this._elapsed += delta;

    this.group.getChildren().forEach(coin => {
      coin.y += (scrollSpeed / 1000) * delta;
      if (coin.y > GAME_H + 60) this.group.remove(coin, true, true);
    });

    if (this._elapsed >= this._nextSpawn) {
      this._spawn();
      this._nextSpawn = this._elapsed + SPAWN_MS
        + Phaser.Math.Between(-SPAWN_JITTER, SPAWN_JITTER);
    }
  }

  _spawn() {
    const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
    const x = LANES_START + lane * LANE_WIDTH + LANE_WIDTH / 2;
    const count = Math.random() < RUN_CHANCE ? RUN_LENGTH : 1;

    for (let i = 0; i < count; i++) {
      const coin = this.group.create(x, -40 - i * RUN_GAP, this._textureKey);
      coin.setDisplaySize(COIN_SIZE, COIN_SIZE);
      coin.setDepth(6);
      coin.body.setVelocity(0, 0);
      coin.body.allowGravity = false;

      // A slow flip reads as a spinning coin without needing sprite frames.
      this.scene.tweens.add({
        targets: coin,
        scaleX: { from: coin.scaleX, to: coin.scaleX * 0.25 },
        duration: 520,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  _pickup(coin) {
    this.collected += 1;
    this.scene.tweens.killTweensOf(coin);

    const burst = this.scene.add.circle(coin.x, coin.y, COIN_SIZE / 2, 0xFFD24A, 0.8)
      .setDepth(7);
    this.scene.tweens.add({
      targets: burst,
      scale: 2,
      alpha: 0,
      duration: 260,
      ease: 'Cubic.easeOut',
      onComplete: () => burst.destroy(),
    });

    this.group.remove(coin, true, true);
    window.gameEvents?.emit('coin-collected', this.collected);
  }

  /** Points a single coin is worth. */
  static get VALUE() { return COIN_VALUE; }

  destroy() {
    this.group.clear(true, true);
  }
}
