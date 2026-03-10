import "./Neprikosnovenna.css";
import styles from "./Neprikosnovenna.module.scss";
import React, {useCallback, useEffect, useMemo, useRef, useState,} from "react";
import {createCursorSettings, createCursorZoneSettings, CursorImages,} from "../components/cursor/CursorSettings.js";
import Cursor from "../components/cursor/Cursor.jsx";
import Background from "../components/background/Background.jsx";
import Button from "../components/button/Button.jsx";
import PortraitProvider from "../components/portrait/PortraitProvider.jsx";
import FlashProvider from "../components/flash/FlashProvider.jsx";
import useSoundEffect from "../hooks/useSoundEffect.js";
import {BackgroundType} from "../components/background/BackgroundSettings.js";

const Zone = {
    NONE: 0, BACK: 1, PORTRAIT: 2, BUTTON: 3,
};

const WhenYouSoBeautifullyDied = () => {
    const cursorRef = useRef(null);
    const backgroundSecondaryRef = useRef(null);
    const backgroundMainRef = useRef(null);
    const buttonRef = useRef(null);
    const portraitRef = useRef(null);
    const flashProviderRef = useRef(null);

    const isClickedRef = useRef(false);
    const isVideoEndedRef = useRef(false);

    const [isBloody, setIsBloody] = useState(() => {
        return JSON.parse(localStorage.getItem("01-isBloody")) ?? false;
    });
    useEffect(() => {
        localStorage.setItem("01-isBloody", JSON.stringify(isBloody));
    }, [isBloody]);

    useEffect(() => {
        if (isBloody) {
            portraitRef.current.scrollToEndVideo();
            portraitRef.current.showVideo();
        }
    }, []);

    //
    // VIDEO CONTROLL
    //

    const handleVideoEnded = useCallback(() => {
        isVideoEndedRef.current = true;
        buttonRef.current.reset();
    }, []);

    const videoSettings = useMemo(() => {
        return {
            onEnded: handleVideoEnded,
        };
    }, [handleVideoEnded]);

    //
    // AUDIO CONTROL
    //

    const {playAudio} = useSoundEffect(useMemo(() => "/audio/СимуляцияОргазма.mov", []),);

    //
    // CURSOR CONTROL
    //

    const handleOnButton = () => {
        backgroundSecondaryRef.current?.hide();
        buttonRef.current.hover();
    };

    const handleOffButton = () => {
        backgroundSecondaryRef.current?.show();
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
            }, [Zone.BACK]: {
                elementId: "Background-0",
                imgCursor: CursorImages.DEFAULT,
                imgCursorClicked: CursorImages.DEFAULT,
                handleOn: null,
                handleOff: null,
            }, [Zone.PORTRAIT]: {
                elementId: "Portrait",
                imgCursor: CursorImages.DEFAULT,
                imgCursorClicked: CursorImages.DEFAULT,
                handleOn: null,
                handleOff: null,
            }, [Zone.BUTTON]: {
                elementId: "BtnNeprikosnovenna",
                imgCursor: CursorImages.POINTER,
                imgCursorClicked: CursorImages.POINTER_CLICKED,
                handleOn: handleOnButton,
                handleOff: handleOffButton,
            },
        };

        cursorZoneSettingsRef.current = createCursorZoneSettings({
            Zone, Data: {...ZoneData},
        });
    }, []);

    const handleLeftClickDown = useCallback(async (currentElementId) => {
        if (currentElementId === "BtnNeprikosnovenna") {
            if (buttonRef.current.isDisabled()) return
            if ((!isClickedRef.current && !isBloody) || (isBloody && (!isClickedRef.current || isVideoEndedRef.current))) {
                buttonRef.current.click();
                portraitRef.current.hideVideo();
                portraitRef.current.showVideo();
            }
            playAudio();
            await flashProviderRef.current.flashes();
        }

        if (isBloody) return;
        if (isVideoEndedRef.current) return;

        if (currentElementId === "BtnNeprikosnovenna") {
            isClickedRef.current = true;
            portraitRef.current.showVideo(true);
            portraitRef.current.playVideo();
            setIsBloody(true);
            buttonRef.current.disable();
        }
    }, [playAudio, isBloody],);

    const handleLeftClickUp = useCallback((currentElementId) => {
        if (currentElementId === "BtnNeprikosnovenna") {
            if ((!isClickedRef.current && !isBloody) || (isBloody && (!isClickedRef.current || isVideoEndedRef.current))) {
                buttonRef.current.hover();
            }
        }
    }, []);

    const cursorSettings = useMemo(() => createCursorSettings({
        imgCursor: CursorImages.DEFAULT,
        startX: null,
        startY: null,
        handleLeftClickDown,
        handleLeftClickUp,
        stiffness: 0.4,
        damping: 0.1,
        mass: 0.1,
        maxSpeed: 25,
    }), [handleLeftClickDown, handleLeftClickUp],);

    //
    // FLASH CONTROLL
    //

    const onFlashStart = useCallback(() => {
        // backgroundMainRef.current.changeType(BackgroundType.KETCHUP)
    }, [])

    const onFlashEnd = useCallback(async () => {
        // backgroundMainRef.current.changeType(BackgroundType.WHITE)
        // return await new Promise((resolve) => setTimeout(resolve, 25));
    }, [])

    return (<>
            <Cursor
                ref={cursorRef}
                settings={cursorSettings}
                zoneSettingsRef={cursorZoneSettingsRef}
            />

            <main className={styles.main}>
                <article className={styles["portrait-container-default"]}>
                    <Button
                        ref={buttonRef}
                        id="BtnNeprikosnovenna"
                        zIndex={6}
                        text="неприкосновенна"
                    />

                    <FlashProvider
                        ref={flashProviderRef}
                        zIndex={4}
                        onFlashStart={onFlashStart}
                        onFlashEnd={onFlashEnd}
                    />

                    <PortraitProvider
                        ref={portraitRef}
                        zIndex={1}
                        settings={videoSettings}
                    />
                </article>

                <Background
                    ref={backgroundSecondaryRef}
                    id="Background-1"
                    zIndex={5}
                    type={BackgroundType.BLUE}
                />
            </main>

            <Background
                ref={backgroundMainRef}
                id="Background-0"
                type={BackgroundType.WHITE}
                zIndex={0}
            />
        </>);
};

export {WhenYouSoBeautifullyDied};
export default WhenYouSoBeautifullyDied;
