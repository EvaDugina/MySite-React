# CursorFingerprintTracker — Архитектура

Двухслойный компонент отрисовки отпечатков курсора поверх картины. Отпечатки общие для всех пользователей (shared DB). Со временем наложение отпечатков визуализирует, куда люди чаще всего кликают.

---

## Структура файлов

```
src/components/cursor/
    CursorFingerprintTracker.jsx          # Основной компонент (WebGL + 2D Canvas)
    CursorFingerprintTracker.css          # Стили контейнера и canvas'ов
    CursorFingerprintTrackerSettings.js   # Конфигурация (константы)
    hooks/
        useFingerprintAPI.js              # Fetch-обёртки для REST API
        useFingerprintAnimation.js        # Таймерная анимация кликов Layer 2
```

---

## Два слоя рендеринга

### Layer 1 — WebGL canvas (статичный, render-once)

Отрисовывает **все отпечатки из БД** одним instanced draw call.

- **Данные:** `GET /api/fingerprints` при монтировании
- **Рендер:** один раз после загрузки данных + текстуры. Повторный рендер только при resize
- **Pipeline:** WebGL2 (fallback на WebGL1 + ANGLE_instanced_arrays)
- **Instancing:** 1 квад (6 вершин, 2 треугольника) + instance buffer с vec2 offsets
- **Текстура:** pointer.png, одна на все instances
- **Blending:** premultiplied alpha (`gl.ONE, gl.ONE_MINUS_SRC_ALPHA`)
- **Fade-in:** CSS transition на opacity canvas элемента (FADE_IN_DURATION)

**Vertex shader:**
```glsl
uniform vec2 u_size;           // отдельный масштаб по X и Y (для прямоугольных контейнеров)
uniform vec2 u_hotspotShift;   // коррекция горячей точки курсора

void main() {
    vec2 position = (a_position + u_hotspotShift) * u_size + a_offset;
    gl_Position = vec4(position, 0.0, 1.0);
}
```

**Fragment shader (premultiplied alpha):**
```glsl
void main() {
    vec4 color = texture(u_texture, v_texCoord);
    float a = color.a * u_alpha;
    fragColor = vec4(color.rgb * a, a);
}
```

**Координаты:**
- Входные: проценты [0..100] относительно контейнера
- Преобразование в NDC: `x_ndc = (x% / 100) * 2 - 1`, `y_ndc = -((y% / 100) * 2 - 1)`

### Layer 2 — 2D Canvas (динамический, анимированный)

Отрисовывает **отпечатки текущей сессии** пользователя.

- **Рендер:** `ctx.drawImage()` при каждом добавлении клика или смене состояния анимации
- **Анимация:** периодическая смена pointer.png ↔ pointer_clicked.png
- **DPR:** canvas масштабируется через `ctx.scale(dpr, dpr)`
- **Alpha:** `ctx.globalAlpha = ALPHA`
- **При перезагрузке:** очищается (данные уже в БД → появятся на Layer 1)

---

## Анимация (Layer 2)

Управляется хуком `useFingerprintAnimation`:

1. `setInterval` с базовой частотой `BASE_INTERVAL` (1000ms)
2. На каждом тике для каждого отпечатка сессии:
   - `SKIP_PROBABILITY` (60%) шанс пропустить
   - Если не пропущен: `setTimeout` с рандомным отклонением (0..`MAX_DEVIATION` 1000ms)
   - Смена состояния на CLICKED → через `CLICK_DURATION` (150ms) обратно на POINTER
3. Отсутствие общего ритма — каждый отпечаток кликает независимо

---

## Hotspot-коррекция

Основной курсор (`Cursor.jsx`) использует `transform: translate(-26.5%, -9%)` для совмещения горячей точки с позицией мыши. Отпечатки используют те же значения:

- **Layer 1 (WebGL):** uniform `u_hotspotShift` сдвигает квад в вершинном шейдере
- **Layer 2 (2D Canvas):** `px = ... - SPRITE_SIZE * HOTSPOT_X`, `py = ... - SPRITE_SIZE * HOTSPOT_Y`

Значения вынесены в Settings: `HOTSPOT_X: 0.265`, `HOTSPOT_Y: 0.09`

---

## Конфигурация (CursorFingerprintTrackerSettings.js)

| Константа | Значение | Описание |
|-----------|----------|----------|
| SPRITE_SIZE | 30 | Размер отпечатка в CSS px |
| ALPHA | 0.05 | Прозрачность каждого отпечатка |
| CANVAS_OPACITY | 1 | Общая прозрачность WebGL canvas (независимо от ALPHA) |
| THROTTLE_MS | 150 | Минимальный интервал между кликами |
| FADE_IN_DURATION | 60000 | Длительность проявления Layer 1 (ms) |
| HOTSPOT_X | 0.265 | Горячая точка курсора по X |
| HOTSPOT_Y | 0.09 | Горячая точка курсора по Y |
| IMAGE_URL | pointer.png | Текстура отпечатка |
| IMAGE_CLICKED_URL | pointer_clicked.png | Текстура при анимации клика |

---

## Императивный API

```js
// Props
{ zIndex: number }

// Ref API (forwardRef + useImperativeHandle)
ref.saveClickPosition({ x, y })    // добавить отпечаток (проценты 0-100)
ref.clearAllFingerprints()          // очистить БД + оба canvas
```

Drop-in замена для EnhancedCursorTracker — тот же контракт ref'а.

---

## Хук useFingerprintAPI

```
loadAll()          → GET  /api/fingerprints         (при монтировании)
addFingerprint()   → POST /api/fingerprints         (debounced batch, 500ms)
clearAll()         → DELETE /api/fingerprints
```

- Batch POST: клики копятся в `pendingRef`, flush через debounce 500ms одной транзакцией
- Console.log после POST: `Fingerprints in DB: added N, total M`
- Flush при размонтировании компонента

---

## Поток данных

```
Клик по Portrait (Neprikosnovenna.jsx)
    │
    ├─ cursorRef.getPosition() → абсолютные px
    ├─ articleRef.getBoundingClientRect() → контейнер
    ├─ Вычисление процентов [0..100]
    │
    ▼
cursorTrackerRef.saveClickPosition({ x%, y% })
    │
    ├─ Throttle (150ms)
    │
    ├─► Layer 2: setSessionClicks([...prev, {x, y}])
    │       └─ redrawSession() → ctx.drawImage()
    │
    └─► API: addFingerprint(x, y)
            └─ pendingRef.push() → debounce 500ms → POST batch
                    └─ SQLite: INSERT INTO fingerprints

При перезагрузке:
    GET /api/fingerprints → dbFingerprints
        └─ Layer 1: WebGL instanced draw (render-once)
```

---

## Производительность

| Метрика | Значение |
|---------|----------|
| Layer 1 draw calls | 1 (instanced) |
| Layer 1 renders | 1 + при resize |
| GPU memory (10k) | ~80KB instance buffer + текстура |
| API read (10k) | ~5ms SQLite + network |
| API write | batch POST, debounced 500ms |
| Анимация | 1 setInterval, только Layer 2 |

### Оценка производительности

#### Rendering (Layer 1 — WebGL)

- **10k отпечатков:** 1 draw call, ~0.5ms GPU time. Instancing = O(1) по draw calls.
- **100k отпечатков:** 1 draw call, ~2-5ms GPU time. Instance buffer ~800KB. Узкое место — `new Float32Array(100k * 2)` на CPU (~1ms).
- **Render-once:** после первой отрисовки GPU idle. Нет requestAnimationFrame цикла. Перерисовка только при resize.
- **DPR:** canvas масштабируется с devicePixelRatio. На 4K (DPR=2) canvas 2x по пикселям, но draw call остаётся 1.
- **Aspect ratio:** `vec2 u_size` корректно масштабирует спрайты на прямоугольных контейнерах без искажений.

#### Rendering (Layer 2 — 2D Canvas)

- **Ожидаемое количество:** десятки-сотни отпечатков за сессию.
- **Полная перерисовка:** `clearRect` + цикл `drawImage` при каждом изменении (новый клик или смена состояния анимации).
- **На 100 отпечатков:** < 1ms на перерисовку.
- **На 1000 отпечатков (edge case):** ~3-5ms. Для сессии в одном окне это маловероятно.

#### Memory

- **Instance buffer:** 8 байт/отпечаток (2 × float32). 10k = 80KB, 100k = 800KB.
- **JS массив dbFingerprints:** ~40 байт/объект ({x, y}). 10k = ~400KB.
- **Текстуры:** 2 изображения (pointer.png, pointer_clicked.png) ~30x30px = < 10KB GPU.
- **Session clicks (Layer 2):** ~50 байт/объект ({x, y, isClicked}). 100 кликов = ~5KB.
- **Суммарно для 10k:** ~600KB (JS + GPU). Для 100k: ~5MB.

#### Network

- **GET /api/fingerprints (10k):** ~200KB JSON, ~50KB gzipped. Один запрос при монтировании.
- **POST batch:** debounce 500ms. При 6 кликах/сек накапливает ~3 клика → ~100 байт JSON. Минимальная нагрузка.
- **Нет WebSocket/polling:** данные загружаются один раз, новые отпечатки других пользователей видны только при перезагрузке.

#### Animation (Layer 2)

- **1 setInterval (1000ms):** на каждом тике итерация по сессионным кликам.
- **60% skip probability:** в среднем 40% отпечатков меняют состояние за тик.
- **setTimeout разброс (0-1000ms):** каждый клик получает свой таймер → десятки setTimeout одновременно.
- **Для 100 отпечатков:** ~40 setTimeout + 40 revert setTimeout = 80 таймеров/тик. Браузер справляется без проблем.
- **Для 500+ отпечатков:** может быть заметен overhead от setState (каждый setClickState создаёт новый массив). Потенциальная оптимизация: batch state updates.

#### SQLite (Server)

- **SELECT ALL (10k):** < 5ms. better-sqlite3 — синхронный, без overhead async.
- **Batch INSERT (100):** < 1ms в транзакции. Prepared statements переиспользуются.
- **WAL mode:** читатели не блокируют писателей. Подходит для 10+ одновременных пользователей.
- **Размер БД (10k записей):** ~200KB файл. Для 1M записей: ~20MB.

#### Узкие места и лимиты

| Порог | Узкое место | Решение |
|-------|-------------|---------|
| 50k+ отпечатков | Float32Array аллокация (~4ms) | Кеширование buffer'а, инкрементальный append |
| 100k+ | JSON.parse ответа API (~10ms) | Бинарный формат (ArrayBuffer) или пагинация |
| 500+ сессионных кликов | setState overhead в анимации | useRef + requestAnimationFrame вместо setState |
| 1M+ в БД | Размер GET ответа (~2MB) | Пагинация или spatial indexing |

---

## Взаимодействие с Neprikosnovenna.jsx

```jsx
// Строка ~148
{isPortraitLoaded && <CursorFingerprintTracker ref={cursorTrackerRef} zIndex={4}/>}

// Строка ~96 (в handleLeftClickDown)
cursorTrackerRef.current.saveClickPosition(cursorPositionPercents)
```

### zIndex стек

| zIndex | Компонент |
|--------|-----------|
| 999 | Cursor (муха) |
| 6 | Button |
| 5 | FlashProvider |
| 4 | CursorFingerprintTracker |
| 2 | ImagePortrait |
| 0 | Background |
