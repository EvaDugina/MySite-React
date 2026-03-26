import { useCallback } from 'react';

/**
 * Pointer event handler hook (click down/up) for the custom cursor.
 * @param {React.MutableRefObject<(() => void) | null>} updatePositionRef
 * @param {React.MutableRefObject<((event: PointerEvent) => void) | null>} handleLeftClickDownRef
 * @param {React.MutableRefObject<((event: PointerEvent) => void) | null>} handleLeftClickUpRef
 * @returns {{ enableCursor: () => void, disableCursor: () => void }}
 */
export function useCursorEvents(
    updatePositionRef,
    handleLeftClickDownRef,
    handleLeftClickUpRef,
) {
    const onPointerDown = useCallback((event) => {
        event.preventDefault();
        updatePositionRef.current?.();

        if (event.button === 0) {
            handleLeftClickDownRef.current?.(event);
        }
    }, [updatePositionRef, handleLeftClickDownRef]);

    const onPointerUp = useCallback((event) => {
        event.preventDefault();

        if (event.button === 0) {
            handleLeftClickUpRef.current?.(event);
        }
    }, [handleLeftClickUpRef]);

    const enableCursor = useCallback(() => {
        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointerup', onPointerUp);
    }, [onPointerDown, onPointerUp]);

    const disableCursor = useCallback(() => {
        window.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointerup', onPointerUp);
    }, [onPointerDown, onPointerUp]);

    return { enableCursor, disableCursor };
}

export default useCursorEvents;
