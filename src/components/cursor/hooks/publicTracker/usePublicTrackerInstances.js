import { useCallback, useEffect, useRef, useState } from 'react'
import { PublicCursorConfig } from '../../CursorPublicTrackerSettings.js'
import { DEFAULT_PUBLIC_CURSOR_ICON_KEY } from '../../PublicCursorIcons.js'

const { FADE_OUT_DURATION } = PublicCursorConfig
const MAX_CURSORS = 8

const CursorPhase = {
    ACTIVE: 'active',
    FADING: 'fading',
}

export function usePublicTrackerInstances({ cursorsRef, setOnUpdate }) {
    const [renderItems, setRenderItems] = useState([])
    const instanceCounterRef = useRef(0)
    const removeTimersByInstanceRef = useRef(new Map())
    const activeInstanceByIdRef = useRef(new Map())
    const activeInstanceByCidRef = useRef(new Map())
    const instanceDataByKeyRef = useRef(new Map())

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
        const iconKey =
            typeof cursor.iconKey === 'string'
                ? cursor.iconKey
                : DEFAULT_PUBLIC_CURSOR_ICON_KEY
        const data = {
            instanceKey,
            id,
            cid: cursor.cid,
            sid: cursor.sid,
            iconKey,
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
                iconKey,
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

        setRenderItems((prev) => {
            let changed = false
            const next = prev.map((item) => {
                if (item.phase !== CursorPhase.ACTIVE) return item
                const cursor = cursorsRef.current.get(item.id)
                if (!cursor) return item
                const nextIconKey =
                    typeof cursor.iconKey === 'string'
                        ? cursor.iconKey
                        : DEFAULT_PUBLIC_CURSOR_ICON_KEY
                if (item.iconKey === nextIconKey) return item
                changed = true
                return {
                    ...item,
                    iconKey: nextIconKey,
                }
            })
            return changed ? next : prev
        })
    }, [createActiveInstance, cursorsRef, startFadeOut])

    useEffect(() => {
        setOnUpdate(handleUpdate)
        return () => {
            setOnUpdate(null)
        }
    }, [handleUpdate, setOnUpdate])

    useEffect(() => {
        return () => {
            for (const [, timerId] of removeTimersByInstanceRef.current) {
                clearTimeout(timerId)
            }
            removeTimersByInstanceRef.current.clear()
            activeInstanceByIdRef.current.clear()
            activeInstanceByCidRef.current.clear()
            instanceDataByKeyRef.current.clear()
        }
    }, [])

    return {
        renderItems,
        instanceDataByKeyRef,
    }
}

export default usePublicTrackerInstances
