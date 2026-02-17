import { useRef, useEffect, useCallback } from "react"
import useThrottle from "./useThrottle"

export function useCursorZone(
    cursorPosition,
    cursorZoneConfig,
    changeCursorSrc,
) {
    const elementZoneRef = useRef(null)
    const currentZoneDataRef = useRef(
        cursorZoneConfig.Data[cursorZoneConfig.Zone.NONE],
    )

    const updateCurrentZone = useThrottle(() => {
        const elementUnder = document.elementFromPoint(
            cursorPosition.x,
            cursorPosition.y,
        )
        if (elementZoneRef.current === elementUnder) return

        handleOffZone?.(elementZoneRef.current)
        elementZoneRef.current = elementUnder
        handleOnZone?.(elementZoneRef.current)
    }, 50)

    useEffect(() => {
        document.addEventListener("mousemove", updateCurrentZone)
        return () => {
            document.removeEventListener("mousemove", updateCurrentZone)
        }
    }, [updateCurrentZone])

    const handleOnZone = useCallback(
        (elementZone) => {
            if (!elementZone) return
            let isFoundZone = false
            Object.values(cursorZoneConfig.Zone).forEach((zoneValue) => {
                const data = cursorZoneConfig.Data[zoneValue]
                if (data.elementId === elementZone.id) {
                    isFoundZone = true
                    changeCursorSrc(data.imgCursor)
                    currentZoneDataRef.current = data
                    data.handleOn?.()
                }
            })

            if (isFoundZone) return

            // Если зона не найдена обнуляем зону в NONE
            // const noneData = cursorZoneConfig.Data[cursorZoneConfig.Zone.NONE];
            // changeCursorSrc(noneData.imgCursor);
            // currentZoneDataRef.current = noneData;
            // noneData.handleOn?.();

        },
        [cursorZoneConfig, changeCursorSrc],
    )

    const handleOffZone = useCallback(
        (elementZone) => {
            if (!elementZone) return
            Object.values(cursorZoneConfig.Zone).forEach((zoneValue) => {
                const data = cursorZoneConfig.Data[zoneValue]
                if (data.elementId === elementZone.id) data.handleOff?.()
            })
        },
        [cursorZoneConfig],
    )

    return { currentZoneDataRef }
}

export default useCursorZone
