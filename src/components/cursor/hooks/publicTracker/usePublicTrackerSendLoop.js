import { useCallback, useEffect, useRef } from 'react'

const SEND_INTERVAL_MS = 50

export function usePublicTrackerSendLoop({
    clientId,
    sendPosition,
    getIsCursorReady,
    getPayloadForSend,
    logPublic,
}) {
    const skippedSendsRef = useRef(0)
    const readySkippedSendsRef = useRef(0)
    const lastValidSendAtRef = useRef(0)

    const sendCurrentPosition = useCallback((reason) => {
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

        sendPosition(payload.x, payload.y, payload.device)
        lastValidSendAtRef.current = Date.now()
    }, [clientId, getIsCursorReady, getPayloadForSend, logPublic, sendPosition])

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
        const intervalId = setInterval(() => {
            if (document.hidden) return
            sendCurrentPosition('interval')
        }, SEND_INTERVAL_MS)

        return () => {
            clearInterval(intervalId)
        }
    }, [sendCurrentPosition])

    return { sendCurrentPosition }
}

export default usePublicTrackerSendLoop
