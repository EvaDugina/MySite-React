# CursorPublicTracker — реализация публичных курсоров в realtime

## Цель

Показывать до `MAX_CURSORS` чужих курсоров поверх страницы `/neprikosnovenna`
с плавной интерполяцией и fade-эффектами.

Ключевое поведение:

- новые пользователи после `hello` получают чужие курсоры даже до отправки
  своего первого `p`;
- собственный курсор пользователя в публичный список не попадает;
- мобильные/десктопные курсоры удаляются по разным TTL на сервере.

## Транспорт и протокол

### WebSocket endpoint

- путь: `/ws`
- dev: proxy через `vite.config.js`
- prod: proxy через `for-docker/nginx.conf`

### Wire protocol (strict v2)

Client -> Server:

```json
{"t":"hello","cid":"pc_xxx","sid":"ps_xxx"}
{"t":"p","x":12.5,"y":-3.2,"d":"d"}
{"t":"bye"}
```

Server -> Client:

```json
{"t":"b","c":[["pc_a","ps_a",14.2,-5.1,"d"],["pc_b","ps_b",0.0,22.7,"m"]]}
```

Где `c` — массив `[cid, sid, x, y, d]`.

## Серверная архитектура

Публичный API backend остаётся прежним:

- `setupWebSocket(httpServer)`
- `closeWebSocket()`

Реализация декомпозирована в `server/realtime`:

- `runtime.js` — orchestration lifecycle;
- `transport.js` — upgrade guard + ws events;
- `protocol.js` — parse/validate/serialize;
- `registry.js` — connections/sessions state;
- `presence.js` — применение `p`;
- `broadcast.js` — batch delivery и stale cleanup;
- `liveness.js` — ping/pong;
- `config.js`, `logger.js`.

### Broadcast правила

Источники курсоров:

- только identified-клиенты с `hasPosition=true`.

Получатели batch:

- любой identified-клиент с `readyState === OPEN` (даже без собственной
  позиции).

Это позволяет показать уже активные чужие курсоры сразу после `hello`,
не дожидаясь локальной инициализации курсора.

## Клиентская архитектура

Клиентская часть декомпозирована по тому же принципу, что backend:
`orchestrator + transport/store/render`.

### `CursorPublicTracker.jsx` (тонкий orchestrator)

- собирает и связывает хуки `publicTracker/*`;
- рендерит overlay и `<img>`-курсор;
- сохраняет публичный API компонента (те же props, тот же контракт интеграции в
  `Neprikosnovenna.jsx`).

### `hooks/publicTracker/*` (UI-runtime)

- `usePublicTrackerViewport.js` — актуальный `articleRect`, `ResizeObserver`,
  вычисление payload (`x`, `y`, `device`) для отправки.
- `usePublicTrackerSendLoop.js` — периодическая отправка `p` (интервал + реакция
  на `visibilitychange` + проверка `getIsCursorReady`).
- `usePublicTrackerInstances.js` — выбор активных инстансов, лимит по `cid`,
  lifecycle `active -> fading -> remove`.
- `usePublicTrackerDomRenderer.js` — `requestAnimationFrame`-LERP,
  `translate3d`-позиционирование, fade-in/fade-out на DOM-элементах.

### `usePublicCursors.js` + `hooks/publicCursors/*` (transport/runtime)

- `usePublicCursors.js` — orchestrator c сохранением прежнего return API:
  `clientId`, `sessionId`, `cursorsRef`, `sendPosition`, `setOnUpdate`,
  `setOnOpen`.
- `publicCursorIdentity.js` — генерация/переиспользование `clientId`,
  `sessionId`, boot lineage.
- `publicCursorProtocol.js` — `hello/p/bye` serialize и парсинг `b`-батчей
  (включая fallback для legacy entry).
- `usePublicCursorsStore.js` — `cursorsRef`, stale cleanup по batch-счётчику,
  `clearTransientState`.
- `usePublicCursorsConnection.js` — WebSocket lifecycle, reconnect/backoff,
  hidden/resume поведение.

## Константы и Settings

Для `CursorPublicTracker` применяется правило:

- **single-use константы** хранятся рядом с местом применения (конкретный
  компонент/хук);
- в `CursorPublicTrackerSettings.js` остаются только **shared-константы**,
  используемые более чем в одном месте.

Текущее состояние:

- `CursorPublicTrackerSettings.js` содержит только `FADE_OUT_DURATION`
  (shared между `usePublicTrackerInstances` и `usePublicTrackerDomRenderer`);
- остальные значения (`SEND_INTERVAL_MS`, `LERP_FACTOR`, `MAX_CURSORS`,
  `WS_PATH`, reconnect-параметры и т.д.) локализованы по хукам.

## Актуальные параметры (по умолчанию)

- broadcast interval (server): `66ms` (~15Hz)
- send interval client -> server: `50ms`
- stale ttl mobile (server): `2s`
- stale ttl desktop (server): `5s`
- max cursors per client: `8`

## Проверка

1. Запустить `docker compose -f docker-compose.dev.yml up --build`.
2. Открыть страницу в двух вкладках.
3. Во вкладке A дождаться инициализации локального курсора и подвигать мышь.
4. Во вкладке B проверить, что чужой курсор появляется после `hello`, даже если
   локальный курсор B ещё не готов.
5. Закрыть вкладку A и убедиться, что курсор плавно исчезает.
6. Запустить backend unit tests:

```bash
node --test /app/realtime/protocol.test.js \
  /app/realtime/registry.test.js \
  /app/realtime/broadcast.test.js \
  /app/realtime/liveness.test.js
```
