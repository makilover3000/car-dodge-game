import { GAME_W } from '../constants.js';
import { PAINTERS } from './decorPainters.js';

/**
 * Generates every scrolling layer for a world as a cached texture.
 *
 * Textures are baked once at boot and then scrolled as tileSprites — nothing
 * here runs per frame. Every tile is seamless vertically: the ground varies
 * only across X, and scattered objects are kept clear of the tile's top and
 * bottom edges so nothing is cut in half at the wrap point.
 */

export const TILE = 480;          // tile height; GAME_H (720) is 1.5 tiles
const ROAD_X = 80;                // road spans x 80..400, matching the lane math
const ROAD_W = 320;
const ROAD_TILE_H = 64;
const EDGE = 76;                  // decor stays outside x<76 and x>404

/** Build all four layer textures for one world. Safe to call twice. */
export function buildWorldTextures(scene, world) {
  const keys = textureKeys(world.key);
  if (scene.textures.exists(keys.ground)) return keys;

  const rng = new Phaser.Math.RandomDataGenerator([world.key]);
  paintGround(scene, world, keys.ground);
  paintRoad(scene, world, keys.road);
  paintDecor(scene, world, keys.decor, rng);
  paintParticles(scene, world, keys.particles, rng);
  return keys;
}

export function textureKeys(key) {
  return {
    ground:    `w_${key}_ground`,
    road:      `w_${key}_road`,
    decor:     `w_${key}_decor`,
    particles: `w_${key}_particles`,
  };
}

/**
 * Ground: gradient across X only (uniform down Y, so it tiles seamlessly),
 * darkest at the outer edges and lifting toward the road for a depth cue.
 */
function paintGround(scene, world, key) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const edge = Phaser.Display.Color.IntegerToColor(world.ground.bottom);
  const near = Phaser.Display.Color.IntegerToColor(world.ground.top);

  for (let x = 0; x < GAME_W; x++) {
    const t = 1 - Math.abs(x - GAME_W / 2) / (GAME_W / 2);
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(edge, near, 100, t * 100);
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
    g.fillRect(x, 0, 1, TILE);
  }

  // Banding at an exact divisor of TILE keeps the seam invisible.
  g.fillStyle(0x000000, 0.05);
  for (let y = 0; y < TILE; y += 60) g.fillRect(0, y, GAME_W, 2);

  g.generateTexture(key, GAME_W, TILE);
  g.destroy();
}

/** Road: surface, dashed centre line and edge stripes. Transparent elsewhere. */
function paintRoad(scene, world, key) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const r = world.road;

  g.fillStyle(r.surface);
  g.fillRect(0, 0, ROAD_W, ROAD_TILE_H);

  g.fillStyle(0x000000, 0.08);
  g.fillRect(0, 0, 10, ROAD_TILE_H);
  g.fillRect(ROAD_W - 10, 0, 10, ROAD_TILE_H);

  g.fillStyle(r.edge, 0.92);
  g.fillRect(4, 0, 5, ROAD_TILE_H);
  g.fillRect(ROAD_W - 9, 0, 5, ROAD_TILE_H);

  g.fillStyle(r.line, 0.95);
  g.fillRect(ROAD_W / 2 - 3, 0, 6, 40);

  g.generateTexture(key, ROAD_W, ROAD_TILE_H);
  g.destroy();
}

/** Roadside objects, scattered down both verges. */
function paintDecor(scene, world, key, rng) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const paint = PAINTERS[world.decor.type];
  const perSide = world.decor.density * 2;

  for (const side of ['left', 'right']) {
    for (let i = 0; i < perSide; i++) {
      // Bottom-centre of the object, kept well inside the tile's edges.
      const x = side === 'left'
        ? rng.between(14, EDGE - 10)
        : rng.between(GAME_W - EDGE + 10, GAME_W - 14);
      const y = rng.between(170, TILE - 20);
      paint(g, rng, x, y, world.decor);
    }
  }

  g.generateTexture(key, GAME_W, TILE);
  g.destroy();
}

/** Weather / atmosphere layer, scrolled at its own speed for parallax. */
function paintParticles(scene, world, key, rng) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const p = world.particle;

  if (p.type !== 'none') {
    for (let i = 0; i < p.count; i++) {
      const x = rng.between(6, GAME_W - 6);
      const y = rng.between(10, TILE - 24);
      drawParticle(g, rng, p, x, y);
    }
  }

  g.generateTexture(key, GAME_W, TILE);
  g.destroy();
}

function drawParticle(g, rng, p, x, y) {
  switch (p.type) {
    case 'rain':
      g.fillStyle(p.color, 0.55);
      g.fillRect(x, y, 2, rng.between(12, 22));
      break;
    case 'snow':
      g.fillStyle(p.color, rng.realInRange(0.5, 0.95));
      g.fillCircle(x, y, rng.realInRange(1.5, 3.4));
      break;
    case 'stars':
      g.fillStyle(p.color, rng.realInRange(0.4, 1));
      g.fillCircle(x, y, rng.realInRange(0.9, 2.2));
      break;
    case 'dust':
      g.fillStyle(p.color, rng.realInRange(0.2, 0.5));
      g.fillEllipse(x, y, rng.between(10, 26), rng.between(3, 6));
      break;
    case 'glint':
      g.fillStyle(p.color, rng.realInRange(0.25, 0.6));
      g.fillRect(x, y, rng.between(8, 20), 2);
      break;
    case 'tear':
      g.fillStyle(p.color, rng.realInRange(0.3, 0.7));
      g.fillRect(0, y, GAME_W, rng.between(1, 3));
      break;
    default:
      break;
  }
}

export const ROAD_GEOMETRY = { x: ROAD_X, width: ROAD_W, tileHeight: ROAD_TILE_H };
