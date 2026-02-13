import { useState, useEffect, useRef, useCallback } from "react"

export function useCursor(
    cursorSettings,
    position,
    setPosition,
    isHidden,
    setIsHidden,
    updateCurrentZone,
    handleLeftClickDown,
    handleLeftClickUp,
) {
    // Refs для изменяемых значений
    const positionRef = useRef(position)
    const isHiddenRef = useRef(isHidden)

    const targetRef = useRef({ x: null, y: null })
    const velocityRef = useRef({ x: 0, y: 0 })
    const isTargetNotInitRef = useRef(false)
    const isStoppedRef = useRef(true)
    const isMouseDownRef = useRef(false)
    const animationIdRef = useRef(null)

    const windowSizeRef = useRef({
        width: window.innerWidth,
        height: window.innerHeight,
    })

    const callbacksRef = useRef({
        handleLeftClickDown,
        handleLeftClickUp,
    })
    useEffect(() => {
        callbacksRef.current = {
            handleLeftClickDown,
            handleLeftClickUp,
        }
    }, [handleLeftClickDown, handleLeftClickUp])

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

    const hideCursor = useCallback(() => {
        if (isHiddenRef.current) return
        isHiddenRef.current = true
        setIsHidden(isHiddenRef.current)
    }, [])

    const showCursor = useCallback(() => {
        if (!isHiddenRef.current) return
        isHiddenRef.current = false
        setIsHidden(isHiddenRef.current)
    }, [])

    const startCursor = useCallback(() => {
        isStoppedRef.current = false
        window.addEventListener("mousemove", onMoseMove)
        startAnimation()
    }, [])

    const stopCursor = useCallback(() => {
        isStoppedRef.current = true
        window.removeEventListener("mousemove", onMoseMove)
        stopAnimation()
    }, [])

    const enableCursor = useCallback(() => {
        window.addEventListener("mousedown", onMouseDown)
        window.addEventListener("mouseup", onMouseUp)
    }, [])

    const disableCursor = useCallback(() => {
        window.removeEventListener("mousedown", onMouseDown)
        window.removeEventListener("mouseup", onMouseUp)
    }, [])

    //
    // INIT & DESTROY
    //

    const init = () => {
        // initPosition
        if (cursorSettings.startX != null && cursorSettings.startY != null) {
            positionRef.current = {
                x: window.innerWidth * cursorSettings.startX,
                y: window.innerHeight * cursorSettings.startY,
            }
            setPosition(positionRef.current)
            showCursor()
        } else {
            isTargetNotInitRef.current = true
        }

        startCursor()
        enableCursor()

        window.addEventListener("blur", onBlur)
        window.addEventListener("resize", onResize)
    }

    const destroy = () => {
        stopCursor()
        disableCursor()
        window.removeEventListener("blur", onBlur)
        window.removeEventListener("resize", onResize)
    }

    //
    // HANDLERS
    //

    const onMoseMove = (event) => {
        targetRef.current = { x: event.clientX, y: event.clientY }
        startAnimation()
    }

    // Обработчики событий мыши
    const onMouseDown = (event) => {
        if (event.button === 0) {
            if (isMouseDownRef.current) return
            isMouseDownRef.current = true
            callbacksRef.current.handleLeftClickDown?.(event)
        }
    }

    const onMouseUp = (event) => {
        if (event.button === 0) {
            if (!isMouseDownRef.current) return
            isMouseDownRef.current = false
            callbacksRef.current.handleLeftClickUp?.(event)
        }
    }

    const onBlur = () => {
        stopAnimation()
    }

    const onResize = () => {
        const newWindowSize = {
            width: window.innerWidth,
            height: window.innerHeight,
        }

        positionRef.current = {
            x:
                (positionRef.current.x / windowSizeRef.current.width) *
                newWindowSize.width,
            y:
                (positionRef.current.y / windowSizeRef.current.height) *
                newWindowSize.height,
        }
        setPosition(positionRef.current)

        windowSizeRef.current = { ...newWindowSize }
    }

    //
    // LOCAL METHODS
    //

    const startAnimation = () => {
        if (animationIdRef.current) return
        if (!isStoppedRef.current)
            animationIdRef.current = requestAnimationFrame(updatePosition)
    }

    const stopAnimation = () => {
        if (animationIdRef.current) {
            cancelAnimationFrame(animationIdRef.current)
            animationIdRef.current = null
        }
    }

    const updatePosition = useCallback(() => {
        if (
            targetRef.current.x == null ||
            targetRef.current.y == null ||
            isStoppedRef.current
        ) {
            stopAnimation()
            return
        }

        // Инициализация на месте указателя
        if (isTargetNotInitRef.current) {
            isTargetNotInitRef.current = false
            positionRef.current = { ...targetRef.current }
            setPosition(positionRef.current)
            showCursor()
        }

        let currentPosition = { ...positionRef.current }

        // Оптимизация. Условие остановки анимации, когда курсор неподвижен
        const EPS = 0.1
        const isNearTarget =
            Math.hypot(
                targetRef.current.x - currentPosition.x,
                targetRef.current.y - currentPosition.y,
            ) < EPS
        const isAlmostStopped =
            Math.hypot(velocityRef.current.x, velocityRef.current.y) < EPS
        if (isNearTarget && isAlmostStopped) {
            positionRef.current = { ...targetRef.current }
            setPosition(positionRef.current)
            velocityRef.current = { x: 0, y: 0 }
            stopAnimation()
            return
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

        positionRef.current = {
            x: currentPosition.x + velocityRef.current.x,
            y: currentPosition.y + velocityRef.current.y,
        }
        setPosition(positionRef.current)

        updateCurrentZone(positionRef.current.x, positionRef.current.y)

        // Продолжаем анимацию
        animationIdRef.current = requestAnimationFrame(updatePosition)
    }, [cursorSettings])

    return {
        showCursor,
        hideCursor,
        stopCursor,
        startCursor,
        enableCursor,
        disableCursor,
    }
}
