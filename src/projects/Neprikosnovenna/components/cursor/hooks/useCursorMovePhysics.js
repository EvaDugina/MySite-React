import { useRef, useEffect, useCallback } from "react"

const EPS = 0.1

function useCursorMovePhysics(stiffness, mass, damping, maxSpeed) {
    const velocityRef = useRef({ x: 0, y: 0 })
    const settingsRef = useRef({ stiffness, mass, damping, maxSpeed })

    useEffect(() => {
        settingsRef.current = { stiffness, mass, damping, maxSpeed }
    }, [stiffness, mass, damping, maxSpeed])

    const isNearTarget = useCallback(((position, target) => {
        const isNearTarget =
            Math.hypot(
                target.x - position.x,
                target.y - position.y,
            ) < EPS
        const isAlmostStopped =
            Math.hypot(velocityRef.current.x, velocityRef.current.y) < EPS
        return isNearTarget && isAlmostStopped
    }), [])

    const resetVelocity = useCallback((() => {
        velocityRef.current = { x: 0, y: 0 }
    }), [])

    const recalculatePosition = useCallback((position, target) => {
        if (target.x === null || target.y === null) return { ...position }

        const { stiffness, mass, damping, maxSpeed } = settingsRef.current

        // Рассчитываем силу (разница между текущей и целевой позицией)
        const forceX = (target.x - position.x) * stiffness
        const forceY = (target.y - position.y) * stiffness

        // Ускорение = сила / масса
        const accelerationX = forceX / mass
        const accelerationY = forceY / mass

        // Обновляем скорость с учетом ускорения и затухания
        velocityRef.current.x =
            (velocityRef.current.x + accelerationX) * damping
        velocityRef.current.y =
            (velocityRef.current.y + accelerationY) * damping

        // Ограничиваем максимальную скорость
        const speed = Math.sqrt(
            velocityRef.current.x * velocityRef.current.x +
            velocityRef.current.y * velocityRef.current.y,
        )
        if (speed > maxSpeed) {
            velocityRef.current.x = (velocityRef.current.x / speed) * maxSpeed
            velocityRef.current.y = (velocityRef.current.y / speed) * maxSpeed
        }

        return {
            x: position.x + velocityRef.current.x,
            y: position.y + velocityRef.current.y,
        }
    }, [])

    return {
        resetVelocity,
        isNearTarget,
        recalculatePosition,
    }
}

export default useCursorMovePhysics
