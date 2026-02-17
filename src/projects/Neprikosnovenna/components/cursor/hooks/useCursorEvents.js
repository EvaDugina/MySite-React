import { useCallback, useRef } from "react"

export function useCursorEvents(handleLeftClickDown, handleLeftClickUp) {
    const isMouseDownRef = useRef(false)

    // const callbacksRef = useRef({ handleLeftClickDown, handleLeftClickUp });
    // useEffect(() => {
    //     callbacksRef.current = { handleLeftClickDown, handleLeftClickUp };
    // }, [handleLeftClickDown, handleLeftClickUp]);

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

    const onMouseDown = useCallback((event) => {
        if (event.button === 0) {
            if (isMouseDownRef.current) return
            isMouseDownRef.current = true
            // callbacksRef.current.handleLeftClickDown?.(event)
            handleLeftClickDown(event)
        }
    }, [])

    const onMouseUp = useCallback((event) => {
        if (event.button === 0) {
            if (!isMouseDownRef.current) return
            isMouseDownRef.current = false
            // callbacksRef.current.handleLeftClickUp?.(event)
            handleLeftClickUp(event)
        }
    }, [])

    return { enableCursor, disableCursor }
}

export default useCursorEvents
