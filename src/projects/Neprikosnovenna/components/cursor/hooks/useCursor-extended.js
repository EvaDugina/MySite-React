import { useState, useEffect, useCallback, useRef } from "react"
import { CursorController } from "../CursorController-extended"

export function useCursor(
    settings,
    cursorImages,
    zones,
    zonesSettings,
    cursorElementRef,
) {
    const [cursorState, setCursorState] = useState({
        position: { x: 0, y: 0 },
        src: cursorImages.NONE || null,
        zone: zones.NONE,
        isHidden: false,
        isStopped: false,
    })

    const cursorControllerRef = useRef(null)
    const zoneElementsRef = useRef({})

    // Инициализация контроллера
    useEffect(() => {
        if (!cursorElementRef?.current) return

        const controller = new CursorController(
            settings,
            cursorImages,
            zones,
            zonesSettings,
            setCursorState,
        )

        cursorControllerRef.current = controller

        // Инициализируем контроллер с элементом курсора
        controller.init(cursorElementRef.current)

        // Добавляем обработчик ресайза
        const handleResize = () => {
            controller.handleOnResize()
        }
        window.addEventListener("resize", handleResize)

        return () => {
            controller.stopCursor()
            controller.disableCursor()
            window.removeEventListener("resize", handleResize)
        }
    }, [settings, cursorImages, zones, zonesSettings, cursorElementRef])

    // Метод для регистрации элементов зон
    const registerZoneElement = useCallback((zoneId, elementRef) => {
        if (!zoneElementsRef.current[zoneId] && elementRef?.current) {
            zoneElementsRef.current[zoneId] = elementRef
            cursorControllerRef.current?.setZoneElements(
                zoneElementsRef.current,
            )
        }
    }, [])

    // Метод для удаления элемента зоны
    const unregisterZoneElement = useCallback((zoneId) => {
        delete zoneElementsRef.current[zoneId]
        cursorControllerRef.current?.setZoneElements(zoneElementsRef.current)
    }, [])

    // Обновление зон при изменении размеров окна
    const updateZones = useCallback(() => {
        cursorControllerRef.current?.setZoneElements(zoneElementsRef.current)
    }, [])

    // Методы управления курсором
    const freezeCursor = useCallback((src) => {
        cursorControllerRef.current?.freezeCursorSrc(src)
    }, [])

    const hideCursor = useCallback(() => {
        cursorControllerRef.current?.hideCursor()
    }, [])

    const showCursor = useCallback(() => {
        cursorControllerRef.current?.showCursor()
    }, [])

    const stopCursor = useCallback(() => {
        cursorControllerRef.current?.stopCursor()
    }, [])

    const restartCursor = useCallback(() => {
        cursorControllerRef.current?.restartCursor()
    }, [])

    const getCursorPosition = useCallback(() => {
        return (
            cursorControllerRef.current?.getCursorState()?.position || {
                x: 0,
                y: 0,
            }
        )
    }, [])

    const isCursorInZone = useCallback((zoneType) => {
        return cursorControllerRef.current?.isCursorZone(zoneType) || false
    }, [])

    return {
        cursorState,
        registerZoneElement,
        unregisterZoneElement,
        updateZones,
        freezeCursor,
        hideCursor,
        showCursor,
        stopCursor,
        restartCursor,
        getCursorPosition,
        isCursorInZone,
    }
}
