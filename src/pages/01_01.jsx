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
        lerpFactor: 0.022,
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
            [Zone.BTN_NEPRIKOSNOVENNA]: {
                elementId: "BtnNeprikosnovenna",
                imgCursor: CursorImages.POINTER,
                imgCursorClicked: CursorImages.POINTER_CLICKED,
                handleOn: handleOnBtn,
                handleOff: handleOffBtn,
            },
        }
        cursorZoneSettingsRef.current = createCursorZoneSettings({
            Zone,
            Data: { ...ZoneData },
        })
    }, [
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
    // По клику на кнопку — пересчитываем coverage НА МЕСТЕ по реальным
    // координатам события (не по lerp'нутой позиции курсора), чтобы
    // быстрый клик при лагающем cursor lerp всё равно блокировался.
    // Успешный клик — открываем /neprikosnovenna в новой вкладке.
    const handleLeftClickDown = useCallback(
        (currentElementId, event) => {
            if (currentElementId === "EyesWindow" && !isOpened) {
                setIsOpened(true)
            } else if (currentElementId === "BtnNeprikosnovenna") {
                if (isCoveredAtCursor(event)) return
                btnNeprikosnovennaRef.current?.click()
                window.open("/neprikosnovenna", "_blank", "noopener")
            }
        },
        [isOpened, isCoveredAtCursor],
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
            // Пока кнопка ещё не «активна» (CSS transition держит
            // pointer-events: none во время delay + fade-in), не перебиваем
            // cursor src — иконкой управляет только zone-system.
            if (getComputedStyle(btnEl).pointerEvents === "none") {
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
                   до перекрытия). */}
                <div
                    className={`${styles.btnSlot} ${
                        isOpened ? styles.btnSlotVisible : ""
                    }`}
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
