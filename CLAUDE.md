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

This project is designed to sit behind a shared Caddy reverse proxy (see `multi-compose-caddy-setup.md`). Neither container publishes ports — both join an external `web` network where Caddy reaches them by container name (`poker_backend:3000`, `poker_frontend:80`).

```bash
# Create the shared network once (host-level, before first run)
docker network create web

# Production (server, behind Caddy — no published ports)
docker compose up --build -d

# Local testing without Caddy — publishes :80 on the host
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build -d

# Stop
docker compose down
```

`nginx.conf` proxies `/socket*` to `poker_backend:3000`. In production Caddy intercepts that path first, so the nginx rule is dead code. Locally (without Caddy) it's what makes the same-origin WebSocket work.

Caddyfile snippet (lives in the Caddy compose project, not here):

```caddy
poker.example.com {
    reverse_proxy /socket* poker_backend:3000
    reverse_proxy poker_frontend:80
}
```

The frontend derives the WebSocket URL at runtime from `window.location` (e.g. `wss://poker.example.com/socket`), so no build-time `VITE_WS_URL` is needed for production.

## Environment Variables

**`backend/.env`** — `MONGODB_URI`, `PORT` (default `3000`), `NODE_ENV`

**`frontend/.env`** — `VITE_WS_URL` (only for `npm run dev`, e.g. `ws://localhost:3000/socket`). In production builds the URL is derived from `window.location` and this var is unused.

The frontend opens at `http://localhost:5173/WelcomePage` in dev.

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
