import { useState, useEffect, useRef } from "react"
import { CursorController } from "../CursorController"
import { CursorType, CursorImages } from "../CursorConstants"

export function useCursor(cursorSettings, cursorZoneConfig) {
    const [cursorState, setCursorState] = useState({
        position: {
            x: null,
            y: null,
        },
        src: CursorImages.POINTER,
        zone: cursorZoneConfig.Zone.NONE,
        isHidden: false,
    })

    const cursorControllerRef = useRef(null)

    // Инициализация контроллера
    useEffect(() => {
        const controller = new CursorController(
            cursorState,
            cursorSettings,
            cursorZoneConfig,
            setCursorState,
        )

        cursorControllerRef.current = controller

        // Инициализируем контроллер
        controller.init()

        return () => {
            controller.destroy()
        }
    }, [cursorSettings])

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
