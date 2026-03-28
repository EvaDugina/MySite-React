# Архитектура backend-сервера

## Назначение

`server/` обслуживает две подсистемы:

1. REST API для хранения отпечатков курсора в SQLite.
2. WebSocket realtime-канал `/ws` для публичных курсоров других пользователей.

## Структура `server/`

```text
server/
  index.js                  # composition root Express + WS bootstrap
  db.js                     # SQLite слой (fingerprints)
  websocket.js              # тонкий facade: setupWebSocket/closeWebSocket
  realtime/
    config.js               # лимиты/тайминги/пути WS
    runtime.js              # orchestration: transport, broadcast, ping, cleanup
    transport.js            # upgrade guard + binding ws events
    protocol.js             # strict v2 parse/validate/serialize
    registry.js             # состояние connections/sessions
    presence.js             # применение позиции (x,y,d,lastSeen,hasPosition)
    broadcast.js            # snapshot + batch delivery + stale cleanup
    liveness.js             # ping/pong sweep
    logger.js               # debug logger
    *.test.js               # unit tests на node:test
```

## Технологии

- Express 5
- better-sqlite3
- ws
- Node.js 20
- Docker (dev/prod)

## HTTP API (`/api/fingerprints`)

### `GET /api/fingerprints`
- Возвращает все отпечатки.

### `POST /api/fingerprints`
- Принимает `{ fingerprints: [{x, y}, ...] }`.
- Валидация: `x` и `y` в диапазоне `[0, 100]`.
- Batch insert внутри транзакции.

### `DELETE /api/fingerprints`
- Удаляет все отпечатки.

## WebSocket API (`/ws`)

### Протокол (strict v2)

Inbound:

- `hello`: `{"t":"hello","cid":"...","sid":"..."}`
- `p`: `{"t":"p","x":12.5,"y":-3.2,"d":"d"}` (`d` или `m`)
- `bye`: `{"t":"bye"}`

Outbound:

- `b`: `{"t":"b","c":[[cid,sid,x,y,d], ...]}`

Legacy-форматы (например 4-элементные cursor entry) сервером считаются невалидными.

### Доставка cursor batch

- Источники курсоров: только клиенты с `hasPosition=true`.
- Получатели: любой **identified** клиент (после валидного `hello`) с открытым websocket.
- В batched delivery сохраняется ограничение `MAX_CURSORS_PER_CLIENT`.
- Если активных курсоров нет, identified-клиент получает `c: []` (нужно для корректного stale-удаления на клиенте).

### Lifecycle и очистка

- Состояние клиента: `connection opened -> identified(hello) -> positioned(p)`.
- Cleanup path единый для причин: `bye`, `stale`, `dead`, `close`, `error`, `shutdown`.
- Stale TTL:
  - mobile: 2s
  - desktop: 5s
  - old-lineage grace: 1.2s
- Broadcast loop: ~15Hz (`66ms`).
- Ping/pong loop: `30s`.

## Интеграция с frontend

Dev (`vite.config.js`):

- proxy `/api` -> backend
- proxy `/ws` -> backend (`ws: true`)

Prod (`for-docker/nginx.conf`):

- proxy `/api` -> `api:3001`
- proxy `/ws` -> `api:3001` (upgrade headers)

## Graceful shutdown

В `index.js` на `SIGINT/SIGTERM` вызываются:

1. `closeWebSocket()`
2. `close()` (закрытие SQLite)

## Проверка

Внутри контейнера `api`:

```bash
node --test /app/realtime/protocol.test.js \
  /app/realtime/registry.test.js \
  /app/realtime/broadcast.test.js \
  /app/realtime/liveness.test.js
```

