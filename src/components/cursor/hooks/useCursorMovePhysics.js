import { useCallback, useEffect, useRef } from 'react';

const EPS = 0.1;

/**
 * Spring physics hook for cursor movement (stiffness, damping, speed clamping).
 * @param {number} stiffness
 * @param {number} mass
 * @param {number} damping
 * @param {number} maxSpeed
 * @returns {{ resetVelocity: Function, isNeedToStop: Function, getRecalculatedPosition: Function }}
 */
function useCursorMovePhysics(stiffness, mass, damping, maxSpeed) {
    const velocityRef = useRef({ x: 0, y: 0 });
    const settingsRef = useRef({ stiffness, mass, damping, maxSpeed });

    useEffect(() => {
        settingsRef.current = { stiffness, mass, damping, maxSpeed };
    }, [stiffness, mass, damping, maxSpeed]);

    const isNeedToStop = useCallback((position, target) => {
        const isNearTarget = Math.hypot(
            target.x - position.x,
            target.y - position.y,
        ) < EPS;
        const isAlmostStopped = Math.hypot(
            velocityRef.current.x,
            velocityRef.current.y,
        ) < EPS;
        return isNearTarget && isAlmostStopped;
    }, []);

    const resetVelocity = useCallback(() => {
        velocityRef.current = { x: 0, y: 0 };
    }, []);

    const getRecalculatedPosition = useCallback((position, target) => {
        if (target.x === null || target.y === null) return { ...position };

        const { stiffness: s, mass: m, damping: d, maxSpeed: max } = settingsRef.current;

        const forceX = (target.x - position.x) * s;
        const forceY = (target.y - position.y) * s;

        const accelerationX = forceX / m;
        const accelerationY = forceY / m;

        velocityRef.current.x = (velocityRef.current.x + accelerationX) * d;
        velocityRef.current.y = (velocityRef.current.y + accelerationY) * d;

        const speed = Math.sqrt(
            velocityRef.current.x * velocityRef.current.x
            + velocityRef.current.y * velocityRef.current.y,
        );
        if (speed > max) {
            velocityRef.current.x = (velocityRef.current.x / speed) * max;
            velocityRef.current.y = (velocityRef.current.y / speed) * max;
        }

        return {
            x: position.x + velocityRef.current.x,
            y: position.y + velocityRef.current.y,
        };
    }, []);

    return {
        resetVelocity,
        isNeedToStop,
        getRecalculatedPosition,
    };
}

export { useCursorMovePhysics };
export default useCursorMovePhysics;
