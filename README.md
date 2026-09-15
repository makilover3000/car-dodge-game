# 🚗 Car Dodge // SG Expressway

A retro pixel-art arcade dodging game built with **React + Phaser 3**, backed by **Supabase**. Pick a car, dodge oncoming traffic on a Singapore expressway, and outlast the leaderboard.

## Gameplay

- **Dodge traffic** across lanes using WASD or the arrow keys, and hit **Space** to pop a 10-second nitro boost.
- **Score climbs automatically** the longer you survive, with speed and enemy spawn rate ramping up over time.
- **5 biomes** unlock as your score climbs (0 / 500 / 1,000 / 2,000 / 5,000 points), each with its own scrolling background and color palette, cross-fading in over 1.5 seconds without pausing the run.
- **New enemy types unlock** at score milestones — side-swiping obstacles at 2,000 pts, trucks at 5,000 pts.
- **Lose all your lives** and it's game over — your score is submitted straight to the leaderboard.

## Features

- **Username-only login** — no passwords, just pick a name and go.
- **Car garage** — every player gets 5 default cars and can hold up to 10. Swap your active ride before each run.
- **Custom car uploads** — upload any image and it's automatically resized and letterboxed client-side into a crisp 64×64 pixel-art sprite (transparent PNG, no blur) before being stored.
- **Global leaderboard** — top 10 high scores, pulled live from Supabase.
- **Pixel-art presentation** — Press Start 2P / VT323 fonts, CRT scanline overlay, and hover pixel-shift effects throughout the UI.

## Tech Stack

- **React 19** — UI shell: login, car garage, HUD overlay, leaderboard.
- **Phaser 3** (loaded via CDN) — owns all game logic: scenes, physics, rendering. Runs completely independently of React.
- **Vite 6** — dev server and build tooling.
- **Supabase** — Postgres database (`users`, `cars`, `scores`) + Storage bucket for uploaded car images.

React and Phaser never touch each other's internals directly — they communicate exclusively through a single global event bridge (`window.gameEvents`), so the game engine has zero React imports and the UI never reaches into Phaser's runtime state.

## Running Locally

Requires Node.js and a Supabase project (URL + anon key).

```bash
npm install
```

Create a `.env.local` file in the project root:

```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Then start the dev server:

```bash
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

### Other scripts

```bash
npm run build     # production build to dist/
npm run preview   # preview the production build locally
```

## Deployment

Deployed on [Vercel](https://vercel.com) as a static Vite build (`npm run build`, output directory `dist`). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in the Vercel project settings — they aren't committed to the repo.

## Project Structure

```
src/
  App.jsx                 # routes between Login / Garage / Game / Leaderboard
  components/              # React UI: Login, CarGarage, CarUpload, GameCanvas, HUD, Leaderboard
  lib/
    supabase.js            # Supabase client
    gameEvents.js           # React <-> Phaser event bridge
  game/
    main.js                # Phaser config + scene registration
    scenes/                 # Boot -> Menu -> Game -> GameOver
    systems/                 # Input, Car, Obstacle, Background, Score managers
  styles/                  # design tokens, biome palettes, global styles
```

See [`PLAN.md`](./PLAN.md) for the full build plan, Supabase schema, and implementation notes.
