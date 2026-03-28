import { useCallback, useEffect } from 'react'
import usePublicCursors from './hooks/usePublicCursors.js'
import { PublicCursorConfig } from './CursorPublicTrackerSettings.js'
import {
    DEFAULT_PUBLIC_CURSOR_ICON_KEY,
    resolvePublicCursorIconUrl,
} from './PublicCursorIcons.js'
import usePublicTrackerViewport from './hooks/publicTracker/usePublicTrackerViewport.js'
import usePublicTrackerSendLoop from './hooks/publicTracker/usePublicTrackerSendLoop.js'
import usePublicTrackerInstances from './hooks/publicTracker/usePublicTrackerInstances.js'
import usePublicTrackerDomRenderer from './hooks/publicTracker/usePublicTrackerDomRenderer.js'
import styles from './CursorPublicTracker.module.css'

const { FADE_OUT_DURATION } = PublicCursorConfig
const CURSOR_SIZE_REM = 1.9
const Z_INDEX = 998

const DEBUG_PUBLIC_CURSOR = import.meta.env.VITE_PUBLIC_CURSOR_DEBUG === '1'

const CursorPublicTracker = ({
    enabled = false,
    currentIconKey = DEFAULT_PUBLIC_CURSOR_ICON_KEY,
    getArticleRect,
    getArticleElement,
    getCursorPosition,
    getIsCursorReady,
    getPointerDevice,
    zIndex = Z_INDEX,
}) => {
    const { clientId, cursorsRef, sendPosition, sendIcon, setOnUpdate, setOnOpen } =
        usePublicCursors({ enabled })

    const logPublic = useCallback((message, data = null) => {
        if (!DEBUG_PUBLIC_CURSOR) return
        if (data === null) {
            console.log(`[public-cursor] ${message}`)
            return
        }
        console.log(`[public-cursor] ${message}`, data)
    }, [])

    const { articleRectRef, getPayloadForSend } = usePublicTrackerViewport({
        getArticleRect,
        getArticleElement,
        getCursorPosition,
        getPointerDevice,
    })

    usePublicTrackerSendLoop({
        enabled,
        clientId,
        sendPosition,
        getIsCursorReady,
        getPayloadForSend,
        currentIconKey,
        logPublic,
    })

    const { renderItems, instanceDataByKeyRef } = usePublicTrackerInstances({
        cursorsRef,
        setOnUpdate,
    })

    const { getRefCallback } = usePublicTrackerDomRenderer({
        articleRectRef,
        cursorsRef,
        renderItems,
        instanceDataByKeyRef,
    })

    useEffect(() => {
        setOnOpen(() => {
            sendIcon(currentIconKey)
        })
        return () => {
            setOnOpen(null)
        }
    }, [currentIconKey, sendIcon, setOnOpen])

    useEffect(() => {
        if (!enabled) return
        sendIcon(currentIconKey)
    }, [currentIconKey, enabled, sendIcon])

    if (!enabled) return null

    return (
        <div
            className={styles.overlay}
            style={{
                zIndex,
                '--public-cursor-size': `${CURSOR_SIZE_REM}rem`,
                '--public-cursor-fade-out-duration': `${FADE_OUT_DURATION}ms`,
            }}
        >
            {renderItems.map(item => (
                <img
                    key={item.instanceKey}
                    ref={getRefCallback(item.instanceKey)}
                    src={resolvePublicCursorIconUrl(item.iconKey)}
                    alt=""
                    className={styles.publicCursor}
                    draggable={false}
                />
            ))}
        </div>
    )
}

export default CursorPublicTracker
