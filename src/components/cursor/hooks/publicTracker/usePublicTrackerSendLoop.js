import { useCallback, useEffect, useRef } from 'react'

const SEND_INTERVAL_MS = 50

export function usePublicTrackerSendLoop({
    enabled,
    clientId,
    sendPosition,
    getIsCursorReady,
    getPayloadForSend,
    currentIconKey,
    logPublic,
}) {
    const skippedSendsRef = useRef(0)
    const readySkippedSendsRef = useRef(0)
    const lastValidSendAtRef = useRef(0)

    const sendCurrentPosition = useCallback((reason) => {
        if (!enabled) return
        if (document.hidden) return

        if (typeof getIsCursorReady === 'function' && !getIsCursorReady()) {
            readySkippedSendsRef.current += 1
            logPublic('skip send (cursor not ready)', {
                reason,
                cid: clientId,
                skippedSends: readySkippedSendsRef.current,
                lastValidSendAt: lastValidSendAtRef.current,
            })
            return
        }

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

        sendPosition(payload.x, payload.y, payload.device, currentIconKey)
        lastValidSendAtRef.current = Date.now()
    }, [
        clientId,
        currentIconKey,
        enabled,
        getIsCursorReady,
        getPayloadForSend,
        logPublic,
        sendPosition,
    ])

    useEffect(() => {
        if (!enabled) return undefined
        const handleVisibilityChange = () => {
            if (document.hidden) return
            sendCurrentPosition('visibilitychange')
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [enabled, sendCurrentPosition])

    useEffect(() => {
        if (!enabled) return undefined
        const intervalId = setInterval(() => {
            if (document.hidden) return
            sendCurrentPosition('interval')
        }, SEND_INTERVAL_MS)

        return () => {
            clearInterval(intervalId)
        }
    }, [enabled, sendCurrentPosition])

    return { sendCurrentPosition }
}

export default usePublicTrackerSendLoop
