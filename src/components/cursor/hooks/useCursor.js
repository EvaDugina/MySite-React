import { useCallback, useEffect, useRef, useState } from "react";
import useCursorMovePhysics from "./useCursorMovePhysics.js";
import useCursorMoveAnimation from "./useCursorMoveAnimation.js";
import useCursorZone from "./useCursorZone.js";
import useCursorEvents from "./useCursorEvents.js";

/**
 * Custom cursor hook: initialization, movement, zones, clicks.
 * @param {Object} settings - config from createCursorSettings()
 * @param {Function} showCursor
 * @param {Function} changeCursorSrc
 * @param {React.MutableRefObject} zoneSettingsRef - ref with config from createCursorZoneSettings()
 * @param {React.MutableRefObject} handleLeftClickDownRef
 * @param {React.MutableRefObject} handleLeftClickUpRef
 * @returns {{ position: { x: number, y: number }, stopCursor: Function, startCursor: Function, currentZoneDataRef: React.MutableRefObject }}
 */
export function useCursor(
    settings,
    showCursor,
    changeCursorSrc,
    zoneSettingsRef,
    handleLeftClickDownRef,
    handleLeftClickUpRef,
) {
    const [position, setPosition] = useState({ x: null, y: null });

    const positionRef = useRef(position);
    const getPosition = useCallback(() => {
        return { ...positionRef.current };
    }, []);

    const isStoppedRef = useRef(true);
    const isTargetNotInitRef = useRef(false);
    const isTargetInitializedRef = useRef(false);
    const targetRef = useRef({ x: null, y: null });
    const windowSizeRef = useRef({
        width: null,
        height: null,
    });

    const updatePositionRef = useRef(null);
    const getIsCursorReady = useCallback(() => {
        return isTargetInitializedRef.current;
    }, []);

    //
    // INITIALIZATION HOOKS
    //

    const { currentZoneDataRef, updateCurrentZone } = useCursorZone(
        getPosition,
        zoneSettingsRef,
        changeCursorSrc,
    );

    const { enableCursor, disableCursor } = useCursorEvents(
        updatePositionRef,
        handleLeftClickDownRef,
        handleLeftClickUpRef,
    );

    const { resetVelocity, isNeedToStop, getRecalculatedPosition } =
        useCursorMovePhysics(
            settings.stiffness,
            settings.mass,
            settings.damping,
            settings.maxSpeed,
        );

    const { startAnimation, continueAnimation, stopAnimation } =
        useCursorMoveAnimation(updatePositionRef);

    //
    // HANDLERS
    //

    const onPointerMove = useCallback(
        (event) => {
            event.preventDefault(); // Для сенсоров

            targetRef.current = { x: event.clientX, y: event.clientY };
            startAnimation();
        },
        [startAnimation],
    );

    const onPointerCancel = useCallback((event) => {
        event.preventDefault(); // Для сенсоров
    }, []);

    const onBlur = useCallback(() => {
        stopAnimation();
    }, [stopAnimation]);

    const onResize = useCallback(() => {
        if (positionRef.current.x === null || positionRef.current.y === null)
            return;

        const newWindowSize = {
            width: window.innerWidth,
            height: window.innerHeight,
        };

        positionRef.current = {
            x:
                (positionRef.current.x / windowSizeRef.current.width) *
                newWindowSize.width,
            y:
                (positionRef.current.y / windowSizeRef.current.height) *
                newWindowSize.height,
        };
        setPosition(positionRef.current);

        windowSizeRef.current = { ...newWindowSize };
    }, []);

    //
    // PUBLIC METHODS
    //

    const startCursor = useCallback(() => {
        isStoppedRef.current = false;
        window.addEventListener("pointerdown", onPointerMove);
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointercancel", onPointerCancel);
        startAnimation();
    }, [onPointerMove, onPointerCancel, startAnimation]);

    const stopCursor = useCallback(() => {
        isStoppedRef.current = true;
        window.removeEventListener("pointerdown", onPointerMove);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointercancel", onPointerCancel);
        stopAnimation();
    }, [onPointerMove, onPointerCancel, stopAnimation]);

    //
    // INIT & DESTROY
    //

    const init = useCallback(() => {
        isTargetNotInitRef.current = false;
        isTargetInitializedRef.current = false;

        windowSizeRef.current = {
            width: window.innerWidth,
            height: window.innerHeight,
        };

        const hasStart =
            settings.startX !== null &&
            settings.startX !== undefined &&
            settings.startY !== null &&
            settings.startY !== undefined;
        if (hasStart) {
            positionRef.current = {
                x: windowSizeRef.current.width * settings.startX,
                y: windowSizeRef.current.height * settings.startY,
            };
            setPosition(positionRef.current);
            showCursor();
            isTargetInitializedRef.current = true;
        } else {
            isTargetNotInitRef.current = true;
        }

        startCursor();
        enableCursor();

        window.addEventListener("blur", onBlur);
        window.addEventListener("resize", onResize);
    }, [settings, showCursor, startCursor, enableCursor, onBlur, onResize]);

    const destroy = useCallback(() => {
        isTargetNotInitRef.current = false;
        isTargetInitializedRef.current = false;
        stopCursor();
        disableCursor();
        window.removeEventListener("blur", onBlur);
        window.removeEventListener("resize", onResize);
    }, [stopCursor, disableCursor, onBlur, onResize]);

    useEffect(() => {
        init();
        return () => {
            destroy();
        };
    }, [init, destroy]);

    //
    // UPDATE POSITION
    //

    const updatePosition = useCallback(() => {
        if (
            targetRef.current.x === null ||
            targetRef.current.y === null ||
            isStoppedRef.current
        ) {
            stopAnimation();
            return;
        }

        // Инициализация на месте указателя
        if (isTargetNotInitRef.current) {
            isTargetNotInitRef.current = false;
            positionRef.current = { ...targetRef.current };
            setPosition(positionRef.current);
            showCursor();
            isTargetInitializedRef.current = true;
        }

        // Оптимизация. Условие остановки анимации, когда курсор неподвижен
        if (isNeedToStop(positionRef.current, targetRef.current)) {
            updateCurrentZone();
            positionRef.current = { ...targetRef.current };
            setPosition(positionRef.current);
            resetVelocity();
            stopAnimation();
            return;
        }

        positionRef.current = getRecalculatedPosition(
            positionRef.current,
            targetRef.current,
        );
        setPosition(positionRef.current);

        continueAnimation();
    }, [
        stopAnimation,
        showCursor,
        isNeedToStop,
        updateCurrentZone,
        resetVelocity,
        getRecalculatedPosition,
        continueAnimation,
    ]);

    useEffect(() => {
        updatePositionRef.current = updatePosition;
    }, [updatePosition]);

    //
    // RETURN
    //

    return {
        position,
        stopCursor,
        startCursor,
        getIsCursorReady,
        currentZoneDataRef,
    };
}

export default useCursor;
