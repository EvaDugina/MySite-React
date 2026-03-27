# CursorPublicTracker — курсоры других пользователей в реальном времени

## Контекст

Нужен компонент, показывающий курсоры других онлайн-пользователей поверх страницы `/neprikosnovenna`. Цель — создать ощущение живого присутствия на арт-инсталляции. До 8 чужих курсоров, мобильные отправляют позицию при касании (TTL 2 сек), десктопные — непрерывно.

## Решения

- **Транспорт:** `ws` (сервер) + нативный WebSocket API (клиент)
- **Координаты:** % от центра `article` — работает на разных экранах
- **Рендер:** DOM `<img>` с `transform: translate3d()` + lerp-интерполяция в rAF
- **Визуал:** тот же POINTER с пониженной opacity (0.4)

---

## Wire Protocol

**Client → Server** (позиция):
```json
{"t":"p","x":12.5,"y":-3.2,"d":"d"}
```
- `t`: тип (`"p"` = position)
- `x`, `y`: float, % от центра article (может быть отрицательным)
- `d`: устройство (`"d"` = desktop, `"m"` = mobile)

**Server → Client** (батч):
```json
{"t":"b","c":[["a1b2c3d4",14.2,-5.1,"d"],["e5f6g7h8",0.0,22.7,"m"]]}
```
- `c`: массив `[id8, x, y, device]`
- Курсор, отсутствующий в N последних батчах — исчезает (fade-out)

---

## Новые файлы

### 1. `server/websocket.js`

Экспорт: `setupWebSocket(httpServer)`, `closeWebSocket()`

```
setupWebSocket(httpServer):
  - new WebSocketServer({ noServer: true, maxPayload: 256 })
  - httpServer.on('upgrade') → проверка url === '/ws'
    → если clients.size >= MAX_CONNECTIONS (100) → socket.destroy(), return
    → иначе handleUpgrade
  - clients = new Map<uuid, { id, x, y, device, lastSeen, ws, isAlive, msgCount, msgWindowStart }>

  on connection:
    - id = crypto.randomUUID() (полный UUID на сервере, id.slice(0,8) в батче)
    - clients.set(id, ...)

  on message:
    - проверить message.length < 128 до JSON.parse
    - rate limit: max 30 msg/sec на клиента (скользящее окно 1 сек)
    - JSON.parse → валидация:
      - t === "p"
      - typeof x === "number" && Number.isFinite(x) && x >= -200 && x <= 200
      - typeof y === "number" && Number.isFinite(y) && y >= -200 && y <= 200
      - d === "d" || d === "m"
    - обновить clients.get(id)

  on close/error:
    - clients.delete(id)

  on pong:
    - client.isAlive = true

  ping/pong (setInterval 30s):
    - для каждого клиента: если !isAlive → ws.terminate()
    - иначе isAlive = false, ws.ping()

  broadcast (setInterval 66ms ≈ 15Hz):
    - запускать интервал при первом подключении, останавливать при последнем отключении
    - удалить stale: mobile > 2s, desktop > 5s
    - каждому клиенту отправить до 8 ДРУГИХ курсоров (самые свежие по lastSeen)

  cleanup:
    - экспорт closeWebSocket() для graceful shutdown
```

**UUID:** `crypto.randomUUID()` (Node 20, без зависимостей).

### 2. `src/components/cursor/CursorPublicTrackerSettings.js`

```javascript
import { CursorImages } from "./CursorSettings.js"

export const PublicCursorConfig = {
    MAX_CURSORS: 8,
    THROTTLE_MS: 50,
    LERP_FACTOR: 0.15,
    OPACITY: 0.4,
    FADE_IN_DURATION: 300,
    FADE_OUT_DURATION: 500,
    CURSOR_SIZE_REM: 1.9,
    HOTSPOT_X: 0.265,
    HOTSPOT_Y: 0.09,
    IMAGE_URL: CursorImages.POINTER,
    RECONNECT_BASE_MS: 1000,
    RECONNECT_MAX_MS: 30000,
    RECONNECT_MULTIPLIER: 1.5,
    STALE_BATCH_COUNT: 3,
    WS_PATH: '/ws',
    Z_INDEX: 998,
}
```

### 3. `src/components/cursor/hooks/usePublicCursors.js`

```
usePublicCursors():
  Состояние (refs, не state — без ре-рендеров на каждый батч):
    - wsRef, cursorsRef (Map<id, {targetX, targetY, displayX, displayY, device}>)
    - reconnectDelayRef, lastSendTimeRef, mountedRef, connectedAtRef

  connect():
    - если !mountedRef.current → return (guard от reconnect после unmount)
    - URL: ws(s)://${location.host}/ws
    - onopen: connectedAtRef = Date.now(), сброс reconnect delay
    - onmessage: парсинг батча → обновление cursorsRef → вызов onUpdate callback
      (onUpdate триггерит setState только при изменении набора cursor IDs)
    - onerror: () => {} (no-op, onclose всегда следует за onerror)
    - onclose(event):
      - если event.code === 1000 (нормальное закрытие) → не переподключаться
      - если !mountedRef.current → return
      - сбрасывать backoff только если соединение жило > 5 сек
      - exponential backoff reconnect

  sendPosition(x, y, device):
    - throttle 50ms
    - ws.send JSON

  Tab visibility:
    - document.hidden → не отправляем позицию (сервер удалит по TTL)
    - при возврате из hidden → немедленно отправить текущую позицию

  Cleanup:
    - mountedRef.current = false
    - ws.close(), clearTimeout reconnect

  return { cursorsRef, sendPosition, setOnUpdate }
```

### 4. `src/components/cursor/CursorPublicTracker.jsx`

```
Props: { articleRef, cursorRef }

  // Определение устройства по типу взаимодействия, а не по capabilities
  lastPointerTypeRef = useRef('mouse')
  // Слушать pointermove/pointerdown → lastPointerTypeRef = event.pointerType

  usePublicCursors() → { cursorsRef, sendPosition, setOnUpdate }

  [visibleIds, setVisibleIds] = useState([])   // активные курсоры
  [fadingOutIds, setFadingOutIds] = useState([]) // курсоры в процессе исчезновения
  cursorElementsRef = Map<id, DOM element>
  articleRectRef = useRef(null)  // кэшированный rect, обновляется по resize

  // Кэширование articleRef.getBoundingClientRect()
  useEffect: ResizeObserver на articleRef → обновить articleRectRef.current

  onUpdate callback:
    - сравнить текущие IDs с новыми
    - новые IDs → добавить в visibleIds
    - исчезнувшие IDs → переместить из visibleIds в fadingOutIds,
      установить opacity 0, setTimeout(FADE_OUT_DURATION) → удалить из fadingOutIds

  rAF loop (animate) — ТОЛЬКО рендер чужих курсоров:
    1. if (!articleRectRef.current) return (null guard)
    2. rect = articleRectRef.current, centerX/centerY из rect
    3. Для каждого курсора (visibleIds + fadingOutIds):
       - lerp: displayX += (targetX - displayX) * LERP_FACTOR
       - screenX = centerX + (displayX / 100) * rect.width
       - el.style.transform = translate(-26.5%, -9%) translate3d(screenX, screenY, 0)

  // Отправка своей позиции — ОТДЕЛЬНЫЙ setInterval(THROTTLE_MS):
  useEffect: setInterval(50ms):
    - if (document.hidden || !articleRectRef.current) return
    - pos = cursorRef.current.getPosition()
    - rect = articleRectRef.current
    - centerX = rect.left + rect.width / 2
    - centerY = rect.top + rect.height / 2
    - x = ((pos.x - centerX) / rect.width) * 100
    - y = ((pos.y - centerY) / rect.height) * 100
    - device = lastPointerTypeRef.current === 'touch' ? 'm' : 'd'
    - sendPosition(x, y, device)

  Fade in:
    - Новый курсор: opacity 0 → OPACITY (CSS transition 300ms)

  JSX:
    <div style={{ position: fixed, inset: 0, pointerEvents: none, zIndex: 998 }}>
      {[...visibleIds, ...fadingOutIds].map(id =>
        <img key={id} ref={el => { if (el) cursorElementsRef.current.set(id, el); else cursorElementsRef.current.delete(id) }}
             src={POINTER} className={styles.publicCursor} />
      )}
    </div>
```

### 5. `src/components/cursor/CursorPublicTracker.module.css`

```css
.publicCursor {
    position: fixed;
    width: 1.9rem;
    height: 1.9rem;
    pointer-events: none;
    user-select: none;
    will-change: transform, opacity;
}
```

---

## Изменения в существующих файлах

### `server/index.js`

```diff
+ import { setupWebSocket, closeWebSocket } from './websocket.js'

- app.listen(PORT, () => {
+ const server = app.listen(PORT, () => {
      console.log(`Fingerprints API running on port ${PORT}`)
  })
+ setupWebSocket(server)

  process.on('SIGINT', () => {
+     closeWebSocket()
      close()
      process.exit(0)
  })
  // аналогично SIGTERM
```

### `server/package.json`

```diff
  "dependencies": {
+     "ws": "^8.18.0",
      ...
  }
```

### `src/pages/Neprikosnovenna.jsx`

```diff
+ import CursorPublicTracker from "../components/cursor/CursorPublicTracker.jsx"

  return (
    <>
      <Cursor ref={cursorRef} ... />
+     <CursorPublicTracker articleRef={articleRef} cursorRef={cursorRef} />
      <main>...</main>
      <Background ... />
    </>
  )
```

### `vite.config.js`

```diff
  proxy: {
      '/api': { ... },
+     '/ws': {
+         target: process.env.API_URL || 'http://localhost:3001',
+         changeOrigin: true,
+         ws: true,
+     },
  },
```

### `for-docker/nginx.conf`

Добавить location `/ws` перед SPA catch-all:
```nginx
location /ws {
    proxy_pass http://api:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
}
```

CSP: изменений **не требуется** — `connect-src 'self'` уже разрешает ws:// и wss:// к тому же origin.

---

## Порядок реализации

1. `server/package.json` — добавить `ws`
2. `server/websocket.js` — WebSocket сервер
3. `server/index.js` — подключение WebSocket
4. `src/components/cursor/CursorPublicTrackerSettings.js` — настройки
5. `src/components/cursor/hooks/usePublicCursors.js` — клиентский хук
6. `src/components/cursor/CursorPublicTracker.module.css` — стили
7. `src/components/cursor/CursorPublicTracker.jsx` — компонент
8. `src/pages/Neprikosnovenna.jsx` — интеграция
9. `vite.config.js` — WS прокси
10. `for-docker/nginx.conf` — WS location (без изменения CSP)

---

## Верификация

1. `docker compose -f docker-compose.dev.yml up --build`
2. Открыть страницу в двух вкладках/браузерах
3. Двигать курсор в одной вкладке — в другой появляется чужой курсор (полупрозрачный POINTER)
4. Закрыть одну вкладку — курсор плавно исчезает (fade-out)
5. Проверить мобильный: DevTools → toggle device toolbar → коснуться экрана → в десктопной вкладке появляется курсор, исчезает через 2 сек
6. Проверить reconnect: остановить/запустить api контейнер → WebSocket автоматически переподключается
7. Проверить prod: `docker compose -f docker-compose.prod.yml up --build` → WebSocket работает через nginx
8. Проверить CSP не изменён: WebSocket работает с `connect-src 'self'`
9. DevTools → Performance → убедиться что нет layout thrashing в rAF
