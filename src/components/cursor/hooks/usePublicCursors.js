import { useEffect, useRef, useCallback, useState } from 'react'
import { PublicCursorConfig } from '../CursorPublicTrackerSettings.js'

const {
    RECONNECT_BASE_MS,
    RECONNECT_MAX_MS,
    RECONNECT_MULTIPLIER,
    STALE_BATCH_COUNT,
    WS_PATH,
    MIN_HEALTHY_CONNECTION_MS,
} = PublicCursorConfig
const SESSION_CLIENT_ID_KEY = 'public_cursor_client_id'
const DEBUG_PUBLIC_CURSOR = import.meta.env.VITE_PUBLIC_CURSOR_DEBUG === '1'
const PAGE_SESSION_ID = createSessionId()
const PAGE_BOOT_AT = Date.now()
const PAGE_BOOT_SEQ = createBootSeq()

function createClientId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `pc_${crypto.randomUUID().replace(/-/g, '')}`
    }
    return `pc_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
}

function getOrCreateClientId() {
    const existing = sessionStorage.getItem(SESSION_CLIENT_ID_KEY)
    if (existing) return existing
    const next = createClientId()
    sessionStorage.setItem(SESSION_CLIENT_ID_KEY, next)
    return next
}

function createSessionId() {
    return createClientId().replace('pc_', 'ps_')
}

function createBootSeq() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID().slice(0, 8)
    }
    return Math.random().toString(36).slice(2, 10)
}

export default function usePublicCursors() {
    const wsRef = useRef(null)
    const cursorsRef = useRef(new Map())
    const onUpdateRef = useRef(null)
    const onOpenRef = useRef(null)
    const reconnectDelayRef = useRef(RECONNECT_BASE_MS)
    const reconnectTimerRef = useRef(null)
    const mountedRef = useRef(true)
    const isSuspendedRef = useRef(document.hidden)
    const connectedAtRef = useRef(0)
    const missedBatchesRef = useRef(new Map())
    const [clientId] = useState(() => getOrCreateClientId())
    const [sessionId] = useState(() => PAGE_SESSION_ID)
    const lineageRef = useRef({
        bootAt: PAGE_BOOT_AT,
        pageSeq: PAGE_BOOT_SEQ,
    })
    const wsIdRef = useRef(0)
    const connectRef = useRef(() => {})

    const logPublic = useCallback((message, data = null) => {
        if (!DEBUG_PUBLIC_CURSOR) return
        if (data === null) {
            console.log(`[public-cursor] ${message}`)
            return
        }
        console.log(`[public-cursor] ${message}`, data)
    }, [])

    const clearTransientState = useCallback(() => {
        if (cursorsRef.current.size === 0 && missedBatchesRef.current.size === 0) return
        cursorsRef.current.clear()
        missedBatchesRef.current.clear()
        onUpdateRef.current?.()
    }, [])

    const connect = useCallback(() => {
        if (!mountedRef.current) return
        if (isSuspendedRef.current) return
        if (wsRef.current && wsRef.current.readyState <= 1) return

        wsIdRef.current += 1
        const wsId = wsIdRef.current
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
        const ws = new WebSocket(`${protocol}//${location.host}${WS_PATH}`)
        wsRef.current = ws
        logPublic('connect', {
            cid: clientId,
            sid: sessionId,
            wsId,
            reconnectDelay: reconnectDelayRef.current,
            ...lineageRef.current,
        })

        ws.onopen = () => {
            if (isSuspendedRef.current) {
                ws.close(1000, 'hidden')
                return
            }
            connectedAtRef.current = Date.now()
            reconnectDelayRef.current = RECONNECT_BASE_MS
            logPublic('open', {
                cid: clientId,
                sid: sessionId,
                wsId,
                ...lineageRef.current,
            })
            ws.send(JSON.stringify({ t: 'hello', cid: clientId, sid: sessionId }))
            onOpenRef.current?.()
        }

        ws.onmessage = (event) => {
            let msg
            try {
                msg = JSON.parse(event.data)
            } catch {
                return
            }

            if (msg.t !== 'b' || !Array.isArray(msg.c)) return

            const newIds = new Set()

            for (const entry of msg.c) {
                if (!Array.isArray(entry)) continue

                const hasSessionId = entry.length >= 5
                const cid = hasSessionId ? entry[0] : entry[0]
                const sid = hasSessionId ? entry[1] : 'legacy'
                const x = hasSessionId ? entry[2] : entry[1]
                const y = hasSessionId ? entry[3] : entry[2]
                const device = hasSessionId ? entry[4] : entry[3]

                if (typeof cid !== 'string' || typeof sid !== 'string') continue
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
                } else {
                    cursorsRef.current.set(id, {
                        cid,
                        sid,
                        targetX: x,
                        targetY: y,
                        displayX: x,
                        displayY: y,
                        device,
                    })
                }

                missedBatchesRef.current.set(id, 0)
            }

            // Увеличить счётчик пропусков для курсоров, отсутствующих в батче
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

            if (onUpdateRef.current) {
                onUpdateRef.current()
            }
        }

        ws.onerror = () => {}

        ws.onclose = (event) => {
            wsRef.current = null
            clearTransientState()
            logPublic('close', {
                cid: clientId,
                sid: sessionId,
                wsId,
                code: event.code,
                reason: event.reason,
                ...lineageRef.current,
            })

            // Нормальное закрытие — не переподключаться
            if (event.code === 1000) return
            if (!mountedRef.current) return
            if (isSuspendedRef.current) return

            // Сбросить delay только если соединение было здоровым
            const connectionDuration = Date.now() - connectedAtRef.current
            if (connectionDuration < MIN_HEALTHY_CONNECTION_MS) {
                reconnectDelayRef.current = Math.min(
                    reconnectDelayRef.current * RECONNECT_MULTIPLIER,
                    RECONNECT_MAX_MS
                )
            }

            logPublic('reconnect scheduled', {
                cid: clientId,
                sid: sessionId,
                wsId,
                delay: reconnectDelayRef.current,
                ...lineageRef.current,
            })
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current)
            }
            reconnectTimerRef.current = setTimeout(() => {
                reconnectTimerRef.current = null
                connectRef.current()
            }, reconnectDelayRef.current)
        }
    }, [clearTransientState, clientId, logPublic, sessionId])

    const sendPosition = useCallback((x, y, device) => {
        if (isSuspendedRef.current) return

        const ws = wsRef.current
        if (!ws || ws.readyState !== 1) return
        if (!Number.isFinite(x) || !Number.isFinite(y)) return

        ws.send(JSON.stringify({ t: 'p', x, y, d: device }))
    }, [])

    const setOnUpdate = useCallback((fn) => {
        onUpdateRef.current = fn
    }, [])

    const setOnOpen = useCallback((fn) => {
        onOpenRef.current = fn
    }, [])

    useEffect(() => {
        mountedRef.current = true
        connectRef.current = connect
        connect()

        const handleVisibilityChange = () => {
            if (document.hidden) {
                isSuspendedRef.current = true
                if (reconnectTimerRef.current) {
                    clearTimeout(reconnectTimerRef.current)
                    reconnectTimerRef.current = null
                }
                const ws = wsRef.current
                if (ws && ws.readyState === 1) {
                    try {
                        ws.send(JSON.stringify({ t: 'bye' }))
                    } catch {
                    }
                }
                if (ws) {
                    ws.close(1000, 'hidden')
                    wsRef.current = null
                }
                clearTransientState()
                return
            }

            isSuspendedRef.current = false
            connectRef.current()
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            mountedRef.current = false
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current)
                reconnectTimerRef.current = null
            }
            if (wsRef.current) {
                wsRef.current.close(1000)
                wsRef.current = null
            }
            clearTransientState()
        }
    }, [clearTransientState, connect])

    return {
        clientId,
        sessionId,
        cursorsRef,
        sendPosition,
        setOnUpdate,
        setOnOpen,
    }
}
