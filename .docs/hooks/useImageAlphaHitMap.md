# useImageAlphaHitMap

Хук строит карту α-канала (`Uint8Array`) изображения при его загрузке и
предоставляет O(1) функцию для проверки, попадает ли точка screen-coord в
непрозрачный пиксель. Используется для **pixel-perfect** hit-testing PNG c
прозрачностью (например — блокировка клика по кнопке, когда её закрывает
изображение рук).

## Принципы

1. Разовая инициализация при `onLoad` — image рисуется в скрытый canvas,
   `getImageData` копируется в `Uint8Array(width × height)` (1 байт на
   пиксель). После этого canvas не нужен.
2. На каждый запрос — O(1) lookup в массиве + одно чтение
   `getBoundingClientRect` для текущего bbox элемента.
3. Учитывает `object-fit: contain` / `cover` — корректно мапит
   screen-координаты в natural-image space с учётом letterbox-полос
   (через `getComputedStyle().objectFit`).
4. `getBoundingClientRect` уже включает `transform: translate3d` (от
   параллакса) — координатное преобразование автоматически верное.

## Сигнатура

```js
useImageAlphaHitMap(src, options?)
```

| Аргумент | Тип | Описание |
|---|---|---|
| `src` | `string` | URL изображения. Same-origin — `getImageData` без CORS-issue. |
| `options.threshold` | `number` (default `32`) | `α > threshold` считается непрозрачным. `0` — самый строгий: блокирует любой видимый пиксель. |

## Возвращает

```js
{
    imgRef: React.RefObject<HTMLImageElement>,
    isPixelOpaqueAt: (screenX: number, screenY: number) => boolean,
    isReady: boolean,
}
```

| Поле | Описание |
|---|---|
| `imgRef` | Навешивается на тот же `<img>`, что показывается в DOM. Используется для получения текущего bounding-box (с учётом transform). |
| `isPixelOpaqueAt(x, y)` | `true` если пиксель в screen-точке (x, y) у изображения имеет `α > threshold`. `false` если вне bbox, в letterbox-зоне или прозрачный. |
| `isReady` | `true` после загрузки + построения hit-map. До этого `isPixelOpaqueAt` возвращает `false` (безопасный default). |

## Использование

```jsx
import useImageAlphaHitMap from "../hooks/useImageAlphaHitMap.js"

const MyComponent = () => {
    const { imgRef, isPixelOpaqueAt } = useImageAlphaHitMap(
        "/images/РУКИ.png",
        { threshold: 0 },
    )

    const handleClick = (event) => {
        if (isPixelOpaqueAt(event.clientX, event.clientY)) {
            // курсор над непрозрачным пикселем PNG → блокируем
            return
        }
        // ... иначе обрабатываем
    }

    return <img ref={imgRef} src="/images/РУКИ.png" />
}
```

## Производительность

- Инициализация: 1 × `getImageData(0, 0, w, h)` при onLoad (~30 ms на
  PNG ~2000×1000).
- На запрос: 1 × `getBoundingClientRect` + 1 × `getComputedStyle` + array
  lookup. ~0.05 ms — можно вызывать на каждом `pointermove`.
- Память: `1 × natural_width × natural_height` байт (для 1431×668 ≈ 1 MB).

## Учёт `object-fit`

| objectFit | Поведение |
|---|---|
| `fill` (или не задан) | Image занимает full-rect, мап один-к-одному |
| `contain` | Image вписан с letterbox; в letterbox-области → `false` |
| `cover` | Image обрезается; мап через корректное преобразование |
| `none` / `scale-down` | Не поддерживается (упрощённо считается `fill`) |

## Ограничения

- **Same-origin**: cross-origin без CORS-headers → tainted canvas → hit-map
  не строится, `isPixelOpaqueAt` всегда `false`.
- **CSS `filter` / `opacity` на `<img>`** не учитываются — hit-map строится
  по сырым PNG-пикселям. Это правильно: visual эффекты ≠ интерактивный hit.
- **CSS `transform`** (включая параллакс) — учитывается автоматически через
  `getBoundingClientRect`.
