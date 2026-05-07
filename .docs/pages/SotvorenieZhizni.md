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

| Zone | elementId | Иконка | Действие на клик |
|---|---|---|---|
| `NONE` | — | DEFAULT | — |
| `BACK` | `Background-01_01` | DEFAULT | — |
| `EYES_WINDOW` | `EyesWindow` | POINTER | `setIsOpened(true)` — раскрытие |
| `BTN_NEPRIKOSNOVENNA` | `BtnNeprikosnovenna` | POINTER | `.click()` (TODO: дальнейший флоу) |

⚠️ `.eyesImage` имеет `pointer-events: none` — иначе `document.elementFromPoint`
возвращает `<img>` (без id), и зона `EYES_WINDOW` не определяется.

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

- Поведение клика на `BtnNeprikosnovenna` — пока stub. Возможные варианты:
  - Переход на следующий фрейм (`01_02` или дальше)
  - Анимация раскрытия в полный портрет
  - Что-то ещё по сценарию миниатюры
