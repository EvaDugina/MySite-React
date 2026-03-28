import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import usePublicCursors from './hooks/usePublicCursors.js'
import { PublicCursorConfig } from './CursorPublicTrackerSettings.js'
import styles from './CursorPublicTracker.module.css'

const {
    LERP_FACTOR,
    OPACITY,
    FADE_IN_DURATION,
    FADE_OUT_DURATION,
    SEND_INTERVAL_MS,
    MAX_CURSORS,
    IMAGE_URL,
    CURSOR_SIZE_REM,
    HOTSPOT_X,
    HOTSPOT_Y,
    Z_INDEX,
} = PublicCursorConfig

const DEBUG_PUBLIC_CURSOR = import.meta.env.VITE_PUBLIC_CURSOR_DEBUG === '1'

const CursorPhase = {
    ACTIVE: 'active',
    FADING: 'fading',
}

const CursorPublicTracker = ({
    getArticleRect,
    getArticleElement,
    getCursorPosition,
    getIsCursorReady,
    getPointerDevice,
    zIndex = Z_INDEX,
}) => {
    const { clientId, cursorsRef, sendPosition, setOnUpdate, setOnOpen } =
        usePublicCursors()

    const [renderItems, setRenderItems] = useState([])
    const articleRectRef = useRef(null)
    const rafIdRef = useRef(null)
    const instanceCounterRef = useRef(0)
    const cursorElementsRef = useRef(new Map())
    const refCallbacksRef = useRef(new Map())
    const removeTimersByInstanceRef = useRef(new Map())
    const activeInstanceByIdRef = useRef(new Map())
    const activeInstanceByCidRef = useRef(new Map())
    const instanceDataByKeyRef = useRef(new Map())
    const skippedSendsRef = useRef(0)
    const lastValidSendAtRef = useRef(0)
    const hotspotTranslateXPercent = -(HOTSPOT_X * 100)
    const hotspotTranslateYPercent = -(HOTSPOT_Y * 100)

    const logPublic = useCallback((message, data = null) => {
        if (!DEBUG_PUBLIC_CURSOR) return
        if (data === null) {
            console.log(`[public-cursor] ${message}`)
            return
        }
        console.log(`[public-cursor] ${message}`, data)
    }, [])

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

    const sendCurrentPosition = useCallback((reason) => {
        if (document.hidden) return
        if (typeof getIsCursorReady === 'function' && !getIsCursorReady()) return

        const payload = getPayloadForSend()
        if (!payload) {
            skippedSendsRef.current += 1
            logPublic('skip send (invalid payload)', {
                reason,
                cid: clientId,
                skippedSends: skippedSendsRef.current,
                lastValidSendAt: lastValidSendAtRef.current,
            })
            return
        }

        sendPosition(payload.x, payload.y, payload.device)
        lastValidSendAtRef.current = Date.now()
    }, [clientId, getIsCursorReady, getPayloadForSend, logPublic, sendPosition])

    const removeInstance = useCallback((instanceKey) => {
        const timerId = removeTimersByInstanceRef.current.get(instanceKey)
        if (timerId) {
            clearTimeout(timerId)
            removeTimersByInstanceRef.current.delete(instanceKey)
        }

        const data = instanceDataByKeyRef.current.get(instanceKey)
        if (data) {
            if (activeInstanceByIdRef.current.get(data.id) === instanceKey) {
                activeInstanceByIdRef.current.delete(data.id)
            }
            if (activeInstanceByCidRef.current.get(data.cid) === instanceKey) {
                activeInstanceByCidRef.current.delete(data.cid)
            }
        }

        instanceDataByKeyRef.current.delete(instanceKey)
        cursorElementsRef.current.delete(instanceKey)
        refCallbacksRef.current.delete(instanceKey)
        setRenderItems(prev => prev.filter(item => item.instanceKey !== instanceKey))
    }, [])

    const startFadeOut = useCallback((instanceKey) => {
        const data = instanceDataByKeyRef.current.get(instanceKey)
        if (!data || data.phase === CursorPhase.FADING) return

        data.phase = CursorPhase.FADING
        data.enterPending = false
        data.fadePending = true
        data.removeAt = Date.now() + FADE_OUT_DURATION

        if (activeInstanceByIdRef.current.get(data.id) === instanceKey) {
            activeInstanceByIdRef.current.delete(data.id)
        }
        if (activeInstanceByCidRef.current.get(data.cid) === instanceKey) {
            activeInstanceByCidRef.current.delete(data.cid)
        }

        setRenderItems((prev) => {
            let found = false
            const next = prev.map((item) => {
                if (item.instanceKey !== instanceKey) return item
                found = true
                return {
                    ...item,
                    phase: CursorPhase.FADING,
                    removeAt: data.removeAt,
                }
            })
            return found ? next : prev
        })

        const timerId = setTimeout(() => {
            removeTimersByInstanceRef.current.delete(instanceKey)
            removeInstance(instanceKey)
        }, FADE_OUT_DURATION)

        const oldTimerId = removeTimersByInstanceRef.current.get(instanceKey)
        if (oldTimerId) clearTimeout(oldTimerId)
        removeTimersByInstanceRef.current.set(instanceKey, timerId)
    }, [removeInstance])

    const createActiveInstance = useCallback((id, cursor) => {
        const instanceKey = `${id}#${instanceCounterRef.current++}`
        const now = Date.now()
        const data = {
            instanceKey,
            id,
            cid: cursor.cid,
            sid: cursor.sid,
            phase: CursorPhase.ACTIVE,
            enterPending: true,
            fadePending: false,
            createdAt: now,
            removeAt: null,
            frozenX: cursor.displayX,
            frozenY: cursor.displayY,
        }

        instanceDataByKeyRef.current.set(instanceKey, data)
        activeInstanceByIdRef.current.set(id, instanceKey)
        activeInstanceByCidRef.current.set(cursor.cid, instanceKey)

        setRenderItems(prev => [
            ...prev,
            {
                instanceKey,
                id,
                cid: cursor.cid,
                sid: cursor.sid,
                phase: CursorPhase.ACTIVE,
                createdAt: now,
                removeAt: null,
            },
        ])
    }, [])

    const handleUpdate = useCallback(() => {
        const entries = [...cursorsRef.current.entries()]
        const orderedCids = []
        const seenCids = new Set()

        for (const [, cursor] of entries) {
            if (!cursor || typeof cursor.cid !== 'string') continue
            if (seenCids.has(cursor.cid)) continue
            seenCids.add(cursor.cid)
            orderedCids.push(cursor.cid)
        }

        const allowedCids = new Set(orderedCids.slice(0, MAX_CURSORS))
        const idsByCid = new Map()
        for (const [id, cursor] of entries) {
            if (!cursor || !allowedCids.has(cursor.cid)) continue
            if (!idsByCid.has(cursor.cid)) idsByCid.set(cursor.cid, [])
            idsByCid.get(cursor.cid).push({ id, cursor })
        }

        const desiredIdByCid = new Map()
        for (const cid of allowedCids) {
            const currentActiveKey = activeInstanceByCidRef.current.get(cid)
            if (currentActiveKey) {
                const currentActive = instanceDataByKeyRef.current.get(currentActiveKey)
                if (currentActive && cursorsRef.current.has(currentActive.id)) {
                    desiredIdByCid.set(cid, currentActive.id)
                    continue
                }
            }

            const candidates = idsByCid.get(cid)
            if (candidates && candidates.length > 0) {
                desiredIdByCid.set(cid, candidates[0].id)
            }
        }

        for (const [cid, desiredId] of desiredIdByCid) {
            const currentActiveKey = activeInstanceByCidRef.current.get(cid)
            const currentActive = currentActiveKey
                ? instanceDataByKeyRef.current.get(currentActiveKey)
                : null

            if (currentActive && currentActive.id === desiredId) continue
            if (currentActiveKey) startFadeOut(currentActiveKey)

            if (!activeInstanceByIdRef.current.has(desiredId)) {
                const cursor = cursorsRef.current.get(desiredId)
                if (cursor) createActiveInstance(desiredId, cursor)
            }
        }

        for (const [id, instanceKey] of [...activeInstanceByIdRef.current.entries()]) {
            const data = instanceDataByKeyRef.current.get(instanceKey)
            if (!data) {
                activeInstanceByIdRef.current.delete(id)
                continue
            }

            const desiredId = desiredIdByCid.get(data.cid)
            if (!desiredId || desiredId !== id || !cursorsRef.current.has(id)) {
                startFadeOut(instanceKey)
            }
        }
    }, [createActiveInstance, cursorsRef, startFadeOut])

    useEffect(() => {
        setOnUpdate(handleUpdate)
        return () => {
            setOnUpdate(null)
        }
    }, [handleUpdate, setOnUpdate])

    useEffect(() => {
        setOnOpen(() => {
            // Eager-send intentionally disabled.
        })
        return () => {
            setOnOpen(null)
        }
    }, [setOnOpen])

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) return
            sendCurrentPosition('visibilitychange')
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [sendCurrentPosition])

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

                if (data.phase === CursorPhase.ACTIVE) {
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
    }, [cursorsRef, hotspotTranslateXPercent, hotspotTranslateYPercent, renderItems])

    useEffect(() => {
        const intervalId = setInterval(() => {
            if (document.hidden) return
            sendCurrentPosition('interval')
        }, SEND_INTERVAL_MS)

        return () => {
            clearInterval(intervalId)
        }
    }, [sendCurrentPosition])

    useLayoutEffect(() => {
        for (const item of renderItems) {
            const el = cursorElementsRef.current.get(item.instanceKey)
            const data = instanceDataByKeyRef.current.get(item.instanceKey)
            if (!el || !data) continue

            if (data.enterPending) {
                el.style.transition = 'none'
                el.style.opacity = '0'
                void el.offsetWidth
                el.style.transition = `opacity ${FADE_IN_DURATION}ms cubic-bezier(.25,.1,.25,1)`
                el.style.opacity = String(OPACITY)
                data.enterPending = false
                continue
            }

            if (data.fadePending) {
                el.style.transition = `opacity ${FADE_OUT_DURATION}ms cubic-bezier(0,.41,.4,1.01)`
                el.style.opacity = '0'
                data.fadePending = false
                continue
            }

            el.style.opacity = data.phase === CursorPhase.FADING ? '0' : String(OPACITY)
        }
    }, [renderItems])

    const getRefCallback = useCallback((instanceKey) => {
        const existing = refCallbacksRef.current.get(instanceKey)
        if (existing) return existing

        const callback = (el) => {
            if (!el) {
                cursorElementsRef.current.delete(instanceKey)
                return
            }

            cursorElementsRef.current.set(instanceKey, el)
            const data = instanceDataByKeyRef.current.get(instanceKey)
            if (!data) return
            el.style.opacity = data.phase === CursorPhase.FADING ? '0' : '0'
        }

        refCallbacksRef.current.set(instanceKey, callback)
        return callback
    }, [])

    useEffect(() => {
        return () => {
            for (const [, timerId] of removeTimersByInstanceRef.current) {
                clearTimeout(timerId)
            }
            removeTimersByInstanceRef.current.clear()
            cursorElementsRef.current.clear()
            refCallbacksRef.current.clear()
            activeInstanceByIdRef.current.clear()
            activeInstanceByCidRef.current.clear()
            instanceDataByKeyRef.current.clear()
        }
    }, [])

    return (
        <div
            className={styles.overlay}
            style={{
                zIndex,
                '--public-cursor-size': `${CURSOR_SIZE_REM}rem`,
            }}
        >
            {renderItems.map(item => (
                <img
                    key={item.instanceKey}
                    ref={getRefCallback(item.instanceKey)}
                    src={IMAGE_URL}
                    alt=""
                    className={styles.publicCursor}
                    draggable={false}
                />
            ))}
        </div>
    )
}

export default CursorPublicTracker
