import { useCallback, useRef } from "react"

export function useCursorEvents(handleLeftClickDown, handleLeftClickUp) {
    const isMouseDownRef = useRef(false)

    //
    // PUBLIC
    //

    const enableCursor = useCallback(() => {
        window.addEventListener("mousedown", onMouseDown)
        window.addEventListener("mouseup", onMouseUp)
    }, [])

    const disableCursor = useCallback(() => {
        window.removeEventListener("mousedown", onMouseDown)
        window.removeEventListener("mouseup", onMouseUp)
    }, [])

    //
    // LOCAL
    //

    const onMouseDown = useCallback(
        (event) => {
            if (event.button === 0) {
                if (isMouseDownRef.current) return
                isMouseDownRef.current = true
                handleLeftClickDown?.(event)
            }
        },
        [handleLeftClickDown],
    )

    const onMouseUp = useCallback(
        (event) => {
            if (event.button === 0) {
                if (!isMouseDownRef.current) return
                isMouseDownRef.current = false
                handleLeftClickUp?.(event)
            }
        },
        [handleLeftClickUp],
    )

    return { enableCursor, disableCursor }
}

export default useCursorEvents
