# Technical — Neprikosnovenna

## brunelleschi_stage

- **Стадия:** POC B
- **Последнее обновление:** 2026-05-26

---

## technology

**Стек:**

- **Язык / фреймворк (фронт):** React 19.2 + Vite 7.2, react-router-dom 7.13, SCSS / CSS Modules.
- **Язык / фреймворк (бэк):** Node.js 20, Express 5, ws (WebSocket).
- **СУБД:** SQLite (better-sqlite3), WAL-режим — конкурентное чтение без блокировок.
- **Очередь / брокер:** не используется.
- **AI-провайдер:** не используется.
- **Инфраструктура:** Docker + Docker Compose, Nginx (prod, multi-stage образ на `nginx:1.27-alpine`).

**Переменные окружения (API-контейнер):**

| Переменная | Назначение | Пример |
|---|---|---|
| `NODE_ENV` | Режим Express | `production` |
| `DB_DIR` | Директория SQLite-файла | `/app/data` |
| `PORT` | Порт Express-сервера | `3001` |

**Переменные окружения (фронт, dev):**

| Переменная | Назначение | Пример |
|---|---|---|
| `API_URL` | Куда Vite проксирует `/api` и `/ws` | `http://api:3001` |
| `CHOKIDAR_USEPOLLING` | HMR на Windows-bind-mount | `true` |

**Поведение `DEBUG`:** на стадии POC B для этого проекта `DEBUG`-флаг не введён. Различие dev/prod задаётся выбором compose-файла (`docker-compose.dev.yml` vs `docker-compose.prod.yml`). Это технический долг (см. `## notes`).

---

## architecture

- **Подход:** SPA-фронт + тонкий Express-бэк, общающиеся через REST и WebSocket. Два контейнера в Docker Compose, изолированы во внутренней bridge-сети `neprikosnovenna-net`.
- **Компоненты:** `frontend` (Vite dev-server или nginx со статикой), `api` (Express + SQLite + WS).
- **Потоки данных:**
  - Браузер ↔ `frontend` — HTTP (страницы, ассеты).
  - Браузер → `frontend` → `api` через `/api/*` — REST-запросы.
  - Браузер ↔ `frontend` ↔ `api` через `/ws` — WebSocket realtime-канал.
  - `api` ↔ SQLite-файл — locally на volume.
- **Внешние зависимости:** нет (никаких сторонних API, никаких CDN, шрифты и ассеты — свои).

**Модули фронта (`src/`):**

- `App.jsx`, `index.jsx`, `AppRouter.jsx`, `AppRouter.config.js` — composition root и роутинг (4 lazy-loaded страницы из `src/pages/v0`).
- `components/cursor/` — кастомный курсор с физикой, WebGL-отрисовка отпечатков, realtime публичные курсоры.
- `components/background/`, `components/button/`, `components/portrait/`, `components/flash/` — императивные UI-блоки через `forwardRef` + `useImperativeHandle`.
- `pages/v0/{00_01,01_01,Neprikosnovenna,AndIAmTheOnlyOne}.jsx` — версия `v0` пользовательских сцен; публичные URL задаются в `AppRouter.config.js` и не содержат префикс `/v0`.
- `hooks/useCursorParallax.js` — параллакс DOM-элемента по pointermove / deviceorientation, rAF + lerp, без re-render. Слушает `pointermove`, `pointerleave`, `deviceorientation`, `blur`, `resize`. Опции: `maxOffsetX/Y` (default 12), `direction` (-1/1), `lerpFactor` (default 0.16).
- `hooks/useImageAlphaHitMap.js` — pixel-perfect hit-testing PNG с прозрачностью. Строит `Uint8Array` α-канала при `onLoad` (один `getImageData`), O(1) lookup через `getBoundingClientRect`. Учитывает `object-fit: contain/cover`, `transform` (через bounding rect). Опция `threshold` (default 32). Ограничение: same-origin (cross-origin без CORS — tainted canvas).

**Модули бэка (`server/`):**

- `index.js` — composition root, поднимает Express + WS, graceful shutdown по `SIGINT`/`SIGTERM` (`closeWebSocket()` → `close()` SQLite).
- `db.js` — SQLite-слой для отпечатков.
- `websocket.js` — фасад `setupWebSocket()` / `closeWebSocket()`.
- `realtime/config.js` — лимиты, тайминги, пути WS (`MAX_CURSORS_PER_CLIENT`, `BROADCAST_INTERVAL_MS=66ms`, stale TTL).
- `realtime/runtime.js` — оркестрация transport / broadcast / ping / cleanup.
- `realtime/transport.js` — upgrade-guard, binding ws-событий.
- `realtime/protocol.js` — strict v2 parse / validate / serialize.
- `realtime/registry.js` — состояния `connections` и `sessions`.
- `realtime/presence.js` — применение позиции `(x, y, d, lastSeen, hasPosition)`.
- `realtime/broadcast.js` — snapshot, batch delivery, stale cleanup.
- `realtime/liveness.js` — ping/pong sweep.
- `realtime/logger.js` — debug-логгер.
- `realtime/*.test.js` — unit-тесты на `node:test`.

**Данные и контракты:**

- **Сущность `fingerprint`** — точка прикосновения с координатами `{x, y}` в диапазоне `[0, 100]` (нормализованные проценты от viewport). Хранится в SQLite.

REST API (`/api/fingerprints`):

- `GET /api/fingerprints` — возвращает все отпечатки.
- `POST /api/fingerprints` — принимает `{ fingerprints: [{x, y}, ...] }`, валидирует диапазон `[0, 100]`, batch-insert в транзакции.
- `DELETE /api/fingerprints` — очищает таблицу.

WebSocket API (`/ws`, strict v2+, legacy-форматы невалидны):

Inbound:

- `hello` — `{"t":"hello","cid":"...","sid":"..."}`
- `p` — `{"t":"p","x":12.5,"y":-3.2,"d":"d","i":"pointer"}` (`d` — desktop, `m` — mobile; `i` — `iconKey`, опционально)
- `i` — `{"t":"i","i":"pointer_clicked"}` (только смена иконки без позиции, fast-path broadcast)
- `bye` — `{"t":"bye"}`

Outbound:

- `b` — `{"t":"b","c":[[cid,sid,x,y,d,iconKey], ...]}` (batch курсоров, ~15 Hz, иногда `c:[]` для stale-cleanup)

Whitelist `ALLOWED_ICON_KEYS`, при невалидном значении нормализуется к `DEFAULT_ICON_KEY`.

**Доставка cursor batch:**

- Источники курсоров: только клиенты с `hasPosition=true`.
- Получатели: любой **identified** клиент (после валидного `hello`) с открытым websocket.
- В batched delivery сохраняется ограничение `MAX_CURSORS_PER_CLIENT`.
- Если активных курсоров нет — identified-клиент всё равно получает `c: []` (нужно для корректного stale-удаления на клиенте).
- При inbound-сообщении `i` сервер делает **fast-path broadcast** сразу, не дожидаясь следующего тика `BROADCAST_INTERVAL_MS`, чтобы смена иконки на кликах была заметной.

Lifecycle клиента: `connected → identified (hello) → positioned (p)`. Cleanup причины: `bye`, `stale`, `dead`, `close`, `error`, `shutdown`. Stale TTL: mobile 2s, desktop 5s, old-lineage grace 1.2s. Broadcast loop ~66ms (~15 Hz), ping/pong 30s.

**Graceful shutdown.** В `server/index.js` на `SIGINT` / `SIGTERM` последовательно: `closeWebSocket()` → `close()` SQLite.

---

## project_structure

```
Neprikosnovenna/
  src/                          # фронт
    App.jsx, index.jsx, AppRouter*.{jsx,config.js}
    components/{cursor,background,button,portrait,flash}/
    pages/v0/{00_01,01_01,Neprikosnovenna,AndIAmTheOnlyOne}.jsx
    hooks/{useCursorParallax,useImageAlphaHitMap}.js
  server/                       # бэк
    index.js, db.js, websocket.js
    realtime/{config,runtime,transport,protocol,registry,
              presence,broadcast,liveness,logger}.js
    realtime/*.test.js
    Dockerfile, docker-entrypoint.sh, .dockerignore
  for-docker/nginx.conf         # nginx config (prod)
  Dockerfile.dev.react          # фронт dev-образ
  Dockerfile.prod               # фронт prod multi-stage
  docker-compose.dev.yml
  docker-compose.prod.yml
  .docs/                        # документация
    product.md, technical.md, demo.md, SCENARIO.md
    screenshots/*.webp
  CLAUDE.md                     # инструкции для агента
  README.md
```

---

## documentation

- `.docs/product.md` — продуктовое видение, аудитория, фичи, метрики.
- `.docs/technical.md` — техническое устройство (этот файл).
- `.docs/demo.md` — короткий gist для показа.
- `.docs/SCENARIO.md` — авторский сценарий, поэтическое ядро и титры.
- `README.md` — что это и быстрый старт.
- `CLAUDE.md` (project root) — стандарты разработки и архитектурные принципы для агента.

**Политика комментариев в коде:** комментируем намерения, ограничения и неочевидные решения. Очевидный код не комментируем.

---

## instructions

### Локальный запуск

Через Docker (предпочтительный путь, все команды проверяются только в контейнере):

```bash
docker compose -f docker-compose.dev.yml up --build
```

- Frontend (Vite dev-server с HMR) — `http://localhost:8080`.
- API (Express + SQLite) — внутри контейнера на `3001`, проксируется через Vite (`/api` → `http://api:3001`, `/ws` → `http://api:3001` с `ws: true`).
- Hot reload: bind-mount `./src` и `./public`, `CHOKIDAR_USEPOLLING=true` для Windows.
- SQLite-файл лежит в `./server/data/fingerprints.db` (bind mount).
- Healthcheck API: `wget` на `/api/fingerprints`, фронт ждёт `condition: service_healthy`.

Без Docker (запасной путь):

```bash
# терминал 1
cd server && npm install && npm run dev   # Express + SQLite на :3001
# терминал 2
npm run dev                                # Vite на :5173
```

Build / preview / lint — внутри контейнера:

```bash
docker compose -f docker-compose.dev.yml run --rm frontend npm run build
docker compose -f docker-compose.dev.yml run --rm frontend npm run preview
docker compose -f docker-compose.dev.yml run --rm frontend npm run lint
```

### Развёртывание

Деплой одной командой (`deploy.sh` пока не введён — это технический долг POC B, см. `## notes`):

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Что происходит:

- Сборка фронта multi-stage: `node:20-alpine3.21` → `npm ci` → `npm run build` → `/app/dist/`. Затем `nginx:1.27-alpine`, `COPY dist → /usr/share/nginx/html`, non-root пользователь `leonardo` (uid 1001), `HEALTHCHECK wget http://127.0.0.1:8080/`.
- Сборка API: `node:20-alpine`, Express + SQLite на 3001 (внутренний, наружу не торчит). Non-root `node` (uid 1000) через `su-exec` в entrypoint.
- Сеть `neprikosnovenna-net` (bridge), фронт зависит от API с `condition: service_healthy`.
- Лимиты: frontend 0.5 CPU / 128M RAM, api 0.5 CPU / 256M RAM.

Nginx (`for-docker/nginx.conf`) маршрутизирует:

- `/` → SPA fallback (`try_files $uri $uri/ /index.html`).
- `~* \.(js|css|png|...)$` → статика, cache 1 год, `immutable`.
- `/api` → `proxy_pass http://api:3001` с таймаутами 5/10/10s.
- `/ws` → `proxy_pass http://api:3001` с upgrade-заголовками.

Security headers (на уровне `server {}`, продублированы в `location` статики):

- `Content-Security-Policy`: `default-src 'self'`, `script-src 'self'`, `connect-src 'self'`, `img-src 'self' data: blob:`, `style-src 'self' 'unsafe-inline'`.
- `X-Frame-Options: SAMEORIGIN`.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- `server_tokens off`.

Gzip: уровень 6, минимум 1024 байт. Типы: `text/*`, `application/javascript`, `application/json`, `application/wasm`.

API-контейнер, entrypoint (`server/docker-entrypoint.sh`): запускается от root, `chown -R node:node /app/data`, потом `exec su-exec node "$@"`. Решение проблемы с правами на volume при runtime-монтировании.

Healthcheck API: `wget -qO- http://localhost:3001/api/fingerprints` — `interval: 30s, timeout: 5s, start_period: 10s, retries: 3`.

### Тестирование

- **Unit-тесты бэка:** `server/realtime/*.test.js` на `node:test`. Запуск внутри `api`-контейнера:
  ```bash
  node --test /app/realtime/protocol.test.js \
    /app/realtime/registry.test.js \
    /app/realtime/broadcast.test.js \
    /app/realtime/liveness.test.js
  ```
- **Smoke-тесты:** ещё не введены (`tests/smoke/`). Это технический долг POC B.
- **Ручная проверка:** см. `## notes` → `### Manual verification scenarios`.

### Очистка БД отпечатков

```bash
curl -X DELETE http://localhost:3001/api/fingerprints
```

В проде эндпоинт доступен только через nginx-прокси.

---

## quality

### Чеклисты

- **Автоматические:** unit-тесты `server/realtime/*.test.js` (`node:test`).
- **Ручные:** см. `## notes` → `### Manual verification scenarios`.

### Наблюдаемость и логирование

- **Куда пишем:** stdout контейнеров (`docker compose logs`).
- **Формат:** plain text. `realtime/logger.js` — debug-логгер для WS-слоя.
- **Ротация:** через Docker logging driver хоста (`json-file` с `max-size`/`max-file`, конкретные значения задаются на хосте, не в репо).
- **Healthcheck:** на обоих контейнерах (см. `## instructions` → развёртывание).
- **Алерты:** нет (POC B).

### Безопасность

- Никаких секретов — у проекта нет токенов, API-ключей, паролей. `.env` не используется.
- Non-root пользователи во всех контейнерах (`leonardo` uid 1001 для фронта, `node` uid 1000 для API).
- API-порт 3001 не экспонирован наружу — только через nginx.
- WS-протокол strict v2+ с валидацией на whitelist для `iconKey`.
- REST-валидация диапазона координат `[0, 100]`.
- `.dockerignore` исключает: `node_modules/`, `.git/`, `.env*`, `server/` (для фронт-контекста), `Dockerfile*`, `docker-compose*.yml`, `*.md`, `.docs/`, `.claude/`. Для API: `node_modules/`, `data/`, `*.log`, `*.md`, `.git/`, `.env*`.

---

## rules

### Stage constraints

**На текущей стадии (POC B) делаем:**

- Docker compose для dev и prod.
- Nginx с SPA fallback, проксированием `/api` и `/ws`, security headers, gzip, immutable cache.
- Non-root пользователи в контейнерах.
- Healthchecks на обоих контейнерах.
- Unit-тесты для realtime-слоя WS.
- Документацию: `product.md` / `technical.md` / `demo.md` / `SCENARIO.md`.

**Intentionally deferred (что НЕ делаем до следующей стадии):**

- `deploy.sh` — пока deploy — это одна команда `docker compose ... up -d`.
- `.env` + `.env.example` + флаг `DEBUG=true/false` — введём, когда появятся секреты или различия dev/prod помимо compose.
- Smoke-тесты в `tests/smoke/`.
- Бэкапы SQLite (named volume `neprikosnovenna-sqlite` остаётся как есть; восстановление не отрабатывалось).
- Миграции БД, переход на PostgreSQL.
- Мониторинг, Sentry, Grafana, метрики.
- MFA, аудит, продуктовая аналитика, нагрузочные / E2E-тесты.
- HTTPS — это инфраструктура хоста, в репо не живёт.

---

## accept

- Обе compose-конфигурации (`dev` и `prod`) поднимаются с нуля одной командой и доходят до `service_healthy`.
- На прод-стенде по адресу [82.202.138.61/neprikosnovenna](http://82.202.138.61/neprikosnovenna) триптих проходится с десктопа без визуальных артефактов.
- REST `/api/fingerprints` принимает POST с батчем и отдаёт GET со всеми точками.
- WS `/ws` отдаёт `iconKey`-синхронизированные курсоры других зрителей в реальном времени.
- Unit-тесты `server/realtime/*.test.js` зелёные.

---

## notes

### Active plans

- **Реализовано:** четыре страницы триптиха в `src/pages/v0`, кастомный курсор с физикой и зонами, WebGL-карта отпечатков + 2D-слой сессии, realtime WS публичные курсоры с fast-path icon update, императивные API всех ключевых компонентов, prod-сборка под Nginx, dev-сборка с HMR.
- **Временно сломано / отложено:** см. Intentionally deferred выше + раздел «Технический долг».

### Manual verification scenarios

- **Триптих на десктопе.** `/` → нажать «плюнуть» и «поцеловать» → через 2 секунды переход на `/neprikosnovenna` → кликнуть по портрету несколько раз → перейти на `/neprikosnovenna/and-i-am-the-only-one-who-knows-that-you-look-better-with-blood` → дождаться видео-трансформации.
- **Карта отпечатков.** Открыть страницу, увидеть подгруженные точки из БД (WebGL-слой), кликнуть — точка появляется поверх (2D-слой), перезагрузить — точка теперь в WebGL-слое.
- **Realtime курсоры.** Открыть страницу в двух окнах → курсор из одного видно в другом, иконка меняется при клике на `BtnNeprikosnovenna`.
- **Адаптивность.** Resize окна на странице 00_01 — кнопки остаются «привязаны» к лицу портрета (scaleX-разметка).
- **Drag&drop кнопки.** На `/01_01` после клика по окну глаз кнопка «неприкосновенна» через секунду переходит в drag, остаётся в `dropped` после отпускания, поднимается обратно по клику.

### Технические решения

- **Императивная оркестрация.** Ключевые компоненты (`Background`, `Button`, `Cursor`, `PortraitProvider`, `FlashProvider`, `CursorFingerprintTracker`) экспонируют API через `forwardRef` + `useImperativeHandle`. Страницы дирижируют сложными сценариями, не пробрасывая state-машины через пропсы. Последствие: page-компоненты императивны и читаются как сценарий, а не как декларативный JSX.
- **Two-layer fingerprint render.** Подгруженные из БД точки — в WebGL instanced (быстро для тысяч точек), точки текущей сессии — в 2D canvas (мгновенный отклик). При reload сессионные точки попадают в WebGL.
- **WS strict v2+ без legacy.** Заранее отказались от обратной совместимости — проект не имеет старых клиентов в природе. Последствие: парсер проще, отладка дешевле.
- **Su-exec в API-entrypoint.** `USER node` в Dockerfile не помогает, когда volume монтируется в runtime — файлы наследуют права хоста. Поэтому entrypoint от root делает `chown` и переключается через `su-exec`.

### Технический долг

- Нет `deploy.sh` — деплой описан текстом и однострочной командой.
- Нет `.env` + `.env.example` + флага `DEBUG` — различие dev/prod только через выбор compose-файла.
- Нет smoke-тестов в `tests/smoke/`.
- Нет бэкапов SQLite-volume.
- Нет ротации логов на уровне приложения (полагаемся на Docker logging driver хоста).

### Журнал изменений

- **2026-05-18:** документация консолидирована в `product.md` / `technical.md` / `demo.md` (Vibe++). Удалены `architecture.md`, `ci-cd.md`, `infrastructure.md`, `hooks/*.md`, `server/server-architecture.md`. Содержимое перенесено в соответствующие секции `technical.md`.
- **2026-05-26:** страницы перенесены из `src/pages` в `src/pages/v0`; `AppRouter.config.js` импортирует страницы из `v0`, публичные маршруты остались прежними. Удалены активные `.docs/pages/*` для перенесённых page-specific справочников.

---

## frontend

- **Стек:** React 19.2, Vite 7.2, react-router-dom 7.13, SCSS / CSS Modules.
- **Безопасность:** никаких секретов в клиентском коде. Запросов к сторонним API нет — всё через свой бэкенд.
- **Состояния:** loading (Suspense на lazy-loaded страницах), error (фолбэк страницы), empty (карта отпечатков пустая — рендерится пустой WebGL-слой), success (основное состояние).
- **Адаптивность:** desktop-first, проверена на разрешениях от 1280px. Touch-жесты не поддерживаются.
- **Code style:** 4-space indent, без точек с запятой, camelCase / PascalCase / UPPER_CASE / kebab-case, BEM + CSS Modules, strict equality, line length 80-100. Подробнее — в `CLAUDE.md`.
