import InputHandler     from '../systems/InputHandler.js';
import CarManager       from '../systems/CarManager.js';
import ObstacleManager  from '../systems/ObstacleManager.js';
import ScoreManager     from '../systems/ScoreManager.js';
import BackgroundManager from '../systems/BackgroundManager.js';

/**
 * GameScene — the core game loop.
 * Composes all systems; contains no game logic itself.
 */
export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    const ctx = window.__gameCtx ?? {};
    this._lives = 3;
    this._invincible = false;  // brief invincibility after hit

    // Systems (order matters: background first so it sits behind everything)
    this.bg         = new BackgroundManager(this);
    this.input_hdl  = new InputHandler(this);
    this.score_mgr  = new ScoreManager(this);
    this.car        = new CarManager(this, ctx);
    this.obstacles  = new ObstacleManager(this);

    // Wire collisions
    this.obstacles.setupCollision(this.car.body, () => this._onHit());

    // Emit initial HUD state
    if (window.gameEvents) {
      window.gameEvents.emit('lives', this._lives);
      window.gameEvents.emit('score', 0);
    }
  }

  update(time, delta) {
    this.input_hdl.update();
    this.score_mgr.update(delta);

    const speed = this.score_mgr.scrollSpeed + this.car.nitroBonus;
    this.bg.update(speed, delta);
    this.car.update(this.input_hdl.intent, delta);
    this.obstacles.update(delta, speed);
  }

  _onHit() {
    if (this._invincible) return;
    this._invincible = true;
    this._lives--;

    if (window.gameEvents) window.gameEvents.emit('lives', this._lives);

    if (this._lives <= 0) {
      this._endGame();
      return;
    }

    // Flash player car; brief invincibility window
    this.tweens.add({
      targets: this.car.body,
      alpha: 0,
      duration: 120,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        this.car.body.alpha = 1;
        this._invincible = false;
      },
    });
  }

  _endGame() {
    const finalScore = Math.floor(this.score_mgr.score);
    this.bg.destroy();
    this.obstacles.destroy();
    this.scene.start('GameOverScene', { score: finalScore });
  }
}
