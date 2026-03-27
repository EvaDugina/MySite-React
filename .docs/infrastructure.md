# Инфраструктура

## Обзор

Два окружения: **dev** (Vite HMR + Express) и **prod** (Nginx + Express). Оба работают через Docker Compose.

### Файлы

| Файл | Назначение |
|------|-----------|
| `docker-compose.dev.yml` | Dev-окружение |
| `docker-compose.prod.yml` | Prod-окружение |
| `Dockerfile.dev.react` | Образ фронтенда (dev) |
| `Dockerfile.prod` | Образ фронтенда (prod, multi-stage) |
| `server/Dockerfile` | Образ API |
| `server/docker-entrypoint.sh` | Entrypoint API — права на volume + su-exec |
| `for-docker/nginx.conf` | Конфигурация Nginx (prod) |
| `.dockerignore` | Исключения для frontend build context |
| `server/.dockerignore` | Исключения для API build context |

---

## Dev-окружение

```bash
docker compose -f docker-compose.dev.yml up --build
```

### Контейнеры

| Сервис | Образ | Порт | Описание |
|--------|-------|------|----------|
| `frontend` | `Dockerfile.dev.react` | 8080 → 5173 | Vite dev server с HMR |
| `api` | `server/Dockerfile` | 3001 → 3001 | Express + SQLite |

### Особенности

- **Hot reload**: volumes `./src` и `./public` монтируются в контейнер, `CHOKIDAR_USEPOLLING=true` для Windows
- **API proxy**: Vite проксирует `/api` → `http://api:3001` через `vite.config.js` (env `API_URL`)
- **Healthcheck**: API проверяется через `wget` на `/api/fingerprints`, фронтенд ждёт `condition: service_healthy`
- **SQLite**: данные в `./server/data/` (bind mount)

### Сетевая схема (dev)

```
Браузер → localhost:8080
              ↓
         Vite dev server (контейнер frontend:5173)
              ↓ proxy /api
         Express API (контейнер api:3001)
              ↓
         SQLite (./server/data/fingerprints.db)
```

---

## Prod-окружение

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

### Контейнеры

| Сервис | Образ | Порт | Лимиты |
|--------|-------|------|--------|
| `frontend` | `Dockerfile.prod` (multi-stage) | 8080 → 8080 | 0.5 CPU, 128M RAM |
| `api` | `server/Dockerfile` | 3001 (внутренний) | 0.5 CPU, 256M RAM |

### Multi-stage сборка фронтенда

```
Этап 1: node:20-alpine3.21
  → npm ci → npm run build → /app/dist/

Этап 2: nginx:1.27-alpine
  → COPY dist → /usr/share/nginx/html
  → non-root пользователь leonardo (uid 1001)
  → HEALTHCHECK wget http://127.0.0.1:8080/
```

### Сетевая схема (prod)

```
Браузер → localhost:8080
              ↓
         Nginx (контейнер frontend:8080)
         ├── /            → SPA (try_files → index.html)
         ├── /assets/*    → статика (cache 1 год, immutable)
         └── /api/*       → proxy_pass http://api:3001
                                ↓
                          Express API (контейнер api:3001)
                                ↓
                          SQLite (named volume neprikosnovenna-sqlite)
```

### Изолированная сеть

Контейнеры связаны через `neprikosnovenna-net` (bridge). API-порт 3001 не экспонирован наружу — доступен только через nginx proxy.

---

## Nginx (`for-docker/nginx.conf`)

### Маршрутизация

| Location | Поведение |
|----------|----------|
| `/` | SPA fallback: `try_files $uri $uri/ /index.html` |
| `~* \.(js\|css\|png\|...)$` | Статика: cache 1 год, `immutable` |
| `/api` | Proxy → `http://api:3001` с таймаутами 5/10/10s |

### Security headers

Заголовки объявлены на уровне `server {}` и продублированы в `location` статики (nginx не наследует `add_header` в блоки, где уже есть свои `add_header`):

- `Content-Security-Policy` — `default-src 'self'`, `script-src 'self'`, `connect-src 'self'`, `img-src 'self' data: blob:`, `style-src 'self' 'unsafe-inline'`
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `server_tokens off` — версия nginx скрыта

### Сжатие

gzip уровень 6, минимум 1024 байт. Типы: `text/*`, `application/javascript`, `application/json`, `application/wasm`.

---

## API-контейнер (`server/Dockerfile`)

### Entrypoint и права на volume

Проблема: `USER node` в Dockerfile не помогает, когда volume монтируется в runtime — файлы наследуют права хоста.

Решение: `docker-entrypoint.sh` запускается от root, исправляет владельца `/app/data` на `node:node`, затем переключается через `su-exec node` на non-root пользователя.

```
docker-entrypoint.sh (root)
  → chown -R node:node /app/data
  → exec su-exec node "$@"
    → node index.js (uid=1000)
```

### Healthcheck

```
wget -qO- http://localhost:3001/api/fingerprints
interval: 30s, timeout: 5s, start_period: 10s, retries: 3
```

### Переменные окружения

| Переменная | Значение | Описание |
|-----------|---------|----------|
| `NODE_ENV` | `production` | Оптимизации Express |
| `DB_DIR` | `/app/data` | Директория SQLite |
| `PORT` | `3001` | Порт Express |

---

## Безопасность

### Non-root пользователи

| Контейнер | Пользователь | UID | Механизм |
|-----------|-------------|-----|----------|
| frontend | `leonardo` | 1001 | `USER` в Dockerfile |
| api | `node` | 1000 | `su-exec` в entrypoint |

### .dockerignore

Frontend build context исключает: `node_modules/`, `.git/`, `.env*`, `server/`, `Dockerfile*`, `docker-compose*.yml`, `*.md`, `.docs/`, `.claude/`.

API build context исключает: `node_modules/`, `data/`, `*.log`, `*.md`, `.git/`, `.env*`.

---

## Данные SQLite

| Окружение | Хранение | Путь |
|-----------|---------|------|
| Dev | Bind mount | `./server/data/fingerprints.db` |
| Prod | Named volume | `neprikosnovenna-sqlite:/app/data/fingerprints.db` |

WAL-режим (`journal_mode = WAL`) обеспечивает конкурентное чтение без блокировок.
