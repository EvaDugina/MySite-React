import { useRef, useCallback } from "react"

export function useZone(cursorZoneConfig, changeCursorSrc) {
    const elementZoneRef = useRef(null)
    const currentZoneData = useRef(
        cursorZoneConfig.Data[cursorZoneConfig.Zone.NONE],
    )

    const handleOnZone = (elementZone) => {
        if (!elementZone) return
        Object.values(cursorZoneConfig.Zone).forEach((zoneValue) => {
            const data = cursorZoneConfig.Data[zoneValue]
            if (data.elementId == elementZone.id) {
                changeCursorSrc(data.imgCursor)
                if (data.handleOn) data.handleOn()
                currentZoneData.current = data
            }
        })
    }

    const handleOffZone = (elementZone) => {
        if (!elementZone) return
        Object.values(cursorZoneConfig.Zone).forEach((zoneValue) => {
            const data = cursorZoneConfig.Data[zoneValue]
            if (data.elementId == elementZone.id) {
                if (data.handleOn) data.handleOff()
            }
        })
    }

    const updateCurrentZone = (cursorPositionX, cursorPositionY) => {
        const elementUnder = document.elementFromPoint(
            cursorPositionX,
            cursorPositionY,
        )
        if (elementZoneRef.current == elementUnder) return

        if (handleOffZone) handleOffZone(elementZoneRef.current)
        elementZoneRef.current = elementUnder
        if (handleOnZone) handleOnZone(elementZoneRef.current)
    }

    return { currentZoneData, updateCurrentZone }
}
