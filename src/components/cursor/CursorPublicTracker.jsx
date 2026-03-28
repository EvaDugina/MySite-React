import { useCallback, useEffect } from 'react'
import usePublicCursors from './hooks/usePublicCursors.js'
import { CursorImages } from './CursorSettings.js'
import usePublicTrackerViewport from './hooks/publicTracker/usePublicTrackerViewport.js'
import usePublicTrackerSendLoop from './hooks/publicTracker/usePublicTrackerSendLoop.js'
import usePublicTrackerInstances from './hooks/publicTracker/usePublicTrackerInstances.js'
import usePublicTrackerDomRenderer from './hooks/publicTracker/usePublicTrackerDomRenderer.js'
import styles from './CursorPublicTracker.module.css'

const CURSOR_SIZE_REM = 1.9
const IMAGE_URL = CursorImages.POINTER
const Z_INDEX = 998

const DEBUG_PUBLIC_CURSOR = import.meta.env.VITE_PUBLIC_CURSOR_DEBUG === '1'

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
        clientId,
        sendPosition,
        getIsCursorReady,
        getPayloadForSend,
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
        setOnOpen(() => undefined)
        return () => {
            setOnOpen(null)
        }
    }, [setOnOpen])

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
