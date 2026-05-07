# useCursorParallax

Хук, применяющий параллакс-смещение к DOM-элементу по перемещению курсора
или вращению touch-устройства (гироскоп). Используется в
[Glass](../components/Glass.md) и [CursorMoveParalax](../components/CursorMoveParalax.md).

## Принципы

1. Чисто стилевой эффект — пишет `transform: translate3d(x, y, 0)` на узле.
2. Сглаживание через rAF + lerp (не дёргается, не «прыгает»).
3. Поддержка двух источников: `deviceorientation` (если есть гироскоп) и
   `pointermove` (как fallback или единственный источник).
4. На устройствах без гироскопа автоматически работает по курсору.
5. Полностью самостоятельно подписывается / отписывается от событий
   при unmount.

## Сигнатура

```js
useCursorParallax(targetRef, options)
```

| Параметр | Тип | Описание |
|---|---|---|
| `targetRef` | `RefObject<HTMLElement>` | Ref на элемент, к которому применять transform |
| `options.maxOffsetX` | `number` | Максимальное смещение по X в px (default 12) |
| `options.maxOffsetY` | `number` | Максимальное смещение по Y в px (default 12) |
| `options.direction` | `number` | -1: противоход курсору (default), 1: вместе |
| `options.enabled` | `boolean` | Включает / выключает (default `true`) |
| `options.enableGyroscope` | `boolean` | Слушать `deviceorientation` (default `true`) |
| `options.fallbackToMouse` | `boolean` | Слушать `pointermove` (default `true`) |
| `options.onApply` | `(x, y) => void` | Кастомный аппликатор вместо `style.transform` |
| `options.lerpFactor` | `number` | Скорость подтягивания к цели, 0..1 (default `0.16`). Меньше = «инерция»/задержка, больше = быстрее. |

## Поведение

- **Курсор**: нормализованная позиция в `[-1, 1]` от центра экрана
  умножается на `maxOffset*` и `direction`.
- **Гироскоп** (`beta`/`gamma`): нормировка `gamma/30`, `beta/30` —
  комфортный диапазон для мобильных наклонов.
- **Switch input mode**: первый получаемый `deviceorientation` переводит
  в режим `gyro-active`, после чего `pointermove` игнорируется (на
  гибридных устройствах с тачскрином и гироскопом).
- **Lerp**: `LERP_FACTOR = 0.16`, `STOP_THRESHOLD = 0.05` — плавная
  анимация ~10 кадров до цели.
- **Cleanup**: `blur` / `mouseleave` / `resize` сбрасывают target в `(0, 0)`.

## Использование

```jsx
import { useRef } from "react"
import useCursorParallax from "../hooks/useCursorParallax.js"

const MyComponent = () => {
    const ref = useRef(null)

    useCursorParallax(ref, {
        maxOffsetX: 30,
        maxOffsetY: 30,
        enableGyroscope: true,
        fallbackToMouse: true,
    })

    return <div ref={ref} className="parallax-element" />
}
```

## Что слушает

```
window.addEventListener('pointermove', ...)      // fallbackToMouse
window.addEventListener('pointerleave', ...)     // fallbackToMouse
window.addEventListener('deviceorientation', ...) // enableGyroscope
window.addEventListener('blur', ...)              // сброс target
window.addEventListener('resize', ...)            // сброс target
```

Все слушатели чистятся в return useEffect.

## Особенности

- **Не использует state** — все вычисления через `useRef` + rAF, без
  re-render React.
- **`will-change: transform`** на элементе рекомендуется для GPU-acceleration
  (это уже стоит в `Glass.module.scss`).
- **Когда `enabled: false`** — анимация останавливается, transform сбрасывается
  в `translate3d(0, 0, 0)`.
