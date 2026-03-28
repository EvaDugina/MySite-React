import { useCallback, useEffect, useRef } from 'react'
import {
    buildByeMessage,
    buildHelloMessage,
    buildPositionMessage,
    parseBatchMessage,
} from './publicCursorProtocol.js'

const RECONNECT_BASE_MS = 1000
const RECONNECT_MAX_MS = 30000
const RECONNECT_MULTIPLIER = 1.5
const WS_PATH = '/ws'
const MIN_HEALTHY_CONNECTION_MS = 5000

export function usePublicCursorsConnection({
    clientId,
    sessionId,
    lineageRef,
    onOpenRef,
    logPublic,
    clearTransientState,
    applyBatch,
}) {
    const wsRef = useRef(null)
    const reconnectDelayRef = useRef(RECONNECT_BASE_MS)
    const reconnectTimerRef = useRef(null)
    const mountedRef = useRef(true)
    const isSuspendedRef = useRef(document.hidden)
    const connectedAtRef = useRef(0)
    const wsIdRef = useRef(0)
    const connectRef = useRef(() => {})

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
            ws.send(buildHelloMessage(clientId, sessionId))
            onOpenRef.current?.()
        }

        ws.onmessage = (event) => {
            const entries = parseBatchMessage(event.data)
            if (!entries) return
            applyBatch(entries, { clientId, sessionId })
        }

        ws.onerror = () => undefined

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

            if (event.code === 1000) return
            if (!mountedRef.current) return
            if (isSuspendedRef.current) return

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
    }, [
        applyBatch,
        clearTransientState,
        clientId,
        lineageRef,
        logPublic,
        onOpenRef,
        sessionId,
    ])

    const sendPosition = useCallback((x, y, device) => {
        if (isSuspendedRef.current) return

        const ws = wsRef.current
        if (!ws || ws.readyState !== 1) return
        if (!Number.isFinite(x) || !Number.isFinite(y)) return

        ws.send(buildPositionMessage(x, y, device))
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
                        ws.send(buildByeMessage())
                    } catch (error) {
                        logPublic('failed to send bye', {
                            cid: clientId,
                            sid: sessionId,
                            reason: error?.message,
                        })
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
    }, [clearTransientState, clientId, connect, logPublic, sessionId])

    return { sendPosition }
}

export default usePublicCursorsConnection
