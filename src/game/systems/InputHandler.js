/**
 * InputHandler — reads keyboard and exposes a per-frame intent object.
 * GameScene calls handler.update() each frame and reads handler.intent.
 */
export default class InputHandler {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    const kb = scene.input.keyboard;
    this.keys = kb.addKeys({
      left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up:    Phaser.Input.Keyboard.KeyCodes.UP,
      down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
      a:     Phaser.Input.Keyboard.KeyCodes.A,
      d:     Phaser.Input.Keyboard.KeyCodes.D,
      w:     Phaser.Input.Keyboard.KeyCodes.W,
      s:     Phaser.Input.Keyboard.KeyCodes.S,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    this.intent = { left: false, right: false, accel: false, brake: false, nitro: false };
    this._nitroDown = false;
  }

  /** Call once per frame; populates this.intent. */
  update() {
    const k = this.keys;
    this.intent.left  = k.left.isDown  || k.a.isDown;
    this.intent.right = k.right.isDown || k.d.isDown;
    this.intent.accel = k.up.isDown    || k.w.isDown;
    this.intent.brake = k.down.isDown  || k.s.isDown;

    // Nitro fires on key-down edge only (not held)
    const spaceNow = k.space.isDown;
    this.intent.nitro = spaceNow && !this._nitroDown;
    this._nitroDown = spaceNow;
  }

  destroy() {
    // Keys are cleaned up when the scene is shut down
  }
}
