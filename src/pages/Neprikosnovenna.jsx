import "./Neprikosnovenna.css";
import styles from "./Neprikosnovenna.module.scss";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createCursorSettings,
  createCursorZoneSettings,
  CursorImages,
} from "../components/cursor/CursorSettings.js";
import Cursor from "../components/cursor/Cursor.jsx";
import Background from "../components/background/Background.jsx";
import { BackgroundType } from "../components/background/BackgroundSettings.js";
import Button from "../components/button/Button.jsx";

import ImagePortrait from "../components/portrait/ImagePortrait.jsx";
import useSoundEffect from "../hooks/useSoundEffect.js";
import { FlashType } from "../components/flash/FlashSettings.js";
import FlashProvider from "../components/flash/FlashProvider.jsx";
import CursorFingerprintTracker from "../components/cursor/CursorFingerprintTracker.jsx";


const Zone = {
  NONE: 0,
  BACK: 1,
  PORTRAIT: 2,
  BUTTON: 3,
  OBEZZHIRIT: 4,
};

const Neprikosnovenna = () => {
  const cursorRef = useRef(null);
  const articleRef = useRef(null);
  const cursorTrackerRef = useRef(null);
  const buttonObeszhiritRef = useRef(null);
  const buttonRef = useRef(null);
  const flashProviderRef = useRef(null);
  const backgroundSecondaryRef = useRef(null);

  const [isPortraitLoaded, setIsPortraitLoaded] = useState(false);
  const [isClickedOnPortrait, setIsClickedOnPortrait] = useState(false);
  const [isObezzhiritVisible, setIsObezzhiritVisible] = useState(false);
  const isObezzhiritVisibleRef = useRef(false);
  const dbHasFingerprintsRef = useRef(false);

  //
  // AUDIO CONTROL
  //

  const { playAudio } = useSoundEffect("/audio/СимуляцияОргазма.mov");

  //
  // ОБЕЗЖИРИТЬ — логика появления
  //

  const showObezzhirit = useCallback(() => {
    isObezzhiritVisibleRef.current = true;
    setIsObezzhiritVisible(true);
  }, []);

  const hideObezzhirit = useCallback(() => {
    isObezzhiritVisibleRef.current = false;
    setIsObezzhiritVisible(false);
  }, []);

  const handleTrackerReady = useCallback((count) => {
    dbHasFingerprintsRef.current = count > 0;
  }, []);

  const handleFadeInComplete = useCallback(() => {
    if (dbHasFingerprintsRef.current && !isObezzhiritVisibleRef.current) {
      showObezzhirit();
    }
  }, [showObezzhirit]);

  //
  // CURSOR CONTROL
  //

  const handleOnButton = () => {};
  const handleOffButton = () => {};

  const handleOnObezzhirit = () => {
    buttonObeszhiritRef.current?.hover();
  };

  const handleOffObezzhirit = () => {
    buttonObeszhiritRef.current?.reset();
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
        imgCursor: CursorImages.POINTER,
        imgCursorClicked: CursorImages.POINTER_CLICKED,
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
      [Zone.OBEZZHIRIT]: {
        elementId: "BtnObeszhirit",
        imgCursor: CursorImages.POINTER,
        imgCursorClicked: CursorImages.POINTER_CLICKED,
        handleOn: handleOnObezzhirit,
        handleOff: handleOffObezzhirit,
      },
    };

    cursorZoneSettingsRef.current = createCursorZoneSettings({
      Zone,
      Data: { ...ZoneData },
    });
  }, []);

  const handleLeftClickDown = useCallback(
    (currentElementId) => {
      if (currentElementId === "BtnNeprikosnovenna") {
        if (!buttonRef.current.isDisabled()) {
          backgroundSecondaryRef.current.hide();
          buttonRef.current.disable();
        }
      } else if (currentElementId === "BtnObeszhirit") {
        buttonObeszhiritRef.current.click();
        cursorTrackerRef.current.clearAllFingerprints();
        hideObezzhirit();
        dbHasFingerprintsRef.current = false;
      } else if (currentElementId === "Portrait") {
        if (!isClickedOnPortrait) setIsClickedOnPortrait(true);
        playAudio();
        flashProviderRef.current.flashes(FlashType.VZGLAD);
        let cursorPosition = cursorRef.current.getPosition();
        const articleRect = articleRef.current.getBoundingClientRect();
        const topValue = articleRef.current.offsetTop;
        const leftValue = articleRef.current.offsetLeft;
        let cursorPositionPercents = {
          x: ((cursorPosition.x - leftValue) / articleRect.width) * 100,
          y: ((cursorPosition.y - topValue) / articleRect.height) * 100,
        };
        cursorTrackerRef.current.saveClickPosition(cursorPositionPercents);

        if (!dbHasFingerprintsRef.current && !isObezzhiritVisibleRef.current) {
          const count = cursorTrackerRef.current.getSessionClickCount();
          if (count >= 30) {
            showObezzhirit();
          }
        }
      }
    },
    [isClickedOnPortrait],
  );

  const handleLeftClickUp = useCallback((currentElementId) => {
    if (currentElementId === "BtnNeprikosnovenna") {
      buttonRef.current.hover();
    } else if (currentElementId === "Portrait") {
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
          <article
            ref={articleRef}
            className={`${styles["portrait-container-default"]}`}
          >
            <ImagePortrait
              id="Painting"
              zIndex={2}
              setIsLoadedCallback={setIsPortraitLoaded}
            />

            {isObezzhiritVisible && (
              <Button
                ref={buttonObeszhiritRef}
                id="BtnObeszhirit"
                variant="obeszhirit"
                zIndex={8}
                text="обезжирить"
              />
            )}

            <Button
              ref={buttonRef}
              id="BtnNeprikosnovenna"
              variant="neprikosnovenna"
              zIndex={7}
              text="неприкосновенна"
            />

            <FlashProvider ref={flashProviderRef} zIndex={6} />

            {isPortraitLoaded && (
              <CursorFingerprintTracker
                ref={cursorTrackerRef}
                zIndex={5}
                onReady={handleTrackerReady}
                onFadeInComplete={handleFadeInComplete}
                startFadeIn={isClickedOnPortrait}
              />
            )}

            <div
              id="Portrait"
              className="z-4"
              style={{
                position: "absolute",
                width: "68%",
                height: "76%",
                top: "50.5%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                background: "transparent",
              }}
            ></div>
          </article>

          <Background id="Background-1" ref={backgroundSecondaryRef} type={BackgroundType.BLUE} zIndex={6} />
        </main>

      <Background id="Background-0" type={BackgroundType.WHITE} zIndex={0} />
    </>
  );
};

export { Neprikosnovenna };
export default Neprikosnovenna;
