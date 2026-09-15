import InputHandler     from '../systems/InputHandler.js';
import CarManager       from '../systems/CarManager.js';
import ObstacleManager  from '../systems/ObstacleManager.js';
import CoinManager      from '../systems/CoinManager.js';
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
    this.coins      = new CoinManager(this);

    // Wire collisions
    this.obstacles.setupCollision(this.car.body, () => this._onHit());
    this.coins.setupCollision(this.car.body, () => {
      this.score_mgr.addBonus(CoinManager.VALUE);
    });

    // Emit initial HUD state
    if (window.gameEvents) {
      window.gameEvents.emit('lives', this._lives);
      window.gameEvents.emit('score', 0);
      window.gameEvents.emit('coin-collected', 0);
    }

    this._setupPause();
  }

  _setupPause() {
    // Event-driven, not polled: a quick tap can land entirely between two
    // frames, and a polled isDown check would never see it.
    this._onPauseKey = () => this.pauseGame();
    this.input.keyboard.on('keydown-ESC', this._onPauseKey);
    this.input.keyboard.on('keydown-P', this._onPauseKey);

    this._onResume = () => {
      if (!this.scene.isPaused()) return;
      this.scene.resume();
      this.physics.resume();
    };
    this._onRestart = () => {
      this.scene.resume();
      this.physics.resume();
      this.scene.restart();
    };
    // Only a genuinely hidden tab auto-pauses. Listening to window blur as well
    // would freeze the run whenever focus moved anywhere off the page.
    this._onVisibility = () => { if (document.hidden) this.pauseGame(); };

    window.gameEvents?.on('game:resume', this._onResume);
    window.gameEvents?.on('game:restart', this._onRestart);
    document.addEventListener('visibilitychange', this._onVisibility);

    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown-ESC', this._onPauseKey);
      this.input.keyboard?.off('keydown-P', this._onPauseKey);
      window.gameEvents?.off('game:resume', this._onResume);
      window.gameEvents?.off('game:restart', this._onRestart);
      document.removeEventListener('visibilitychange', this._onVisibility);
    });
  }

  /** Freeze the run and hand control to the React overlay. */
  pauseGame() {
    if (this.scene.isPaused()) return;
    this.physics.pause();
    this.scene.pause();
    window.gameEvents?.emit('game:pause');
  }

  update(time, delta) {
    this.input_hdl.update();
    this.score_mgr.update(delta);

    const speed = this.score_mgr.scrollSpeed + this.car.nitroBonus;
    this.bg.update(speed, delta);
    this.car.update(this.input_hdl.intent, delta);
    this.obstacles.update(delta, speed);
    this.coins.update(delta, speed);
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
    const coins = this.coins.collected;
    this.bg.destroy();
    this.obstacles.destroy();
    this.coins.destroy();
    this.scene.start('GameOverScene', { score: finalScore, coins });
  }
}
