# CursorPublicTracker — реализация публичных курсоров в realtime

## Цель

Показывать до `MAX_CURSORS` чужих курсоров поверх страницы `/neprikosnovenna` с плавной интерполяцией и fade-эффектами.

Ключевое поведение:

- новые пользователи после `hello` получают чужие курсоры даже до отправки своего первого `p`;
- собственный курсор пользователя в публичный список не попадает;
- мобильные/десктопные курсоры удаляются по разным TTL.

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

Но реализация декомпозирована в `server/realtime`:

- `runtime.js` — orchestration lifecycle
- `transport.js` — upgrade guard + ws events
- `protocol.js` — parse/validate/serialize
- `registry.js` — connections/sessions state
- `presence.js` — применение `p`
- `broadcast.js` — batch delivery и stale cleanup
- `liveness.js` — ping/pong
- `config.js`, `logger.js`

### Broadcast правила

Источники курсоров:

- только identified-клиенты с `hasPosition=true`.

Получатели batch:

- любой identified-клиент с `readyState === OPEN` (даже без собственной позиции).

Это позволяет показать уже активные чужие курсоры сразу после `hello`, не дожидаясь локальной инициализации курсора.

## Клиентская часть

### `usePublicCursors.js`

- открывает WS-соединение на `/ws`;
- отправляет `hello` на `onopen`;
- принимает `b`-батчи и обновляет `cursorsRef`;
- отправка позиции (`p`) выполняется только отдельно через `sendPosition(...)`;
- при скрытии вкладки отправляет `bye`, закрывает сокет и чистит transient state;
- на reconnect использует exponential backoff.

Примечание:

- в парсинге client-side сохраняется fallback для legacy entry (`entry.length < 5`);
- сервер работает в strict v2, поэтому legacy-формат сейчас не ожидается, fallback оставлен только ради совместимости клиента.

### `CursorPublicTracker.jsx`

- рендерит курсоры в overlay (`position: fixed; inset: 0`);
- интерполирует позиции через LERP в `requestAnimationFrame`;
- делает fade-in/fade-out на уровне DOM-элементов;
- отправляет локальную позицию по интервалу (`SEND_INTERVAL_MS`, сейчас 50ms);
- если локальный курсор ещё не готов (`getIsCursorReady() === false`), отправка `p` откладывается, но приём чужих batch продолжается.

## Актуальные параметры

См. `CursorPublicTrackerSettings.js` и `server/realtime/config.js`.

Важные значения по умолчанию:

- broadcast interval: 66ms (~15Hz)
- send interval client->server: 50ms
- stale ttl mobile: 2s
- stale ttl desktop: 5s
- max cursors per client: 8

## Проверка

1. Запустить `docker compose -f docker-compose.dev.yml up --build`.
2. Открыть страницу в двух вкладках.
3. Во вкладке A дождаться инициализации локального курсора и подвигать мышь.
4. Во вкладке B проверить, что чужой курсор появляется после `hello`, даже если локальный курсор B ещё не готов.
5. Закрыть вкладку A и убедиться, что курсор плавно исчезает.
6. Запустить backend unit tests:

```bash
node --test /app/realtime/protocol.test.js \
  /app/realtime/registry.test.js \
  /app/realtime/broadcast.test.js \
  /app/realtime/liveness.test.js
```

