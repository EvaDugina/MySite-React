import { useCallback, useRef } from "react"

export function useCursorMoveAnimation(updatePosition, isStoppedRef) {
    const animationIdRef = useRef(null)

    const startAnimation = useCallback(() => {
        if (animationIdRef.current) return
        if (!isStoppedRef.current)
            animationIdRef.current = requestAnimationFrame(updatePosition)
    }, [])

    const continueAnimation = useCallback(() => {
        animationIdRef.current = requestAnimationFrame(updatePosition)
    }, [])

    const stopAnimation = useCallback(() => {
        if (animationIdRef.current) {
            cancelAnimationFrame(animationIdRef.current)
            animationIdRef.current = null
        }
    }, [])

    return { startAnimation, continueAnimation, stopAnimation }
}

export default useCursorMoveAnimation
