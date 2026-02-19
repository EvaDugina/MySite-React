import { useRef, useEffect, useCallback } from "react"
import useThrottle from "./useThrottle"

export function useCursorZone(
    getPositionStable,
    zoneSettingsRef,
    changeCursorSrc,
) {
    const elementZoneRef = useRef(null)
    const currentZoneDataRef = useRef(
        zoneSettingsRef.current.Data[zoneSettingsRef.current.Zone.NONE],
    )

    useEffect(() => {
        elementZoneRef.current = null
    }, [zoneSettingsRef.current.Data])

    const updateCurrentZone = useCallback(() => {
        // event.preventDefault();
        const position = getPositionStable()
        const elementUnder = document.elementFromPoint(
            position.x,
            position.y,
        )
        if (elementZoneRef.current && elementZoneRef.current.id === elementUnder.id) return null

        handleOffZone?.(elementZoneRef.current)
        elementZoneRef.current = elementUnder
        handleOnZone?.(elementZoneRef.current)
    }, []);

    const updateCurrentZoneThrottled = useThrottle(updateCurrentZone, 50);

    useEffect(() => {
        document.addEventListener("pointermove", updateCurrentZoneThrottled)
        return () => {
            document.removeEventListener("pointermove", updateCurrentZoneThrottled)
        }
    }, [])

    const handleOnZone = useCallback(
        (elementZone) => {
            if (!elementZone) return
            let isFoundZone = false
            Object.values(zoneSettingsRef.current.Zone).forEach((zoneValue) => {
                const data = zoneSettingsRef.current.Data[zoneValue]
                if (data.elementId === elementZone.id) {
                    isFoundZone = true
                    changeCursorSrc(data.imgCursor)
                    currentZoneDataRef.current = data
                    data.handleOn?.()
                }
            })

            if (isFoundZone) return

            // Если зона не найдена обнуляем зону в NONE
            const noneData = zoneSettingsRef.current.Data[zoneSettingsRef.current.Zone.NONE];
            changeCursorSrc(noneData.imgCursor);
            currentZoneDataRef.current = noneData;
            noneData.handleOn?.();

        }, [])

    const handleOffZone = useCallback(
        (elementZone) => {
            if (!elementZone) return
            Object.values(zoneSettingsRef.current.Zone).forEach((zoneValue) => {
                const data = zoneSettingsRef.current.Data[zoneValue]
                if (data.elementId === elementZone.id)
                    data.handleOff?.()
            })
        }, [])

    return { currentZoneDataRef, updateCurrentZoneThrottled }
}

export default useCursorZone
