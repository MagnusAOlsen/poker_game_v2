# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run frontend + backend together
npm run dev

# Build everything
npm run build

# Lint
npm run lint

# Run backend or frontend individually
npm run dev --prefix backend
npm run dev --prefix frontend
```

There are no tests in this project.

## Docker

```bash
# Build and start both containers
docker compose up --build

# Run in background
docker compose up --build -d

# Stop
docker compose down
```

The frontend is served by nginx on port `80`. The backend WebSocket is on port `3000`. `VITE_WS_URL` is baked into the frontend at build time — to change it (e.g. for LAN play), pass the build arg:

```bash
docker compose build --build-arg VITE_WS_URL=ws://192.168.1.x:3000 frontend
```

## Environment Variables

**`backend/.env`** — `MONGODB_URI`, `PORT` (default `3000`), `NODE_ENV`

**`frontend/.env`** — `VITE_WS_URL` (WebSocket URL, e.g. `ws://localhost:3000` for local dev or the local network IP for LAN play)

The frontend opens at `http://localhost:5173/WelcomePage` in dev. Production is deployed on Vercel (frontend) and Railway (backend).

## Architecture

### How the game loop works

The backend (`backend/src/index.ts`) is a single WebSocket + HTTP server. Each game session lives in a `Map<string, Session>` entirely in memory — nothing persists across server restarts except MongoDB game stats.

When a host sends `startGame`, `loopRounds()` kicks off an `async while(true)` that runs one full round per iteration via `playRound()`. Player actions (bet, reveal) are resolved via `Promise`-based callbacks: `player.bet()` and `player.revealCards()` both return Promises that only resolve when the player sends the corresponding WebSocket message. This means the async game loop is literally suspended waiting for each player to act.

Turn reminders are sent every 13 seconds and showdown reminders every 6 seconds to clients who haven't acted yet, handled via `setInterval` stored in `session.turnReminders` / `session.showdownReminders`.

### Game logic (`backend/src/gameLogic/`)

- `Game.ts` — round lifecycle: `startNewRound` → `collectBets` (×4 phases) → `collectShowdownChoices` → `payOut`. Handles side pots, blinds, phase transitions, and last-aggressor-on-river showdown order.
- `Player.ts` — per-player state and the Promise resolvers for `bet()` / `revealCards()`.
- `HandEvaluator.ts` — best-of-seven hand evaluation and comparison.
- `Deck.ts` / `Card.ts` — standard deck, shuffle, deal.

### Frontend (`frontend/src/`)

Pages communicate exclusively over WebSocket using `sessionStorage` to persist player name and game code across navigations. The host view (`HostPlaying`) shows all players and community cards; the player view (`PlayerPlaying`) shows only the acting player's own hand and action buttons.

Language toggle (Norwegian/English) is managed via `LanguageContext` and only affects the local device.

### Adjusting starting chips

Default is 150 chips. To change it, pass a different value when constructing `new Player(name, chips)` in `backend/src/index.ts`.
