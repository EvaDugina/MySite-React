# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Neprikosnovenna** (Неприкосновенна) — an interactive web art installation exploring the relationship between the touchable and the sacred. Built as a React 19 SPA with custom physics-based cursor, WebGL effects, and imperative component orchestration.

Language in code/docs/UI is primarily **Russian**. Пиши только на русском.

## Commands

```bash
# Development
npm run dev          # Vite dev server

# Build & preview
npm run build        # Production build (vite build)
npm run preview      # Preview production build
npm run prod         # Build + preview

# Lint
npm run lint         # ESLint (flat config)

# Docker
docker-compose -f docker-compose.prod.yml up --build -d   # Production (nginx on :8080)
docker compose -f docker-compose.dev.yml up --build        # Development
```

No test framework is configured.

### Backend (Fingerprints API)

```bash
cd server && npm install && npm run dev   # Express + SQLite on :3001
```

Minimal REST API (`server/`) for shared fingerprint storage: `GET/POST/DELETE /api/fingerprints`. Stack: Express 5 + better-sqlite3. Vite proxies `/api` to backend.

## Architecture

**Stack:** React 19.2 + Vite 7.2 + react-router-dom 7.13, SCSS/CSS Modules, Express 5 + SQLite (backend), Docker + Nginx

**Entry flow:** `index.html` → `src/index.jsx` → `App.jsx` → `AppRouter.jsx` → lazy-loaded pages

**Two pages** defined in `AppRouter.config.js`:

- `/neprikosnovenna` — static portrait with click tracking, audio, flash effects, "обезжирить" button (clears all fingerprints, appears after 20+ DB fingerprints or first session click)
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
- `Button.ref` → `.hover()`, `.click()`, `.disable()` — props: `variant` (`"neprikosnovenna"` | `"obezzhirit"`)
- `Cursor.ref` → `.getPosition()`, `.hide()`, `.show()`
- `PortraitProvider.ref` → `.playVideo()`, `.showVideo()`, `.scrollToEndVideo()`
- `FlashProvider.ref` → `.flashes(type)` (async flash sequences, guarded against concurrent calls)
- `CursorFingerprintTracker.ref` → `.saveClickPosition()`, `.clearAllFingerprints()` — props: `onReady(count)` callback when DB data loaded

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

Production uses multi-stage Docker: `node:20-alpine` builder → `nginx:alpine` runner on port 8080. Nginx config at `for-docker/nginx.conf` with SPA fallback, security headers, gzip, and 1-year immutable cache for static assets. Container runs as non-root user.
