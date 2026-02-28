import React, {
    forwardRef,
    useCallback,
    useImperativeHandle,
    useRef,
} from "react";
import Flash from "./Flash.jsx";
import { FlashType } from "./FlashSettingsHandler";

const FLASH_DURATION = 100;

/**
 * Провайдер нескольких вспышек, последовательный вызов через ref.flashes(n).
 * @param {Object} props
 * @param {number} [props.zIndex]
 */
const FlashProvider = forwardRef((props, ref) => {
    const { zIndex } = props;

    const flashFrontRef = useRef(null);
    const flashDefaultRef = useRef(null);

    const generateFlashQueue = (flashRef) => [
        flashRef,
        null,
        flashRef,
        null,
        null,
        flashRef,
        flashRef,
    ];

    const flashes = useCallback(async (n = 1) => {
        const flash = async (flashQueue) => {
            if (flashQueue.length <= 0) return;

            const flashRef = flashQueue[0] ?? flashDefaultRef;
            flashRef.current.flash();
            await new Promise((resolve) => {
                setTimeout(() => {
                    flashQueue.shift();
                    resolve();
                }, FLASH_DURATION);
            });

            if (flashQueue.length > 0) {
                await flash(flashQueue);
            }
        };

        for (let i = 0; i < n; i++) {
            await flash(generateFlashQueue(flashFrontRef));
        }
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
                ref={flashDefaultRef}
                zIndex={zIndex}
                duration={FLASH_DURATION}
            />
        </>
    );
});

FlashProvider.displayName = "FlashProvider";

export default FlashProvider;
