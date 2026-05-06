# Vhozhdenie (00_01)

Стартовая страница инсталляции — «Вхождение в МИНИАТЮРУ». Файл — `src/pages/00_01.jsx`,
компонент — `Vhozhdenie`. Соответствует фрейму `00_01` из секции
«00 Вхождение в МИНИАТЮРУ» прототипа Figma.

## Роут

| Path | Title | Component |
|---|---|---|
| `/` | Неприкосновенна — вхождение | `Vhozhdenie` |

## Структура страницы

```
<main class="main">
  <article class="frame">                        — 84vw, по центру
    <img id="Portrait">                          — z-1, scaleX(2), статичен
    <Glass zIndex={3} maxOffsetX={40} ...>       — z-3, параллакс
    <div class="textBlock z-2">                  — z-2, под Glass (refraction)
      <h1>Миниатюра «Неприкосновенна»</h1>
      <p>Миниатюра о том... <u>рукотворное</u> ...</p>
    </div>
    <div class="btnSpitSlot">                    — z-4, поверх Glass
      <Button id="BtnSpit">плюнуть</Button>
    </div>
    <div class="btnKissSlot">                    — z-4
      <Button id="BtnKiss">поцеловать</Button>
    </div>
  </article>
</main>
```

## Поведение

1. Курсор-зоны:
   - `BtnSpit` / `BtnKiss` — иконка `POINTER`, callbacks `hover()` / `reset()`.
   - На уже `disabled` кнопке `hover/reset` пропускается (guard через
     `isDisabled()`), чтобы повторно её не активировать.
2. Клик по кнопке:
   - `BtnSpit` или `BtnKiss` (не нажатой ранее) → `.disable()` + флаг.
   - Клики по портрету и фону игнорируются.
3. Когда обе кнопки `disabled` — через **2 секунды** `useNavigate('/neprikosnovenna')`.
4. Параллакс — только Glass (`maxOffsetX/Y = 40`); портрет, текст, кнопки —
   статичны.

## Типографика

| Элемент | Шрифт | Размер | Стиль |
|---|---|---|---|
| `.title` | Inter ExtraBold (800) | 5.55vw | (= 96px на 1728-frame Figma) |
| `.body` | Inter Bold Italic (700) | 2.78vw | (= 48px на 1728-frame Figma) |
| `.underline` | — | — | `text-decoration: underline` на словах «рукотворное» / «сакральным» |

## Glass-эффект

См. документацию [Glass](../components/Glass.md). На странице установлен с
`maxOffsetX/Y={40}` для заметного параллакса.

## Кнопки

Используется общий `<Button>`. На странице — без variant'а, дефолтные стили.
Кастомизация через [Button.module.scss](../components/Button.md):
- `:--hovered`: `translateY(-1px)` + `box-shadow`
- `:--active`: `translateY(0)` + лёгкая `box-shadow` (нажатие)
- `:--disabled`: `opacity: 0.35`, `transition: none` — мгновенный переход
  (после клика никакой плавной анимации).

## Изображение портрета

`/images/НЕПРИКОСНОВЕННА.webp` — статичный image-fill, без видео-флоу.
Применён `transform: scaleX(2)` — растянут по ширине в 2 раза при
сохранении высоты (визуально-непропорциональное искажение).
