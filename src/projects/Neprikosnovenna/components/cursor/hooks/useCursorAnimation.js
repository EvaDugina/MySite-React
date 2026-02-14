import { useCallback, useRef } from "react"

export function useCursorAnimation(callbackUpdatePosition, isStoppedRef) {
    const animationIdRef = useRef(null)

    const startAnimation = useCallback(() => {
        if (animationIdRef.current) return
        if (!isStoppedRef.current)
            animationIdRef.current = requestAnimationFrame(
                callbackUpdatePosition,
            )
    }, [])

    const continueAnimation = useCallback(() => {
        animationIdRef.current = requestAnimationFrame(callbackUpdatePosition)
    }, [])

    const stopAnimation = useCallback(() => {
        if (animationIdRef.current) {
            cancelAnimationFrame(animationIdRef.current)
            animationIdRef.current = null
        }
    }, [])

    return { startAnimation, continueAnimation, stopAnimation }
}

export default useCursorAnimation
