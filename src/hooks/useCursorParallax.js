import { useEffect, useRef } from "react"

const LERP_FACTOR = 0.16
const STOP_THRESHOLD = 0.05

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const isFiniteNumber = (value) =>
    typeof value === "number" && Number.isFinite(value)

/**
 * Параллакс-смещение элемента по движению курсора или гироскопу устройства.
 * Применяет translate3d к переданному ref'у через rAF + lerp.
 *
 * @param {React.RefObject<HTMLElement>} targetRef
 * @param {Object} options
 * @param {number} [options.maxOffsetX=12]
 * @param {number} [options.maxOffsetY=12]
 * @param {number} [options.direction=-1] инвертирует знак смещения (-1 = противоход курсору)
 * @param {boolean} [options.enabled=true]
 * @param {boolean} [options.enableGyroscope=true]
 * @param {boolean} [options.fallbackToMouse=true]
 * @param {(x: number, y: number) => void} [options.onApply] хук вместо style.transform
 */
const useCursorParallax = (targetRef, options = {}) => {
    const {
        maxOffsetX = 12,
        maxOffsetY = 12,
        direction = -1,
        enabled = true,
        enableGyroscope = true,
        fallbackToMouse = true,
        onApply,
    } = options

    const inputModeRef = useRef("mouse")
    const targetOffsetRef = useRef({ x: 0, y: 0 })
    const currentOffsetRef = useRef({ x: 0, y: 0 })
    const rafIdRef = useRef(null)
    const isAnimatingRef = useRef(false)

    useEffect(() => {
        if (typeof window === "undefined") return undefined

        const safeMaxOffsetX = Math.max(0, Number(maxOffsetX) || 0)
        const safeMaxOffsetY = Math.max(0, Number(maxOffsetY) || 0)
        const normalizedDirection = Number(direction) < 0 ? -1 : 1

        const applyTransform = (x, y) => {
            if (typeof onApply === "function") {
                onApply(x, y)
                return
            }
            const node = targetRef.current
            if (!node) return
            node.style.transform = `translate3d(${x}px, ${y}px, 0)`
        }

        const stopAnimation = () => {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current)
                rafIdRef.current = null
            }
            isAnimatingRef.current = false
        }

        const animate = () => {
            const target = targetOffsetRef.current
            const current = currentOffsetRef.current

            const nextX = current.x + (target.x - current.x) * LERP_FACTOR
            const nextY = current.y + (target.y - current.y) * LERP_FACTOR
            currentOffsetRef.current = { x: nextX, y: nextY }
            applyTransform(nextX, nextY)

            const dx = Math.abs(target.x - nextX)
            const dy = Math.abs(target.y - nextY)
            if (dx < STOP_THRESHOLD && dy < STOP_THRESHOLD) {
                currentOffsetRef.current = { ...target }
                applyTransform(target.x, target.y)
                stopAnimation()
                return
            }

            rafIdRef.current = requestAnimationFrame(animate)
        }

        const startAnimation = () => {
            if (isAnimatingRef.current) return
            isAnimatingRef.current = true
            rafIdRef.current = requestAnimationFrame(animate)
        }

        const setTargetFromNormalized = (nx, ny) => {
            targetOffsetRef.current = {
                x: clamp(nx, -1, 1) * safeMaxOffsetX * normalizedDirection,
                y: clamp(ny, -1, 1) * safeMaxOffsetY * normalizedDirection,
            }
            startAnimation()
        }

        const resetTargetOffset = () => {
            targetOffsetRef.current = { x: 0, y: 0 }
            startAnimation()
        }

        if (!enabled) {
            stopAnimation()
            targetOffsetRef.current = { x: 0, y: 0 }
            currentOffsetRef.current = { x: 0, y: 0 }
            applyTransform(0, 0)
            return undefined
        }

        const getCenter = () => ({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
        })

        const handleMouseMove = (event) => {
            if (!fallbackToMouse) return
            if (inputModeRef.current === "gyro-active") return

            const center = getCenter()
            if (center.x === 0 || center.y === 0) {
                resetTargetOffset()
                return
            }
            const nx = (event.clientX - center.x) / center.x
            const ny = (event.clientY - center.y) / center.y
            setTargetFromNormalized(nx, ny)
        }

        const handleMouseLeave = () => {
            if (inputModeRef.current !== "gyro-active") {
                resetTargetOffset()
            }
        }

        const handleBlur = () => {
            resetTargetOffset()
        }

        const handleResize = () => {
            resetTargetOffset()
        }

        const handleDeviceOrientation = (event) => {
            if (!enableGyroscope) return
            const { beta, gamma } = event
            if (!isFiniteNumber(beta) || !isFiniteNumber(gamma)) return
            const nx = gamma / 30
            const ny = beta / 30
            inputModeRef.current = "gyro-active"
            setTargetFromNormalized(nx, ny)
        }

        const supportsGyroscope =
            enableGyroscope &&
            typeof window.DeviceOrientationEvent !== "undefined"

        if (supportsGyroscope) {
            window.addEventListener(
                "deviceorientation",
                handleDeviceOrientation,
                true,
            )
            inputModeRef.current = fallbackToMouse ? "gyro-pending" : "gyro-only"
        } else {
            inputModeRef.current = "mouse"
        }

        if (fallbackToMouse) {
            window.addEventListener("pointermove", handleMouseMove, {
                passive: true,
            })
            window.addEventListener("pointerleave", handleMouseLeave, {
                passive: true,
            })
        }

        window.addEventListener("blur", handleBlur)
        window.addEventListener("resize", handleResize, { passive: true })

        applyTransform(0, 0)

        return () => {
            if (supportsGyroscope) {
                window.removeEventListener(
                    "deviceorientation",
                    handleDeviceOrientation,
                    true,
                )
            }
            if (fallbackToMouse) {
                window.removeEventListener("pointermove", handleMouseMove)
                window.removeEventListener("pointerleave", handleMouseLeave)
            }
            window.removeEventListener("blur", handleBlur)
            window.removeEventListener("resize", handleResize)
            stopAnimation()
        }
    }, [
        targetRef,
        maxOffsetX,
        maxOffsetY,
        direction,
        enabled,
        enableGyroscope,
        fallbackToMouse,
        onApply,
    ])
}

export default useCursorParallax
