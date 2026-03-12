# WebGLCursorTracker — Архитектура

## Обзор

Модуль реализует накопление кликов (в процентах относительно контейнера) и их батч‑отрисовку одним WebGL draw-call'ом: на каждый клик рисуется прямоугольник (2 треугольника = 6 вершин) с одной и той же текстурой курсора.

---

## Структура файлов

```
src/components/cursor/
├── WebGLCursorTracker.jsx    # Основной компонент (WebGL рендер)
├── WebGLCursorTracker.css    # Стили overlay + fallback (не используется)
└── hooks/
    └── useClicks.js          # Хук для state + localStorage persistence
```

---

## Слои ответственности

### 1. Хук `useClicks.js` — слой данных (state + persistence)

**State-хранилище:**
- `clicksMap: Map<id, clickData>` — хранит объект клика по id
- `clicksOrder: string[]` — порядок отрисовки (и восстановления из storage)
- `clicks: clickData[]` — вычисляется через `useMemo()` как `clicksOrder -> clicksMap.get(id)`

**Загрузка при монтировании:**
- читает `localStorage['clicks']`
- ожидает массив объектов `{id, x, y, timestamp}`
- кладёт в `Map` и `order`

**Запись в localStorage (оптимизация):**
- `asyncSaveToStorage` = `debounce(..., 1000)`
- внутри debounce ещё `setTimeout(..., 0)`, чтобы запись не блокировала текущий тик
- запись происходит при изменении `clicks` и только если `clicks.length > 0`

**API хука:**
- `addClick(x, y)` — генерирует `crypto.randomUUID()`, сохраняет `{id, x, y, timestamp}`, обновляет Map и order
- `clearClicks()` — чистит state и localStorage

**Проблемы при масштабировании:**
- Хук рассчитан на рост массива без ограничений
- Для 10k+ кликов JSON stringify/parse и память становятся узким местом

---

### 2. Компонент `WebGLCursorTracker.jsx` — слой рендера (WebGL canvas)

**Рендерит:**
- `<canvas class="webgl-cursor-container">` поверх контента (absolute, 100%, pointerEvents: none)

**Props:**
- `zIndex` — z-index для overlay

**Императивный интерфейс (через forwardRef + useImperativeHandle):**
- `saveClickPosition(cursorPositionPercents)` — троттлит клики (не чаще 150ms), вызывает `addClick(x, y)`

**Текущая реализация (instancing + render-once):**

Вместо генерации 6 вершин на каждый клик, компонент хранит **одну** базовую геометрию (квад из 2 треугольников = 6 вершин) и отдельный **instance buffer** с позициями кликов.

**WebGL pipeline (useEffect, один раз):**
- создаёт WebGL2 контекст или WebGL1 + расширение `ANGLE_instanced_arrays`
- компилирует шейдеры и линкует программу
- создаёт:
  - `quadBuffer` — базовый квад (позиции + UV)
  - `instanceBuffer` — массив `a_offset` (vec2) для каждого клика
  - `texture` — одна текстура по `imageUrl`
- включает blending
- подписывается на `resize` и обновляет viewport

**Render-once (без постоянного rAF):**
- `render()` вызывается:
  - после загрузки текстуры
  - при изменении массива `clicks`
  - при `resize`
- внутри `render()`:
  - пересчитывается `u_size` (из `spriteSize` в пикселях → NDC с учётом DPR)
  - строится `Float32Array(instanceCount * 2)` (x,y в NDC) и загружается в `instanceBuffer`
  - выполняется один draw call:
    - WebGL2: `gl.drawArraysInstanced(...)`
    - WebGL1: `ext.drawArraysInstancedANGLE(...)`

**Важно (anti-bug): stale closure**
- `render()` определяется внутри `useEffect([])` и иначе замыкает первоначальный `clicks` (обычно пустой).
- Поэтому актуальные клики прокидываются через `clicksRef.current`, а `render` хранится в `renderRef.current`.
- Это гарантирует, что pipeline не пересоздаётся, но данные для отрисовки всегда свежие.

---

### 3. `WebGLCursorTracker.css` — стили

- `.webgl-cursor-container` — абсолютное позиционирование, pointer-events: none
  - важно задавать `top: 0` и `left: 0`, чтобы canvas гарантированно перекрывал контейнер
- `.webgl-cursor-fallback` — CSS-анимации для fallback (не используется в JSX)
- Оптимизации (`will-change`, `backface-visibility`) применяются прямо к `.webgl-cursor-container`

---

## Взаимодействие с `Neprikosnovenna.jsx`

### Страница `Neprikosnovenna.jsx`

**Ответственности:**
- Управляет зонами курсора (`Cursor` + zoneSettings)
- Обрабатывает клики мыши через `handleLeftClickDown/Up`
- На клике по `Portrait` вычисляет координаты курсора в процентах относительно `<article>`
- Делегирует сохранение клика в трекер через `cursorTrackerRef.current.saveClickPosition(...)`

**Используемый компонент:**
- На странице подключён `EnhancedCursorTracker` (не `WebGLCursorTracker` напрямую)
- Но интерфейс тот же: `ref.saveClickPosition({x, y})`

### Поток данных

```
Cursor (кастомный компонент)
    │
    │ трекает позицию курсора, знает currentElementId
    │
    ▼
handleLeftClickDown(currentElementId)  [в Neprikosnovenna.jsx]
    │
    │ если currentElementId === "Portrait"
    │
    ▼
cursorRef.current.getPosition()  →  абсолютные координаты курсора
articleRef.current.getBoundingClientRect()  →  геометрия контейнера
    │
    ▼
Вычисление процентов [0..100] по width/height
    │
    ▼
cursorTrackerRef.current.saveClickPosition({x%, y%})
    │
    ▼
EnhancedCursorTracker / WebGLCursorTracker
    │
    ├─ троттлит (150ms)
    ├─ addClick(x, y)  →  useClicks hook
    │      ├─ сохраняет в state
    │      └─ сохраняет в localStorage (debounce 1000ms)
    │
    └─ отрисовывает все клики через WebGL overlay
```

### Контракты

- Внешний модуль передаёт **проценты** в системе координат контейнера `articleRef`
- Трекер ожидает значения 0..100 и сам переводит их в NDC
- Трекер не ловит события мыши (`pointerEvents:none`) — события идут через `Cursor`

---

## Целевая архитектура (после переписывания на instancing)

### Ключевые изменения

1. **Instancing вместо 6 вершин на клик**
   - 1 прямоугольник (6 вершин) хранится один раз
   - Позиции для каждого спрайта — отдельный instance buffer
   - `drawArraysInstancedANGLE` / `drawArraysInstanced` одним вызовом

2. **Render-once вместо бесконечного rAF**
   - Рендер только после загрузки текстуры и при изменении данных
   - Нет постоянного цикла анимации

3. **Стабильный WebGL pipeline**
   - Программа/шейдеры/буферы создаются один раз при монтировании
   - При добавлении кликов — только обновление instance buffer

4. **Оптимизация хранения**
   - Компактный формат в localStorage (без uuid/timestamp для статичных данных)
   - Typed arrays для GPU данных

### Преимущества

- **Производительность**: 1 draw call для 10k+ спрайтов
- **Память**: меньше дублирования данных (6 вершин vs 6 * N вершин)
- **Стабильность**: нет пересоздания GPU ресурсов при каждом клике
