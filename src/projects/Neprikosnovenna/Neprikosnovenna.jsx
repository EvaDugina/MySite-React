import "./Neprikosnovenna.css";
import styles from "./Neprikosnovenna.module.css";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
    CursorImages,
    createCursorSettings,
    createCursorZoneSettings,
} from "./components/cursor/CursorSettingsHandler";
import Cursor from "./components/cursor/Cursor";
import Background from "./components/background/Background";
import Button from "./components/button/Button";
import ImagePortrait from "./components/portrait/ImagePortrait.jsx";

const Zone = {
    NONE: 0,
    BACK: 1,
    PORTRAIT: 2,
    BUTTON: 3,
};

const WhenYouSoBeautifullyDied = () => {
    const cursorRef = useRef(null);
    const buttonRef = useRef(null);

    const handleOnButton = () => {
        buttonRef.current.hover();
    };

    const handleOffButton = () => {
        buttonRef.current.reset();
    };

    const cursorZoneSettingsRef = useRef(null);
    useEffect(() => {
        const ZoneData = {
            [Zone.NONE]: {
                elementId: null,
                imgCursor: CursorImages.DEFAULT,
                imgCursorClicked: CursorImages.DEFAULT,
                handleOn: null,
                handleOff: null,
            },
            [Zone.BACK]: {
                elementId: "Background-0",
                imgCursor: CursorImages.DEFAULT,
                imgCursorClicked: CursorImages.DEFAULT,
                handleOn: null,
                handleOff: null,
            },
            [Zone.PORTRAIT]: {
                elementId: "Portrait",
                imgCursor: CursorImages.DEFAULT,
                imgCursorClicked: CursorImages.DEFAULT,
                handleOn: null,
                handleOff: null,
            },
            [Zone.BUTTON]: {
                elementId: "BtnNeprikosnovenna",
                imgCursor: CursorImages.POINTER,
                imgCursorClicked: CursorImages.POINTER_CLICKED,
                handleOn: handleOnButton,
                handleOff: handleOffButton,
            },
        };

        cursorZoneSettingsRef.current = createCursorZoneSettings({
            Zone,
            Data: { ...ZoneData },
        });
    }, []);

    const handleLeftClickDown = useCallback((currentElementId) => {
        if (currentElementId === "BtnNeprikosnovenna") {
            buttonRef.current.click();
        }
    }, []);

    const handleLeftClickUp = useCallback((currentElementId) => {
        if (currentElementId === "BtnNeprikosnovenna") {
            buttonRef.current.hover();
        }
    }, []);

    const cursorSettings = useMemo(
        () =>
            createCursorSettings({
                imgCursor: CursorImages.DEFAULT,
                startX: null,
                startY: null,
                handleLeftClickDown,
                handleLeftClickUp,
                stiffness: 0.4,
                damping: 0.1,
                mass: 0.1,
                maxSpeed: 25,
            }),
        [handleLeftClickDown, handleLeftClickUp],
    );

    return (
        <>
            <Cursor
                ref={cursorRef}
                settings={cursorSettings}
                zoneSettingsRef={cursorZoneSettingsRef}
            />

            <main className={styles.main}>
                <div className={`${styles.container} z-1`}>
                    <article
                        className={`${styles["portrait-container-default"]} ${styles.center}`}
                    >
                        <div
                            className={`${styles["ignore-cursor"]} d-none`}
                            aria-hidden
                        />

                        <Button
                            ref={buttonRef}
                            id="BtnNeprikosnovenna"
                            zIndex={3}
                            text="неприкосновенна"
                        />

                        <ImagePortrait zIndex={2} />
                    </article>
                </div>
            </main>

            <Background id="Background-0" variant="white" zIndex={0} />
        </>
    );
};

export { WhenYouSoBeautifullyDied };
export default WhenYouSoBeautifullyDied;
