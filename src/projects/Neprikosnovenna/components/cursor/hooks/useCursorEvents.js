import { useCallback, useRef } from "react"

export function useCursorEvents() {
    const animationIdRef = useRef(null)

    return { startAnimation, continueAnimation, stopAnimation }
}

export default useCursorEvents
