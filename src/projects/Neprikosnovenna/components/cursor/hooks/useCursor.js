import { useState, useEffect, useRef, useCallback } from "react"
import useCursorPhysics from "./useCursorPhysics"

export function useCursor(
    cursorSettings,
    position,
    setPosition,
    showCursor,
    handleLeftClickDown,
    handleLeftClickUp,
) {
    const { positionRef, targetRef, velocityRef, recalculatePosition } =
        useCursorPhysics(
            position,
            cursorSettings.stiffness,
            cursorSettings.mass,
            cursorSettings.damping,
            cursorSettings.maxSpeed,
        )

    const isTargetNotInitRef = useRef(false)
    const isStoppedRef = useRef(true)
    const isMouseDownRef = useRef(false)
    const animationIdRef = useRef(null)

    const windowSizeRef = useRef({
        width: null,
        height: null,
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
        init()
        return () => {
            destroy()
        }
    }, [])

    //
    // PUBLIC METHODS
    //

    const startCursor = useCallback(() => {
        isStoppedRef.current = false
        window.addEventListener("mousemove", onMouseMove)
        startAnimation()
    }, [])

    const stopCursor = useCallback(() => {
        isStoppedRef.current = true
        window.removeEventListener("mousemove", onMouseMove)
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
        windowSizeRef.current = {
            width: window.innerWidth,
            height: window.innerHeight,
        }

        if (cursorSettings.startX != null && cursorSettings.startY != null) {
            positionRef.current = {
                x: windowSizeRef.current.width * cursorSettings.startX,
                y: windowSizeRef.current.height * cursorSettings.startY,
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

    const onMouseMove = (event) => {
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
            targetRef.current.x === null ||
            targetRef.current.y === null ||
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

        recalculatePosition()
        setPosition(positionRef.current)

        // Продолжаем анимацию
        animationIdRef.current = requestAnimationFrame(updatePosition)
    }, [])

    return {
        stopCursor,
        startCursor,
        enableCursor,
        disableCursor,
    }
}
