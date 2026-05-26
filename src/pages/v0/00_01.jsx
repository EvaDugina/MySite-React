import styles from "./00_01.module.scss"
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import { useNavigate } from "react-router-dom"
import {
    createCursorZoneSettings,
    CursorImages,
} from "../../components/cursor/CursorSettings.js"
import Cursor from "../../components/cursor/Cursor.jsx"
import Button from "../../components/button/Button.jsx"
import Glass from "../../components/glass/Glass.jsx"

const Zone = {
    NONE: 0,
    BACK: 1,
    PORTRAIT: 2,
    BTN_SPIT: 3,
    BTN_KISS: 4,
}

const NEXT_ROUTE = "/01_01"
const NEXT_ROUTE_DELAY_MS = 1000
const CURSOR_PHYSICS_DEFAULT = {
    stiffness: 1,
    damping: 0.4,
    mass: 1,
    maxSpeed: 200,
}
const CURSOR_PHYSICS_AFTER_FIRST_CLICK = {
    stiffness: 0.5,
    damping: 0.68,
    mass: 1,
    maxSpeed: 0.2,
}

const Vhozhdenie = () => {
    const navigate = useNavigate()

    const cursorRef = useRef(null)
    const btnSpitRef = useRef(null)
    const btnKissRef = useRef(null)

    const [isSpitClicked, setIsSpitClicked] = useState(false)
    const [isKissClicked, setIsKissClicked] = useState(false)
    const hasFirstClick = isSpitClicked || isKissClicked

    // Переход на следующую страницу — через 1 секунду после второго клика.
    useEffect(() => {
        if (isSpitClicked && isKissClicked) {
            const id = setTimeout(() => navigate(NEXT_ROUTE), NEXT_ROUTE_DELAY_MS)
            return () => clearTimeout(id)
        }
    }, [isSpitClicked, isKissClicked, navigate])

    // Не трогаем кнопку, если она уже disabled — иначе reset() вернёт
    // canClicked=true и кнопку можно будет нажать повторно.
    const handleOnBtnSpit = useCallback(() => {
        if (btnSpitRef.current?.isDisabled()) return
        btnSpitRef.current?.hover()
    }, [])
    const handleOffBtnSpit = useCallback(() => {
        if (btnSpitRef.current?.isDisabled()) return
        btnSpitRef.current?.reset()
    }, [])
    const handleOnBtnKiss = useCallback(() => {
        if (btnKissRef.current?.isDisabled()) return
        btnKissRef.current?.hover()
    }, [])
    const handleOffBtnKiss = useCallback(() => {
        if (btnKissRef.current?.isDisabled()) return
        btnKissRef.current?.reset()
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
                elementId: "Background-0",
                imgCursor: CursorImages.DEFAULT,
                imgCursorClicked: CursorImages.DEFAULT,
                handleOn: null,
                handleOff: null,
            },
            [Zone.PORTRAIT]: {
                elementId: "Portrait",
                imgCursor: CursorImages.DEFAULT,
                imgCursorClicked: CursorImages.DEFAULT,
                handleOn: null,
                handleOff: null,
            },
            [Zone.BTN_SPIT]: {
                elementId: "BtnSpit",
                imgCursor: CursorImages.POINTER,
                imgCursorClicked: CursorImages.POINTER_CLICKED,
                handleOn: handleOnBtnSpit,
                handleOff: handleOffBtnSpit,
            },
            [Zone.BTN_KISS]: {
                elementId: "BtnKiss",
                imgCursor: CursorImages.POINTER,
                imgCursorClicked: CursorImages.POINTER_CLICKED,
                handleOn: handleOnBtnKiss,
                handleOff: handleOffBtnKiss,
            },
        }

        cursorZoneSettingsRef.current = createCursorZoneSettings({
            Zone,
            Data: { ...ZoneData },
        })
    }, [
        handleOnBtnSpit,
        handleOffBtnSpit,
        handleOnBtnKiss,
        handleOffBtnKiss,
    ])

    const handleLeftClickDown = useCallback(
        (currentElementId) => {
            if (currentElementId === "BtnSpit" && !isSpitClicked) {
                btnSpitRef.current?.disable()
                setIsSpitClicked(true)
            } else if (currentElementId === "BtnKiss" && !isKissClicked) {
                btnKissRef.current?.disable()
                setIsKissClicked(true)
            }
            // Клик по портрету и фону — игнорируем.
        },
        [isSpitClicked, isKissClicked],
    )

    const cursorSettings = useMemo(
        () => {
            const cursorPhysics = hasFirstClick
                ? CURSOR_PHYSICS_AFTER_FIRST_CLICK
                : CURSOR_PHYSICS_DEFAULT

            return {
                imgCursor: CursorImages.DEFAULT,
                isHidden: false,
                startX: null,
                startY: null,
                handleLeftClickDown,
                handleLeftClickUp: null,
                handleDoubleLeftClick: null,
                ...cursorPhysics,
            }
        },
        [handleLeftClickDown, hasFirstClick],
    )

    return (
        <>
            <Cursor
                ref={cursorRef}
                settings={cursorSettings}
                zoneSettingsRef={cursorZoneSettingsRef}
            />

            <main className={styles.main}>
                <article className={styles.frame}>
                    <img
                        id="Portrait"
                        className={`${styles.portrait} not-allowed z-1`}
                        src="/images/НЕПРИКОСНОВЕННА.webp"
                        alt=""
                        draggable={false}
                    />

                    <Glass
                        zIndex={3}
                        maxOffsetX={40}
                        maxOffsetY={40}
                        enableParallax={false}
                        enableGyroscope={false}
                        fallbackToMouse={false}
                        extraClass="d-none"
                        pointerThrottleMs={16}
                    />

                    {/* Текст статичен: Glass на этой странице скрыт и не слушает
                       pointermove, чтобы не нагружать движение курсора. */}
                    <div
                        className={`${styles.textBlock} not-allowed z-3`}
                    >
                        <h1 className={styles.title}>
                            Миниатюра «Неприкосновенна»
                        </h1>
                        <p className={styles.body}>
                            Миниатюра о том, как удивительно способно{" "}
                            <span className={styles.underline}>
                                рукотворное
                            </span>{" "}
                            {" "}оживать и становиться{" "}
                            <span className={styles.underline}>
                                сакральным
                            </span>
                            .
                        </p>
                    </div>

                    <div className={styles.btnSpitSlot}>
                        <Button
                            ref={btnSpitRef}
                            id="BtnSpit"
                            zIndex={4}
                            text="плюнуть"
                        />
                    </div>

                    <div className={styles.btnKissSlot}>
                        <Button
                            ref={btnKissRef}
                            id="BtnKiss"
                            zIndex={4}
                            text="поцеловать"
                        />
                    </div>
                </article>
            </main>
        </>
    )
}

Vhozhdenie.displayName = "Vhozhdenie"

export default Vhozhdenie
