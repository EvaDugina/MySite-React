# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Язык

Language in code/docs/UI is primarily **Russian**. Пиши **только на русском** — код, комментарии, документация, сообщения коммитов, ответы в чате.

## Project

**Neprikosnovenna** (Неприкосновенна) — an interactive web art installation exploring the relationship between the touchable and the sacred. Built as a React 19 SPA with custom physics-based cursor, WebGL effects, and imperative component orchestration.

## Commands

> ⚠️ **Все команды запускаются и проверяются исключительно внутри Docker-контейнера.** Не запускай `npm run *` напрямую в хост-системе.

```bash
# Development
docker compose -f docker-compose.dev.yml up --build  # Vite dev server

# Build, preview, prod and lint only inside docker:
docker compose -f docker-compose.dev.yml run --rm app npm run build
docker compose -f docker-compose.dev.yml run --rm app npm run preview
docker compose -f docker-compose.dev.yml run --rm app npm run lint

# Production
docker-compose -f docker-compose.prod.yml up --build -d   # (nginx on :8080)
```

No test framework is configured.

### Backend (Fingerprints API)

```bash
cd server && npm install && npm run dev   # Express + SQLite on :3001
```

Minimal REST API (`server/`) for shared fingerprint storage: `GET/POST/DELETE /api/fingerprints`. Stack: Express 5 + better-sqlite3. In dev Vite proxies `/api` to backend; in prod Nginx proxies `/api` to the `api` container.

## Architecture

**Stack:** React 19.2 + Vite 7.2 + react-router-dom 7.13, SCSS/CSS Modules, Express 5 + SQLite (backend), Docker + Nginx

**Entry flow:** `index.html` → `src/index.jsx` → `App.jsx` → `AppRouter.jsx` → lazy-loaded pages

**Two pages** defined in `AppRouter.config.js`:

- `/neprikosnovenna` — static portrait with click tracking, audio, flash effects
- `/neprikosnovenna/and-i-am-the-only-one-who-knows-that-you-look-better-with-blood` — video transformation, persistent "bloody" state via localStorage

### Cursor System (`src/components/cursor/`)

The most complex subsystem. Custom physics-based cursor replacing the browser default.

- **useCursorMovePhysics** — spring physics engine (stiffness, mass, damping, maxSpeed)
- **useCursor** — orchestrator: events, resize, animation loop, zone changes
- **useCursorZone** — zone detection mapping elements to zones (NONE, BACK, PORTRAIT, BUTTON, OBEZZHIRIT) with cursor icon/behavior changes
- **CursorFingerprintTracker** — two-layer fingerprint renderer (WebGL instanced for DB data, 2D Canvas for session) with shared SQLite backend via Express API

### Imperative Component Pattern

Core components expose imperative APIs via `forwardRef` + `useImperativeHandle`:

- `Background.ref` → `.show()`, `.hide()`, `.changeType()`
- `Button.ref` → `.hover()`, `.click()`, `.disable()`, `.reset()`, `.isDisabled()` — props: `variant` (`"neprikosnovenna"` | `"obeszhirit"`), `isHoverAble` (default true), `isClickAble` (default true)
- `Cursor.ref` → `.getPosition()`, `.hide()`, `.show()`
- `PortraitProvider.ref` → `.playVideo()`, `.showVideo()`, `.scrollToEndVideo()`
- `FlashProvider.ref` → `.flashes(type)` (async flash sequences, guarded against concurrent calls)
- `CursorFingerprintTracker.ref` → `.saveClickPosition()`, `.clearAllFingerprints()`, `.getSessionClickCount()` — props: `onReady(count)` callback when DB data loaded, `startFadeIn` controls WebGL layer fade-in start

Pages orchestrate complex interaction sequences by calling these imperatively.

### Settings Pattern

Each component has a `*Settings.js` file defining configuration objects/factories (cursor types, background types, flash types, portrait types). These are the single source of truth for component variants.

## Code Style (from .docs/RulesCoding.md)

- **4-space indentation**, no semicolons (consistent omission)
- **Naming:** camelCase (variables/functions/hooks), PascalCase (components, files), UPPER_CASE (constants), kebab-case (directories)
- **Event handlers:** `handle` prefix (`handleClick`, `handleSubmit`)
- **Booleans:** verb prefix (`isLoading`, `hasError`, `canSubmit`)
- **Styling:** BEM + CSS Modules (`.module.css` / `.module.scss`), desktop-first media queries
- **React:** functional components with arrow functions, composition over inheritance, custom hooks for complex logic
- **Strict equality** (`===`, `!==`), trailing commas, line length 80–100 chars

## Deployment

Production uses two Docker containers orchestrated by `docker-compose.prod.yml`:

- **frontend** — multi-stage build (`node:20-alpine` builder → `nginx:alpine`) on port 8080. Non-root user. Nginx config at `for-docker/nginx.conf` with SPA fallback, `/api` proxy to backend, security headers, gzip, 1-year immutable cache.
- **api** — `node:20-alpine`, Express + SQLite on port 3001 (internal only, not exposed). Non-root `node` user. Named volume `neprikosnovenna-sqlite` for DB persistence. Healthcheck on `/api/fingerprints`.

Frontend depends on api with `condition: service_healthy`.
