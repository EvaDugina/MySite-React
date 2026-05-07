import styles from "./01_01.module.scss"
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import {
    createCursorSettings,
    createCursorZoneSettings,
    CursorImages,
} from "../components/cursor/CursorSettings.js"
import Cursor from "../components/cursor/Cursor.jsx"
import Button from "../components/button/Button.jsx"
import Glass from "../components/glass/Glass.jsx"
import useCursorParallax from "../hooks/useCursorParallax.js"
import useImageAlphaHitMap from "../hooks/useImageAlphaHitMap.js"

const Zone = {
    NONE: 0,
    BACK: 1,
    EYES_WINDOW: 2,
    BTN_NEPRIKOSNOVENNA: 3,
}

const SotvorenieZhizni = () => {
    const cursorRef = useRef(null)
    const btnNeprikosnovennaRef = useRef(null)
    const backgroundRef = useRef(null)
    const eyesWindowRef = useRef(null)

    const [isOpened, setIsOpened] = useState(false)

    // Drag-state машина (после успешного клика на кнопку):
    //   'idle'     — кнопка ещё кликабельна (alpha-hit blocking активен)
    //   'frozen'   — клик произошёл, курсор стоит, кнопка прилипла (1 сек)
    //   'dragging' — курсор разморожен, кнопка следует за курсором
    //   'dropped'  — pointerup случился, кнопка стоит в droppedPos
    // dragStateRef — синхронное зеркало для window-листенеров (чтобы не
    // ждать ре-рендера для проверки в pointerup-хендлере собственно клика).
    const [dragState, setDragState] = useState("idle")
    const dragStateRef = useRef("idle")
    const setDrag = useCallback((next) => {
        dragStateRef.current = next
        setDragState(next)
    }, [])

    // droppedPos — state (а не ref), потому что:
    //   а) переход в 'dropped' требует перерисовки (inline-style transform);
    //   б) eslint react-hooks/refs запрещает читать ref.current в render.
    const [droppedPos, setDroppedPos] = useState(null)
    const buttonSlotRef = useRef(null)
    const freezeTimerRef = useRef(null)
    // Pivot-offset: смещение точки касания курсора от ЦЕНТРА кнопки в момент
    // pointerdown. Используется в rAF и для inline-стиля 'dropped', чтобы
    // курсор оставался ровно в той точке кнопки, где было касание (а не
    // прыгал в её центр). Перевычисляется на каждом pickup (initial click +
    // pickup-back).
    const pivotOffsetRef = useRef({ x: 0, y: 0 })

    // Cleanup отложенного unfreeze-таймера на unmount страницы.
    useEffect(() => () => {
        if (freezeTimerRef.current) clearTimeout(freezeTimerRef.current)
    }, [])

    // Aspect-ratio изображения ВЗГЛЯД — задаётся при onLoad,
    // прокидывается в inline-style EyesWindow, чтобы окно
    // повторяло пропорции картинки (без letterbox).
    const [eyesAspect, setEyesAspect] = useState(null)
    const handleEyesImgLoad = useCallback((e) => {
        const img = e.target
        if (img.naturalWidth && img.naturalHeight) {
            setEyesAspect(img.naturalWidth / img.naturalHeight)
        }
    }, [])

    // Hit-map для PNG рук (alpha-канал) — нужен и как ref на img для
    // параллакса, и для проверки покрытия кнопки непрозрачным пикселем.
    // threshold: 0 — самый строгий. Любой пиксель с α > 0 блокирует клик.
    // Клик проходит только через ЯВНО ПУСТЫЕ участки (α === 0).
    const { imgRef: handsRef, isPixelOpaqueAt: isHandsOpaqueAt } =
        useImageAlphaHitMap("/images/РУКИ.png", { threshold: 0 })

    // Флаг: руки сейчас закрывают позицию курсора над кнопкой.
    // Используется как для блокировки клика, так и для смены иконки курсора.
    const isHandsCoveringBtnRef = useRef(false)

    // Параллакс — независимо для трёх элементов.
    // Background и EyesWindow с базовой амплитудой 25px.
    // Hands — амплитуда увеличена в 3 раза (75px) для более выраженного движения.
    // Только text и Button остаются статичными.
    const baseParallaxOpts = {
        maxOffsetX: 25,
        maxOffsetY: 25,
        enabled: true,
        enableGyroscope: true,
        fallbackToMouse: true,
    }
    useCursorParallax(backgroundRef, baseParallaxOpts)
    useCursorParallax(eyesWindowRef, baseParallaxOpts)
    useCursorParallax(handsRef, {
        ...baseParallaxOpts,
        maxOffsetX: 200,
        maxOffsetY: 200,
        // lerpFactor 0.04 (× 1.5 медленнее предыдущих 0.06; 4× медленнее
        // дефолтного 0.16) — руки догоняют курсор лениво, выраженная инерция.
        lerpFactor: 0.025,
    })

    // Зоны курсора: окно глаз и кнопка — Pointer; остальное — дефолт.
    const handleOnEyesWindow = useCallback(() => {
        // hover-state для окна не нужен; просто иконка курсора меняется
    }, [])
    const handleOffEyesWindow = useCallback(() => {}, [])
    const handleOnBtn = useCallback(() => {
        if (btnNeprikosnovennaRef.current?.isDisabled()) return
        btnNeprikosnovennaRef.current?.hover()
    }, [])
    const handleOffBtn = useCallback(() => {
        if (btnNeprikosnovennaRef.current?.isDisabled()) return
        btnNeprikosnovennaRef.current?.reset()
    }, [])

    const cursorZoneSettingsRef = useRef(null)
    useEffect(() => {
        // Зона кнопки зависит от dragState:
        //   idle      — POINTER / POINTER_CLICKED + hover/reset (кликабельно)
        //   frozen    — HAND_CLOSE (кнопка прилипла, иконка-«хват»)
        //   dragging  — HAND_CLOSE (продолжается drag)
        //   dropped   — POINTER на hover, HAND_CLOSE на pointerdown
        let btnZone
        if (dragState === "frozen" || dragState === "dragging") {
            btnZone = {
                elementId: "BtnNeprikosnovenna",
                imgCursor: CursorImages.HAND_CLOSE,
                imgCursorClicked: CursorImages.HAND_CLOSE,
                handleOn: null,
                handleOff: null,
            }
        } else if (dragState === "dropped") {
            btnZone = {
                elementId: "BtnNeprikosnovenna",
                imgCursor: CursorImages.POINTER,
                imgCursorClicked: CursorImages.HAND_CLOSE,
                handleOn: null,
                handleOff: null,
            }
        } else {
            btnZone = {
                elementId: "BtnNeprikosnovenna",
                imgCursor: CursorImages.POINTER,
                imgCursorClicked: CursorImages.POINTER_CLICKED,
                handleOn: handleOnBtn,
                handleOff: handleOffBtn,
            }
        }

        const ZoneData = {
            [Zone.NONE]: {
                elementId: null,
                imgCursor: CursorImages.DEFAULT,
                imgCursorClicked: CursorImages.DEFAULT,
                handleOn: null,
                handleOff: null,
            },
            [Zone.BACK]: {
                elementId: "Background-01_01",
                imgCursor: CursorImages.DEFAULT,
                imgCursorClicked: CursorImages.DEFAULT,
                handleOn: null,
                handleOff: null,
            },
            [Zone.EYES_WINDOW]: {
                elementId: "EyesWindow",
                imgCursor: CursorImages.POINTER,
                imgCursorClicked: CursorImages.POINTER_CLICKED,
                handleOn: handleOnEyesWindow,
                handleOff: handleOffEyesWindow,
            },
            [Zone.BTN_NEPRIKOSNOVENNA]: btnZone,
        }
        cursorZoneSettingsRef.current = createCursorZoneSettings({
            Zone,
            Data: { ...ZoneData },
        })
    }, [
        dragState,
        handleOnEyesWindow,
        handleOffEyesWindow,
        handleOnBtn,
        handleOffBtn,
    ])

    // Live-проверка покрытия. Если передан event — берём реальные клиентские
    // координаты; иначе fallback на lerp'd позицию кастомного курсора.
    // Использование event.clientX/Y устраняет race из-за лагающего lerp'а.
    const isCoveredAtCursor = useCallback((event) => {
        let x, y
        if (
            event &&
            typeof event.clientX === "number" &&
            typeof event.clientY === "number"
        ) {
            x = event.clientX
            y = event.clientY
        } else {
            const pos = cursorRef.current?.getPosition()
            if (!pos) return false
            x = pos.x
            y = pos.y
        }
        return isHandsOpaqueAt(x, y)
    }, [isHandsOpaqueAt])

    // По клику на окно глаз — раскрываем «руки + кнопку».
    // По клику на кнопку (только в state 'idle'):
    //   1) проверяем coverage руками по РЕАЛЬНЫМ event.clientX/Y (не по
    //      lerp'нутой позиции — против race на быстрых движениях);
    //   2) переключаем иконку курсора на HAND_CLOSE;
    //   3) замораживаем курсор (stopVideo ≡ stopCursor: снимает
    //      pointermove-listeners; курсор стоит в lerp'нутой позиции);
    //   4) переходим в state 'frozen' — rAF-sync ниже начнёт прилеплять
    //      кнопку к позиции курсора;
    //   5) через 1с снимаем freeze (start ≡ startCursor) и переводим в
    //      'dragging' — кнопка продолжает прилипать, но курсор уже
    //      движется за мышью.
    // window.open(/neprikosnovenna) удалён — переход заменён drag-механикой.
    const handleLeftClickDown = useCallback(
        (currentElementId, event) => {
            if (currentElementId === "EyesWindow" && !isOpened) {
                setIsOpened(true)
                return
            }
            if (
                currentElementId === "BtnNeprikosnovenna" &&
                dragStateRef.current === "idle"
            ) {
                if (isCoveredAtCursor(event)) return
                // Pivot offset: касание курсора (event.clientX/Y) минус
                // центр кнопки. В rAF потом btn.center = cursor − pivot.
                const btnEl = document.getElementById("BtnNeprikosnovenna")
                if (btnEl) {
                    const r = btnEl.getBoundingClientRect()
                    pivotOffsetRef.current = {
                        x: event.clientX - (r.left + r.width / 2),
                        y: event.clientY - (r.top + r.height / 2),
                    }
                }
                btnNeprikosnovennaRef.current?.click()
                cursorRef.current?.setSrc(CursorImages.HAND_CLOSE)
                cursorRef.current?.stopVideo()
                setDrag("frozen")
                freezeTimerRef.current = setTimeout(() => {
                    cursorRef.current?.start()
                    if (dragStateRef.current === "frozen") setDrag("dragging")
                    freezeTimerRef.current = null
                }, 1000)
            }
        },
        [isOpened, isCoveredAtCursor, setDrag],
    )

    // Re-assert корректной иконки курсора на любое pointer-событие.
    //
    // ВАЖНО про ordering:
    //   - cursor system (useCursorEvents.js) слушает pointerdown/up на
    //     window и в обработчике вызывает changeCursorSrc(POINTER_CLICKED)
    //     на pointerdown и changeCursorSrc(POINTER) на pointerup —
    //     безусловно, не зная о coverage.
    //   - addEventListener в одной фазе вызывает listeners в порядке
    //     регистрации. Cursor.jsx монтируется раньше — наш обработчик
    //     ниже регистрируется ПОСЛЕ → срабатывает позже → перебивает.
    //
    // Также re-assert на pointermove перебивает откат src от cursor system
    // (если переход зон случился между нашими тиками).
    useEffect(() => {
        const reassert = (event) => {
            // В состоянии 'dropped' — реассертим POINTER при наведении
            // на кнопку (zone-system читает currentZoneDataRef, который
            // обновляется только при смене зоны → может быть устаревшим).
            // В 'frozen'/'dragging' — иконку держит handleLeftClickDown
            // и pointerup-handler (HAND_CLOSE), не трогаем.
            const ds = dragStateRef.current
            if (ds === "frozen" || ds === "dragging") return
            // Реальные координаты события (event.clientX/Y) — синхронны
            // с пользовательским movement; lerp'нутая позиция курсора
            // отстаёт. Это критично для быстрых движений и кликов.
            let x, y
            if (
                event &&
                typeof event.clientX === "number" &&
                typeof event.clientY === "number"
            ) {
                x = event.clientX
                y = event.clientY
            } else {
                const pos = cursorRef.current?.getPosition()
                if (!pos) return
                x = pos.x
                y = pos.y
            }
            const btnEl = document.getElementById("BtnNeprikosnovenna")
            if (!btnEl) return
            // 'idle': пока кнопка ещё не «активна» (CSS transition держит
            // pointer-events: none во время delay + fade-in), не перебиваем
            // cursor src — иконкой управляет только zone-system.
            if (
                ds === "idle" &&
                getComputedStyle(btnEl).pointerEvents === "none"
            ) {
                isHandsCoveringBtnRef.current = false
                return
            }
            const r = btnEl.getBoundingClientRect()
            const overBtn =
                x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
            if (!overBtn) {
                isHandsCoveringBtnRef.current = false
                return
            }
            // 'dropped': курсор над кнопкой → POINTER (без alpha-hit
            // блокировки — после первого успешного клика игра выиграна).
            if (ds === "dropped") {
                cursorRef.current?.setSrc(CursorImages.POINTER)
                return
            }
            // 'idle': alpha-hit blocking + POINTER/DEFAULT.
            const covered = isHandsOpaqueAt(x, y)
            isHandsCoveringBtnRef.current = covered
            cursorRef.current?.setSrc(
                covered ? CursorImages.DEFAULT : CursorImages.POINTER,
            )
        }
        window.addEventListener("pointermove", reassert)
        window.addEventListener("pointerdown", reassert)
        window.addEventListener("pointerup", reassert)
        return () => {
            window.removeEventListener("pointermove", reassert)
            window.removeEventListener("pointerdown", reassert)
            window.removeEventListener("pointerup", reassert)
        }
    }, [isHandsOpaqueAt])

    // Drag-эффект 1: pickup-back. Если кнопка УЖЕ дропнута и
    // пользователь зажал ЛКМ внутри её bounding-box — снова прилеплять.
    // Freeze второй раз НЕ выполняем (он только на самый первый клик).
    useEffect(() => {
        const onPointerDown = (e) => {
            if (dragStateRef.current !== "dropped") return
            const btnEl = document.getElementById("BtnNeprikosnovenna")
            if (!btnEl) return
            const r = btnEl.getBoundingClientRect()
            const inside =
                e.clientX >= r.left &&
                e.clientX <= r.right &&
                e.clientY >= r.top &&
                e.clientY <= r.bottom
            if (!inside) return
            // Recalc pivot — пользователь подхватил кнопку в новой точке.
            pivotOffsetRef.current = {
                x: e.clientX - (r.left + r.width / 2),
                y: e.clientY - (r.top + r.height / 2),
            }
            cursorRef.current?.setSrc(CursorImages.HAND_CLOSE)
            setDrag("dragging")
        }
        window.addEventListener("pointerdown", onPointerDown)
        return () => window.removeEventListener("pointerdown", onPointerDown)
    }, [setDrag])

    // Drag-эффект 2: drop по pointerup (только из state 'dragging').
    // pointerup от исходного клика приходит во state 'frozen' —
    // ИГНОРИРУЕТСЯ для drop, но иконка реассертится в HAND_CLOSE,
    // т.к. cursor-system на pointerup ставит imgCursor зоны (в момент
    // первого pointerup zone-settings useEffect мог ещё не пересобраться
    // → стояла бы старая POINTER).
    useEffect(() => {
        const onPointerUp = (e) => {
            const s = dragStateRef.current
            if (s === "frozen") {
                cursorRef.current?.setSrc(CursorImages.HAND_CLOSE)
                return
            }
            if (s !== "dragging") return
            // droppedPos хранит позицию ЦЕНТРА кнопки (cursor − pivot),
            // т.к. в JSX inline-стиль ставит translate3d именно на центр.
            const off = pivotOffsetRef.current
            setDroppedPos({ x: e.clientX - off.x, y: e.clientY - off.y })
            setDrag("dropped")
            cursorRef.current?.setSrc(CursorImages.POINTER)
        }
        window.addEventListener("pointerup", onPointerUp)
        return () => window.removeEventListener("pointerup", onPointerUp)
    }, [setDrag])

    // Drag-эффект 3: rAF-sync позиции кнопочного слота с курсором.
    // Активен в 'frozen' и 'dragging'. Пишем style.transform НАПРЯМУЮ
    // в DOM (как useCursorParallax) — без ре-рендера на каждом тике.
    // translate(-50%,-50%) сохраняет «хват кнопки за центр».
    useEffect(() => {
        if (dragState !== "frozen" && dragState !== "dragging") return
        let raf = 0
        const tick = () => {
            const pos = cursorRef.current?.getPosition()
            const el = buttonSlotRef.current
            if (
                pos &&
                el &&
                pos.x !== null &&
                pos.x !== undefined &&
                pos.y !== null &&
                pos.y !== undefined
            ) {
                // btn.center = cursor − pivotOffset → курсор остаётся ровно
                // в той точке кнопки, где было касание.
                const off = pivotOffsetRef.current
                el.style.transform = `translate(-50%, -50%) translate3d(${pos.x - off.x}px, ${pos.y - off.y}px, 0)`
            }
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [dragState])

    const cursorSettings = useMemo(
        () =>
            createCursorSettings({
                imgCursor: CursorImages.DEFAULT,
                startX: null,
                startY: null,
                handleLeftClickDown,
                handleLeftClickUp: null,
                // Максимально быстрый курсор + плавная остановка.
                // ВНИМАНИЕ (useCursorMovePhysics.js:48): `damping` —
                // множитель сохранения скорости (velocity *= damping
                // каждый кадр). damping=0 → курсор не двигается;
                // damping→1 → overshoot.
                //
                // Скорость регулируется stiffness/mass (отношение 2:1 даёт
                // высокий acceleration). damping контролирует «хвост» при
                // подходе к цели: выше damping = velocity дольше сохраняется
                // у самой цели = плавнее остановка (без рывка).
                //
                // 0.5 → 0.75: остановка более «эластичная», без изменения
                // пикового скорости (ограничена maxSpeed=150).
                stiffness: 1.0,
                damping: 0.4,
                mass: 1,
                maxSpeed: 200,
            }),
        [handleLeftClickDown],
    )

    return (
        <>
            <Cursor
                ref={cursorRef}
                settings={cursorSettings}
                zoneSettingsRef={cursorZoneSettingsRef}
            />

            <main className={styles.main}>
                {/* Background — двигается параллаксом самостоятельно. */}
                <div
                    ref={backgroundRef}
                    id="Background-01_01"
                    className={`${styles.background} not-allowed z-1`}
                />

                {/* EyesWindow — двигается параллаксом весь, вместе с img и Glass.
                   Лежит ПОД текстом по z-index. Высота окна вычисляется
                   из ширины и aspect-ratio изображения (см. handleEyesImgLoad). */}
                <div
                    ref={eyesWindowRef}
                    id="EyesWindow"
                    className={`${styles.eyesWindow} not-allowed z-2`}
                    style={
                        eyesAspect
                            ? { aspectRatio: String(eyesAspect) }
                            : undefined
                    }
                >
                    <img
                        className={styles.eyesImage}
                        src="/images/ВЗГЛЯД.jpg"
                        alt=""
                        draggable={false}
                        onLoad={handleEyesImgLoad}
                    />
                    <Glass
                        mode="contained"
                        enableParallax={false}
                        frostBlur={0}
                        bgColor="rgba(0, 0, 0, 0.04)"
                    />
                </div>

                {/* Текст — статичен, ПОВЕРХ окна по z-index.
                   Скрывается плавно после клика на EyesWindow. */}
                <div
                    className={`${styles.textBlock} not-allowed z-3 ${
                        isOpened ? styles.textBlockHidden : ""
                    }`}
                >
                    <h1 className={styles.title}>
                        Миниатюра «Неприкосновенна»
                    </h1>
                    <p className={styles.body}>
                        Миниатюра о том, как удивительно способно{" "}
                        <span className={styles.underline}>рукотворное</span>{" "}
                        {" "}оживать и становиться{" "}
                        <span className={styles.underline}>сакральным</span>.
                    </p>
                </div>

                {/* Btn-Neprikosnovenna лежит ПОД руками по z-index, чтобы
                   руки визуально перекрывали кнопку (геймплей: успеть нажать
                   до перекрытия).
                   После drag → состояние 'dropped': inline-transform держит
                   кнопку в droppedPos. В 'frozen'/'dragging' transform пишется
                   из rAF-loop'а напрямую в DOM (см. эффект выше). */}
                <div
                    ref={buttonSlotRef}
                    className={[
                        styles.btnSlot,
                        isOpened ? styles.btnSlotVisible : null,
                        dragState !== "idle" ? styles.btnSlotDetached : null,
                    ]
                        .filter(Boolean)
                        .join(" ")}
                    style={
                        dragState === "dropped" && droppedPos
                            ? {
                                  transform: `translate(-50%, -50%) translate3d(${droppedPos.x}px, ${droppedPos.y}px, 0)`,
                              }
                            : undefined
                    }
                >
                    <Button
                        ref={btnNeprikosnovennaRef}
                        id="BtnNeprikosnovenna"
                        zIndex={5}
                        text="неприкосновенна"
                    />
                </div>

                {/* Hands — НАД кнопкой. pointer-events: none, поэтому клики
                   проходят насквозь к кнопке; pixel-perfect блокировка
                   делается в handleLeftClickDown через alpha hit-map. */}
                <img
                    ref={handsRef}
                    className={`${styles.hands} not-allowed z-7 ${
                        isOpened ? styles.handsVisible : ""
                    }`}
                    src="/images/РУКИ.png"
                    alt=""
                    draggable={false}
                    aria-hidden="true"
                />
            </main>
        </>
    )
}

SotvorenieZhizni.displayName = "SotvorenieZhizni"

export default SotvorenieZhizni
