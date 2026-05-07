# SotvorenieZhizni (01_01)

Страница «Миниатюра Сотворение Жизни» — первый фрейм одноимённой секции.
Файл `src/pages/01_01.jsx`, компонент `SotvorenieZhizni`. Соответствует
фрейму `01_01` из секции «01 Миниатюра СОТВОРЕНИЕ ЖИЗНИ» в Figma.

## Роут

| Path | Title | Component |
|---|---|---|
| `/01_01` | Сотворение жизни | `SotvorenieZhizni` |

Переход с `/` (страница 00, [Vhozhdenie](Vhozhdenie.md)) — после двух
кликов по «плюнуть»/«поцеловать» через 2 секунды.

## Состояния

Страница имеет два состояния, переключаемые по клику на «окно глаз»:

### 1. Initial — окно с глазами Моны Лизы (соответствует 01_01 в Figma)
- Синий фон (#002FA7, International Klein Blue)
- Текст по центру (под окном по z-index): h1 + body, как в 00_01
- Окно (688×295 в координатах Figma → 36% × 24% от viewport) c обрезанным
  изображением глаз, inner-shadow, локальным Glass
- Курсор `pointer` над окном (зона `EYES_WINDOW`)

### 2. Opened — после клика на окно (соответствует 01_02 в Figma)
- Появляется изображение `/images/РУКИ.png` (opacity 0.85, fade-in 0.8s)
- Появляется `Btn-Neprikosnovenna` (текст «неприкосновенна», fade-in 0.8s
  с задержкой 0.3s)
- Окно с глазами и Glass — остаются на месте

## Структура DOM

```
<main class="main">                                — синий фон
  <Cursor />

  <div class="parallaxLayer">                       — параллакс по курсору
    <div id="Background-01_01" class="background"/> — z-1
    <div id="EyesWindow" class="eyesWindow">        — z-3
      <img class="eyesImage" src="/images/ВЗГЛЯД.jpg"/>
      <Glass mode="contained" enableParallax={false}
             frostBlur={0} bgColor="rgba(0,0,0,0.04)"/>
    </div>
  </div>

  <div class="textBlock">                           — z-2, статичен
    <h1>Миниатюра «Неприкосновенна»</h1>
    <p>Миниатюра о том, как удивительно способно
       <span class="underline">рукотворное</span> оживать
       и становиться <span class="underline">сакральным</span>.</p>
  </div>

  <img class="hands [.handsVisible]"
       src="/images/РУКИ.png"/>                     — z-5, opacity 0→0.85
  <div class="btnSlot [.btnSlotVisible]">           — z-6, opacity 0→1
    <Button id="BtnNeprikosnovenna" />
  </div>
</main>
```

## Параллакс

`useCursorParallax(parallaxRef, { maxOffsetX: 25, maxOffsetY: 25, ... })` —
параллакс применяется к `.parallax-layer` и переносит **фон + окно с глазами +
Glass** как единое целое. Текст, руки и кнопка — статичны.

`Glass` внутри окна — `enableParallax={false}`, его внутренний параллакс
отключён, чтобы не дублировать движение.

## Зоны курсора

Зона `BTN_NEPRIKOSNOVENNA` зависит от `dragState` (см. ниже):

| Zone | elementId | Иконка (idle) | Иконка (frozen/dragging) | Иконка (dropped) |
|---|---|---|---|---|
| `NONE` | — | DEFAULT | — | — |
| `BACK` | `Background-01_01` | DEFAULT | — | — |
| `EYES_WINDOW` | `EyesWindow` | POINTER | — | — |
| `BTN_NEPRIKOSNOVENNA` | `BtnNeprikosnovenna` | POINTER | HAND_CLOSE | POINTER |

`imgCursorClicked`: idle → POINTER_CLICKED, frozen/dragging → HAND_CLOSE,
dropped → HAND_CLOSE (показывается на pickup-back).

⚠️ `.eyesImage` имеет `pointer-events: none` — иначе `document.elementFromPoint`
возвращает `<img>` (без id), и зона `EYES_WINDOW` не определяется.

## Drag&drop кнопки

После успешного клика на `BtnNeprikosnovenna` (alpha-hit hands не блокирует
+ кнопка достигла `opacity: 1`) кнопка превращается в draggable-элемент.
Машина состояний `dragState`:

```
[idle]
  ─pointerdown на btn────────────→ [frozen]
        • setSrc(HAND_CLOSE)
        • cursorRef.stopVideo()       — снимает pointermove-listeners
        • кнопка прилипает к курсору в точке касания (pivot offset)
        • setTimeout 1000 ms

[frozen]
  ─через 1с──→ [dragging]              cursorRef.start() возвращает движение
  pointerup ИГНОРИРУЕТСЯ (pointerup от исходного клика не дропает)

[dragging]
  ─pointerup──→ [dropped]              кнопка остаётся в droppedPos

[dropped]
  ─pointerdown на btn──→ [dragging]    pickup-back, freeze повторно НЕ делаем
```

**Pivot offset.** При каждом pickup (initial click + pickup-back) сохраняется
вектор `(event.clientX − btn.center.x, event.clientY − btn.center.y)`.
В rAF-loop'е и в inline-style для `dropped` транслейт делает
`btn.center = cursor − pivot`, поэтому курсор остаётся ровно в той точке
кнопки, где было касание (а не прыгает в её центр).

**Реализация.** Только в `01_01.jsx` — `Cursor`/`Button` без модификаций;
используются методы imperative API: `setSrc`, `stopVideo`, `start`,
`getPosition`. Позиция кнопочного слота пишется напрямую в
`buttonSlotRef.current.style.transform` через rAF (без re-render).

**SCSS-гейт.** `.btnSlot { pointer-events: none }` + `& > * { pointer-events:
inherit }` — внутренний `<button>` наследует значение слота, иначе пробивал
бы блокировку. После 13s (3s delay + 10s fade) `.btnSlotVisible` переключает
на `auto`. До этого момента ни клик, ни hover не срабатывают
(`document.elementFromPoint` пропускает кнопку → zone не BTN).

**Detached-режим.** Класс `.btnSlotDetached` (`top: 0; left: 0;
z-index: 8 (над hands z-7); transition: none; pointer-events: auto`) —
позиционирование переходит к JS, slot становится поверх рук на время drag.

## Glass для 01_01

Параметры Glass отличаются от 00_01:
- `mode="contained"` — локальное стекло над окном глаз
- `frostBlur={0}` — без размытия (Figma Frost = 0)
- `bgColor="rgba(0, 0, 0, 0.04)"` — почти прозрачный чёрный (Figma fill)
- `enableParallax={false}` — параллакс делает родительский слой

## Изображения

- `/images/ВЗГЛЯД.jpg` — обрезанное изображение глаз Моны Лизы
- `/images/РУКИ.png` — руки, держащие воротник (image hash из Figma:
  `97de5aa4ed2cecedf33c755c4ee13fbd2673605b`, проект использует общий ассет)

## TODO

- Анимация захвата (плавный «прыжок» кнопки к курсору вместо моментального).
- Drop-зоны / финальный сценарий после первого drag.
