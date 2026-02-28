import { useCallback, useRef } from 'react';

/**
 * Хук анимации движения курсора через requestAnimationFrame.
 * @param {React.MutableRefObject<(() => void) | null>} updatePositionRef
 * @returns {{ startAnimation: () => void, continueAnimation: () => void, stopAnimation: () => void }}
 */
export function useCursorMoveAnimation(updatePositionRef) {
    const animationIdRef = useRef(null);

    const animate = useCallback(() => {
        updatePositionRef.current?.();
    }, [updatePositionRef]);

    const startAnimation = useCallback(() => {
        if (animationIdRef.current) return;
        animationIdRef.current = requestAnimationFrame(animate);
    }, [animate]);

    const continueAnimation = useCallback(() => {
        animationIdRef.current = requestAnimationFrame(animate);
    }, [animate]);

    const stopAnimation = useCallback(() => {
        if (animationIdRef.current) {
            cancelAnimationFrame(animationIdRef.current);
            animationIdRef.current = null;
        }
    }, []);

    return { startAnimation, continueAnimation, stopAnimation };
}

export default useCursorMoveAnimation;
