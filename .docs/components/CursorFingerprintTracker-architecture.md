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
        useFingerprintAnimation.js        # Анимация кликов Layer 2 (периодический flicker)
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

### Layer 2 — 2D Canvas (динамический, с анимацией кликов)

Отрисовывает **отпечатки текущей сессии** пользователя с анимацией.

- **Рендер:** полный `redrawSession()` при каждом изменении `sessionClicks` (useState)
- **Анимация:** `useFingerprintAnimation` — периодическая смена спрайта на POINTER_CLICKED (150ms), затем возврат
- **Данные:** `useState` для `sessionClicks` (с `isClicked` флагом), синхронизация в ref
- **DPR:** canvas масштабируется через `ctx.scale(dpr, dpr)`
- **Alpha:** `ctx.globalAlpha = ALPHA`
- **При перезагрузке:** очищается (данные уже в БД → появятся на Layer 1)

---

## Hotspot-коррекция

Основной курсор (`Cursor.jsx`) использует `transform: translate(-26.5%, -9%)` для совмещения горячей точки с позицией мыши. Отпечатки используют те же значения:

- **Layer 1 (WebGL):** uniform `u_hotspotShift` сдвигает квад в вершинном шейдере
- **Layer 2 (2D Canvas):** `px = ... - spriteSize * HOTSPOT_X`, `py = ... - spriteSize * HOTSPOT_Y` (где `spriteSize = spriteSizePxRef.current`)

Значения вынесены в Settings: `HOTSPOT_X: 0.265`, `HOTSPOT_Y: 0.09`

---

## Конфигурация (CursorFingerprintTrackerSettings.js)

| Константа | Значение | Описание |
|-----------|----------|----------|
| SPRITE_REM | 1.9 | Размер отпечатка в rem (совпадает с CSS-размером курсора, пересчитывается в px динамически) |
| ALPHA | 0.05 | Прозрачность каждого отпечатка |
| CANVAS_OPACITY | 1 | Общая прозрачность WebGL canvas (независимо от ALPHA) |
| THROTTLE_MS | 150 | Минимальный интервал между кликами |
| FADE_IN_DURATION | 60000 | Длительность проявления Layer 1 (ms) |
| HOTSPOT_X | 0.265 | Горячая точка курсора по X |
| HOTSPOT_Y | 0.09 | Горячая точка курсора по Y |
| IMAGE_URL | pointer.png | Текстура отпечатка |

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
| Добавление клика | setState + полный redraw Layer 2 |
| Размер спрайта | динамический (1.9rem → px через getComputedStyle) |

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
- **Текстуры:** 2 изображения (pointer.png, pointer_clicked.png), размер динамический (1.9rem) = < 10KB GPU.
- **Session clicks (Layer 2):** ~50 байт/объект ({x, y, isClicked}). 100 кликов = ~5KB.
- **Суммарно для 10k:** ~600KB (JS + GPU). Для 100k: ~5MB.

#### Network

- **GET /api/fingerprints (10k):** ~200KB JSON, ~50KB gzipped. Один запрос при монтировании.
- **POST batch:** debounce 500ms. При 6 кликах/сек накапливает ~3 клика → ~100 байт JSON. Минимальная нагрузка.
- **Нет WebSocket/polling:** данные загружаются один раз, новые отпечатки других пользователей видны только при перезагрузке.

#### Layer 2 — добавление клика и анимация

- **Полный redraw** при каждом изменении `sessionClicks` (useState) — включая анимацию (смена `isClicked`).
- **Анимация:** `useFingerprintAnimation` — каждый тик (~800ms) итерирует все отпечатки, с 30% вероятностью пропуска и случайным отклонением 0-800ms.
- **Стоимость redraw:** на 100 отпечатков < 1ms, на 1000 — ~3-5ms.
- **Размер спрайта:** динамический, `SPRITE_REM × root font-size`, пересчитывается при resize.

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
| 1500+ сессионных кликов при resize | redrawSession ~5-15ms | Допустимо, resize — редкая операция |
| 1M+ в БД | Размер GET ответа (~2MB) | Пагинация или spatial indexing |

---

## Потенциальные проблемы на мобильных устройствах (iPhone)

### Canvas memory при DPR=3

iPhone X/12/14 используют DPR=3. Два canvas элемента (Layer 1 WebGL + Layer 2 2D) при размере контейнера ~375x500 CSS px создают физические размеры 1125x1500px. Каждый canvas framebuffer = ~6.4 MB. **Два canvas = ~12.8 MB** только на framebuffer'ы.

На iPhone X (3 GB RAM) это заметная доля. При одновременном проигрывании видео на второй странице суммарное потребление может достигать 30-40 MB визуальных ресурсов.

**Возможная оптимизация:** ограничить DPR для canvas максимумом 2 на мобильных:
```js
const dpr = Math.min(window.devicePixelRatio || 1, 2)
```

### Safari WebGL context loss

Safari на iOS может принудительно потерять WebGL context при нехватке GPU памяти (`webglcontextlost` event). Текущий компонент **не обрабатывает** этот event. При потере контекста Layer 1 перестанет отображаться без уведомления.

**Вероятность:** Низкая при 10k отпечатков. Средняя при 50k+ или при конкуренции с видео на второй странице.

### JSON.parse при 50k+ отпечатках

При 50k записей JSON payload ~1 MB, `JSON.parse` занимает ~25-40ms на A11 (iPhone X). Это может вызвать заметный jank при загрузке. Текущий порог 10k — безопасен.

### GPU fill rate при 10k спрайтов

Каждый спрайт при DPR=3 занимает ~75x75–100x100 физических пикселей (зависит от root font-size и SPRITE_REM: 1.9). 10k спрайтов = ~56–100M пикселей fill rate с alpha blending. На iPhone X (A11 GPU, ~25 Gpix/s) это ~5-8 ms на один render. Render-once, поэтому это разовая стоимость, но при resize выполняется повторно.

### Оценка времени первого render (10k отпечатков)

| Метрика | iPhone X (A11) | iPhone 12 (A14) | iPhone 14 (A15) |
|---------|---------------|-----------------|-----------------|
| Загрузка данных (4G) | ~25 ms | ~25 ms | ~25 ms |
| WebGL init + шейдеры | ~10 ms | ~6 ms | ~5 ms |
| CPU (Float32Array + цикл) | ~2.5 ms | ~1.4 ms | ~1 ms |
| GPU (instanced draw) | ~5-8 ms | ~2-4 ms | ~1.5-3 ms |
| Память (JS + GPU + canvas) | 13.6 MB | 13.6 MB | 13.6 MB |
| **Вердикт** | OK | OK | OK |

Все устройства укладываются в один 16.6ms кадр (60fps) для render. Узкое место появится при ~50k+ отпечатков.

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
