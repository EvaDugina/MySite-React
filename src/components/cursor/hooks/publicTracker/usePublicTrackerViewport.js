import { useCallback, useEffect, useRef } from 'react'

export function usePublicTrackerViewport({
    getArticleRect,
    getArticleElement,
    getCursorPosition,
    getPointerDevice,
}) {
    const articleRectRef = useRef(null)

    const refreshArticleRect = useCallback(() => {
        if (typeof getArticleRect !== 'function') return null
        const rect = getArticleRect()
        if (!rect) return null
        if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height)) return null
        if (rect.width <= 0 || rect.height <= 0) return null
        articleRectRef.current = rect
        return rect
    }, [getArticleRect])

    const getPayloadForSend = useCallback(() => {
        const rect = articleRectRef.current || refreshArticleRect()
        if (!rect) return null
        if (typeof getCursorPosition !== 'function') return null

        const pos = getCursorPosition()
        if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return null

        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const x = ((pos.x - centerX) / rect.width) * 100
        const y = ((pos.y - centerY) / rect.height) * 100
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null

        let device = 'd'
        if (typeof getPointerDevice === 'function') {
            device = getPointerDevice() === 'm' ? 'm' : 'd'
        }

        return { x, y, device }
    }, [getCursorPosition, getPointerDevice, refreshArticleRect])

    useEffect(() => {
        const updateRect = () => {
            refreshArticleRect()
        }

        updateRect()
        window.addEventListener('resize', updateRect, { passive: true })
        window.addEventListener('scroll', updateRect, { passive: true })

        let resizeObserver = null
        const articleElement =
            typeof getArticleElement === 'function'
                ? getArticleElement()
                : null
        if (articleElement && typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => {
                updateRect()
            })
            resizeObserver.observe(articleElement)
        }

        return () => {
            window.removeEventListener('resize', updateRect)
            window.removeEventListener('scroll', updateRect)
            if (resizeObserver) resizeObserver.disconnect()
        }
    }, [getArticleElement, refreshArticleRect])

    return {
        articleRectRef,
        refreshArticleRect,
        getPayloadForSend,
    }
}

export default usePublicTrackerViewport
