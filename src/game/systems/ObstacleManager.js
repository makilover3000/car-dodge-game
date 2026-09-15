import { GAME_W, GAME_H } from '../constants.js';

const LANE_COUNT  = 4;
const LANE_WIDTH  = 80;
const LANES_START = (GAME_W - LANE_COUNT * LANE_WIDTH) / 2;

const BASE_SPAWN_MS    = 1400;  // starting interval between spawns
const MIN_SPAWN_MS     = 400;   // floor
const SPAWN_REDUCTION  = 80;    // reduced per spawn-rate-up event

/**
 * ObstacleManager — pools enemy cars and trucks, handles spawning and collisions.
 */
export default class ObstacleManager {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this._spawnInterval = BASE_SPAWN_MS;
    this._elapsed = 0;
    this._nextSpawn = 0;
    this._sideswipeEnabled = false;
    this._trucksEnabled = false;
    this._lives = 3;

    // Static group — obstacles move via tilePositionY trick on tileSprites,
    // but physics sprites need to move themselves
    this.group = scene.physics.add.group();

    // Listen for difficulty events from ScoreManager
    // Store bound handlers so we can unsubscribe them cleanly in destroy()
    this._onSpawnRateUpBound   = () => this._onSpawnRateUp();
    this._onSideswipeBound     = () => { this._sideswipeEnabled = true; };
    this._onTrucksBound        = () => { this._trucksEnabled = true; };

    if (window.gameEvents) {
      window.gameEvents.on('spawn-rate-up',    this._onSpawnRateUpBound);
      window.gameEvents.on('unlock-sideswipe', this._onSideswipeBound);
      window.gameEvents.on('unlock-trucks',    this._onTrucksBound);
    }
  }

  /** @param {Phaser.Physics.Arcade.Sprite} playerSprite */
  setupCollision(playerSprite, onHit) {
    this.scene.physics.add.overlap(playerSprite, this.group, () => onHit());
  }

  /**
   * @param {number} delta - ms since last frame
   * @param {number} scrollSpeed - current road scroll speed px/s
   */
  update(delta, scrollSpeed) {
    this._elapsed += delta;

    // Move existing obstacles downward at scroll speed
    this.group.getChildren().forEach(obs => {
      obs.y += (scrollSpeed / 1000) * delta;
      if (obs.y > GAME_H + 100) {
        obs.setActive(false).setVisible(false);
        this.group.remove(obs, true, true);
      }
    });

    // Spawn new obstacle on timer
    if (this._elapsed >= this._nextSpawn) {
      this._spawn(scrollSpeed);
      this._nextSpawn = this._elapsed + this._spawnInterval + Phaser.Math.Between(-150, 150);
    }
  }

  _spawn(scrollSpeed) {
    const useTruck = this._trucksEnabled && Math.random() < 0.25;
    const texKey   = useTruck ? 'obs_truck' : 'obs_car';

    let lane;
    if (this._sideswipeEnabled && Math.random() < 0.2) {
      // Side-swipe: spawn off left/right edge and sweep across
      this._spawnSideswiper(scrollSpeed);
      return;
    }

    lane = Phaser.Math.Between(0, LANE_COUNT - 1);
    const x = LANES_START + lane * LANE_WIDTH + LANE_WIDTH / 2;
    const obs = this.group.create(x, -80, texKey);
    obs.setDepth(9);
    obs.body.setVelocity(0, 0);
    obs.body.allowGravity = false;
  }

  _spawnSideswiper(scrollSpeed) {
    const fromLeft = Math.random() < 0.5;
    const startX   = fromLeft ? -50 : GAME_W + 50;
    const endX     = fromLeft ? GAME_W + 50 : -50;
    const y        = Phaser.Math.Between(100, GAME_H - 200);

    const obs = this.scene.physics.add.sprite(startX, y, 'obs_car');
    obs.setDepth(9);
    obs.body.allowGravity = false;
    this.group.add(obs);

    this.scene.tweens.add({
      targets: obs,
      x: endX,
      y: y + scrollSpeed * 2,
      duration: 2200,
      ease: 'Linear',
      onComplete: () => {
        if (obs.active) { obs.setActive(false).setVisible(false); this.group.remove(obs, true, true); }
      },
    });
  }

  _onSpawnRateUp() {
    this._spawnInterval = Math.max(MIN_SPAWN_MS, this._spawnInterval - SPAWN_REDUCTION);
  }

  destroy() {
    if (window.gameEvents) {
      window.gameEvents.off('spawn-rate-up',    this._onSpawnRateUpBound);
      window.gameEvents.off('unlock-sideswipe', this._onSideswipeBound);
      window.gameEvents.off('unlock-trucks',    this._onTrucksBound);
    }
    this.group.clear(true, true);
  }
}
