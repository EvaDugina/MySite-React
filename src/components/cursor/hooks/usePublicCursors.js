import { useCallback, useRef, useState } from 'react'
import {
    getOrCreateClientId,
    getPageLineage,
    getPageSessionId,
} from './publicCursors/publicCursorIdentity.js'
import usePublicCursorsStore from './publicCursors/usePublicCursorsStore.js'
import usePublicCursorsConnection from './publicCursors/usePublicCursorsConnection.js'

const DEBUG_PUBLIC_CURSOR = import.meta.env.VITE_PUBLIC_CURSOR_DEBUG === '1'

export default function usePublicCursors(options = {}) {
    const { enabled = true } = options
    const onUpdateRef = useRef(null)
    const onOpenRef = useRef(null)
    const [clientId] = useState(() => getOrCreateClientId())
    const [sessionId] = useState(() => getPageSessionId())
    const lineageRef = useRef(getPageLineage())

    const logPublic = useCallback((message, data = null) => {
        if (!DEBUG_PUBLIC_CURSOR) return
        if (data === null) {
            console.log(`[public-cursor] ${message}`)
            return
        }
        console.log(`[public-cursor] ${message}`, data)
    }, [])

    const { cursorsRef, clearTransientState, applyBatch } = usePublicCursorsStore({
        onUpdateRef,
    })

    const { sendPosition, sendIcon } = usePublicCursorsConnection({
        enabled,
        clientId,
        sessionId,
        lineageRef,
        onOpenRef,
        logPublic,
        clearTransientState,
        applyBatch,
    })

    const setOnUpdate = useCallback((fn) => {
        onUpdateRef.current = fn
    }, [])

    const setOnOpen = useCallback((fn) => {
        onOpenRef.current = fn
    }, [])

    return {
        clientId,
        sessionId,
        cursorsRef,
        sendPosition,
        sendIcon,
        setOnUpdate,
        setOnOpen,
    }
}
