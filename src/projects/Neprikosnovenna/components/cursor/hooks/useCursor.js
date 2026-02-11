import { useState, useEffect, useRef } from "react"

export function useCursor(
    cursorSettings,
    handleLeftClickDown,
    handleLeftClickUp,
    handleOnZone,
    handleOffZone,
) {
    // Refs для изменяемых значений
    const positionRef = useRef({ x: null, y: null })
    const targetRef = useRef({ x: null, y: null })
    const velocityRef = useRef({ x: 0, y: 0 })
    const isTargetNotInitRef = useRef(false)
    const isStoppedRef = useRef(true)
    const isMouseDownRef = useRef(false)
    const isHiddenRef = useRef(true)
    const animationIdRef = useRef(null)

    // Ref для зоны (не зависит от состояния)
    const elementZoneRef = useRef(null)

    const [cursorState, setCursorState] = useState({
        position: { x: positionRef.current.x, y: positionRef.current.y },
        isHidden: isHiddenRef.current,
    })

    const updateState = (newState) => {
        setCursorState((prev) => ({ ...prev, ...newState }))
    }

    // Инициализация контроллера
    useEffect(() => {
        // Инициализируем контроллер
        init()

        return () => {
            destroy()
        }
    }, [])

    //
    // PUBLIC METHODS
    //

    const hideCursor = () => {
        if (isHiddenRef.current) return
        isHiddenRef.current = true
        updateState({
            isHidden: isHiddenRef.current,
        })
    }

    const showCursor = () => {
        if (!isHiddenRef.current) return
        isHiddenRef.current = false
        updateState({
            isHidden: isHiddenRef.current,
        })
    }

    const startCursor = () => {
        isStoppedRef.current = false
        window.addEventListener("mousemove", onMosemove)
        startAnimation()
    }

    const stopCursor = () => {
        isStoppedRef.current = true
        window.removeEventListener("mousemove", onMosemove)
        if (animationIdRef.current) {
            cancelAnimationFrame(animationIdRef.current)
            animationIdRef.current = null
        }
    }

    const enableCursor = () => {
        window.addEventListener("mousedown", onMouseDown)
        window.addEventListener("mouseup", onMouseUp)
    }

    const disableCursor = () => {
        window.removeEventListener("mousedown", onMouseDown)
        window.removeEventListener("mouseup", onMouseUp)
    }

    //
    // INIT & DESTROY
    //

    const init = () => {
        // initPosition
        if (cursorSettings.startX != null && cursorSettings.startY != null) {
            positionRef.current.x = window.innerWidth * cursorSettings.startX
            positionRef.current.y = window.innerHeight * cursorSettings.startY
            updateState({
                position: {
                    x: positionRef.current.x,
                    y: positionRef.current.y,
                },
            })
            showCursor()
        } else {
            isTargetNotInitRef.current = true
        }

        let timeout = cursorSettings.timeout || 0

        setTimeout(() => {
            startCursor()
            enableCursor()
            window.addEventListener("blur", onBlur)
        }, timeout * 1000)
    }

    const destroy = () => {
        stopCursor()
        disableCursor()
        window.removeEventListener("blur", onBlur)
    }

    //
    // HANDLERS
    //

    const onMosemove = (event) => {
        targetRef.current = { x: event.clientX, y: event.clientY }
        startAnimation()
    }

    // Обработчики событий мыши
    const onMouseDown = (event) => {
        if (event.which === 1) {
            if (isMouseDownRef.current) return

            isMouseDownRef.current = true

            // Обычный клик
            if (handleLeftClickDown) {
                handleLeftClickDown(event)
            }
        }
    }

    const onMouseUp = (event) => {
        if (event.which === 1) {
            if (!isMouseDownRef.current) return

            isMouseDownRef.current = false

            if (handleLeftClickUp) {
                handleLeftClickUp(event)
            }
        }
    }

    const onBlur = () => {
        if (animationIdRef.current) {
            // cancelAnimationFrame(animationIdRef.current)
            animationIdRef.current = null
        }
    }

    //
    // LOCAL METHODS
    //

    const startAnimation = () => {
        if (!animationIdRef.current && !isStoppedRef.current) {
            animationIdRef.current = requestAnimationFrame(updatePosition)
        }
    }

    const updatePosition = () => {
        if (
            isStoppedRef.current ||
            targetRef.current.x == null ||
            targetRef.current.y == null
        ) {
            animationIdRef.current = requestAnimationFrame(updatePosition)
            return
        }

        let currentPosition = { ...positionRef.current }

        // Инициализация на месте указателя
        if (isTargetNotInitRef.current) {
            currentPosition.x = targetRef.current.x
            currentPosition.y = targetRef.current.y
            isTargetNotInitRef.current = false
            showCursor()
        }

        // Рассчитываем силу (разница между текущей и целевой позицией)
        const forceX =
            (targetRef.current.x - currentPosition.x) * cursorSettings.stiffness
        const forceY =
            (targetRef.current.y - currentPosition.y) * cursorSettings.stiffness

        // Ускорение = сила / масса
        const accelerationX = forceX / cursorSettings.mass
        const accelerationY = forceY / cursorSettings.mass

        // Обновляем скорость с учетом ускорения и затухания
        velocityRef.current.x =
            (velocityRef.current.x + accelerationX) * cursorSettings.damping
        velocityRef.current.y =
            (velocityRef.current.y + accelerationY) * cursorSettings.damping

        // Ограничиваем максимальную скорость
        const speed = Math.sqrt(
            velocityRef.current.x * velocityRef.current.x +
                velocityRef.current.y * velocityRef.current.y,
        )
        if (speed > cursorSettings.maxSpeed) {
            velocityRef.current.x =
                (velocityRef.current.x / speed) * cursorSettings.maxSpeed
            velocityRef.current.y =
                (velocityRef.current.y / speed) * cursorSettings.maxSpeed
        }

        currentPosition = {
            x: currentPosition.x + velocityRef.current.x,
            y: currentPosition.y + velocityRef.current.y,
        }

        if (
            currentPosition.x != positionRef.current.x ||
            currentPosition.y != positionRef.current.y
        ) {
            positionRef.current.x = currentPosition.x
            positionRef.current.y = currentPosition.y

            // Обновляем состояние
            updateState({
                position: {
                    x: positionRef.current.x,
                    y: positionRef.current.y,
                },
            })

            updateCurrentZone()
        }

        // Продолжаем анимацию
        animationIdRef.current = requestAnimationFrame(updatePosition)
    }

    const updateCurrentZone = () => {
        const elementUnder = document.elementFromPoint(
            positionRef.current.x,
            positionRef.current.y,
        )
        if (elementZoneRef.current == elementUnder) return

        if (handleOffZone) handleOffZone(elementZoneRef.current)
        elementZoneRef.current = elementUnder
        if (handleOnZone) handleOnZone(elementZoneRef.current)
    }

    return {
        cursorState,
        showCursor,
        hideCursor,
        stopCursor,
        startCursor,
        enableCursor,
        disableCursor,
    }
}
