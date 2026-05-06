# Glass

Полноэкранный glassmorphism-overlay в стиле Apple «Liquid Glass» (см. CodePen [wprod/raVpwJL](https://codepen.io/wprod/pen/raVpwJL)).
Накладывается поверх контента страницы и применяет к фону frost-blur и SVG-рефракцию.
Сам параллакс-смещения по курсору / гироскопу — через хук [`useCursorParallax`](../hooks/useCursorParallax.md).

## Принципы

1. Не перехватывает клики (`pointer-events: none` на контейнере).
2. Многослойная структура — каждый слой отвечает за свою часть эффекта.
3. Поверх Liquid Glass можно положить любой контент через `children` — он
   становится частью стекла и двигается с ним при параллаксе.
4. Эффект — приближение к Figma Glass effect (Refraction, Depth, Dispersion,
   Frost, Light) средствами CSS + SVG-фильтра.
5. Стиль Apple Liquid Glass:
   - Frost — `backdrop-filter: blur(4px)`
   - Refraction — `filter: url(#lensFilter)` (`feTurbulence` + `feDisplacementMap`)
   - Light — `var(--lg-highlight)` через `inset box-shadow` (specular layer)
   - Tint — `var(--lg-bg-color)` через overlay-слой

## Структура слоёв

| Слой | z-index | Что делает |
|---|---|---|
| `.glass-filter` | 0 | `backdrop-filter: blur` + `filter: url(#lensFilter) saturate(120%) brightness(1.15)` |
| `.glass-overlay` | 1 | `background: var(--lg-bg-color)` — основной тон стекла |
| `.glass-specular` | 2 | `inset box-shadow` для имитации «грани линзы» |
| `.glass-content` | 3 | слот для содержимого (`children`) |

## Props

| Имя | Тип | По умолчанию | Описание |
|---|---|---|---|
| `maxOffsetX` | `number` | `10` | Максимальное смещение по X (px) при параллаксе |
| `maxOffsetY` | `number` | `10` | Максимальное смещение по Y (px) при параллаксе |
| `enableGyroscope` | `boolean` | `true` | Слушать ли `deviceorientation` на мобильных |
| `fallbackToMouse` | `boolean` | `true` | Если гироскоп недоступен — слушать ли `pointermove` |
| `enabled` | `boolean` | `true` | Включает параллакс. Если `false` — стекло на месте |
| `zIndex` | `number` | — | z-index самого стеклянного контейнера |
| `children` | `ReactNode` | — | Контент `.glass-content`. Если пусто — клики проходят насквозь |

## CSS-переменные

В `:root` (определены в `Glass.module.scss`):

```scss
--lg-bg-color: rgba(255, 255, 255, 0.25);  // тон стекла (overlay)
--lg-highlight: rgba(255, 255, 255, 0.75);  // блики (specular)
--lg-text: #ffffff;                          // цвет текста внутри стекла
--lg-red: #fb4268;                           // активный акцент (CodePen)
--lg-grey: #444739;                          // неактивный акцент (CodePen)
```

Меняй их в `:root` чтобы перетемизировать стекло без правки компонента.

## SVG-фильтр `lensFilter`

Рендерится как часть `<Glass>`:

```xml
<filter id="lensFilter">
    <feTurbulence baseFrequency="0.012 0.012" numOctaves="2" seed="92" />
    <feGaussianBlur stdDeviation="1.5" />
    <feDisplacementMap scale="14" xChannelSelector="R" yChannelSelector="G" />
</filter>
```

`backdrop-filter: blur(4px)` сначала размывает «снимок» фона, затем
`filter: url(#lensFilter)` применяет displacement к этому слою —
получается liquid lens distortion.

## Использование

```jsx
import Glass from "../components/glass/Glass.jsx"

<Glass
    zIndex={3}
    maxOffsetX={40}
    maxOffsetY={40}
    enableGyroscope
    fallbackToMouse
>
    {/* опционально: контент внутри стеклянного слоя */}
    <p>Текст, привязанный к стеклу</p>
</Glass>
```

## Особенности позиционирования

`.glass-container` использует `position: absolute` с трюком
`top: calc(50% - 50vh); left: calc(50% - 50vw); width: 100vw; height: 100vh`,
что даёт всегда полный viewport — независимо от ширины родителя
(в т.ч. если родитель имеет `transform`, который иначе сделал бы `position: fixed`
относительным к нему).

## Совместимость

- **Chromium** (Chrome / Edge / Opera): `filter: url(...)` поддерживается на
  элементе с `backdrop-filter` — рефракция видна полностью.
- **Firefox**: `filter: url(...)` работает, но `backdrop-filter` ограниченно —
  Liquid distortion может быть отключён, frost остаётся.
- **Safari**: `backdrop-filter: blur` через префикс; SVG-рефракция —
  частично. Эффект мягче, чем в Chromium.

`@supports (filter: url(#a))` — гард внутри SCSS, чтобы не ломать fallback.
