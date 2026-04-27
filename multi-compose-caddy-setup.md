# Multi-Compose Docker Setup with Shared Caddy Reverse Proxy

This setup uses **one shared Caddy service** as the only public entry point on the server, and keeps each application in its **own Docker Compose project**. Each app can have its own frontend, backend, database, worker, or other internal services.

This is a good fit when you want to host several websites or programs on the same server and route traffic by domain or subdomain.

## Goals

- Expose only **ports 80 and 443** publicly
- Let **Caddy** handle HTTPS and reverse proxying
- Keep app services on **private Docker networking**
- Make it easy to add more apps later
- Support **WebSockets** without exposing backend ports like `3000`

---

## Architecture Overview

The idea is:

- One Compose project for **Caddy**
- One Compose project per app, for example:
  - `game`
  - `blog`
  - `admin`
- All public web traffic enters through **Caddy**
- Caddy forwards requests to the correct container based on domain or path
- Internal services such as PostgreSQL, Redis, and workers are **not public**

Example routing:

- `game.example.com` -> game frontend
- `game.example.com/api/*` -> game backend
- `game.example.com/socket*` -> game backend WebSocket endpoint
- `blog.example.com` -> blog container

---

## Recommended Folder Structure

```text
/opt
  /caddy
    docker-compose.yml
    Caddyfile

  /game
    docker-compose.yml
    .env
    /frontend
    /backend

  /blog
    docker-compose.yml
    .env
    /app
```

You can choose a different folder layout, but keeping each app separate makes deployment and maintenance easier.

---

## Shared Docker Network

Create one external Docker network that all public-facing apps and Caddy will join:

```bash
docker network create web
```

This allows the Caddy container to reach containers started by other Compose projects.

---

## Caddy Compose File

File: `/opt/caddy/docker-compose.yml`

```yaml
services:
  caddy:
    image: caddy:2
    container_name: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - web

volumes:
  caddy_data:
  caddy_config:

networks:
  web:
    external: true
```

### Notes

- `80` is used for HTTP
- `443` is used for HTTPS
- Caddy stores certificates in `caddy_data`
- The `web` network must already exist

---

## Example App Compose File: Game

File: `/opt/game/docker-compose.yml`

```yaml
services:
  game_frontend:
    build: ./frontend
    container_name: game_frontend
    restart: unless-stopped
    expose:
      - "80"
    networks:
      - web

  game_backend:
    build: ./backend
    container_name: game_backend
    restart: unless-stopped
    expose:
      - "3000"
    environment:
      NODE_ENV: production
    networks:
      - web
      - internal

volumes:
  game_db_data:

networks:
  web:
    external: true
  internal:
    driver: bridge
```

### Notes

- `game_frontend` is reachable by Caddy on the `web` network
- `game_backend` is also reachable by Caddy on the `web` network
- `expose` makes ports available to other containers on the Docker network, without publishing them to the internet
- There is no `ports:` section on the backend or database, so users cannot directly access `:3000` or PostgreSQL

---

## Example Caddyfile

File: `/opt/caddy/Caddyfile`

```caddy
game.example.com {
    reverse_proxy /api/* game_backend:3000
    reverse_proxy /socket* game_backend:3000
    reverse_proxy game_frontend:80
}

blog.example.com {
    reverse_proxy blog_app:80
}
```

### What this does

For `game.example.com`:

- Requests to `/api/*` go to `game_backend:3000`
- Requests to `/socket*` go to `game_backend:3000`
- Everything else goes to `game_frontend:80`

For `blog.example.com`:

- All requests go to `blog_app:80`

Caddy handles HTTPS automatically if your DNS records point to the server.

---

## WebSockets in This Setup

This setup works well with WebSockets.

The browser should **not** connect to:

```text
ws://your-server-ip:3000
```

Instead, it should connect through the same public domain, for example:

```text
wss://game.example.com/socket
```

### Frontend example

```js
const protocol = window.location.protocol === "https:" ? "wss" : "ws";
const socket = new WebSocket(`${protocol}://${window.location.host}/socket`);
```

This is better because:

- it uses the same domain as the frontend
- it works through port `443` with `wss://`
- it avoids exposing port `3000`
- it is more likely to work on restricted networks like schools, offices, or public Wi-Fi

---

## Why This Is Better Than Exposing Backend Ports

If you expose `3000:3000` publicly, users try to reach the backend directly on port 3000. That can fail because:

- schools and public networks often block nonstandard ports
- it creates more public attack surface
- it complicates HTTPS and CORS
- it makes deployment less clean when hosting multiple apps

Using Caddy avoids those problems by keeping public traffic on standard web ports only.

---

## Example App Compose File: Blog

File: `/opt/blog/docker-compose.yml`

```yaml
services:
  blog_app:
    build: ./app
    container_name: blog_app
    restart: unless-stopped
    expose:
      - "80"
    networks:
      - web

networks:
  web:
    external: true
```

This app is simple because it only needs one web container.

---

## Startup Order

A normal setup sequence is:

```bash
docker network create web

cd /opt/caddy
docker compose up -d

cd /opt/game
docker compose up -d

cd /opt/blog
docker compose up -d
```

If the `web` network already exists, Docker will say so and keep using it.

---

## DNS Requirements

For Caddy to issue HTTPS certificates automatically, the relevant domains or subdomains must point to your server.

Examples:

- `game.example.com` -> your server IP
- `blog.example.com` -> your server IP

If DNS is not set up correctly, HTTPS provisioning will fail.

---

## Practical Rules

### Public services

These should usually be reachable through Caddy:

- frontends
- backends with HTTP or WebSocket APIs
- admin panels
- dashboards

### Internal-only services

These should usually **not** be public:

- PostgreSQL
- MySQL
- Redis
- workers
- job queues
- background processors

---

## Important Design Rule

Use:

- `ports:` only for Caddy in most cases
- `expose:` for app containers that Caddy should reach internally
- no public ports for databases and internal services

That keeps the server cleaner and safer.

---

## Scaling to More Apps

When you add another app later, the pattern stays the same:

1. Create a new Compose project for the app
2. Attach its public-facing container to the external `web` network
3. Add a new site block in the Caddyfile
4. Reload or restart Caddy

Example new site:

```caddy
admin.example.com {
    reverse_proxy admin_frontend:80
}
```

---

## Summary

This setup gives you:

- one shared reverse proxy
- one Compose file per app
- clean separation between projects
- private internal networking
- easier scaling to multiple websites
- proper support for HTTPS and WebSockets
- a more production-like deployment model

In short:

- **Caddy is its own container**
- **each app has its own Compose project**
- **all public-facing services join the shared `web` network**
- **only Caddy exposes ports 80 and 443**
- **backend services stay internal, even when they use WebSockets**
