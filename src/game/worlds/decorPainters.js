/**
 * Roadside decoration painters — one per decor type named in worldDefs.
 *
 * Each painter draws a SINGLE object into the given Graphics at (x, y), where
 * (x, y) is the object's bottom-centre. Callers keep objects clear of the tile
 * edges so the strip stays seamless when it scrolls.
 *
 * @typedef {{ colors: number[], lit: number }} DecorSpec
 */

/** Building block with lit windows — Singapore HDB flats. */
function blocks(g, rng, x, y, spec) {
  const w = rng.between(30, 52);
  const h = rng.between(46, 96);
  g.fillStyle(rng.pick(spec.colors));
  g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle(spec.lit, 0.9);
  for (let wy = y - h + 8; wy < y - 8; wy += 12) {
    for (let wx = x - w / 2 + 6; wx < x + w / 2 - 6; wx += 11) {
      if (rng.frac() > 0.45) g.fillRect(wx, wy, 5, 6);
    }
  }
}

/** Palm tree — trunk plus radiating fronds. */
function palms(g, rng, x, y, spec) {
  const h = rng.between(38, 60);
  g.fillStyle(0x8A5A2B);
  g.fillRect(x - 3, y - h, 6, h);
  const leaf = rng.pick(spec.colors);
  g.fillStyle(leaf);
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6 + rng.frac() * 0.3;
    g.fillTriangle(
      x, y - h,
      x + Math.cos(a) * 26, y - h + Math.sin(a) * 16 - 4,
      x + Math.cos(a) * 20, y - h + Math.sin(a) * 20 + 6,
    );
  }
}

/** Neon signage pylon — stacked glowing bars. */
function signs(g, rng, x, y, spec) {
  const h = rng.between(56, 104);
  g.fillStyle(0x241B4A);
  g.fillRect(x - 4, y - h, 8, h);
  for (let i = 0; i < rng.between(2, 4); i++) {
    const c = rng.pick(spec.colors);
    const bw = rng.between(20, 34);
    const by = y - h + 10 + i * 22;
    g.fillStyle(c, 0.35);
    g.fillRect(x - bw / 2 - 3, by - 3, bw + 6, 20);
    g.fillStyle(c, 1);
    g.fillRect(x - bw / 2, by, bw, 14);
  }
}

/** Glass tower — tall slab with a window grid. */
function towers(g, rng, x, y, spec) {
  const w = rng.between(34, 54);
  const h = rng.between(80, 150);
  g.fillStyle(rng.pick(spec.colors));
  g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle(0xFFFFFF, 0.18);
  g.fillRect(x - w / 2, y - h, w * 0.32, h);
  g.fillStyle(spec.lit, 0.85);
  for (let wy = y - h + 10; wy < y - 10; wy += 14) {
    for (let wx = x - w / 2 + 7; wx < x + w / 2 - 7; wx += 13) {
      if (rng.frac() > 0.55) g.fillRect(wx, wy, 6, 7);
    }
  }
}

/** Layered rock mesa. */
function mesas(g, rng, x, y, spec) {
  const w = rng.between(50, 84);
  const h = rng.between(44, 82);
  g.fillStyle(rng.pick(spec.colors));
  g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle(spec.lit, 0.22);
  for (let sy = y - h + 10; sy < y; sy += 14) {
    g.fillRect(x - w / 2, sy, w, 4);
  }
  g.fillStyle(0xFFFFFF, 0.12);
  g.fillTriangle(x - w / 2, y - h, x - w / 2 + 16, y - h - 10, x - w / 2 + 30, y - h);
}

/** Ice peak — triangle with a snow cap. */
function peaks(g, rng, x, y, spec) {
  const w = rng.between(44, 76);
  const h = rng.between(48, 92);
  g.fillStyle(rng.pick(spec.colors));
  g.fillTriangle(x, y - h, x - w / 2, y, x + w / 2, y);
  g.fillStyle(spec.lit, 0.95);
  g.fillTriangle(x, y - h, x - w * 0.17, y - h * 0.62, x + w * 0.17, y - h * 0.62);
}

/** Planet or asteroid with a highlight crescent. */
function planets(g, rng, x, y, spec) {
  const r = rng.between(14, 30);
  const c = rng.pick(spec.colors);
  g.fillStyle(c, 0.28);
  g.fillCircle(x, y - r, r + 7);
  g.fillStyle(c, 1);
  g.fillCircle(x, y - r, r);
  g.fillStyle(0xFFFFFF, 0.35);
  g.fillCircle(x - r * 0.3, y - r * 1.3, r * 0.34);
}

/** Datamosh block — offset colour-channel slabs. */
function glitch(g, rng, x, y, spec) {
  const w = rng.between(26, 60);
  const h = rng.between(14, 40);
  for (let i = 0; i < 3; i++) {
    g.fillStyle(rng.pick(spec.colors), 0.75);
    g.fillRect(x - w / 2 + rng.between(-7, 7), y - h + rng.between(-5, 5), w, h / 2);
  }
  g.fillStyle(spec.lit, 0.9);
  g.fillRect(x - w / 2, y - h - 5, w, 3);
}

export const PAINTERS = {
  blocks, palms, signs, towers, mesas, peaks, planets, glitch,
};
