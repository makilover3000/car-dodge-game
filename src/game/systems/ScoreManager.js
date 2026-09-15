const BIOME_THRESHOLDS = [0, 500, 1000, 2000, 5000];
const SPEED_INTERVAL_MS   = 30_000; // speed bump every 30s
const SPAWN_INTERVAL_MS   = 45_000; // spawn rate bump every 45s
const BASE_SPEED          = 280;    // px/s
const SPEED_INCREMENT     = 30;
const BASE_SCORE_RATE     = 10;     // pts/s

/**
 * ScoreManager — tracks score, drives difficulty scaling, emits events.
 */
export default class ScoreManager {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this.score = 0;
    this.speed = BASE_SPEED;
    this.scoreRate = BASE_SCORE_RATE;
    this._elapsed = 0;
    this._lastSpeedBump = 0;
    this._lastSpawnBump = 0;
    this._biomeIndex = 0;
    this._sideSwipersUnlocked = false;
    this._trucksUnlocked = false;
  }

  /** Returns current scroll speed in px/s. */
  get scrollSpeed() { return this.speed; }

  /** Returns true first time side-swipers become available. */
  get sideSwipersUnlocked() { return this._sideSwipersUnlocked; }

  /** Returns true first time trucks become available. */
  get trucksUnlocked() { return this._trucksUnlocked; }

  /**
   * Call every frame.
   * @param {number} delta - ms since last frame
   */
  update(delta) {
    this._elapsed += delta;
    this.score += (this.scoreRate * delta) / 1000;

    this._checkSpeedBump();
    this._checkSpawnBump();
    this._checkMilestones();
    this._checkBiomeThreshold();

    // Emit score to React HUD
    if (window.gameEvents) {
      window.gameEvents.emit('score', Math.floor(this.score));
    }
  }

  _checkSpeedBump() {
    if (this._elapsed - this._lastSpeedBump >= SPEED_INTERVAL_MS) {
      this.speed += SPEED_INCREMENT;
      this._lastSpeedBump = this._elapsed;
    }
  }

  _checkSpawnBump() {
    if (this._elapsed - this._lastSpawnBump >= SPAWN_INTERVAL_MS) {
      this.scoreRate += 2;
      this._lastSpawnBump = this._elapsed;
      if (window.gameEvents) window.gameEvents.emit('spawn-rate-up');
    }
  }

  _checkMilestones() {
    const s = this.score;
    if (!this._sideSwipersUnlocked && s >= 2000) {
      this._sideSwipersUnlocked = true;
      if (window.gameEvents) window.gameEvents.emit('unlock-sideswipe');
    }
    if (!this._trucksUnlocked && s >= 5000) {
      this._trucksUnlocked = true;
      if (window.gameEvents) window.gameEvents.emit('unlock-trucks');
    }
  }

  _checkBiomeThreshold() {
    const next = this._biomeIndex + 1;
    if (next < BIOME_THRESHOLDS.length && this.score >= BIOME_THRESHOLDS[next]) {
      this._biomeIndex = next;
      if (window.gameEvents) {
        window.gameEvents.emit('biome-threshold-crossed', { index: this._biomeIndex });
      }
    }
  }
}
