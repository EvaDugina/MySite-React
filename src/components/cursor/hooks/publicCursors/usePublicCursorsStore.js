import { useCallback, useRef } from 'react'
import { DEFAULT_PUBLIC_CURSOR_ICON_KEY } from '../../PublicCursorIcons.js'

const STALE_BATCH_COUNT = 12

export function usePublicCursorsStore({ onUpdateRef }) {
    const cursorsRef = useRef(new Map())
    const missedBatchesRef = useRef(new Map())

    const clearTransientState = useCallback(() => {
        if (cursorsRef.current.size === 0 && missedBatchesRef.current.size === 0) return
        cursorsRef.current.clear()
        missedBatchesRef.current.clear()
        onUpdateRef.current?.()
    }, [onUpdateRef])

    const applyBatch = useCallback((entries, identity) => {
        const { clientId, sessionId } = identity
        const newIds = new Set()

        for (const entry of entries) {
            const { cid, sid, x, y, device, iconKey } = entry
            if (cid === clientId && sid === sessionId) continue

            const id = `${cid}:${sid}`
            newIds.add(id)

            const existing = cursorsRef.current.get(id)
            if (existing) {
                existing.targetX = x
                existing.targetY = y
                existing.device = device
                existing.cid = cid
                existing.sid = sid
                existing.iconKey = typeof iconKey === 'string'
                    ? iconKey
                    : DEFAULT_PUBLIC_CURSOR_ICON_KEY
            } else {
                cursorsRef.current.set(id, {
                    cid,
                    sid,
                    targetX: x,
                    targetY: y,
                    displayX: x,
                    displayY: y,
                    device,
                    iconKey: typeof iconKey === 'string'
                        ? iconKey
                        : DEFAULT_PUBLIC_CURSOR_ICON_KEY,
                })
            }

            missedBatchesRef.current.set(id, 0)
        }

        for (const [id] of cursorsRef.current) {
            if (!newIds.has(id)) {
                const count = (missedBatchesRef.current.get(id) || 0) + 1
                missedBatchesRef.current.set(id, count)

                if (count >= STALE_BATCH_COUNT) {
                    cursorsRef.current.delete(id)
                    missedBatchesRef.current.delete(id)
                }
            }
        }

        onUpdateRef.current?.()
    }, [onUpdateRef])

    return {
        cursorsRef,
        clearTransientState,
        applyBatch,
    }
}

export default usePublicCursorsStore
