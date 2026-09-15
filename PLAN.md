# Car Dodge Game — Implementation Plan

## Context

A fresh project. Only `CLAUDE (1).md` exists today — no scaffolding, no `package.json`, no `src/`. CLAUDE.md fully specifies:
- Vite + React shell with Phaser 3 (CDN) running all game logic
- Supabase for auth (username-only), `cars`, and `scores`
- 5 biomes that swap at score thresholds with a 1.5s fade
- 10-car garage per user; custom car uploads resized client-side to 64×64
- Pixel art aesthetic everywhere (Press Start 2P, scanlines, hover pixel-shift)

This plan defines the build order, the Supabase schema SQL, the React/Phaser component breakdown, the bridge between them, the biome transition mechanic, and the car upload pipeline.

**Aesthetic direction (committed):** arcade cabinet × Singapore hawker-stall neon, chunky CRT pixel art, deep navy + sodium amber accents on the menus, palette swap per biome. No purple gradients, no Inter, no Bootstrap defaults.

---

## 1. Build Order

Strictly sequential — each step is verifiable before the next begins.

1. **Project scaffold** — `npm create vite@latest . -- --template react`, then install `@supabase/supabase-js`. Phaser 3 loaded via CDN in `index.html` per CLAUDE.md. Add `.env.local` and confirm `import.meta.env.VITE_*` reads.
2. **Supabase project setup** — create project in Supabase dashboard, run schema SQL (section 2), create the `car-images` storage bucket (public read), copy URL + anon key into `.env.local`.
3. **`lib/supabase.js`** — single client instance, exported.
4. **Pixel design tokens** — `src/styles/tokens.css` with CSS variables for biome palettes, Press Start 2P import, scanline overlay class, hover pixel-shift utility.
5. **`Login.jsx`** — retro terminal aesthetic. Username input → check/create user → seed default cars if new → store in `localStorage` and React state.
6. **`CarGarage.jsx`** — arcade-cabinet grid of cars (max 10). Select, delete with single warning modal, upload custom car. Selected car ID persists in `localStorage`.
7. **Car image upload + resize pipeline** (section 6) wired into the garage.
8. **`GameCanvas.jsx`** — bare Phaser mount/unmount wrapper. Smoke-test that React can instantiate and destroy Phaser cleanly without leaks.
9. **`window.gameEvents` EventEmitter bridge** (section 4) — set up before any cross-boundary calls.
10. **Phaser core: BootScene → MenuScene → GameScene → GameOverScene** scaffolded with placeholder rectangles. Verify scene flow.
11. **`InputHandler.js`** — WASD + arrows + Space for nitro (10s cooldown).
12. **`CarManager.js`** — renders the selected car (placeholder colored rect or custom uploaded 64×64). Receives `selectedCarId` via the bridge.
13. **`ObstacleManager.js`** — spawns enemy cars; spawn rate scales with elapsed time. Side-swiping obstacles unlock at 2000pts, trucks at 5000pts.
14. **`ScoreManager.js`** — score tick, difficulty scaling (speed every 30s, spawn rate every 45s), emits score events.
15. **`BackgroundManager.js` + biome transition system** (section 5).
16. **`HUD.jsx`** — score + lives + nitro cooldown, rendered as a React overlay above the canvas. Listens on the bridge.
17. **`GameOverScene.js` → score submission** — on death, write to `scores` table via the bridge → React handles the network call.
18. **`Leaderboard.jsx`** — top 10 from `scores`, pixel-art table.
19. **Polish pass** — scanline overlay layer, hover pixel-shift on every button, biome-driven palette swap on menu chrome, reduced-motion respected.
20. **Vercel deploy** — env vars set in dashboard, build command `npm run build`, output `dist`.

Verification at every step: run `npm run dev`, exercise the feature in a real browser, confirm no console errors, confirm Phaser instance is destroyed on route change.

---

## 2. Supabase SQL to Run

Run in the Supabase SQL editor as a single transaction.

```sql
-- USERS
create table public.users (
  id          uuid primary key default gen_random_uuid(),
  username    text unique not null,
  created_at  timestamptz not null default now()
);

-- CARS
create table public.cars (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  name        text not null,
  is_default  boolean not null default false,
  image_url   text,
  created_at  timestamptz not null default now()
);
create index cars_user_id_idx on public.cars(user_id);

-- SCORES
create table public.scores (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  username    text not null,
  score       integer not null check (score >= 0),
  created_at  timestamptz not null default now()
);
create index scores_score_desc_idx on public.scores(score desc, created_at desc);

-- RLS — anon key needs read everywhere and write to scores + cars for the logged-in pseudo-user.
-- Since auth is username-only (no Supabase Auth), policies are permissive: this game is for fun, not banking.
alter table public.users  enable row level security;
alter table public.cars   enable row level security;
alter table public.scores enable row level security;

create policy "anon read users"    on public.users  for select using (true);
create policy "anon insert users"  on public.users  for insert with check (true);

create policy "anon read cars"     on public.cars   for select using (true);
create policy "anon insert cars"   on public.cars   for insert with check (true);
create policy "anon update cars"   on public.cars   for update using (true) with check (true);
create policy "anon delete cars"   on public.cars   for delete using (true);

create policy "anon read scores"   on public.scores for select using (true);
create policy "anon insert scores" on public.scores for insert with check (true);
```

**Storage:** create a public bucket named `car-images` via the Supabase dashboard. Add a policy: anyone can `insert` and `select` from this bucket. File path convention: `<user_id>/<car_id>.png`.

> **Security note:** with no Supabase Auth and permissive RLS, the anon key can write any row. CLAUDE.md explicitly chose username-only auth, so this matches spec — flagged here so it's an informed choice, not an oversight.

---

## 3. Component Breakdown

### React (UI shell — no game logic)

| File | Responsibility | State it owns |
|---|---|---|
| `src/App.jsx` | Route between Login / Garage / Game / Leaderboard. Holds `currentUser`. | `currentUser`, current route |
| `src/components/Login.jsx` | Username input, lookup-or-create, seed default cars. | local input state |
| `src/components/CarGarage.jsx` | Grid of up to 10 cars, select, delete (warning modal), upload. | `cars[]`, `selectedCarId` |
| `src/components/CarUpload.jsx` | File input + canvas resize preview + upload to Storage. | `file`, `previewUrl`, `uploading` |
| `src/components/GameCanvas.jsx` | Mount Phaser into a `<div ref>`, destroy on unmount. Forwards `selectedCarId` and `username` into the bridge at mount. | Phaser instance ref |
| `src/components/HUD.jsx` | Absolutely-positioned overlay above the canvas. Subscribes to bridge events. | `score`, `lives`, `nitroReady`, `biome` |
| `src/components/Leaderboard.jsx` | Top 10 pull from `scores`. | `rows[]`, `loading` |
| `src/lib/supabase.js` | Single Supabase client. | — |
| `src/lib/gameEvents.js` | Creates and exports `window.gameEvents`. | — |
| `src/styles/tokens.css` | Biome palettes, Press Start 2P, scanline overlay, hover pixel-shift. | — |

### Phaser (game logic — no React)

| File | Responsibility |
|---|---|
| `src/game/main.js` | Phaser config, scene registration, parent div lookup. |
| `src/game/scenes/BootScene.js` | Preload car sprites (generated procedurally for now), biome backgrounds, pixel font. "LOADING" bar. |
| `src/game/scenes/MenuScene.js` | "PRESS SPACE TO START" in pixel font over scrolling expressway loop. |
| `src/game/scenes/GameScene.js` | Owns the run: composes the systems below, advances per-frame. |
| `src/game/scenes/GameOverScene.js` | Death animation → emits `score-submit` on bridge → "RETRY?" prompt. |
| `src/game/systems/InputHandler.js` | WASD + arrows + Space, exposes per-frame intent. |
| `src/game/systems/CarManager.js` | Loads the selected car texture (default key or custom URL) and renders it. |
| `src/game/systems/ObstacleManager.js` | Pools enemy cars/trucks, manages spawn timer, hitbox checks. |
| `src/game/systems/BackgroundManager.js` | Scrolling biome layers, palette state, transition driver. |
| `src/game/systems/ScoreManager.js` | Score, difficulty scaling, milestone events. |

Every file targets <200 lines per CLAUDE.md.

---

## 4. React ↔ Phaser Communication

A single global `EventEmitter` (`window.gameEvents`) is the ONLY bridge. CLAUDE.md mandates this — no prop drilling into Phaser, no Phaser reaching into React state.

### Implementation

`src/lib/gameEvents.js`:

```js
const listeners = new Map();
export const gameEvents = {
  on(event, fn)  { (listeners.get(event) ?? listeners.set(event, new Set()).get(event)).add(fn); },
  off(event, fn) { listeners.get(event)?.delete(fn); },
  emit(event, payload) { listeners.get(event)?.forEach(fn => fn(payload)); },
};
if (typeof window !== 'undefined') window.gameEvents = gameEvents;
```

### Event vocabulary (the contract)

**React → Phaser:**

| Event | Payload | Meaning |
|---|---|---|
| `game:start` | `{ selectedCarId, customImageUrl, username }` | GameCanvas just mounted |
| `game:pause` | — | tab blur or pause button |
| `game:resume` | — | resume |
| `game:destroy` | — | React is unmounting GameCanvas |

**Phaser → React:**

| Event | Payload | Meaning |
|---|---|---|
| `score` | `number` | every score tick |
| `lives` | `number` | hit taken |
| `nitro-cooldown` | `{ remaining, total }` | for HUD bar |
| `biome-changed` | `{ key, palette }` | HUD chrome recolors |
| `score-submit` | `{ score }` | GameOver — React writes to Supabase |

### Lifecycle ownership

- **React owns the Phaser instance lifecycle.** `GameCanvas.jsx` creates the Phaser game on mount and destroys it on unmount (`game.destroy(true)`).
- **Phaser never imports React.** It only reads/writes via `window.gameEvents`.
- **React never reaches into Phaser state.** Subscribes via events.
- **All network calls live in React.** Phaser emits `score-submit`; React owns the Supabase insert.

---

## 5. Biome Transition Implementation

5 biomes triggered at 0 / 500 / 1000 / 2000 / 5000 pts, each with own palette + scrolling background, 1.5s fade.

### Data

```js
const BIOMES = [
  { key: 'expressway', threshold: 0,    palette: {...}, layers: [...] },
  { key: 'sunset',     threshold: 500,  palette: {...}, layers: [...] },
  { key: 'neon',       threshold: 1000, palette: {...}, layers: [...] },
  { key: 'space',      threshold: 2000, palette: {...}, layers: [...] },
  { key: 'glitch',     threshold: 5000, palette: {...}, layers: [...] },
];
```

### Transition driver

`BackgroundManager` keeps two layer sets in memory at once: current biome and incoming. On `biome-threshold-crossed`:

1. Build incoming layers offscreen at `alpha=0`, scrolling at current speed.
2. Tween `incoming.alpha 0 → 1` AND `current.alpha 1 → 0` over **1500ms** (`Sine.easeInOut`).
3. Road below remains drivable — gameplay doesn't pause.
4. On complete: destroy outgoing layers, swap pointers, emit `biome-changed` so the React HUD recolors.
5. Lock further transitions for 200ms to guard against double-fire.

### Palette propagation

Each biome's `palette` maps to CSS custom properties (`--biome-bg`, `--biome-accent`, `--biome-ink`). On `biome-changed`, the HUD listener writes them to `document.documentElement.style`. Every menu/HUD element styled with `var(--biome-*)` updates in lockstep with the canvas.

### Glitch biome (5000pts secret)

Adds a Phaser post-process pipeline (small WebGL shader: horizontal tearing + hue shift). Canvas-renderer fallback uses palette flicker. Polish pass — implement after the other 4 work.

---

## 6. Car Image Upload + Resize Flow

CLAUDE.md: 64×64px, browser-resized via Canvas before upload. Garage caps at 10.

### Flow (all in `CarUpload.jsx`)

1. **Pick file** via `<input type="file" accept="image/png,image/jpeg,image/webp">`. Reject other types.
2. **Validate size** — reject >5MB up-front.
3. **Decode to bitmap** — `const bitmap = await createImageBitmap(file)`. Handles EXIF orientation.
4. **Draw into 64×64 offscreen canvas:**
   ```js
   const canvas = new OffscreenCanvas(64, 64);
   const ctx = canvas.getContext('2d');
   ctx.imageSmoothingEnabled = false; // pixel-art look
   const scale = Math.min(64 / bitmap.width, 64 / bitmap.height);
   const w = bitmap.width * scale, h = bitmap.height * scale;
   ctx.drawImage(bitmap, (64 - w) / 2, (64 - h) / 2, w, h);
   ```
5. **Encode to PNG blob** — `canvas.convertToBlob({ type: 'image/png' })`. PNG preserves transparency.
6. **Preview** — show 64×64 result scaled up to 256×256 with `image-rendering: pixelated`.
7. **Confirm + upload:**
   - Insert `cars` row first with `image_url = null` to get generated `car_id`.
   - Upload blob to `car-images/<user_id>/<car_id>.png`.
   - Update `cars` row with `getPublicUrl(path)`.
   - On any failure: delete the half-created row.
8. **Cap enforcement** — block file picker when `cars.length >= 10`. Modal: "GARAGE FULL — SCRAP A CAR FIRST".

### Why this approach

- `createImageBitmap` + `OffscreenCanvas` is the modern path: handles orientation, runs off main thread.
- `imageSmoothingEnabled = false` is what makes uploaded photos look like pixel art instead of blurry thumbnails.
- Letterboxing (not cropping) preserves user intent.
- Row → upload → update sequence gives us `car_id` for the filename; cleanup prevents orphans.

### Old-browser fallback

Hidden `<img>` + regular `<canvas>` + `canvas.toBlob(...)` if `createImageBitmap`/`OffscreenCanvas` are missing.

---

## Placeholder Car Art

All 5 default cars are colored rectangles at this stage — no sprite files needed. Each gets a distinct color:

| # | Name | Color |
|---|---|---|
| 1 | Uncle Sedan | `#C73E3A` (red) |
| 2 | Tuk-Tuk Terror | `#F2B544` (yellow) |
| 3 | F1 Kart | `#2E86AB` (blue) |
| 4 | Void Van | `#1A1A1A` (near-black) |
| 5 | Kopitiam Kart | `#6B4423` (brown) |

`BootScene.preload()` generates each texture procedurally via Phaser `Graphics` → `generateTexture('car_uncle_sedan', 64, 64)`. The garage UI renders the same colors as CSS rectangles with `image-rendering: pixelated`. Real PNG sprites later drop into `src/assets/cars/` — no code refactor because `CarManager` only consumes texture keys.

---

## Verification Plan (end-to-end)

1. `npm run dev` — Login screen loads with Press Start 2P, scanlines visible, no console errors.
2. New username → arrive in Garage with 5 default cars seeded (verify in Supabase).
3. Upload a non-square JPEG → 64×64 pixelated letterboxed preview → confirm → new car in garage → URL resolves.
4. Select car, start game → Phaser canvas mounts, car renders, WASD moves, Space triggers nitro w/ 10s cooldown.
5. Past 500 pts → 1.5s fade to sunset biome AND HUD recolors.
6. Repeat at 1000 / 2000 / 5000.
7. Die → GameOver → score appears in `scores` → Leaderboard shows it if top 10.
8. Refresh → `localStorage` restores user + selected car.
9. Lighthouse a11y ≥90, no CLS regressions.
10. Deploy to Vercel, repeat 1–8 against production URL.

---

## Critical Files to Create

```
index.html
vite.config.js
.env.local                         # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
src/main.jsx
src/App.jsx
src/lib/supabase.js
src/lib/gameEvents.js
src/styles/tokens.css
src/components/Login.jsx
src/components/CarGarage.jsx
src/components/CarUpload.jsx
src/components/GameCanvas.jsx
src/components/HUD.jsx
src/components/Leaderboard.jsx
src/game/main.js
src/game/scenes/{Boot,Menu,Game,GameOver}Scene.js
src/game/systems/{Input,Car,Obstacle,Background,Score}*.js
```
