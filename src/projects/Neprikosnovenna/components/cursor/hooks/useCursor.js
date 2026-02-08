import { useState, useEffect, useRef } from "react"
import { CursorController } from "../CursorController"

export function useCursor(settings) {
    const [cursorState, setCursorState] = useState({
        position: { x: 0, y: 0 },
        isHidden: false,
        isStopped: false,
    })

    const cursorControllerRef = useRef(null)

    // Инициализация контроллера
    useEffect(() => {
        const controller = new CursorController(settings, setCursorState)

        cursorControllerRef.current = controller

        // Инициализируем контроллер
        controller.init()

        return () => {
            controller.destroy()
        }
    }, [settings])

    // Методы управления курсором
    const hideCursor = () => {
        cursorControllerRef.current?.hideCursor()
    }

    const showCursor = () => {
        cursorControllerRef.current?.showCursor()
    }

    const stopCursor = () => {
        cursorControllerRef.current?.stopCursor()
    }

    const restartCursor = () => {
        cursorControllerRef.current?.restartCursor()
    }

    return {
        cursorState,
        hideCursor,
        showCursor,
        stopCursor,
        restartCursor,
    }
}
