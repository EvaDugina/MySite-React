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
  <article class="frame">                        — 60vw layout, scaleX(4)
                                                   visual = 240vw, центр viewport
    <img id="Portrait">                          — z-1, заполняет frame
    <Glass zIndex={3} maxOffsetX={40} ...>       — z-3, параллакс
    <div class="textBlock z-3">                  — fixed, z-3, поверх Glass
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

**Координатная система article.** `scaleX(4)` на `.frame` растягивает
весь content (img + кнопки) горизонтально 4× от центра. Кнопки сидят
в layout-координатах frame, поэтому при ресайзе viewport их визуальная
позиция меняется синхронно с лицом на фото — не разъезжаются.

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
| `.title` | Inter ExtraBold (800) | 2vw | (textBlock width 25vw, шрифт подобран после scaleX-разметки) |
| `.body` | Inter Bold Italic (700) | 0.8vw | (textBlock width 25vw) |
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
Стретч даёт `scaleX(4)` на родительском `.frame` (см. структуру выше) —
визуально-непропорциональное искажение по ширине. На самой `<img>`
никаких transform нет, она просто заполняет frame через `inset: 0`.
