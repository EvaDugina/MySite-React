import { useRef, useCallback, useEffect } from "react"

const useThrottle = (callback, delay) => {
    const lastCallTime = useRef(0)
    const timeoutRef = useRef(null)

    // Очищаем таймаут при размонтировании
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [])

    return useCallback(
        (...args) => {
            const now = Date.now()
            const timeElapsed = now - lastCallTime.current

            if (timeElapsed >= delay) {
                lastCallTime.current = now
                callback(...args)
            } else {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current)
                }
                timeoutRef.current = setTimeout(() => {
                    lastCallTime.current = Date.now()
                    callback(...args)
                    timeoutRef.current = null
                }, delay - timeElapsed)
            }
        },
        [callback, delay],
    )
}

export default useThrottle
