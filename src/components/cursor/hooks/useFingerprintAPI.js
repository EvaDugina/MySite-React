import { useState, useEffect, useRef, useCallback } from 'react'

const API_URL = '/api/fingerprints'
const DEBOUNCE_DELAY = 500

export function useFingerprintAPI() {
    const [dbFingerprints, setDbFingerprints] = useState([])
    const [isReady, setIsReady] = useState(false)
    const pendingRef = useRef([])
    const timerRef = useRef(null)

    const flushPending = useCallback(() => {
        const batch = pendingRef.current
        if (batch.length === 0) return

        pendingRef.current = []

        fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fingerprints: batch }),
        })
            .then((res) => res.json())
            .then((data) => {
                console.log(`Fingerprints in DB: added ${data.added}, total ${data.total}`)
            })
            .catch((err) => {
                console.warn('useFingerprintAPI: POST failed', err)
            })
    }, [])

    const scheduleFlush = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(flushPending, DEBOUNCE_DELAY)
    }, [flushPending])

    // Загрузка всех отпечатков при монтировании
    useEffect(() => {
        let cancelled = false

        fetch(API_URL)
            .then((res) => res.json())
            .then((data) => {
                if (!cancelled && Array.isArray(data.fingerprints)) {
                    setDbFingerprints(data.fingerprints)
                    setIsReady(true)
                }
            })
            .catch((err) => {
                console.warn('useFingerprintAPI: GET failed', err)
                setIsReady(true)
            })

        return () => {
            cancelled = true
        }
    }, [])

    // Flush при размонтировании
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
            flushPending()
        }
    }, [flushPending])

    const addFingerprint = useCallback((x, y) => {
        pendingRef.current.push({ x, y })
        scheduleFlush()
    }, [scheduleFlush])

    const clearAll = useCallback(async () => {
        if (timerRef.current) clearTimeout(timerRef.current)
        pendingRef.current = []

        try {
            await fetch(API_URL, { method: 'DELETE' })
            setDbFingerprints([])
        } catch (err) {
            console.warn('useFingerprintAPI: DELETE failed', err)
        }
    }, [])

    return { dbFingerprints, isReady, addFingerprint, clearAll }
}
