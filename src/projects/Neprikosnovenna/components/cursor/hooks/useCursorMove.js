import { useState, useEffect, useRef, useCallback } from "react"
import useCursorMovePhysics from "./useCursorMovePhysics"
import useCursorMoveAnimation from "./useCursorMoveAnimation"

export function useCursorMove(
    cursorSettings,
    showCursor,
    enableCursor,
    disableCursor,
) {
    const isTargetNotInitRef = useRef(false)
    const isStoppedRef = useRef(true)

    const [position, setPosition] = useState({ x: null, y: null })
    const positionRef = useRef(position)
    const targetRef = useRef({ x: null, y: null })
    const { resetVelocity, isNearTarget, recalculatePosition } =
        useCursorMovePhysics(
            cursorSettings.stiffness,
            cursorSettings.mass,
            cursorSettings.damping,
            cursorSettings.maxSpeed,
        )

    const windowSizeRef = useRef({
        width: null,
        height: null,
    })

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

        // Оптимизация. Условие остановки анимации, когда курсор неподвижен
        if (isNearTarget(positionRef.current, targetRef.current)) {
            positionRef.current = { ...targetRef.current }
            setPosition(positionRef.current)
            resetVelocity()
            stopAnimation()
            return
        }

        positionRef.current = recalculatePosition(positionRef.current, targetRef.current)
        setPosition(positionRef.current)

        continueAnimation()
    }, [])

    const { startAnimation, continueAnimation, stopAnimation } =
        useCursorMoveAnimation(updatePosition, isStoppedRef)

    return {
        position,
        stopCursor,
        startCursor,
    }
}

export default useCursorMove
