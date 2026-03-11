import React, {
    forwardRef,
    useCallback,
    useImperativeHandle,
    useRef,
} from "react";
import Flash from "./Flash.jsx";
import { FlashType } from "./FlashSettings.js";

const FLASH_DURATION = 150;

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

/**
 * Провайдер нескольких вспышек, последовательный вызов через ref.flashes(n).
 * @param {Object} props
 * @param {number} [props.zIndex]
 */
const FlashProvider = forwardRef((props, ref) => {
    const { zIndex, onFlashStart, onFlashEnd } = props;

    const flashFrontRef = useRef(null);
    const flashVzgladRef = useRef(null);
    const flashPortraitNegativeRef = useRef(null);
    const flashNegativeRef = useRef(null);

    const generateFlashQueue = (flashRef) => [
        flashRef,
        flashPortraitNegativeRef,
        flashRef,
        flashPortraitNegativeRef,
        flashRef,
        flashNegativeRef,
        flashRef
    ];

    const flashes = useCallback(async (flashType = null) => {
        const flash = async (flashQueue) => {
            if (flashQueue.length <= 0) return;

            const flashRef = flashQueue[0] ?? flashNegativeRef;

            onFlashStart?.();
            await flashRef.current.flash();
            await onFlashEnd?.();

            flashQueue.shift();

            if (flashQueue.length > 0) {
                await flash(flashQueue);
            }
        };
        if (flashType === null) ref = getRandomInt(2) === 0 ? flashFrontRef : flashVzgladRef;
        else if (flashType === FlashType.FRONT) ref = flashFrontRef;
        else ref = flashVzgladRef;

        await flash(generateFlashQueue(ref));
    }, []);

    useImperativeHandle(ref, () => ({ flashes }));

    return (
        <>
            <Flash
                ref={flashFrontRef}
                type={FlashType.FRONT}
                zIndex={zIndex}
                duration={FLASH_DURATION}
            />
            <Flash
                ref={flashVzgladRef}
                type={FlashType.VZGLAD}
                zIndex={zIndex}
                duration={FLASH_DURATION}
            />
            <Flash
                ref={flashPortraitNegativeRef}
                type={FlashType.PORTRAIT_NEGATIVE}
                zIndex={zIndex}
                duration={FLASH_DURATION}
            />
            <Flash
                ref={flashNegativeRef}
                type={FlashType.NEGATIVE}
                zIndex={zIndex}
                duration={FLASH_DURATION}
            />
        </>
    );
});

FlashProvider.displayName = "FlashProvider";

export default FlashProvider;
