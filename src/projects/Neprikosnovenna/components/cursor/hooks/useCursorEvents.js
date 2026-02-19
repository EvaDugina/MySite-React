import { useCallback, useRef } from "react"

export function useCursorEvents(handleLeftClickDown, handleLeftClickUp) {

    // const callbacksRef = useRef({ handleLeftClickDown, handleLeftClickUp });
    // useEffect(() => {
    //     callbacksRef.current = { handleLeftClickDown, handleLeftClickUp };
    // }, [handleLeftClickDown, handleLeftClickUp]);

    //
    // PUBLIC
    //

    const enableCursor = useCallback(() => {
        window.addEventListener("pointerdown", onPointerDown)
        window.addEventListener("pointerup", onPointerUp)
    }, [])

    const disableCursor = useCallback(() => {
        window.removeEventListener("pointerdown", onPointerDown)
        window.removeEventListener("pointerup", onPointerUp)
    }, [])

    //
    // LOCAL
    //

    const onPointerDown = useCallback((event) => {
        event.preventDefault(); // Для сенсоров

        if (event.button === 0) {
            handleLeftClickDown(event)
        }
    }, [])

    const onPointerUp = useCallback((event) => {
        event.preventDefault(); // Для сенсоров

        if (event.button === 0) {
            handleLeftClickUp(event)
        }
    }, [])

    return { enableCursor, disableCursor }
}

export default useCursorEvents
