import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import styles from '../../CursorPublicTracker.module.css'

const LERP_FACTOR = 0.15
const HOTSPOT_X = 0.265
const HOTSPOT_Y = 0.09

export function usePublicTrackerDomRenderer({
    articleRectRef,
    cursorsRef,
    renderItems,
    instanceDataByKeyRef,
}) {
    const rafIdRef = useRef(null)
    const enterAnimationFrameByKeyRef = useRef(new Map())
    const cursorElementsRef = useRef(new Map())
    const refCallbacksRef = useRef(new Map())
    const hotspotTranslateXPercent = -(HOTSPOT_X * 100)
    const hotspotTranslateYPercent = -(HOTSPOT_Y * 100)

    const cancelEnterAnimation = useCallback((instanceKey) => {
        const rafId = enterAnimationFrameByKeyRef.current.get(instanceKey)
        if (!rafId) return
        cancelAnimationFrame(rafId)
        enterAnimationFrameByKeyRef.current.delete(instanceKey)
    }, [])

    const queueEnterAnimation = useCallback((instanceKey, el) => {
        cancelEnterAnimation(instanceKey)

        el.classList.remove(styles.publicCursorFadeOut)
        el.classList.remove(styles.publicCursorVisible)
        el.classList.remove(styles.publicCursorFadeIn)

        const rafId = requestAnimationFrame(() => {
            enterAnimationFrameByKeyRef.current.delete(instanceKey)

            const currentEl = cursorElementsRef.current.get(instanceKey)
            const data = instanceDataByKeyRef.current.get(instanceKey)
            if (!currentEl || !data || !data.enterPending) return

            currentEl.classList.add(styles.publicCursorFadeIn)
            data.enterPending = false
        })

        enterAnimationFrameByKeyRef.current.set(instanceKey, rafId)
    }, [cancelEnterAnimation, instanceDataByKeyRef])

    useEffect(() => {
        const activeKeys = new Set(renderItems.map(item => item.instanceKey))
        for (const key of [...refCallbacksRef.current.keys()]) {
            if (!activeKeys.has(key)) refCallbacksRef.current.delete(key)
        }
        for (const key of [...cursorElementsRef.current.keys()]) {
            if (!activeKeys.has(key)) cursorElementsRef.current.delete(key)
        }
        for (const key of [...enterAnimationFrameByKeyRef.current.keys()]) {
            if (activeKeys.has(key)) continue
            cancelEnterAnimation(key)
        }
    }, [cancelEnterAnimation, renderItems])

    useEffect(() => {
        const animate = () => {
            rafIdRef.current = requestAnimationFrame(animate)

            const rect = articleRectRef.current
            if (!rect) return

            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2

            for (const item of renderItems) {
                const data = instanceDataByKeyRef.current.get(item.instanceKey)
                const el = cursorElementsRef.current.get(item.instanceKey)
                if (!data || !el) continue

                let displayX = data.frozenX
                let displayY = data.frozenY

                if (data.phase === 'active') {
                    const cursor = cursorsRef.current.get(data.id)
                    if (!cursor) continue

                    cursor.displayX += (cursor.targetX - cursor.displayX) * LERP_FACTOR
                    cursor.displayY += (cursor.targetY - cursor.displayY) * LERP_FACTOR
                    displayX = cursor.displayX
                    displayY = cursor.displayY
                    data.frozenX = displayX
                    data.frozenY = displayY
                }

                const screenX = centerX + (displayX / 100) * rect.width
                const screenY = centerY + (displayY / 100) * rect.height
                el.style.transform = `translate(${hotspotTranslateXPercent}%, ${hotspotTranslateYPercent}%) translate3d(${screenX}px, ${screenY}px, 0)`
            }
        }

        rafIdRef.current = requestAnimationFrame(animate)
        return () => {
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
        }
    }, [
        articleRectRef,
        cursorsRef,
        hotspotTranslateXPercent,
        hotspotTranslateYPercent,
        instanceDataByKeyRef,
        renderItems,
    ])

    useLayoutEffect(() => {
        for (const item of renderItems) {
            const el = cursorElementsRef.current.get(item.instanceKey)
            const data = instanceDataByKeyRef.current.get(item.instanceKey)
            if (!el || !data) continue

            if (data.enterPending) {
                queueEnterAnimation(item.instanceKey, el)
                continue
            }

            if (data.fadePending) {
                cancelEnterAnimation(item.instanceKey)
                el.classList.add(styles.publicCursorVisible)
                el.classList.remove(styles.publicCursorFadeIn)
                void el.offsetWidth
                el.classList.add(styles.publicCursorFadeOut)
                data.fadePending = false
                continue
            }

            if (data.phase === 'fading') {
                cancelEnterAnimation(item.instanceKey)
                el.classList.add(styles.publicCursorVisible)
                el.classList.add(styles.publicCursorFadeOut)
            } else {
                cancelEnterAnimation(item.instanceKey)
                el.classList.remove(styles.publicCursorFadeOut)
                el.classList.add(styles.publicCursorVisible)
            }
        }
    }, [cancelEnterAnimation, instanceDataByKeyRef, queueEnterAnimation, renderItems])

    const getRefCallback = useCallback((instanceKey) => {
        const existing = refCallbacksRef.current.get(instanceKey)
        if (existing) return existing

        const callback = (el) => {
            if (!el) {
                cancelEnterAnimation(instanceKey)
                cursorElementsRef.current.delete(instanceKey)
                return
            }

            cursorElementsRef.current.set(instanceKey, el)
            const data = instanceDataByKeyRef.current.get(instanceKey)
            if (!data) return
            el.classList.remove(styles.publicCursorFadeIn, styles.publicCursorFadeOut)
            if (data.enterPending) {
                queueEnterAnimation(instanceKey, el)
            } else if (data.phase === 'fading') {
                el.classList.add(styles.publicCursorVisible)
                el.classList.add(styles.publicCursorFadeOut)
            } else if (data.phase === 'active') {
                el.classList.add(styles.publicCursorVisible)
            }
        }

        refCallbacksRef.current.set(instanceKey, callback)
        return callback
    }, [cancelEnterAnimation, instanceDataByKeyRef, queueEnterAnimation])

    useEffect(() => {
        return () => {
            for (const [, enterRafId] of enterAnimationFrameByKeyRef.current) {
                cancelAnimationFrame(enterRafId)
            }
            enterAnimationFrameByKeyRef.current.clear()
            cursorElementsRef.current.clear()
            refCallbacksRef.current.clear()
        }
    }, [])

    return { getRefCallback }
}

export default usePublicTrackerDomRenderer
