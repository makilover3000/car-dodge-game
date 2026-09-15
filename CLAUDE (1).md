# CLAUDE.md — Car Dodge Game

## Read This First
Before doing anything, read all files in `.claude/agents/` and `.claude/skills/`. Apply the frontend-developer agent and frontend-design + ui-ux-pro-max skills throughout this project. Do not write generic AI slop UI. Commit to a bold aesthetic direction.

---

## Project Overview
A pixel art browser car dodge game with user accounts, a personal car garage, global leaderboard, and Supabase backend. Built with Vite + React + Phaser.js. Deployed on Vercel.

---

## Tech Stack
- **Frontend**: Vite + React
- **Game Engine**: Phaser.js 3 (loaded via CDN, no npm install needed)
- **Backend/DB**: Supabase (database + auth + storage)
- **Deployment**: Vercel
- **Styling**: CSS modules or plain CSS, pixel art aesthetic throughout

---

## File Structure
```
car-dodge-game/
  src/
    components/
      Login.jsx          # username login screen
      CarGarage.jsx      # car selection + management UI
      GameCanvas.jsx     # Phaser game instance wrapper
      Leaderboard.jsx    # global highscores
      HUD.jsx            # in-game score, lives display
    game/
      main.js            # Phaser game config
      scenes/
        BootScene.js     # preload assets
        MenuScene.js     # main menu
        GameScene.js     # core game loop
        GameOverScene.js # score submit + retry
      systems/
        InputHandler.js  # WASD + arrow key input
        CarManager.js    # player car rendering + custom image
        ObstacleManager.js # enemy car spawning + movement
        BackgroundManager.js # biome system + transitions
        ScoreManager.js  # score tracking + difficulty scaling
    lib/
      supabase.js        # supabase client init
    assets/
      cars/              # 5 default pixel art car sprites
      backgrounds/       # biome background assets
      fonts/             # pixel font
  index.html
  vite.config.js
  .env.local             # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

---

## Supabase Schema

### users table
```sql
id          uuid primary key default gen_random_uuid()
username    text unique not null
created_at  timestamptz default now()
```

### cars table
```sql
id          uuid primary key default gen_random_uuid()
user_id     uuid references users(id) on delete cascade
name        text not null
is_default  boolean default false
image_url   text
created_at  timestamptz default now()
```

### scores table
```sql
id          uuid primary key default gen_random_uuid()
user_id     uuid references users(id) on delete cascade
username    text not null
score       integer not null
created_at  timestamptz default now()
```

---

## Auth Flow (no password)
- User types username on login screen
- Check if username exists in `users` table
- If yes: fetch their cars, proceed to garage
- If no: create new user, seed 5 default cars, proceed to garage
- Store user object in React state + localStorage for session persistence

---

## Garage System Rules
- Each user has max 10 cars total
- 5 default cars seeded on first login (cannot be re-added if deleted)
- User can upload custom car images (stored in Supabase Storage, URL saved in cars table)
- Deleting any car is permanent, no confirmation needed beyond a single warning modal
- Selected car is highlighted, stored in localStorage as `selectedCarId`
- Custom car upload: resize image to 64x64px in browser using Canvas before uploading

---

## Default Cars (pixel art, give each a goofy name + description)
1. Uncle Sedan — "Your uncle's trusty Proton. Smells like Tiger Balm."
2. Tuk-Tuk Terror — "Bangkok's finest. Somehow faster than everything."
3. F1 Kart — "Technically street legal. Technically."
4. Void Van — "No one knows where it came from. No one asks."
5. Kopitiam Kart — "Powered by kopi-o. Unstoppable before 9am."

---

## Game Mechanics

### Controls
- A/D or Left/Right arrows: move car left/right
- W/S or Up/Down arrows: speed up/slow down
- Space: activate nitro boost (cooldown 10s)

### Difficulty
- Speed increases every 30 seconds
- Obstacle spawn rate increases every 45 seconds
- At 2000pts: add side-swiping obstacle cars
- At 5000pts: add obstacle trucks (wider hitbox)

### Biomes (background changes at score milestones)
| Score | Biome | Vibe |
|-------|-------|------|
| 0 | Singapore Expressway | Day, blue sky, HDB blocks |
| 500 | Sunset Highway | Dusk, orange sky, palm trees |
| 1000 | Cyberpunk Neon City | Night, neon signs, rain |
| 2000 | Space Highway | Stars, planets, asteroid belts |
| 5000 | Glitch World | Corrupted pixels, screen tears (secret biome) |

- Each transition: 1.5s fade effect
- Each biome has its own color palette, road markings, and scrolling background elements
- Pixel art style throughout, chunky pixels, limited color palette per biome

---

## Leaderboard
- Top 10 global scores fetched from Supabase `scores` table
- Score submitted automatically on game over
- Shows: rank, username, score, date
- Pixel art table styling

---

## UI / Design Rules (from frontend-design + ui-ux-pro-max skills)
- Pixel art aesthetic EVERYWHERE, not just the game canvas
- Use a pixel font (Press Start 2P from Google Fonts) for all UI text
- Car selection screen: bold, arcade cabinet vibe
- Login screen: simple, retro terminal aesthetic
- No generic Bootstrap or Tailwind defaults
- Color palette should match the current active biome
- Scanline overlay effect on all screens for retro CRT feel
- All buttons have hover pixel-shift animation (move 2px down on hover)

---

## Architecture Rules
- Never put game logic inside React components. React = UI shell only. Phaser = all game logic.
- GameCanvas.jsx just mounts and destroys the Phaser instance
- Communicate React to Phaser via a global EventEmitter (e.g. window.gameEvents)
- Separate every system into its own file under src/game/systems/
- No spaghetti code. If a file exceeds 200 lines, split it.
- Comment every major section and every system's public methods

---

## Environment Variables
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
Never hardcode these. Always use import.meta.env.VITE_*

---

## Deployment
- Platform: Vercel
- Build command: `npm run build`
- Output directory: `dist`
- Add environment variables in Vercel dashboard

---

## Development Commands
```bash
npm create vite@latest . -- --template react
npm install
npm install phaser
npm install @supabase/supabase-js
npm run dev
```

---

## Session Handoff Format
When ending a session, always summarize:
- What works
- What is broken or incomplete
- Files touched
- Next steps

Paste this into the next session to restore context.
