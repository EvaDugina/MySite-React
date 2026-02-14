import { useRef, useEffect } from "react"

function useCursorPhysics(position, stiffness, mass, damping, maxSpeed) {
    const positionRef = useRef(position)
    const targetRef = useRef({ x: null, y: null })
    const velocityRef = useRef({ x: 0, y: 0 })
    const settingsRef = useRef({ stiffness, mass, damping, maxSpeed })

    useEffect(() => {
        settingsRef.current = { stiffness, mass, damping, maxSpeed }
    }, [stiffness, mass, damping, maxSpeed])

    const recalculatePosition = () => {
        if (targetRef.current.x === null || targetRef.current.y === null) return

        const { stiffness, mass, damping, maxSpeed } = settingsRef.current

        let currentPosition = { ...positionRef.current }

        // Рассчитываем силу (разница между текущей и целевой позицией)
        const forceX = (targetRef.current.x - currentPosition.x) * stiffness
        const forceY = (targetRef.current.y - currentPosition.y) * stiffness

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

        positionRef.current = {
            x: currentPosition.x + velocityRef.current.x,
            y: currentPosition.y + velocityRef.current.y,
        }
    }

    return {
        positionRef,
        targetRef,
        velocityRef,
        recalculatePosition,
    }
}

export default useCursorPhysics
