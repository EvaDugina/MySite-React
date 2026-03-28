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
docker compose -f docker-compose.dev.yml run --rm frontend npm run build
docker compose -f docker-compose.dev.yml run --rm frontend npm run preview
docker compose -f docker-compose.dev.yml run --rm frontend npm run lint

# Production
docker-compose -f docker-compose.prod.yml up --build -d   # (nginx on :8080)
```

Backend has lightweight unit tests based on built-in `node:test` for `server/realtime/*.test.js`.

### Backend (Fingerprints API)

```bash
cd server && npm install && npm run dev   # Express + SQLite on :3001
```

Backend (`server/`) includes:
- REST API for shared fingerprint storage: `GET/POST/DELETE /api/fingerprints`
- WebSocket realtime channel for public cursors: `GET /ws` (upgrade)

Stack: Express 5 + better-sqlite3 + ws.
In dev Vite proxies `/api` and `/ws` to backend; in prod Nginx proxies `/api` and `/ws` to the `api` container.

## Architecture

**Stack:** React 19.2 + Vite 7.2 + react-router-dom 7.13, SCSS/CSS Modules, Express 5 + SQLite + ws (backend), Docker + Nginx

**Entry flow:** `index.html` → `src/index.jsx` → `App.jsx` → `AppRouter.jsx` → lazy-loaded pages

**Two pages** defined in `AppRouter.config.js`:

- `/neprikosnovenna` — static portrait with click tracking, audio, flash effects
- `/neprikosnovenna/and-i-am-the-only-one-who-knows-that-you-look-better-with-blood` — video transformation, persistent "bloody" state via localStorage

### Cursor System (`src/components/cursor/`)

The most complex subsystem. Custom physics-based cursor replacing the browser default.

- **useCursorMovePhysics** — spring physics engine (stiffness, mass, damping, maxSpeed)
- **useCursor** — orchestrator: events, resize, animation loop, zone changes
- **useCursorZone** — zone detection mapping elements to zones (NONE: 0, BACK: 1, PORTRAIT: 2, BUTTON: 3, OBEZZHIRIT: 4) with cursor icon/behavior changes
- **CursorFingerprintTracker** — two-layer fingerprint renderer (WebGL instanced for DB data, 2D Canvas for session) with shared SQLite backend via Express API
- **CursorPublicTracker** — realtime public cursors over WebSocket (`/ws`) с `iconKey`-синхронизацией (позиция + иконка), fast-path icon update (`t:"i"`), hard gate по первому клику `BtnNeprikosnovenna`, и декомпозицией на `hooks/publicTracker/*` и `hooks/publicCursors/*`

### Imperative Component Pattern

Core components expose imperative APIs via `forwardRef` + `useImperativeHandle`:

- `Background.ref` → `.show()`, `.hide()`, `.changeType()` — props: `variant` (`'white'` | `'blue'`), `extraClass`, `zIndex`
- `Button.ref` → `.hover()`, `.click()`, `.disable()`, `.reset()`, `.isDisabled()` — props: `variant` (`"neprikosnovenna"` | `"obeszhirit"`), `isHoverAble` (default true), `isClickAble` (default true)
- `Cursor.ref` → `.getPosition()`, `.hide()`, `.show()`
- `PortraitProvider.ref` → `.showVideo()`, `.hideVideo()`, `.playVideo()`, `.pauseVideo()`, `.stopVideo()`, `.scrollToEndVideo()`, `.scrollToStartVideo()`, `.changeImagePortraitType()`
- `FlashProvider.ref` → `.flashes(type)` (async flash sequences, guarded against concurrent calls) — props: `zIndex`, `onFlashStart`, `onFlashEnd`
- `CursorFingerprintTracker.ref` → `.saveClickPosition()`, `.clearAllFingerprints()`, `.getSessionClickCount()` — props: `onReady(count)` callback when DB data loaded, `onFadeInComplete` callback when fade-in transition ends, `startFadeIn` controls WebGL layer fade-in start

Pages orchestrate complex interaction sequences by calling these imperatively.

### Settings Pattern

`*Settings.js` используется для shared-констант и конфигураций вариантов компонентов.  
Если константа используется только в одном компоненте/хуке, она хранится рядом с местом использования (пример: `CursorPublicTracker` после декомпозиции).

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

- **frontend** — multi-stage build (`node:20-alpine` builder → `nginx:alpine`) on port 8080. Non-root user. Nginx config at `for-docker/nginx.conf` with SPA fallback, `/api` and `/ws` proxy to backend, security headers, gzip, 1-year immutable cache.
- **api** — `node:20-alpine`, Express + SQLite on port 3001 (internal only, not exposed). Non-root `node` user. Named volume `neprikosnovenna-sqlite` for DB persistence. Healthcheck on `/api/fingerprints`.

Frontend depends on api with `condition: service_healthy`.
