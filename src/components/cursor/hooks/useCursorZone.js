import { useCallback, useEffect, useRef } from 'react';
import { useThrottleCallback } from '@react-hook/throttle';
import { CursorImages } from '../CursorSettings.js';

/**
 * Zone detection hook — determines which zone the cursor is over and triggers handleOn/handleOff.
 * @param {() => { x: number, y: number }} getPosition
 * @param {React.MutableRefObject<{ Zone: Object, Data: Object } | null>} zoneSettingsRef
 * @param {(src: string) => void} changeCursorSrc
 * @returns {{ currentZoneDataRef: React.MutableRefObject, updateCurrentZone: Function }}
 */
export function useCursorZone(getPosition, zoneSettingsRef, changeCursorSrc) {
    const elementZoneRef = useRef(null);
    const currentZoneDataRef = useRef({
        elementId: null,
        imgCursor: CursorImages.DEFAULT,
        imgCursorClicked: CursorImages.DEFAULT,
        handleOn: null,
        handleOff: null,
    });

    const handleOnZone = useCallback((elementZone) => {
        if (!elementZone) return;
        let isFoundZone = false;
        Object.values(zoneSettingsRef.current.Zone).forEach((zoneValue) => {
            const data = zoneSettingsRef.current.Data[zoneValue];
            if (data.elementId === elementZone.id) {
                isFoundZone = true;
                changeCursorSrc(data.imgCursor);
                currentZoneDataRef.current = data;
                data.handleOn?.();
            }
        });

        if (isFoundZone) return;

        const noneData = zoneSettingsRef.current.Data[
            zoneSettingsRef.current.Zone.NONE
        ];
        changeCursorSrc(noneData.imgCursor);
        currentZoneDataRef.current = noneData;
        noneData.handleOn?.();
    }, [zoneSettingsRef, changeCursorSrc]);

    const handleOffZone = useCallback((elementZone) => {
        if (!elementZone) return;
        Object.values(zoneSettingsRef.current.Zone).forEach((zoneValue) => {
            const data = zoneSettingsRef.current.Data[zoneValue];
            if (data.elementId === elementZone.id) data.handleOff?.();
        });
    }, [zoneSettingsRef]);

    const updateCurrentZone = useCallback(() => {
        const position = getPosition();
        const elementUnder = document.elementFromPoint(position.x, position.y);
        if (
            !elementUnder
            || (elementZoneRef.current && elementZoneRef.current.id === elementUnder.id)
        ) {
            return null;
        }

        handleOffZone?.(elementZoneRef.current);
        elementZoneRef.current = elementUnder;
        handleOnZone?.(elementZoneRef.current);
    }, [getPosition, handleOnZone, handleOffZone]);

    const updateCurrentZoneRef = useRef(null);
    useEffect(() => {
        updateCurrentZoneRef.current = updateCurrentZone;
    }, [updateCurrentZone]);

    const stableUpdateCurrentZone = useCallback(() => {
        updateCurrentZoneRef.current?.();
    }, []);

    const throttledUpdateCurrentZone = useThrottleCallback(stableUpdateCurrentZone, 50);

    useEffect(() => {
        document.addEventListener('pointermove', throttledUpdateCurrentZone);
        return () => {
            document.removeEventListener('pointermove', throttledUpdateCurrentZone);
        };
    }, [throttledUpdateCurrentZone]);

    return {
        currentZoneDataRef,
        updateCurrentZone: throttledUpdateCurrentZone,
    };
}

export default useCursorZone;
